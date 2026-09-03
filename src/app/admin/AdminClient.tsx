"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { StatusPill, PaymentPill } from "@/components/StatusPill";
import { Sprinkle } from "@/components/SprinkleRule";
import { formatLong, formatShort, monthGrid, money, parseDate, toISO } from "@/lib/dates";
import { ORDER_STATUS_LABEL, STATUS_COLOR, type AdminOrder, type OrderStatus } from "@/lib/types";

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DOW = ["S", "M", "T", "W", "T", "F", "S"];

export default function AdminClient({
  orders, packages, schools, schoolYearId,
}: {
  orders: AdminOrder[];
  packages: { id: string; name: string }[];
  schools: { id: string; name: string }[];
  schoolYearId: string;
}) {
  const router = useRouter();
  const [view, setView] = useState<"list" | "calendar">("list");
  const [q, setQ] = useState("");
  const [school, setSchool] = useState("");
  const [status, setStatus] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [editing, setEditing] = useState<AdminOrder | null>(null);

  const today = toISO(new Date());
  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    return { year: d.getFullYear(), month: d.getMonth() };
  });

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return orders.filter((o) => {
      if (school && o.school_name !== school) return false;
      if (status && o.status !== status) return false;
      if (from && o.delivery_date < from) return false;
      if (to && o.delivery_date > to) return false;
      if (!needle) return true;
      return [
        o.child_first_name, o.child_last_name, o.parent_first_name, o.parent_last_name,
        o.parent_email, o.school_name, o.teacher_name, o.grade,
      ].filter(Boolean).join(" ").toLowerCase().includes(needle);
    });
  }, [orders, q, school, status, from, to]);

  const byDate = useMemo(() => {
    const map = new Map<string, AdminOrder[]>();
    for (const o of filtered) {
      const list = map.get(o.delivery_date) ?? [];
      list.push(o);
      map.set(o.delivery_date, list);
    }
    return map;
  }, [filtered]);

  const exportUrl = `/api/admin/export?school_year_id=${schoolYearId}${from ? `&from=${from}` : ""}${to ? `&to=${to}` : ""}`;

  return (
    <>
      {/* Controls */}
      <div className="mt-10 flex flex-wrap items-center gap-3">
        <div className="flex rounded-pill border border-line bg-white p-1">
          {(["list", "calendar"] as const).map((v) => (
            <button key={v} onClick={() => setView(v)}
              className={`rounded-pill px-4 py-1.5 text-sm font-semibold capitalize ${
                view === v ? "bg-ink text-white" : "text-muted hover:text-ink"
              }`}>
              {v}
            </button>
          ))}
        </div>

        <input className="field max-w-xs flex-1" placeholder="Search child, parent or teacher"
          value={q} onChange={(e) => setQ(e.target.value)} />

        <select className="field w-auto" value={school} onChange={(e) => setSchool(e.target.value)}>
          <option value="">All schools</option>
          {schools.map((s) => <option key={s.id} value={s.name}>{s.name}</option>)}
        </select>

        <select className="field w-auto" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">Any status</option>
          {Object.entries(ORDER_STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>

        <input type="date" className="field w-auto" value={from} onChange={(e) => setFrom(e.target.value)} aria-label="From date" />
        <input type="date" className="field w-auto" value={to} onChange={(e) => setTo(e.target.value)} aria-label="To date" />

        <a href={exportUrl} className="btn-quiet !py-2 text-sm">Export to CSV</a>
        <a href="/admin/bakery/production" className="btn-quiet !py-2 text-sm">Production sheet</a>
      </div>

      {/* List */}
      {view === "list" && (
        <div className="card mt-6 overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead>
              <tr className="border-b border-line text-left">
                {["Celebration", "Child", "School / class", "Mini doughnuts", "Package", "Allergies", "Status", "Payment", ""].map((h) => (
                  <th key={h} className="whitespace-nowrap px-4 py-3 font-mono text-[11px] uppercase tracking-wider text-muted">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {filtered.map((o) => (
                <tr key={o.order_id} className={o.delivery_date === today ? "bg-honey/5" : ""}>
                  <td className="whitespace-nowrap px-4 py-3">
                    <span className="font-mono">{formatShort(o.delivery_date)}</span>
                    {o.celebration_source === "admin" && (
                      <span className="ml-2 text-xs text-berry">set by office</span>
                    )}
                    <div className="text-xs text-muted">b. {formatShort(o.birthday)}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-semibold">{o.child_first_name} {o.child_last_name}</div>
                    <div className="text-xs text-muted">{o.parent_email}</div>
                  </td>
                  <td className="px-4 py-3">
                    {o.school_short_name ?? o.school_name}
                    <div className="text-xs text-muted">Grade {o.grade} · {o.teacher_name}</div>
                  </td>
                  <td className="px-4 py-3 font-mono">{o.donut_count}</td>
                  <td className="px-4 py-3">{o.package_name}</td>
                  <td className="px-4 py-3">
                    {o.allergy_notes
                      ? <span className="pill bg-berryl text-berry">{o.allergy_notes}</span>
                      : <span className="text-muted">None</span>}
                  </td>
                  <td className="px-4 py-3"><StatusPill status={o.status} /></td>
                  <td className="px-4 py-3"><PaymentPill status={o.payment_status} /></td>
                  <td className="px-4 py-3 text-right">
                    <button className="font-semibold text-berry hover:underline" onClick={() => setEditing(o)}>Edit</button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={9} className="px-4 py-12 text-center text-muted">
                  No orders match these filters. Clear the search to see everything.
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Calendar — a sprinkle per delivery, coloured by status */}
      {view === "calendar" && (
        <div className="card mt-6 p-5">
          <div className="mb-5 flex items-center justify-between">
            <button className="btn-quiet !px-4 !py-2 text-sm"
              onClick={() => setCursor((c) => c.month === 0 ? { year: c.year - 1, month: 11 } : { ...c, month: c.month - 1 })}>
              ← Previous
            </button>
            <h2 className="text-xl">{MONTHS[cursor.month]} {cursor.year}</h2>
            <button className="btn-quiet !px-4 !py-2 text-sm"
              onClick={() => setCursor((c) => c.month === 11 ? { year: c.year + 1, month: 0 } : { ...c, month: c.month + 1 })}>
              Next →
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center">
            {DOW.map((d, i) => (
              <div key={i} className="pb-2 font-mono text-[11px] uppercase text-muted">{d}</div>
            ))}
            {monthGrid(cursor.year, cursor.month).flat().map((iso) => {
              const inMonth = parseDate(iso).getMonth() === cursor.month;
              const list = byDate.get(iso) ?? [];
              return (
                <div key={iso}
                  className={`min-h-[92px] rounded-xl border p-2 text-left ${
                    iso === today ? "border-honey bg-honey/5" : "border-line"
                  } ${inMonth ? "bg-white" : "bg-paper/60"}`}>
                  <div className={`font-mono text-xs ${inMonth ? "" : "text-muted/50"}`}>
                    {Number(iso.slice(-2))}
                  </div>
                  <ul className="mt-1 space-y-1">
                    {list.slice(0, 3).map((o) => (
                      <li key={o.order_id}>
                        <button onClick={() => setEditing(o)}
                          className="flex w-full items-center gap-1.5 rounded-md px-1 py-0.5 text-left text-[11px] leading-tight hover:bg-paper">
                          <Sprinkle color={STATUS_COLOR[o.payment_status === "paid" ? "paid" : o.status]}
                            title={ORDER_STATUS_LABEL[o.status]} />
                          <span className="truncate">{o.child_first_name} · {o.donut_count}</span>
                        </button>
                      </li>
                    ))}
                    {list.length > 3 && (
                      <li className="px-1 text-[11px] text-muted">+{list.length - 3} more</li>
                    )}
                  </ul>
                </div>
              );
            })}
          </div>

          <div className="mt-5 flex flex-wrap gap-4 text-xs text-muted">
            {[["paid", "Paid"], ["unpaid", "Payment pending"], ["confirmed", "Confirmed"], ["delivered", "Delivered"]].map(([k, label]) => (
              <span key={k} className="flex items-center gap-1.5">
                <Sprinkle color={STATUS_COLOR[k]} /> {label}
              </span>
            ))}
          </div>
        </div>
      )}

      {editing && (
        <EditPanel order={editing} packages={packages}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); router.refresh(); }} />
      )}
    </>
  );
}

function EditPanel({
  order, packages, onClose, onSaved,
}: {
  order: AdminOrder;
  packages: { id: string; name: string }[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    celebration_date: order.delivery_date,
    quantity: order.quantity,
    grade: order.grade,
    teacher_name: order.teacher_name,
    status: order.status as OrderStatus,
    payment_status: order.payment_status,
    allergy_notes: order.allergy_notes ?? "",
    admin_notes: order.admin_notes ?? "",
    special_instructions: order.special_instructions ?? "",
  });
  const [busy, setBusy] = useState(false);

  async function save(extra: Record<string, any> = {}) {
    setBusy(true);
    await fetch("/api/admin/order", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        order_id: order.order_id,
        registration_id: order.registration_id,
        child_id: order.child_id,
        ...form,
        donut_count: form.quantity,
        ...extra,
      }),
    });
    setBusy(false);
    onSaved();
  }

  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-ink/30" onClick={onClose}>
      <div className="h-full w-full max-w-lg overflow-y-auto bg-paper p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="eyebrow">{order.school_name}</p>
            <h2 className="mt-2 text-2xl">{order.child_first_name} {order.child_last_name}</h2>
            <p className="text-sm text-muted">
              Birthday {formatLong(order.birthday)} · {order.package_name}
            </p>
          </div>
          <button onClick={onClose} className="btn-quiet !px-3 !py-1.5 text-sm">Close</button>
        </div>

        <div className="card mt-6 space-y-4 p-5">
          <div>
            <label className="label">Scheduled school celebration date</label>
            <input type="date" className="field" value={form.celebration_date}
              onChange={(e) => setForm({ ...form, celebration_date: e.target.value })} />
            <p className="mt-1.5 text-sm text-muted">
              Change this to combine birthdays or to move around a vacation day.
            </p>
          </div>

          <div>
            <label className="label">Mini doughnuts to bake</label>
            <input type="number" min={1} className="field" value={form.quantity}
              onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })} />
            <p className="mt-1.5 text-sm text-muted">
              This is the number Manna Bakehouse sees on the production sheet.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Grade</label>
              <input className="field" value={form.grade}
                onChange={(e) => setForm({ ...form, grade: e.target.value })} />
            </div>
            <div>
              <label className="label">Rebbe / teacher</label>
              <input className="field" value={form.teacher_name}
                onChange={(e) => setForm({ ...form, teacher_name: e.target.value })} />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Order status</label>
              <select className="field" value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value as OrderStatus })}>
                {Object.entries(ORDER_STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Payment</label>
              <select className="field" value={form.payment_status}
                onChange={(e) => setForm({ ...form, payment_status: e.target.value as any })}>
                <option value="unpaid">Payment due</option>
                <option value="pending">Payment processing</option>
                <option value="paid">Paid</option>
                <option value="refunded">Refunded</option>
              </select>
            </div>
          </div>

          <div>
            <label className="label">Allergy information</label>
            <input className="field" value={form.allergy_notes}
              onChange={(e) => setForm({ ...form, allergy_notes: e.target.value })} />
          </div>
          <div>
            <label className="label">Instructions for the bakery</label>
            <input className="field" value={form.special_instructions}
              onChange={(e) => setForm({ ...form, special_instructions: e.target.value })} />
          </div>
          <div>
            <label className="label">Office notes (parents never see these)</label>
            <textarea className="field" rows={3} value={form.admin_notes}
              onChange={(e) => setForm({ ...form, admin_notes: e.target.value })} />
          </div>
        </div>

        <div className="mt-5 rounded-card border border-line bg-white p-5 text-sm">
          <p className="font-semibold">Parent</p>
          <p className="mt-1 text-muted">
            {order.parent_first_name} {order.parent_last_name}<br />
            {order.parent_email}<br />
            {order.parent_phone}
          </p>
          <p className="mt-3 font-mono">{money(order.amount_cents)} · {order.payment_plan === "annual" ? "Paying yearly" : "Paying per birthday"}</p>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <button className="btn-primary flex-1" disabled={busy} onClick={() => save()}>
            {busy ? "Saving…" : "Save changes"}
          </button>
          <button className="btn-quiet" disabled={busy}
            onClick={() => save({ payment_status: "paid" })}>Mark paid</button>
          <button className="btn-quiet" disabled={busy}
            onClick={() => save({ refund: true })}>Issue refund</button>
          <button className="btn-quiet !text-berry" disabled={busy}
            onClick={() => save({ status: "cancelled" })}>Cancel order</button>
        </div>
      </div>
    </div>
  );
}
