import Link from "next/link";
import { AdminNav } from "@/components/AdminNav";
import { SprinkleRule } from "@/components/SprinkleRule";
import { createClient } from "@/lib/supabase/server";
import RolloverForm from "./RolloverForm";

export const dynamic = "force-dynamic";

export default async function SchoolYearPage() {
  const supabase = await createClient();
  const { data: years } = await supabase
    .from("school_years").select("id, label, starts_on, ends_on, is_active").order("starts_on");

  return (
    <>
      <AdminNav />
      <main className="mx-auto max-w-3xl px-5 py-10">
        <Link href="/admin" className="eyebrow">← Birthday orders</Link>
        <h1 className="mt-4 text-3xl">School years</h1>
        <SprinkleRule width={130} className="mt-4" />

        <div className="card mt-8 divide-y divide-line">
          {(years ?? []).map((y) => (
            <div key={y.id} className="flex items-center justify-between gap-4 p-5">
              <div>
                <p className="font-semibold">{y.label}</p>
                <p className="font-mono text-sm text-muted">{y.starts_on} → {y.ends_on}</p>
              </div>
              {y.is_active && <span className="pill bg-pistachiol text-pistachio">Active</span>}
            </div>
          ))}
        </div>

        <RolloverForm years={years ?? []} />
      </main>
    </>
  );
}
