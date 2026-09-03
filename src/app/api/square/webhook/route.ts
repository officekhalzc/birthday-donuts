import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { verifyWebhookSignature } from "@/lib/square";
import { templates } from "@/lib/email/templates";
import { sendEmail, alreadySent } from "@/lib/email/send";

export const runtime = "nodejs";

/**
 * The receipt, sent only once the money has cleared. Registration no longer
 * emails anything, so this is the first thing a family hears from us — and a
 * family that abandoned checkout correctly hears nothing at all.
 *
 * A failure here is logged and swallowed: the payment is real whether or not
 * the email sends, and returning an error would make Square retry the whole
 * webhook and risk a duplicate.
 */
async function sendConfirmation(db: ReturnType<typeof createAdminClient>, orderIds: string[]) {
  try {
    if (await alreadySent("registration_confirmation", orderIds[0])) return;

    const { data: rows } = await db
      .from("admin_orders")
      .select("order_id, child_first_name, school_name, grade, teacher_name, birthday, delivery_date, donut_count, package_name, amount_cents, parent_email, pay_token")
      .in("order_id", orderIds)
      .order("delivery_date");

    if (!rows?.length || !rows[0].parent_email) return;

    await sendEmail({
      to: rows[0].parent_email,
      template: "registration_confirmation",
      orderId: orderIds[0],
      ...templates.registration_confirmation(rows, rows[0].pay_token),
    });
  } catch (e: any) {
    console.error("Confirmation email failed after payment:", e?.message);
  }
}

/**
 * Square calls this after a payment settles. It is the only place an order is
 * marked paid, so a parent closing the browser mid-payment cannot break
 * anything, and nothing reaches the bake queue on the strength of a redirect.
 *
 * Subscribe to `payment.created`, `payment.updated` and `refund.updated` in the
 * Square dashboard. The first two are both handled because a payment link can
 * arrive already COMPLETED, and we would rather act twice than miss it — every
 * update below is written so that running it again changes nothing.
 */
export async function POST(request: Request) {
  const raw = await request.text();
  const signature = request.headers.get("x-square-hmacsha256-signature");

  if (!verifyWebhookSignature(raw, signature)) {
    // Deliberately terse: an unverified caller learns nothing about why.
    return NextResponse.json({ error: "Bad signature." }, { status: 401 });
  }

  let event: any;
  try {
    event = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Bad payload." }, { status: 400 });
  }

  const db = createAdminClient();
  const type: string = event?.type ?? "";

  // ---------- payment completed ----------
  if (type === "payment.created" || type === "payment.updated") {
    const payment = event?.data?.object?.payment;

    if (payment?.status === "COMPLETED" && payment?.order_id) {
      const paidAt = payment.updated_at ?? new Date().toISOString();

      const { data: rows } = await db
        .from("payments")
        .select("order_id")
        .eq("square_order_id", payment.order_id);

      const orderIds = (rows ?? []).map((r) => r.order_id).filter(Boolean);

      if (orderIds.length) {
        await db
          .from("payments")
          .update({ status: "paid", paid_at: paidAt, square_payment_id: payment.id })
          .eq("square_order_id", payment.order_id)
          .eq("status", "pending");

        await db
          .from("orders")
          .update({ payment_status: "paid" })
          .in("id", orderIds)
          .neq("payment_status", "refunded");

        await sendConfirmation(db, orderIds);
      } else {
        // A payment we have no record of. Worth a log line: it usually means
        // someone took a payment in Square directly, outside this system.
        console.warn("Square payment with no matching order:", payment.order_id);
      }
    }
  }

  // ---------- refund completed ----------
  if (type === "refund.updated" || type === "refund.created") {
    const refund = event?.data?.object?.refund;

    if (refund?.status === "COMPLETED" && refund?.payment_id) {
      const { data: rows } = await db
        .from("payments")
        .select("order_id")
        .eq("square_payment_id", refund.payment_id);

      const orderIds = (rows ?? []).map((r) => r.order_id).filter(Boolean);

      if (orderIds.length) {
        await db
          .from("payments")
          .update({ status: "refunded", refunded_at: new Date().toISOString() })
          .eq("square_payment_id", refund.payment_id);

        await db.from("orders").update({ payment_status: "refunded" }).in("id", orderIds);
      }
    }
  }

  return NextResponse.json({ received: true });
}
