import { AdminNav } from "@/components/AdminNav";
import { SprinkleRule } from "@/components/SprinkleRule";
import { createClient } from "@/lib/supabase/server";
import OneTimeForm from "./OneTimeForm";

export const dynamic = "force-dynamic";

/**
 * Entering a birthday that came in outside the monthly ordering window.
 *
 * These arrive by email, so nothing exists in the system for them and the
 * office has no link to send. This puts the order in and gives the family's
 * payment link straight back.
 */
export default async function OneTimeOrderPage() {
  const supabase = await createClient();

  const { data: year } = await supabase
    .from("school_years").select("id, label").eq("is_active", true).maybeSingle();

  const { data: schools } = await supabase
    .from("schools").select("id, name").order("name");

  const { data: pkg } = await supabase
    .from("packages")
    .select("per_item_cents")
    .eq("is_active", true)
    .order("sort_order")
    .limit(1)
    .maybeSingle();

  return (
    <>
      <AdminNav />
      <main className="mx-auto max-w-3xl px-5 py-10">
        <p className="eyebrow">School year {year?.label ?? "—"}</p>
        <h1 className="mt-3 text-3xl md:text-4xl">One-time order</h1>
        <SprinkleRule width={150} className="mt-4" />
        <p className="mt-5 max-w-xl leading-relaxed text-muted">
          For a birthday arranged outside the monthly ordering window. This creates
          the order and gives you a payment link to send the family.
        </p>

        {!year ? (
          <div className="card mt-8 p-6">
            <p className="font-semibold">No school year is marked active.</p>
            <p className="mt-2 leading-relaxed text-muted">
              An order has to belong to a school year. Set one active under School
              years, then come back.
            </p>
          </div>
        ) : (
          <OneTimeForm
            schools={schools ?? []}
            perItemCents={pkg?.per_item_cents ?? 0}
          />
        )}
      </main>
    </>
  );
}
