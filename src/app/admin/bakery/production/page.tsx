import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { SprinkleRule } from "@/components/SprinkleRule";
import PrintButton from "./PrintButton";
import { formatLong, toISO } from "@/lib/dates";
import type { BakeryOrder } from "@/lib/types";

export const dynamic = "force-dynamic";

/** The sheet that gets printed and taped up in the kitchen each morning. */
export default async function ProductionSheet({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const { date } = await searchParams;
  const day = date || toISO(new Date());

  const supabase = await createClient();
  const { data } = await supabase
    .from("bakery_orders")
    .select("*")
    .eq("delivery_date", day)
    .order("school_name");
  const orders = (data ?? []) as BakeryOrder[];

  const bySchool = new Map<string, BakeryOrder[]>();
  for (const o of orders) {
    const key = o.school_name;
    bySchool.set(key, [...(bySchool.get(key) ?? []), o]);
  }
  const total = orders.reduce((s, o) => s + o.donut_count, 0);

  return (
    <main className="mx-auto max-w-3xl px-5 py-10">
      <div className="no-print mb-8 flex flex-wrap items-center justify-between gap-3">
        <Link href="/admin/bakery" className="eyebrow">← Back to orders</Link>
        <form className="flex items-center gap-2">
          <label className="text-sm text-muted" htmlFor="date">Sheet for</label>
          <input id="date" name="date" type="date" defaultValue={day} className="field w-auto !py-2 text-sm" />
          <button className="btn-quiet !py-2 text-sm">Show</button>
        </form>
      </div>

      <header>
        <p className="eyebrow">Manna Bakehouse · daily production</p>
        <h1 className="mt-2 text-3xl">{formatLong(day)}</h1>
        <SprinkleRule width={200} className="mt-3" />
      </header>

      {orders.length === 0 ? (
        <p className="mt-10 text-muted">No deliveries scheduled for this day.</p>
      ) : (
        <div className="mt-10 space-y-8">
          {[...bySchool.entries()].map(([schoolName, list]) => (
            <section key={schoolName} className="card p-6">
              <h2 className="font-mono text-sm uppercase tracking-wider">School: {schoolName}</h2>
              <div className="mt-5 space-y-6">
                {list.map((o) => (
                  <article key={o.order_id} className="border-l-2 border-honey pl-4">
                    <p className="font-display text-lg">{o.child_first_name} {o.child_last_name}</p>
                    <p className="text-sm text-muted">Grade {o.grade} — {o.teacher_name}</p>
                    <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 font-mono text-sm">
                      <dt className="text-muted">Mini doughnuts</dt>
                      <dd className="font-medium">{o.donut_count}</dd>
                      <dt className="text-muted">Type</dt>
                      <dd>{o.package_name}</dd>
                      <dt className="text-muted">Allergies</dt>
                      <dd className={o.allergy_notes ? "font-medium text-berry" : ""}>
                        {o.allergy_notes || "None"}
                      </dd>
                      {o.special_instructions && (
                        <>
                          <dt className="text-muted">Notes</dt>
                          <dd>{o.special_instructions}</dd>
                        </>
                      )}
                    </dl>
                  </article>
                ))}
              </div>
              <p className="mt-5 border-t border-line pt-3 font-mono text-sm">
                {schoolName} subtotal: {list.reduce((s, o) => s + o.donut_count, 0)} mini doughnuts
              </p>
            </section>
          ))}

          <div className="rounded-card border-2 border-ink p-6 text-center">
            <p className="eyebrow">Total mini doughnuts needed today</p>
            <p className="mt-2 font-display text-5xl">{total}</p>
          </div>
        </div>
      )}

      <PrintButton />
    </main>
  );
}
