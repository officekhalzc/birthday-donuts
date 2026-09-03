"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function RolloverForm({
  years,
}: { years: { id: string; label: string }[] }) {
  const router = useRouter();
  const [form, setForm] = useState({
    label: "", starts_on: "", ends_on: "", copy_from_year_id: years.at(-1)?.id ?? "",
  });
  const [result, setResult] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function create() {
    setBusy(true); setResult(null);
    const res = await fetch("/api/admin/rollover", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const json = await res.json();
    setBusy(false);
    setResult(res.ok
      ? `Created ${form.label} and carried ${json.copied} children forward. Update grades and teachers, then make the year active in Supabase.`
      : json.error);
    router.refresh();
  }

  return (
    <div className="card mt-8 space-y-4 p-6">
      <h2 className="text-xl">Start a new school year</h2>
      <p className="text-muted">
        Families keep their accounts and their children. Grades and teachers copy over
        as-is so you can bump them up in the orders list.
      </p>

      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label className="label">Label</label>
          <input className="field" placeholder="2027–2028" value={form.label}
            onChange={(e) => setForm({ ...form, label: e.target.value })} />
        </div>
        <div>
          <label className="label">First day</label>
          <input type="date" className="field" value={form.starts_on}
            onChange={(e) => setForm({ ...form, starts_on: e.target.value })} />
        </div>
        <div>
          <label className="label">Last day</label>
          <input type="date" className="field" value={form.ends_on}
            onChange={(e) => setForm({ ...form, ends_on: e.target.value })} />
        </div>
      </div>

      <div>
        <label className="label">Copy children from</label>
        <select className="field" value={form.copy_from_year_id}
          onChange={(e) => setForm({ ...form, copy_from_year_id: e.target.value })}>
          <option value="">Do not copy — start empty</option>
          {years.map((y) => <option key={y.id} value={y.id}>{y.label}</option>)}
        </select>
      </div>

      {result && <p className="rounded-xl bg-paper px-4 py-3 text-sm">{result}</p>}

      <button className="btn-primary w-full" disabled={busy || !form.label || !form.starts_on || !form.ends_on}
        onClick={create}>
        {busy ? "Creating…" : "Create school year"}
      </button>
    </div>
  );
}
