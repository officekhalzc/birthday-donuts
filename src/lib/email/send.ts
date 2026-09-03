import { Resend } from "resend";
import { createAdminClient } from "../supabase/server";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

/**
 * Sends an email and writes a row to email_log so a reminder is never sent twice.
 * If RESEND_API_KEY is missing the message is logged to the console instead,
 * which is what happens while you are developing locally.
 */
export async function sendEmail(opts: {
  to: string;
  subject: string;
  html: string;
  template: string;
  orderId?: string;
}) {
  const db = createAdminClient();

  if (!resend) {
    console.log(`[email:${opts.template}] to ${opts.to} — ${opts.subject}`);
    return { ok: true, skipped: true };
  }

  try {
    const res = await resend.emails.send({
      from: process.env.EMAIL_FROM!,
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
    });
    await db.from("email_log").insert({
      template: opts.template,
      to_email: opts.to,
      order_id: opts.orderId ?? null,
      provider_id: res.data?.id ?? null,
    });
    return { ok: true };
  } catch (e: any) {
    await db.from("email_log").insert({
      template: opts.template,
      to_email: opts.to,
      order_id: opts.orderId ?? null,
      error: String(e?.message ?? e),
    });
    return { ok: false, error: String(e?.message ?? e) };
  }
}

/** True if we have already sent this template for this order. */
export async function alreadySent(template: string, orderId: string) {
  const db = createAdminClient();
  const { count } = await db
    .from("email_log")
    .select("id", { count: "exact", head: true })
    .eq("template", template)
    .eq("order_id", orderId)
    .is("error", null);
  return (count ?? 0) > 0;
}
