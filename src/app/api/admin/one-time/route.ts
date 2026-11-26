import { NextResponse } from "next/server";
import { createClient, createAdminClient, getProfile } from "@/lib/supabase/server";

export const runtime = "nodejs";

/**
 * A one-time order, entered by the school office.
 *
 * Birthdays that arrive outside the monthly ordering window come in by email,
 * so there is no registration behind them and nothing for the office to send a
 * parent. This creates the same rows a parent registration would and hands
 * back the family's payment link.
 *
 * Unlike the parent form it does not work the celebration date out from the
 * birthday: the office has already agreed a date with the family, so it is
 * taken as given and recorded as set by the office.
 */

function str(v: unknown, max: number): string {
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export async function POST(request: Request) {
  const profile = await getProfile();
  if (profile?.role !== "admin") {
    return NextResponse.json({ error: "Administrators only." }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));

  const parentFirst = str(body.parent_first_name, 80);
  const parentLast = str(body.parent_last_name, 80);
  const email = str(body.email, 200).toLowerCase();
  const phone = str(body.phone, 40) || null;
  const childFirst = str(body.child_first_name, 80);
  const childLast = str(body.child_last_name, 80) || parentLast;
  const grade = str(body.grade, 40);
  const teacher = str(body.teacher_name, 100);
  const schoolId = str(body.school_id, 64);
  const allergy = str(body.allergy_notes, 300) || null;
  const notes = str(body.admin_notes, 500) || null;
  const celebrationDate = str(body.celebration_date, 10);
  const quantity = Math.max(1, Math.min(200, Number(body.quantity) || 0));

  if (!parentFirst || !parentLast) {
    return NextResponse.json({ error: "The parent needs a first and last name." }, { status: 400 });
  }
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return NextResponse.json({ error: "A valid parent email is needed for the payment link." }, { status: 400 });
  }
  if (!childFirst) {
    return NextResponse.json({ error: "The child needs a first name." }, { status: 400 });
  }
  if (!ISO_DATE.test(celebrationDate)) {
    return NextResponse.json({ error: "Pick the date the doughnuts should arrive." }, { status: 400 });
  }
  if (!schoolId) {
    return NextResponse.json({ error: "Pick a school." }, { status: 400 });
  }
  if (!Number(body.quantity)) {
    return NextResponse.json({ error: "How many mini doughnuts?" }, { status: 400 });
  }

  // The admin client is used for the writes: the office is already verified
  // above, and row level security is written for parents, not staff inserts.
  const db = createAdminClient();
  const sessionDb = await createClient();

  const { data: year } = await sessionDb
    .from("school_years").select("id, label").eq("is_active", true).single();
  if (!year) {
    return NextResponse.json(
      { error: "No school year is marked active, so there is nothing to file this against." },
      { status: 400 }
    );
  }

  const { data: pkg } = await db
    .from("packages")
    .select("id, price_cents, per_item_cents")
    .eq("is_active", true)
    .order("sort_order")
    .limit(1)
    .maybeSingle();
  if (!pkg) {
    return NextResponse.json({ error: "No active package, so there is no price to charge." }, { status: 400 });
  }

  // Reuse the family if we already know this email — one payment link per
  // family is the whole point, and a second parent row would split it in two.
  let { data: parent } = await db
    .from("parents").select("id, pay_token").ilike("email", email).maybeSingle();

  if (!parent) {
    const { data: created, error } = await db
      .from("parents")
      .insert({ first_name: parentFirst, last_name: parentLast, email, phone })
      .select("id, pay_token")
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    parent = created;
  } else if (phone) {
    await db.from("parents").update({ phone }).eq("id", parent.id);
  }

  // A child already registered this year cannot take a second registration —
  // the table forbids it — so reuse that child only when the year is free.
  const { data: existingChildren } = await db
    .from("children")
    .select("id, registrations(school_year_id)")
    .eq("parent_id", parent.id)
    .ilike("first_name", childFirst)
    .ilike("last_name", childLast);

  const reusable = (existingChildren ?? []).find(
    (c: any) => !(c.registrations ?? []).some((r: any) => r.school_year_id === year.id)
  );

  let childId = reusable?.id as string | undefined;

  if (!childId) {
    const { data: child, error } = await db
      .from("children")
      .insert({
        parent_id: parent.id,
        first_name: childFirst,
        last_name: childLast,
        // The office often doesn't have the birthday for a one-off. The
        // celebration date is the honest stand-in: it is the day that matters.
        birthday: ISO_DATE.test(str(body.birthday, 10)) ? str(body.birthday, 10) : celebrationDate,
        allergy_notes: allergy,
      })
      .select("id")
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    childId = child.id;
  } else if (allergy) {
    await db.from("children").update({ allergy_notes: allergy }).eq("id", childId);
  }

  const { data: reg, error: regErr } = await db
    .from("registrations")
    .insert({
      school_year_id: year.id,
      child_id: childId,
      school_id: schoolId,
      grade: grade || "—",
      teacher_name: teacher || "—",
      package_id: pkg.id,
      quantity,
      celebration_date: celebrationDate,
      celebration_source: "admin",
      celebration_reason: "One-time order arranged with the school office",
      payment_plan: "per_birthday",
      admin_notes: notes,
    })
    .select("id")
    .single();
  if (regErr) return NextResponse.json({ error: regErr.message }, { status: 400 });

  const amountCents = pkg.per_item_cents > 0 ? pkg.per_item_cents * quantity : pkg.price_cents;

  const { data: order, error: orderErr } = await db
    .from("orders")
    .insert({
      registration_id: reg.id,
      school_year_id: year.id,
      delivery_date: celebrationDate,
      donut_count: quantity,
      amount_cents: amountCents,
      payment_status: "unpaid",
    })
    .select("id")
    .single();
  if (orderErr) return NextResponse.json({ error: orderErr.message }, { status: 400 });

  const site = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ?? new URL(request.url).origin;

  return NextResponse.json({
    ok: true,
    order_id: order.id,
    amount_cents: amountCents,
    pay_url: `${site}/pay/${parent.pay_token}`,
  });
}
