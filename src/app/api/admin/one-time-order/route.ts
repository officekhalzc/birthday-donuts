import { NextResponse } from "next/server";
import { createClient, getProfile } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/email/send";
import { templates } from "@/lib/email/templates";
import {
  displayName,
  isCalendarDate,
  orderAmountCents,
  parseQuantity,
  splitPersonName,
  MAX_ONE_TIME_QUANTITY,
} from "@/lib/one-time-order";

const clip = (value: unknown, max: number) =>
  typeof value === "string" ? value.trim().slice(0, max) : "";

/**
 * Staff enter one order outside the public registration form.
 *
 * That form is not called from here. It moves the celebration off Shabbos,
 * Sunday, and vacation days, and it can charge immediately when
 * PAYMENT_MODE=square. This route keeps the date exactly as typed, leaves the
 * order unpaid, and hands back the family's existing /pay/[token] link.
 */
export async function POST(request: Request) {
  const profile = await getProfile();
  if (profile?.role !== "admin") {
    return NextResponse.json({ error: "Administrators only." }, { status: 403 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "That request could not be read." }, { status: 400 });
  }

  const email = clip(body.parent_email, 160).toLowerCase();
  const parentName = splitPersonName(clip(body.parent_name, 160));
  const childName = splitPersonName(clip(body.child_name, 160));
  const schoolId = clip(body.school_id, 80);
  const deliveryDate = clip(body.delivery_date, 10);
  const birthdayRaw = clip(body.birthday, 10);
  const grade = clip(body.grade, 40);
  const teacher = clip(body.teacher_name, 100);
  const allergy = clip(body.allergy_notes, 300);
  const quantity = parseQuantity(body.quantity);

  if (!parentName.first_name || !email.includes("@") || /\s/.test(email)) {
    return NextResponse.json(
      { error: "Enter the parent's name and a valid email address." },
      { status: 400 }
    );
  }
  if (!childName.first_name) {
    return NextResponse.json({ error: "Enter the child's name." }, { status: 400 });
  }
  if (!schoolId) {
    return NextResponse.json({ error: "Choose a school." }, { status: 400 });
  }
  if (!isCalendarDate(deliveryDate)) {
    return NextResponse.json({ error: "Enter a delivery date." }, { status: 400 });
  }
  if (birthdayRaw && !isCalendarDate(birthdayRaw)) {
    return NextResponse.json({ error: "That birthday isn't a real date." }, { status: 400 });
  }
  if (quantity === null) {
    return NextResponse.json(
      { error: `Enter a quantity from 1 to ${MAX_ONE_TIME_QUANTITY}.` },
      { status: 400 }
    );
  }

  const supabase = await createClient();

  const { data: year, error: yearErr } = await supabase
    .from("school_years").select("id").eq("is_active", true).maybeSingle();
  if (yearErr || !year) {
    return NextResponse.json({ error: "There is no active school year yet." }, { status: 400 });
  }

  const { data: pkg, error: pkgErr } = await supabase
    .from("packages").select("id, name, price_cents, per_item_cents")
    .eq("is_active", true).order("sort_order").limit(1).maybeSingle();
  if (pkgErr || !pkg) {
    return NextResponse.json({ error: "No product is set up yet." }, { status: 400 });
  }

  const { data: school, error: schoolErr } = await supabase
    .from("schools").select("id, name").eq("id", schoolId).maybeSingle();
  if (schoolErr || !school) {
    return NextResponse.json({ error: "Choose a school." }, { status: 400 });
  }

  // Same parent record, and therefore the same pay link, when the email matches
  // regardless of case. A new family gets a new token. The name already on file
  // is left alone.
  const { data: existing, error: lookupErr } = await supabase
    .from("parents").select("id, pay_token").ilike("email", email).maybeSingle();
  if (lookupErr) return NextResponse.json({ error: lookupErr.message }, { status: 400 });

  let parentRow = existing;
  let parentMatched = Boolean(existing);

  if (!parentRow) {
    const { data: created, error } = await supabase
      .from("parents")
      .insert({
        first_name: parentName.first_name,
        last_name: parentName.last_name,
        email,
      })
      .select("id, pay_token")
      .single();
    if (error) {
      // Two people saved the same new email at once. Use the row that won.
      if (error.code === "23505") {
        const { data: again, error: againErr } = await supabase
          .from("parents").select("id, pay_token").ilike("email", email).maybeSingle();
        if (againErr || !again) {
          return NextResponse.json({ error: error.message }, { status: 400 });
        }
        parentRow = again;
        parentMatched = true;
      } else {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
    } else {
      parentRow = created;
    }
  }

  if (!parentRow?.id || !parentRow.pay_token) {
    return NextResponse.json({ error: "The parent record could not be saved." }, { status: 400 });
  }

  // Always a new child. A child can only have one registration per school year,
  // and a one-time order has to be able to sit beside the normal registration.
  const { data: child, error: childErr } = await supabase
    .from("children")
    .insert({
      parent_id: parentRow.id,
      first_name: childName.first_name,
      last_name: childName.last_name,
      birthday: birthdayRaw || null,
      allergy_notes: allergy || null,
    })
    .select("id")
    .single();
  if (childErr) {
    const needsBirthday = childErr.code === "23502" && /birthday/i.test(childErr.message);
    return NextResponse.json({
      error: needsBirthday
        ? "A birthday is still required by the database. Run supabase/migrations/003_optional_child_birthday.sql, or enter a birthday for this order."
        : childErr.message,
    }, { status: 400 });
  }

  const amount = orderAmountCents(pkg, quantity);

  const { data: reg, error: regErr } = await supabase
    .from("registrations")
    .insert({
      school_year_id: year.id,
      child_id: child.id,
      school_id: school.id,
      grade,
      teacher_name: teacher,
      package_id: pkg.id,
      quantity,
      // The typed date, not a suggested school day.
      celebration_date: deliveryDate,
      celebration_source: "admin",
      celebration_reason: "One-time order entered by the school office",
      payment_plan: "per_birthday",
      admin_notes: "One-time order",
    })
    .select("id")
    .single();
  if (regErr) {
    await supabase.from("children").delete().eq("id", child.id);
    return NextResponse.json({ error: regErr.message }, { status: 400 });
  }

  const { data: order, error: orderErr } = await supabase
    .from("orders")
    .insert({
      registration_id: reg.id,
      school_year_id: year.id,
      delivery_date: deliveryDate,
      donut_count: quantity,
      amount_cents: amount,
      payment_status: "unpaid",
    })
    .select("id")
    .single();
  if (orderErr) {
    await supabase.from("registrations").delete().eq("id", reg.id);
    await supabase.from("children").delete().eq("id", child.id);
    return NextResponse.json({ error: orderErr.message }, { status: 400 });
  }

  // Same unpaid confirmation public registration sends in invoice-later mode.
  // The order stays unpaid; the email says payment is due and links here.
  let confirmationEmail: "sent" | "skipped" | "failed" = "failed";
  if (parentRow.pay_token) {
    const summary = {
      child_first_name: childName.first_name,
      school_name: school.name,
      grade,
      teacher_name: teacher,
      birthday: birthdayRaw || null,
      delivery_date: deliveryDate,
      donut_count: quantity,
      package_name: pkg.name,
      amount_cents: amount,
    };
    const result = await sendEmail({
      to: email,
      template: "registration_confirmation",
      orderId: order.id,
      ...templates.registration_confirmation([summary], parentRow.pay_token, false),
    });
    confirmationEmail = result.ok ? ("skipped" in result && result.skipped ? "skipped" : "sent") : "failed";
  }

  return NextResponse.json({
    ok: true,
    order_id: order.id,
    pay_token: parentRow.pay_token,
    amount_cents: amount,
    quantity,
    delivery_date: deliveryDate,
    child_name: displayName(childName.first_name, childName.last_name),
    parent_email: email,
    parent_matched: parentMatched,
    package_name: pkg.name,
    confirmation_email: confirmationEmail,
  });
}
