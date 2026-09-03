import { Nav } from "@/components/Nav";
import { SprinkleRule } from "@/components/SprinkleRule";
import { createAdminClient } from "@/lib/supabase/server";
import { formatLong, formatShort, money } from "@/lib/dates";
import PayButton from "./PayButton";

export const dynamic = "force-dynamic";

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

  const { data: rows } = await supabase
    .from("admin_orders").select("*").eq("parent_id", parent.id).order("delivery_date");

  const orders = (rows ?? []).filter((o) => o.status !== "cancelled");
  const unpaid = orders.filter((o) => o.payment_status === "unpaid");
  const owed = unpaid.reduce((s, o) => s + o.amount_cents, 0);

  return (
    <>
      <Nav />
      <main className="mx-auto max-w-2xl px-5 py-12">
        <p className="eyebrow">Hello {parent.first_name}</p>
        <h1 className="mt-3 text-3xl md:text-4xl">Your birthday orders</h1>
        <SprinkleRule width={150} className="mt-4" />

        {paid && (
          <div className="mt-8 rounded-card border border-pistachio/30 bg-pistachiol px-5 py-4">
            <p className="font-semibold">Payment received — thank you.</p>
          </div>
        )}

        {unpaid.length > 0 && (
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
