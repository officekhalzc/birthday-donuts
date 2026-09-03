import { NextResponse } from "next/server";
import { createClient, getProfile } from "@/lib/supabase/server";
import { suggestCelebrationDate } from "@/lib/dates";

/**
 * Starts a new school year and carries every family forward.
 * Parents keep their account and their children; the office updates grades
 * and teachers afterwards rather than making families type it all again.
 */
export async function POST(request: Request) {
  const profile = await getProfile();
  if (profile?.role !== "admin") {
    return NextResponse.json({ error: "Administrators only." }, { status: 403 });
  }

  const supabase = await createClient();
  const { label, starts_on, ends_on, copy_from_year_id } = await request.json();

  const { data: year, error: yearErr } = await supabase
    .from("school_years")
    .insert({ label, starts_on, ends_on, is_active: false })
    .select("id, label, starts_on, ends_on")
    .single();
  if (yearErr) return NextResponse.json({ error: yearErr.message }, { status: 400 });

  let copied = 0;

  if (copy_from_year_id) {
    const { data: previous } = await supabase
      .from("registrations")
      .select("*")
      .eq("school_year_id", copy_from_year_id);

    const { data: children } = await supabase.from("children").select("id, birthday");
    const birthdays = new Map((children ?? []).map((c) => [c.id, c.birthday]));

    const { data: packages } = await supabase
      .from("packages").select("id, price_cents, per_item_cents");

    for (const r of previous ?? []) {
      const birthday = birthdays.get(r.child_id);
      if (!birthday) continue;

      const celebration = suggestCelebrationDate(birthday, year, [], r.school_id);
      const { data: reg, error } = await supabase
        .from("registrations")
        .insert({
          school_year_id: year.id,
          child_id: r.child_id,
          school_id: r.school_id,
          grade: r.grade,               // office bumps these up afterwards
          teacher_name: r.teacher_name,
          package_id: r.package_id,
          quantity: r.quantity,
          celebration_date: celebration.date,
          celebration_reason: celebration.reason,
          payment_plan: r.payment_plan,
        })
        .select("id")
        .single();
      if (error) continue;

      const pkg = packages?.find((p) => p.id === r.package_id);
      const count = r.quantity;
      await supabase.from("orders").insert({
        registration_id: reg.id,
        school_year_id: year.id,
        delivery_date: celebration.date,
        donut_count: count,
        amount_cents: pkg ? (pkg.per_item_cents > 0 ? pkg.per_item_cents * count : pkg.price_cents) : 0,
      });
      copied++;
    }
  }

  return NextResponse.json({ ok: true, school_year_id: year.id, copied });
}
