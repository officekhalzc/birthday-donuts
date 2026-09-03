import Link from "next/link";
import { AdminNav } from "@/components/AdminNav";
import { SprinkleRule } from "@/components/SprinkleRule";
import { createClient } from "@/lib/supabase/server";
import { formatLong, toISO, addDays } from "@/lib/dates";
import type { BakeryOrder } from "@/lib/types";
import StatusControl from "./StatusControl";

export const dynamic = "force-dynamic";

export default async function BakeryPage() {
  const supabase = await createClient();
  const today = toISO(new Date());

  // The kitchen view carries no parent contact details and no money.
  const { data } = await supabase
    .from("bakery_orders")
    .select("*")
    .gte("delivery_date", today)
    .lte("delivery_date", addDays(today, 60))
    .order("delivery_date");
  const orders = (data ?? []) as BakeryOrder[];

  const days = new Map<string, BakeryOrder[]>();
  for (const o of orders) {
    days.set(o.delivery_date, [...(days.get(o.delivery_date) ?? []), o]);
  }

  return (
    <>
      <AdminNav />
      <main className="mx-auto max-w-5xl px-5 py-10">
        <p className="eyebrow">Manna Bakehouse</p>
        <h1 className="mt-3 text-3xl md:text-4xl">Upcoming birthday orders</h1>
        <SprinkleRule width={160} className="mt-4" />

        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/admin/bakery/production" className="btn-primary">Today&rsquo;s production sheet</Link>
          <Link href={`/admin/bakery/production?date=${addDays(today, 1)}`} className="btn-quiet">Tomorrow&rsquo;s sheet</Link>
        </div>

        {days.size === 0 && (
          <div className="card mt-8 p-10 text-center text-muted">
            No deliveries scheduled in the next 60 days.
          </div>
        )}

        <div className="mt-10 space-y-10">
          {[...days.entries()].map(([date, list]) => (
            <section key={date}>
              <div className="flex flex-wrap items-baseline justify-between gap-3">
                <h2 className="text-2xl">{formatLong(date)}</h2>
                <p className="font-mono text-sm text-muted">
                  {list.reduce((s, o) => s + o.donut_count, 0)} mini doughnuts ·{" "}
                  <Link href={`/admin/bakery/production?date=${date}`} className="underline decoration-honey decoration-2 underline-offset-4">
                    print sheet
                  </Link>
                </p>
              </div>

              <ul className="mt-4 space-y-4">
                {list.map((o) => (
                  <li key={o.order_id} className="card p-5">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <p className="font-display text-lg">
                          {o.child_first_name} {o.child_last_name}
                        </p>
                        <p className="text-sm text-muted">
                          {o.school_short_name ?? o.school_name} · Grade {o.grade} · {o.teacher_name}
                        </p>
                        <p className="mt-3 font-mono text-sm">
                          {o.donut_count} × {o.package_name}
                        </p>
                        {o.allergy_notes && (
                          <p className="mt-3 inline-block rounded-pill bg-berryl px-3 py-1 text-sm font-semibold text-berry">
                            Allergy: {o.allergy_notes}
                          </p>
                        )}
                        {o.special_instructions && (
                          <p className="mt-2 text-sm text-muted">{o.special_instructions}</p>
                        )}
                      </div>
                      <StatusControl orderId={o.order_id} status={o.status} />
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </main>
    </>
  );
}
