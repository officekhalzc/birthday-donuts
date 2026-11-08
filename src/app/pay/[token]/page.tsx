import { Nav } from "@/components/Nav";
import { SprinkleRule } from "@/components/SprinkleRule";
import { createAdminClient } from "@/lib/supabase/server";
import { formatLong, formatShort, money } from "@/lib/dates";
import { getOrderPaymentState, squareConfigured } from "@/lib/square";
import PayButton from "./PayButton";

export const dynamic = "force-dynamic";

/**
 * Catches up with Square when a parent returns from checkout.
 *
 * Marking an order paid used to happen only in the webhook. When the webhook
 * doesn't arrive the money is gone and the site never notices, so the parent
 * is invited to pay a second time. This asks Square itself and writes the same
 * rows the webhook would, so a missing webhook costs a round trip rather than
 * a double payment. Every write is idempotent, exactly as in the webhook.
 */
async function confirmWithSquare(
  db: ReturnType<typeof createAdminClient>,
  parentId: string
): Promise<void> {
  if (!squareConfigured()) return;

  const { data: pending } = await db
    .from("payments")
    .select("square_order_id")
    .eq("parent_id", parentId)
    .eq("status", "pending")
    .not("square_order_id", "is", null);

  const squareOrderIds = [...new Set((pending ?? []).map((p) => p.square_order_id))];

  for (const squareOrderId of squareOrderIds) {
    try {
      const state = await getOrderPaymentState(squareOrderId as string);
      if (!state.paid) continue;

      const { data: rows } = await db
        .from("payments").select("order_id").eq("square_order_id", squareOrderId);
      const orderIds = (rows ?? []).map((r) => r.order_id).filter(Boolean);
      if (!orderIds.length) continue;

      await db
        .from("payments")
        .update({
          status: "paid",
          paid_at: state.paidAt ?? new Date().toISOString(),
          square_payment_id: state.paymentId,
        })
        .eq("square_order_id", squareOrderId)
        .eq("status", "pending");

      await db
        .from("orders")
        .update({ payment_status: "paid" })
        .in("id", orderIds)
        .neq("payment_status", "refunded");
    } catch (e: any) {
      // Square unreachable or the order is gone. The page below then tells the
      // parent we are still confirming rather than asking them to pay again.
      console.error("Could not confirm Square order", squareOrderId, e?.message);
    }
  }
}

/**
 * The page a parent reaches from the link in their email. The token in the URL
 * is the only credential — it shows one family's orders and nothing else.
 */
export default async function PayPage({
  params, searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ paid?: string }>;
}) {
  const { token } = await params;
  const { paid } = await searchParams;
  const supabase = createAdminClient();

  const { data: parent } = await supabase
    .from("parents").select("id, first_name, pay_token").eq("pay_token", token).maybeSingle();

  if (!parent) {
    return (
      <>
        <Nav />
        <main className="mx-auto max-w-lg px-5 py-24 text-center">
          <h1 className="text-2xl">This link isn&rsquo;t valid</h1>
          <p className="mt-3 text-muted">
            It may have been mistyped or replaced by a newer email. Search your inbox for
            the most recent message, or contact the school office.
          </p>
        </main>
      </>
    );
  }

  // Returning from Square: catch up before deciding what to show, so the page
  // never contradicts itself by thanking them and billing them at once.
  if (paid) await confirmWithSquare(supabase, parent.id);

  const { data: rows } = await supabase
    .from("admin_orders").select("*").eq("parent_id", parent.id).order("delivery_date");

  const orders = (rows ?? []).filter((o) => o.status !== "cancelled");
  // "pending" only means a Square link was once generated for this order, not
  // that money is on its way. A parent who opened checkout and changed their
  // mind must still be able to pay, so pending counts as owing. Anything truly
  // settled is marked "paid" by the Square webhook and drops out here.
  const unpaid = orders.filter(
    (o) => o.payment_status === "unpaid" || o.payment_status === "pending"
  );
  const owed = unpaid.reduce((s, o) => s + o.amount_cents, 0);

  return (
    <>
      <Nav />
      <main className="mx-auto max-w-2xl px-5 py-12">
        <p className="eyebrow">Hello {parent.first_name}</p>
        <h1 className="mt-3 text-3xl md:text-4xl">Your birthday orders</h1>
        <SprinkleRule width={150} className="mt-4" />

        {paid && unpaid.length === 0 && (
          <div className="mt-8 rounded-card border border-pistachio/30 bg-pistachiol px-5 py-4">
            <p className="font-semibold">Payment received — thank you.</p>
          </div>
        )}

        {paid && unpaid.length > 0 && (
          <div className="mt-8 rounded-card border border-honey/40 bg-honey/10 px-5 py-4">
            <p className="font-semibold">We&rsquo;re still confirming your payment.</p>
            <p className="mt-1 text-sm leading-relaxed text-muted">
              Square has your payment but we haven&rsquo;t been able to match it here yet.
              Refresh this page in a minute. Please don&rsquo;t pay again — if it still
              looks wrong, contact the school office and we&rsquo;ll sort it out.
            </p>
          </div>
        )}

        {/* Never offered straight after checkout: a parent who has just paid must
            not be invited to pay twice while confirmation is still catching up. */}
        {unpaid.length > 0 && !paid && (
          <div className="card mt-8 flex flex-col items-start gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl">Payment due</h2>
              <p className="mt-1 text-muted">
                {unpaid.length} {unpaid.length === 1 ? "birthday" : "birthdays"} still to pay.
              </p>
            </div>
            <PayButton token={token} label={`Pay ${money(owed)}`} />
          </div>
        )}

        <ul className="mt-8 space-y-4">
          {orders.map((o) => (
            <li key={o.order_id} className="card p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-display text-lg">{o.child_first_name} {o.child_last_name}</p>
                  <p className="text-sm text-muted">
                    {o.school_name} · Grade {o.grade} · {o.teacher_name}
                  </p>
                </div>
                <span className={`pill ${o.payment_status === "paid"
                  ? "bg-pistachiol text-pistachio" : "bg-berryl text-berry"}`}>
                  {o.payment_status === "paid" ? "Paid" : money(o.amount_cents)}
                </span>
              </div>
              <dl className="mt-4 space-y-2 text-sm">
                <div className="flex justify-between gap-3">
                  <dt className="text-muted">Child&rsquo;s birthday</dt>
                  <dd className="font-mono">{formatShort(o.birthday)}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="font-semibold">School celebration</dt>
                  <dd className="font-mono font-medium text-berry">{formatLong(o.delivery_date)}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-muted">Mini doughnuts</dt>
                  <dd className="font-mono">{o.donut_count}</dd>
                </div>
              </dl>
              {o.celebration_reason && (
                <p className="mt-3 rounded-xl bg-paper px-4 py-3 text-sm text-muted">
                  {o.celebration_reason}.
                </p>
              )}
            </li>
          ))}
        </ul>

        <p className="mt-10 text-sm text-muted">
          Need to change a date, a quantity or a teacher&rsquo;s name? Contact the school
          office and they&rsquo;ll update it.
        </p>
      </main>
    </>
  );
}
