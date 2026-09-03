import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { templates } from "@/lib/email/templates";
import { sendEmail, alreadySent } from "@/lib/email/send";
import { toISO, addDays } from "@/lib/dates";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Runs once a day (see vercel.json).
 *  - every day: reminders for celebrations seven days out
 *  - Sundays:   the week ahead for the office and for Manna Bakehouse
 */
export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Not allowed." }, { status: 401 });
  }

  const db = createAdminClient();
  const today = toISO(new Date());
  const inSevenDays = addDays(today, 7);
  const weekEnd = addDays(today, 7);
  let reminders = 0;

  // ---- parent reminders, seven days ahead ----
  const { data: soon } = await db
    .from("admin_orders")
    .select("*")
    .eq("delivery_date", inSevenDays)
    .neq("status", "cancelled");

  for (const o of soon ?? []) {
    if (!o.parent_email) continue;
    if (await alreadySent("upcoming_reminder", o.order_id)) continue;

    await sendEmail({
      to: o.parent_email,
      template: "upcoming_reminder",
      orderId: o.order_id,
      ...templates.upcoming_reminder(
        {
          child_first_name: o.child_first_name,
          school_name: o.school_name,
          grade: o.grade,
          teacher_name: o.teacher_name,
          birthday: o.birthday,
          delivery_date: o.delivery_date,
          donut_count: o.donut_count,
          package_name: o.package_name,
          amount_cents: o.amount_cents,
        },
        o.payment_status === "unpaid",
        o.pay_token
      ),
    });
    reminders++;
  }

  // ---- Sunday summaries ----
  const isSunday = new Date().getDay() === 0;
  if (isSunday) {
    const { data: week } = await db
      .from("admin_orders")
      .select("*")
      .gte("delivery_date", today)
      .lte("delivery_date", weekEnd)
      .neq("status", "cancelled")
      .order("delivery_date");

    const rows = (week ?? []).map((o) => ({
      child_first_name: o.child_first_name,
      school_name: o.school_short_name ?? o.school_name,
      grade: o.grade,
      teacher_name: o.teacher_name,
      birthday: o.birthday,
      delivery_date: o.delivery_date,
      donut_count: o.donut_count,
      package_name: o.package_name,
    }));

    if (process.env.ADMIN_EMAIL) {
      await sendEmail({
        to: process.env.ADMIN_EMAIL,
        template: "admin_weekly_summary",
        ...templates.admin_weekly_summary(rows),
      });
    }
    if (process.env.BAKERY_EMAIL && rows.length) {
      await sendEmail({
        to: process.env.BAKERY_EMAIL,
        template: "bakery_production_summary",
        ...templates.bakery_production_summary(rows),
      });
    }
  }

  return NextResponse.json({ ok: true, reminders, summaries: isSunday });
}
