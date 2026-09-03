import { NextResponse } from "next/server";
import { createClient, getProfile } from "@/lib/supabase/server";
import { templates } from "@/lib/email/templates";
import { sendEmail } from "@/lib/email/send";

const ALLOWED = ["upcoming", "confirmed", "baking", "ready_for_delivery", "delivered", "cancelled"];

/** Used by the bakery dashboard to move an order along. */
export async function POST(request: Request) {
  const profile = await getProfile();
  if (!profile || !["admin", "bakery"].includes(profile.role)) {
    return NextResponse.json({ error: "Not allowed." }, { status: 403 });
  }

  const { order_id, status, bakery_notes } = await request.json();
  if (status && !ALLOWED.includes(status)) {
    return NextResponse.json({ error: "Unknown status." }, { status: 400 });
  }

  const supabase = await createClient();
  const patch: Record<string, any> = {};
  if (status) {
    patch.status = status;
    if (status === "confirmed") patch.confirmed_at = new Date().toISOString();
    if (status === "delivered") patch.delivered_at = new Date().toISOString();
    if (status === "cancelled") patch.cancelled_at = new Date().toISOString();
  }
  if (bakery_notes !== undefined) patch.bakery_notes = bakery_notes;

  const { error } = await supabase.from("orders").update(patch).eq("id", order_id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  // Tell the parent once the mini doughnuts have actually arrived.
  if (status === "delivered") {
    const { data: row } = await supabase
      .from("admin_orders").select("*").eq("order_id", order_id).single();
    if (row?.parent_email) {
      await sendEmail({
        to: row.parent_email,
        template: "delivery_confirmation",
        orderId: order_id,
        ...templates.delivery_confirmation({
          child_first_name: row.child_first_name,
          school_name: row.school_name,
          grade: row.grade,
          teacher_name: row.teacher_name,
          birthday: row.birthday,
          delivery_date: row.delivery_date,
          donut_count: row.donut_count,
          package_name: row.package_name,
        }),
      });
    }
  }

  return NextResponse.json({ ok: true });
}
