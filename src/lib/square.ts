import crypto from "node:crypto";

/**
 * A very small Square client — just the three calls this program makes.
 *
 * There is deliberately no Square SDK dependency. The SDK's shape has changed
 * between major versions more than once, and we only need three endpoints, so
 * plain fetch against a pinned API version is easier to keep working.
 */

/** Pinned on purpose. Square keeps old versions working; drifting silently is worse. */
const SQUARE_VERSION = "2026-08-19";

const SANDBOX = "https://connect.squareupsandbox.com";
const PRODUCTION = "https://connect.squareup.com";

/** Sandbox unless someone has explicitly said production. Fail safe, not open. */
export function squareBaseUrl(): string {
  return process.env.SQUARE_ENVIRONMENT === "production" ? PRODUCTION : SANDBOX;
}

export function isSandbox(): boolean {
  return squareBaseUrl() === SANDBOX;
}

export function squareConfigured(): boolean {
  return Boolean(process.env.SQUARE_ACCESS_TOKEN && process.env.SQUARE_LOCATION_ID);
}

type SquareError = { category?: string; code?: string; detail?: string };

async function squareFetch<T>(path: string, body: unknown, method = "POST"): Promise<T> {
  const res = await fetch(`${squareBaseUrl()}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${process.env.SQUARE_ACCESS_TOKEN}`,
      "Square-Version": SQUARE_VERSION,
      "Content-Type": "application/json",
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  const json: any = await res.json().catch(() => ({}));

  if (!res.ok) {
    const errors: SquareError[] = json?.errors ?? [];
    const detail = errors.map((e) => e.detail ?? e.code).filter(Boolean).join("; ");
    // Square's own wording is aimed at developers, so callers replace this
    // with something a parent can act on. It is logged, not shown.
    throw new Error(detail || `Square returned ${res.status}`);
  }

  return json as T;
}

// ---------------------------------------------------------------------------
// Payment links
// ---------------------------------------------------------------------------

export type PaymentLineItem = {
  /** What the parent sees on the checkout page, e.g. "Leah — Birthday Mini Doughnuts". */
  name: string;
  /** In cents. */
  amountCents: number;
  /** Second line under the name, e.g. "Delivery Tue, 15 Sep". */
  note?: string;
};

export type CreatedPaymentLink = {
  url: string;
  orderId: string;
  paymentLinkId: string;
};

/**
 * Builds a Square-hosted checkout page for one family's outstanding birthdays.
 *
 * The returned `orderId` is the join key: Square reports it back on the webhook,
 * and it is what we store on the `payments` rows. We do not try to smuggle our
 * own order ids through `reference_id`, which is capped at 40 characters and so
 * cannot hold more than one UUID.
 */
export async function createPaymentLink(opts: {
  lineItems: PaymentLineItem[];
  redirectUrl: string;
  buyerEmail?: string | null;
  /** Shown to the bakery in the Square dashboard. Keep it short and human. */
  paymentNote?: string;
  /** Our own reference, max 40 chars. The parent id fits; a list of orders does not. */
  referenceId?: string;
}): Promise<CreatedPaymentLink> {
  const json = await squareFetch<{
    payment_link: { id: string; url: string; order_id: string };
  }>("/v2/online-checkout/payment-links", {
    idempotency_key: crypto.randomUUID(),
    order: {
      location_id: process.env.SQUARE_LOCATION_ID,
      reference_id: opts.referenceId?.slice(0, 40),
      line_items: opts.lineItems.map((li) => ({
        name: li.name.slice(0, 500),
        quantity: "1",
        note: li.note?.slice(0, 500),
        base_price_money: { amount: li.amountCents, currency: "USD" },
      })),
    },
    checkout_options: {
      redirect_url: opts.redirectUrl,
      ask_for_shipping_address: false,
      allow_tipping: false,
    },
    pre_populated_data: opts.buyerEmail ? { buyer_email: opts.buyerEmail } : undefined,
    payment_note: opts.paymentNote?.slice(0, 500),
  });

  return {
    url: json.payment_link.url,
    orderId: json.payment_link.order_id,
    paymentLinkId: json.payment_link.id,
  };
}

// ---------------------------------------------------------------------------
// Refunds
// ---------------------------------------------------------------------------

export async function refundPayment(opts: {
  paymentId: string;
  amountCents: number;
  reason?: string;
}): Promise<void> {
  await squareFetch("/v2/refunds", {
    idempotency_key: crypto.randomUUID(),
    payment_id: opts.paymentId,
    amount_money: { amount: opts.amountCents, currency: "USD" },
    reason: opts.reason?.slice(0, 192),
  });
}

// ---------------------------------------------------------------------------
// Webhook signatures
// ---------------------------------------------------------------------------

/**
 * Square signs the notification URL concatenated with the raw request body,
 * using the signature key from the webhook subscription.
 *
 * The URL must match what is registered in the Square dashboard character for
 * character — a trailing slash or http/https mismatch fails every time, and is
 * the usual reason a webhook that "should work" silently doesn't.
 */
export function verifyWebhookSignature(rawBody: string, signature: string | null): boolean {
  const key = process.env.SQUARE_WEBHOOK_SIGNATURE_KEY;
  const url =
    process.env.SQUARE_WEBHOOK_URL ??
    (process.env.NEXT_PUBLIC_SITE_URL
      ? `${process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "")}/api/square/webhook`
      : undefined);

  if (!key || !url || !signature) return false;

  const expected = crypto
    .createHmac("sha256", key)
    .update(url + rawBody)
    .digest("base64");

  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

// ---------------------------------------------------------------------------
// Diagnostics
// ---------------------------------------------------------------------------

export type ConnectionReport = {
  ok: boolean;
  httpStatus?: number;
  errors?: { category?: string; code?: string; detail?: string }[];
  locationCount?: number;
  /** Whether SQUARE_LOCATION_ID is actually one of this account's locations. */
  locationMatches?: boolean;
};

/**
 * Asks Square who we are. Used by /api/square/health to tell apart the three
 * ways this goes wrong — a token for the other environment, a location id
 * from the other environment, and a bad API version — without anyone having
 * to read server logs.
 *
 * Returns error codes and counts only, never the token or the account's
 * location ids, because the endpoint that calls this is public.
 */
export async function describeConnection(): Promise<ConnectionReport> {
  try {
    const res = await fetch(`${squareBaseUrl()}/v2/locations`, {
      headers: {
        Authorization: `Bearer ${process.env.SQUARE_ACCESS_TOKEN}`,
        "Square-Version": SQUARE_VERSION,
        "Content-Type": "application/json",
      },
    });

    const json: any = await res.json().catch(() => ({}));

    if (!res.ok) {
      return { ok: false, httpStatus: res.status, errors: json?.errors ?? [] };
    }

    const ids: string[] = (json.locations ?? []).map((l: any) => l.id);
    return {
      ok: true,
      httpStatus: res.status,
      locationCount: ids.length,
      locationMatches: ids.includes(process.env.SQUARE_LOCATION_ID ?? ""),
    };
  } catch (e: any) {
    return { ok: false, errors: [{ detail: String(e?.message ?? e) }] };
  }
}
