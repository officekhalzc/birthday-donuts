import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { suggestCelebrationDate } from "@/lib/dates";
import { createPaymentLink, squareConfigured } from "@/lib/square";

const str = (v: unknown, max = 200) =>
  typeof v === "string" ? v.trim().slice(0, max) : "";

/**
 * The public registration form posts here. There is no login, so this route
 * uses the service-role key and validates everything itself. A parent is
 * recognised by email address: registering again adds to the same record.
 */
export async function POST(request: Request) {
  const supabase = createAdminClient();
  const body = await request.json();
  const { parent, children } = body;

  const email = str(parent?.email, 160).toLowerCase();
  const firstName = str(parent?.first_name, 80);
  const lastName = str(parent?.last_name, 80);
  const phone = str(parent?.phone, 40);

  if (!firstName || !lastName || !email.includes("@")) {
    return NextResponse.json({ error: "Please fill in your name and a valid email address." }, { status: 400 });
  }
  if (!Array.isArray(children) || children.length === 0 || children.length > 12) {
    return NextResponse.json({ error: "Add at least one child." }, { status: 400 });
  }

  const { data: year } = await supabase
    .from("school_years").select("id, label, starts_on, ends_on").eq("is_active", true).single();
  if (!year) {
    return NextResponse.json({ error: "Registration is not open yet. Please contact the school office." }, { status: 400 });
  }

  const { data: noSchool } = await supabase
    .from("no_school_dates").select("date, reason, school_id").eq("school_year_id", year.id);

  // A single-product program: everyone gets the one active package.
  const { data: pkg } = await supabase
    .from("packages").select("id, name, price_cents, per_item_cents")
    .eq("is_active", true).order("sort_order").limit(1).maybeSingle();
  if (!pkg) {
    return NextResponse.json({ error: "No product is set up yet. Please contact the school office." }, { status: 400 });
  }

  // Find this parent, or create them.
  const { data: existing } = await supabase
    .from("parents").select("id, pay_token").ilike("email", email).maybeSingle();

  let parentRow = existing;
  if (!parentRow) {
    const { data: created, error } = await supabase
      .from("parents")
      .insert({ first_name: firstName, last_name: lastName, email, phone })
      .select("id, pay_token")
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    parentRow = created;
  } else {
    await supabase.from("parents").update({ phone }).eq("id", parentRow.id);
  }

  const summaries: any[] = [];

  for (const c of children) {
    const quantity = Math.max(1, Math.min(200, Number(c?.quantity) || 0));
    const childFirst = str(c?.first_name, 80);
    const childLast = str(c?.last_name, 80);
    const birthday = str(c?.birthday, 10);
    if (!childFirst || !childLast || !/^\d{4}-\d{2}-\d{2}$/.test(birthday)) {
      return NextResponse.json({ error: "Each child needs a name and a birthday." }, { status: 400 });
    }

    const { data: child, error: childErr } = await supabase
      .from("children")
      .insert({
        parent_id: parentRow.id,
        first_name: childFirst,
        last_name: childLast,
        birthday,
        allergy_notes: str(c?.allergy_notes, 300) || null,
        notes: str(c?.notes, 500) || null,
      })
      .select("id, first_name")
      .single();
    if (childErr) return NextResponse.json({ error: childErr.message }, { status: 400 });

    const celebration = suggestCelebrationDate(birthday, year, noSchool ?? [], c.school_id);

    const { data: reg, error: regErr } = await supabase
      .from("registrations")
      .insert({
        school_year_id: year.id,
        child_id: child.id,
        school_id: c.school_id,
        grade: str(c?.grade, 40),
        teacher_name: str(c?.teacher_name, 100),
        package_id: pkg.id,
        quantity,
        celebration_date: celebration.date,
        celebration_source: "auto",
        celebration_reason: celebration.reason,
        payment_plan: "annual",
      })
      .select("id")
      .single();
    if (regErr) return NextResponse.json({ error: regErr.message }, { status: 400 });

    const amount = pkg.per_item_cents > 0 ? pkg.per_item_cents * quantity : pkg.price_cents;

    const { data: order, error: orderErr } = await supabase
      .from("orders")
      .insert({
        registration_id: reg.id,
        school_year_id: year.id,
        delivery_date: celebration.date,
        donut_count: quantity,
        amount_cents: amount,
      })
      .select("id")
      .single();
    if (orderErr) return NextResponse.json({ error: orderErr.message }, { status: 400 });

    const { data: school } = await supabase
      .from("schools").select("name").eq("id", c.school_id).single();

    summaries.push({
      order_id: order.id,
      child_first_name: child.first_name,
      school_name: school?.name ?? "",
      grade: str(c?.grade, 40),
      teacher_name: str(c?.teacher_name, 100),
      birthday,
      delivery_date: celebration.date,
      donut_count: quantity,
      package_name: pkg.name,
      amount_cents: amount,
    });
  }

  // ---- payment ----
  // Registration and payment are one step: the family goes straight to Square
  // from here. The orders exist but stay unpaid, and the bakery never sees an
  // unpaid order, so an abandoned checkout costs nobody a doughnut.
  if (!squareConfigured()) {
    return NextResponse.json(
      { error: "Card payments aren't switched on yet. Please contact the school office." },
      { status: 503 }
    );
  }

  const site = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ?? new URL(request.url).origin;

  let link;
  try {
    link = await createPaymentLink({
      referenceId: parentRow.id,
      buyerEmail: email,
      redirectUrl: `${site}/register/done`,
      paymentNote: `Birthday doughnuts — ${firstName} ${lastName}`,
      lineItems: summaries.map((s) => ({
        name: `${s.child_first_name} — ${s.package_name}`,
        amountCents: s.amount_cents,
        note: `${s.school_name} · Delivery ${s.delivery_date}`,
      })),
    });
  } catch (e: any) {
    console.error("Square createPaymentLink failed during registration:", e?.message);
    return NextResponse.json(
      { error: "We couldn't open the payment page. Nothing has been charged — please try again, or contact the school office." },
      { status: 502 }
    );
  }

  await supabase.from("payments").insert(
    summaries.map((s) => ({
      parent_id: parentRow.id,
      school_year_id: year.id,
      order_id: s.order_id,
      plan: "annual",
      amount_cents: s.amount_cents,
      status: "pending",
      square_order_id: link.orderId,
      square_payment_link_id: link.paymentLinkId,
    }))
  );

  await supabase
    .from("orders")
    .update({ payment_status: "pending" })
    .in("id", summaries.map((s) => s.order_id));

  // The confirmation email is sent by the Square webhook once the money has
  // actually cleared, so a family that abandons checkout is never told they
  // are registered.
  return NextResponse.json({ url: link.url, count: summaries.length });
}
