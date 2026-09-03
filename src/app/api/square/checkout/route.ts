import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { createPaymentLink, squareConfigured } from "@/lib/square";
import { formatShort } from "@/lib/dates";

export const runtime = "nodejs";

/**
 * Builds a Square checkout page for everything a family still owes.
 * The pay token from the emailed link is the credential — there is no login.
 * Parents enter their card on Square's own page; nothing is stored here.
 */
export async function POST(request: Request) {
  if (!squareConfigured()) {
    return NextResponse.json(
      { error: "Card payments aren't switched on yet. Please contact the school office." },
      { status: 503 }
    );
  }

  const { token } = await request.json();
  if (typeof token !== "string" || token.length < 20) {
    return NextResponse.json({ error: "That payment link isn't valid." }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { data: parent } = await supabase
    .from("parents").select("id, first_name, last_name, email, pay_token").eq("pay_token", token).maybeSingle();
  if (!parent) {
    return NextResponse.json({ error: "That payment link isn't valid." }, { status: 404 });
  }

  const { data: rows } = await supabase
    .from("admin_orders")
    .select("order_id, amount_cents, child_first_name, child_last_name, delivery_date, package_name, school_year_id, payment_plan, school_short_name, school_name")
    .eq("parent_id", parent.id)
    .eq("payment_status", "unpaid")
    .neq("status", "cancelled");

  if (!rows?.length) {
    return NextResponse.json({ error: "There's nothing outstanding on this account." }, { status: 400 });
  }

  const site = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ?? new URL(request.url).origin;
  const orderIds = rows.map((r) => r.order_id);

  // Everything the bakery needs to match a deposit to a production sheet goes
  // on the line items, because that is what shows in the Square dashboard.
  let link;
  try {
    link = await createPaymentLink({
      referenceId: parent.id,
      buyerEmail: parent.email,
      redirectUrl: `${site}/pay/${token}?paid=1`,
      paymentNote: `Birthday doughnuts — ${parent.first_name} ${parent.last_name}`.slice(0, 500),
      lineItems: rows.map((r) => ({
        name: `${r.child_first_name} ${r.child_last_name} — ${r.package_name}`,
        amountCents: r.amount_cents,
        note: `${r.school_short_name ?? r.school_name} · Delivery ${formatShort(r.delivery_date)}`,
      })),
    });
  } catch (e: any) {
    console.error("Square createPaymentLink failed:", e?.message);
    return NextResponse.json(
      { error: "We couldn't open the payment page just now. Please try again, or contact the school office." },
      { status: 502 }
    );
  }

  await supabase.from("payments").insert(
    rows.map((r) => ({
      parent_id: parent.id,
      school_year_id: r.school_year_id,
      order_id: r.order_id,
      plan: rows.length > 1 ? "annual" : r.payment_plan,
      amount_cents: r.amount_cents,
      status: "pending",
      square_order_id: link.orderId,
      square_payment_link_id: link.paymentLinkId,
    }))
  );

  await supabase.from("orders").update({ payment_status: "pending" }).in("id", orderIds);

  return NextResponse.json({ url: link.url });
}
