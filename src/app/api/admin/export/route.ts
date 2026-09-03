import { NextResponse } from "next/server";
import { createClient, getProfile } from "@/lib/supabase/server";

const COLUMNS = [
  "delivery_date", "birthday", "child_first_name", "child_last_name", "school_name",
  "grade", "teacher_name", "package_name",
  "donut_count", "quantity", "allergy_notes", "special_instructions",
  "status", "payment_status", "amount_cents",
  "parent_first_name", "parent_last_name", "parent_email", "parent_phone", "admin_notes",
];

const cell = (v: any) => {
  const s = v === null || v === undefined ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/** Downloads every order for a school year. Opens straight in Excel. */
export async function GET(request: Request) {
  const profile = await getProfile();
  if (profile?.role !== "admin") {
    return NextResponse.json({ error: "Administrators only." }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const supabase = await createClient();
  let query = supabase.from("admin_orders").select("*").order("delivery_date");

  const yearId = searchParams.get("school_year_id");
  if (yearId) query = query.eq("school_year_id", yearId);
  const from = searchParams.get("from");
  if (from) query = query.gte("delivery_date", from);
  const to = searchParams.get("to");
  if (to) query = query.lte("delivery_date", to);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  const rows = [COLUMNS.join(",")];
  for (const r of data ?? []) rows.push(COLUMNS.map((c) => cell((r as any)[c])).join(","));

  return new NextResponse(rows.join("\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="birthday-orders-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
