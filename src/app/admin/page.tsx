import { AdminNav } from "@/components/AdminNav";
import { SprinkleRule } from "@/components/SprinkleRule";
import { createClient } from "@/lib/supabase/server";
import { toISO, addDays, money } from "@/lib/dates";
import type { AdminOrder } from "@/lib/types";
import AdminClient from "./AdminClient";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const supabase = await createClient();

  const { data: year } = await supabase
    .from("school_years").select("id, label, starts_on, ends_on").eq("is_active", true).single();

  const { data } = await supabase
    .from("admin_orders")
    .select("*")
    .eq("school_year_id", year?.id ?? "")
    .order("delivery_date");
  const orders = (data ?? []) as AdminOrder[];

  const { data: packages } = await supabase
    .from("packages").select("id, name").order("sort_order");
  const { data: schools } = await supabase
    .from("schools").select("id, name").order("name");

  const today = toISO(new Date());
  const weekEnd = addDays(today, 7);
  const monthEnd = addDays(today, 30);
  const live = orders.filter((o) => o.status !== "cancelled");

  const stats = [
    { label: "Today", value: live.filter((o) => o.delivery_date === today).length },
    { label: "Next 7 days", value: live.filter((o) => o.delivery_date >= today && o.delivery_date <= weekEnd).length },
    { label: "Next 30 days", value: live.filter((o) => o.delivery_date >= today && o.delivery_date <= monthEnd).length },
    {
      label: "Unpaid",
      value: money(live.filter((o) => o.payment_status === "unpaid").reduce((s, o) => s + o.amount_cents, 0)),
    },
  ];

  return (
    <>
      <AdminNav />
      <main className="mx-auto max-w-7xl px-5 py-10">
        <p className="eyebrow">School year {year?.label ?? "—"}</p>
        <h1 className="mt-3 text-3xl md:text-4xl">Birthday orders</h1>
        <SprinkleRule width={150} className="mt-4" />

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((s) => (
            <div key={s.label} className="card p-5">
              <p className="eyebrow">{s.label}</p>
              <p className="mt-2 font-display text-3xl">{s.value}</p>
            </div>
          ))}
        </div>

        <AdminClient
          orders={orders}
          packages={packages ?? []}
          schools={schools ?? []}
          schoolYearId={year?.id ?? ""}
        />
      </main>
    </>
  );
}
