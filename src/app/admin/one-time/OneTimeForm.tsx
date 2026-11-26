"use client";

import { useState } from "react";
import Link from "next/link";
import { SprinkleRule } from "@/components/SprinkleRule";

type School = { id: string; name: string };

type Done = { pay_url: string; amount_cents: number; order_id: string };

function money(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

export default function OneTimeForm({
  schools, perItemCents,
}: {
  schools: School[];
  perItemCents: number;
}) {
  const [form, setForm] = useState({
    parent_first_name: "", parent_last_name: "", email: "", phone: "",
    child_first_name: "", child_last_name: "",
    school_id: schools[0]?.id ?? "", grade: "", teacher_name: "",
    celebration_date: "", quantity: "25",
    birthday: "", allergy_notes: "", admin_notes: "",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<Done | null>(null);
  const [copied, setCopied] = useState(false);

  const set = (k: string) => (e: any) => setForm({ ...form, [k]: e.target.value });

  const qty = Number(form.quantity) || 0;
  const preview = perItemCents > 0 && qty > 0 ? money(perItemCents * qty) : null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError(null);
    try {
      const res = await fetch("/api/admin/one-time", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, quantity: qty }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "That didn't save.");
      setDone(json);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function copy() {
    if (!done) return;
    try {
      await navigator.clipboard.writeText(done.pay_url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt("Copy this payment link:", done.pay_url);
    }
  }

  if (done) {
    return (
      <div className="card mt-8 p-6">
        <p className="eyebrow">Order created</p>
        <h2 className="mt-2 text-2xl">
          {form.child_first_name} {form.child_last_name || form.parent_last_name}
        </h2>
        <SprinkleRule width={140} className="mt-3" />

        <p className="mt-4 leading-relaxed text-muted">
          {qty} mini doughnuts for {form.celebration_date}, {money(done.amount_cents)} due.
          Send this link to {form.email} — it opens their own page with a button to pay by card.
        </p>

        <p className="mt-4 break-all rounded-xl bg-paper px-4 py-3 font-mono text-sm">
          {done.pay_url}
        </p>

        <div className="mt-5 flex flex-wrap gap-3">
          <button onClick={copy} className="btn-primary">
            {copied ? "Copied" : "Copy payment link"}
          </button>
          <button
            onClick={() => { setDone(null); setForm({ ...form, child_first_name: "", child_last_name: "", celebration_date: "", birthday: "", allergy_notes: "", admin_notes: "" }); }}
            className="btn-quiet"
          >
            Add another
          </button>
          <Link href="/admin" className="btn-quiet">Back to orders</Link>
        </div>

        <p className="mt-5 text-sm leading-relaxed text-muted">
          The link shows everything this family still owes, so if they have other
          unpaid birthdays those appear on it too.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="card mt-8 space-y-5 p-6">
      <div>
        <h2 className="text-xl">Parent</h2>
        <p className="mt-1 text-sm text-muted">
          The payment link belongs to the email, so an existing family is matched by it.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label">First name</label>
          <input className="field" required value={form.parent_first_name} onChange={set("parent_first_name")} />
        </div>
        <div>
          <label className="label">Last name</label>
          <input className="field" required value={form.parent_last_name} onChange={set("parent_last_name")} />
        </div>
        <div>
          <label className="label">Email</label>
          <input className="field" type="email" required value={form.email} onChange={set("email")} />
        </div>
        <div>
          <label className="label">Phone <span className="font-normal text-muted">(optional)</span></label>
          <input className="field" value={form.phone} onChange={set("phone")} />
        </div>
      </div>

      <div className="border-t border-line pt-5">
        <h2 className="text-xl">Child</h2>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label">First name</label>
          <input className="field" required value={form.child_first_name} onChange={set("child_first_name")} />
        </div>
        <div>
          <label className="label">Last name <span className="font-normal text-muted">(defaults to the parent&rsquo;s)</span></label>
          <input className="field" value={form.child_last_name} onChange={set("child_last_name")} />
        </div>
        <div>
          <label className="label">School</label>
          <select className="field" value={form.school_id} onChange={set("school_id")}>
            {schools.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Grade <span className="font-normal text-muted">(optional)</span></label>
          <input className="field" value={form.grade} onChange={set("grade")} />
        </div>
        <div className="sm:col-span-2">
          <label className="label">Rebbe / teacher <span className="font-normal text-muted">(optional)</span></label>
          <input className="field" value={form.teacher_name} onChange={set("teacher_name")} />
        </div>
      </div>

      <div className="border-t border-line pt-5">
        <h2 className="text-xl">The order</h2>
        <p className="mt-1 text-sm text-muted">
          This date is used exactly as entered — nothing is moved for Shabbos, Yom Tov
          or vacation, so check the school calendar first.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label">Delivery date</label>
          <input className="field" type="date" required value={form.celebration_date} onChange={set("celebration_date")} />
        </div>
        <div>
          <label className="label">Mini doughnuts</label>
          <input className="field" type="number" min={1} max={200} required value={form.quantity} onChange={set("quantity")} />
          {preview && <p className="mt-1.5 text-sm text-muted">Comes to <strong className="text-ink">{preview}</strong>.</p>}
        </div>
        <div>
          <label className="label">Birthday <span className="font-normal text-muted">(optional)</span></label>
          <input className="field" type="date" value={form.birthday} onChange={set("birthday")} />
        </div>
        <div>
          <label className="label">Allergy information <span className="font-normal text-muted">(optional)</span></label>
          <input className="field" value={form.allergy_notes} onChange={set("allergy_notes")} />
        </div>
        <div className="sm:col-span-2">
          <label className="label">Office notes <span className="font-normal text-muted">(parents never see these)</span></label>
          <input className="field" value={form.admin_notes} onChange={set("admin_notes")} />
        </div>
      </div>

      {error && <p className="rounded-xl bg-berryl px-4 py-3 text-sm text-berry">{error}</p>}

      <div className="flex flex-wrap gap-3 border-t border-line pt-5">
        <button className="btn-primary" disabled={busy}>
          {busy ? "Creating…" : "Create order and payment link"}
        </button>
        <Link href="/admin" className="btn-quiet">Cancel</Link>
      </div>
    </form>
  );
}
