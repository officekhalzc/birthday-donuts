import { NextResponse } from "next/server";
import { createClient, getProfile } from "@/lib/supabase/server";
import { refundPayment, squareConfigured } from "@/lib/square";

const REG_FIELDS = [
  "celebration_date", "quantity", "grade", "teacher_name",
  "package_id", "admin_notes",
  "special_instructions", "school_id",
];
const ORDER_FIELDS = ["status", "payment_status", "donut_count", "amount_cents", "bakery_notes"];

/** One endpoint for every edit the administrator can make to an order. */
export async function PATCH(request: Request) {
  const profile = await getProfile();
  if (profile?.role !== "admin") {
    return NextResponse.json({ error: "Administrators only." }, { status: 403 });
  }

  const supabase = await createClient();
  const body = await request.json();
  const { order_id, registration_id, allergy_notes, child_id, refund } = body;

  // --- registration-level edits ---
  const regPatch: Record<string, any> = {};
  for (const f of REG_FIELDS) if (body[f] !== undefined) regPatch[f] = body[f];
  if (body.celebration_date !== undefined) {
    regPatch.celebration_source = "admin";
    regPatch.celebration_reason = body.celebration_reason ?? "Date set by the school office";
  }
  if (Object.keys(regPatch).length) {
    const { error } = await supabase.from("registrations").update(regPatch).eq("id", registration_id);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    // A database trigger keeps the order's date and mini doughnut count in step.
  }

  // --- order-level edits ---
  const orderPatch: Record<string, any> = {};
  for (const f of ORDER_FIELDS) if (body[f] !== undefined) orderPatch[f] = body[f];
  if (body.status === "delivered") orderPatch.delivered_at = new Date().toISOString();
  if (body.status === "cancelled") orderPatch.cancelled_at = new Date().toISOString();
  if (Object.keys(orderPatch).length) {
    const { error } = await supabase.from("orders").update(orderPatch).eq("id", order_id);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  }

  if (allergy_notes !== undefined && child_id) {
    await supabase.from("children").update({ allergy_notes }).eq("id", child_id);
  }

  // --- refund through Square ---
  // Only this order's amount is refunded, never the whole payment: a family
  // paying for several birthdays at once shares one Square payment, and
  // cancelling one birthday must not refund the others.
  if (refund) {
    const { data: payment } = await supabase
      .from("payments").select("id, square_payment_id, amount_cents")
      .eq("order_id", order_id).eq("status", "paid").maybeSingle();

    if (payment?.square_payment_id && squareConfigured()) {
      try {
        await refundPayment({
          paymentId: payment.square_payment_id,
          amountCents: payment.amount_cents,
          reason: "Birthday celebration cancelled",
        });
      } catch (e: any) {
        console.error("Square refund failed:", e?.message);
        return NextResponse.json(
          { error: `The refund didn't go through: ${e?.message ?? "unknown error"}. Nothing was changed.` },
          { status: 502 }
        );
      }
      // The refund.updated webhook also writes these, which is harmless —
      // this is here so the admin screen updates without waiting on Square.
      await supabase.from("payments")
        .update({ status: "refunded", refunded_at: new Date().toISOString() })
        .eq("id", payment.id);
    }
    await supabase.from("orders").update({ payment_status: "refunded" }).eq("id", order_id);
  }

  return NextResponse.json({ ok: true });
}
