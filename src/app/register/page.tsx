import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/server";
import { SprinkleRule } from "@/components/SprinkleRule";
import RegisterForm from "./RegisterForm";

export const dynamic = "force-dynamic";

export default async function RegisterPage() {
  const supabase = createAdminClient();

  const [{ data: schools }, { data: pricing }, { data: year }] = await Promise.all([
    supabase.from("schools").select("id, name, short_name").eq("is_active", true).order("name"),
    supabase.from("packages").select("price_cents, per_item_cents")
      .eq("is_active", true).order("sort_order").limit(1).maybeSingle(),
    supabase.from("school_years").select("id, label, starts_on, ends_on").eq("is_active", true).single(),
  ]);

  const { data: noSchool } = year
    ? await supabase.from("no_school_dates").select("date, reason, school_id").eq("school_year_id", year.id)
    : { data: [] as any[] };

  if (!year) {
    return (
      <main className="mx-auto max-w-lg px-5 py-24 text-center">
        <h1 className="text-2xl">Registration is not open yet</h1>
        <p className="mt-3 text-muted">
          The school year has not been set up. Please check back, or contact the school office.
        </p>
        <Link href="/" className="btn-quiet mt-6">Back to the homepage</Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl px-5 py-12">
      <Link href="/" className="eyebrow">← Birthday Mini Doughnuts</Link>
      <h1 className="mt-4 text-3xl md:text-4xl">Register your child</h1>
      <SprinkleRule width={160} className="mt-4" />
      <p className="mt-4 text-muted">
        School year {year.label}. You can add more than one child — you only fill in
        your own details once.
      </p>

      <RegisterForm
        schools={schools ?? []}
        pricing={pricing}
        year={year}
        noSchool={noSchool ?? []}
      />
    </main>
  );
}
