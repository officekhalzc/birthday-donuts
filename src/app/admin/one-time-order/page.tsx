import { AdminNav } from "@/components/AdminNav";
import { SprinkleRule } from "@/components/SprinkleRule";
import { createClient } from "@/lib/supabase/server";
import OneTimeOrderForm from "./OneTimeOrderForm";

export const dynamic = "force-dynamic";

export default async function OneTimeOrderPage() {
  const supabase = await createClient();

  const [{ data: schools }, { data: pkg }, { data: year }] = await Promise.all([
    supabase.from("schools").select("id, name").eq("is_active", true).order("name"),
    supabase.from("packages").select("name, price_cents, per_item_cents")
      .eq("is_active", true).order("sort_order").limit(1).maybeSingle(),
    supabase.from("school_years").select("label").eq("is_active", true).maybeSingle(),
  ]);

  const ready = Boolean(year && pkg && (schools?.length ?? 0) > 0);

  return (
    <>
      <AdminNav />
      <main className="mx-auto max-w-3xl px-5 py-10">
        <p className="eyebrow">School year {year?.label ?? "—"}</p>
        <h1 className="mt-3 text-3xl md:text-4xl">One-time order</h1>
        <SprinkleRule width={150} className="mt-4" />
        <p className="mt-4 max-w-2xl text-muted">
          For a family ordering outside the normal registration. The delivery
          date is kept exactly as you enter it. Nothing is charged yet — copy
          the payment link and send it when you are ready to invoice.
        </p>

        {ready && pkg ? (
          <OneTimeOrderForm schools={schools ?? []} pricing={pkg} />
        ) : (
          <p className="card mt-8 p-6 text-muted">
            This needs an active school year, an active package, and at least one
            school before an order can be entered.
          </p>
        )}
      </main>
    </>
  );
}
