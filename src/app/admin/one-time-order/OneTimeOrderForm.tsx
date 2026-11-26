"use client";

import { useState } from "react";
import { CopyPayLink, payUrl } from "@/components/CopyPayLink";
import { formatLong, money } from "@/lib/dates";
import { classroomLine } from "@/lib/labels";
import {
  isCalendarDate,
  MAX_ONE_TIME_QUANTITY,
  orderAmountCents,
  parseQuantity,
  type PackagePrice,
} from "@/lib/one-time-order";

type School = { id: string; name: string };

type Created = {
  pay_token: string;
  amount_cents: number;
  quantity: number;
  delivery_date: string;
  child_name: string;
  parent_email: string;
  parent_matched: boolean;
  package_name: string;
  confirmation_email: "sent" | "skipped" | "failed";
};

const blank = {
  parent_name: "",
  parent_email: "",
  child_name: "",
  school_id: "",
  delivery_date: "",
  quantity: "25",
  grade: "",
  teacher_name: "",
  birthday: "",
  allergy_notes: "",
};

export default function OneTimeOrderForm({
  schools, pricing,
}: {
  schools: School[];
  pricing: PackagePrice & { name: string };
}) {
  const [form, setForm] = useState(blank);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [created, setCreated] = useState<Created | null>(null);

  const quantity = parseQuantity(form.quantity);
  const amount = quantity ? orderAmountCents(pricing, quantity) : 0;
  const set = (patch: Partial<typeof blank>) => setForm((f) => ({ ...f, ...patch }));

  const ready =
    form.parent_name.trim() &&
    form.parent_email.includes("@") &&
    form.child_name.trim() &&
    form.school_id &&
    isCalendarDate(form.delivery_date) &&
    quantity !== null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!ready || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/one-time-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          quantity,
          birthday: form.birthday,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "The order could not be saved.");
      setCreated(json as Created);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "The order could not be saved.");
    } finally {
      setBusy(false);
    }
  }

  if (created) {
    const where = [
      schools.find((s) => s.id === form.school_id)?.name,
      classroomLine(form.grade, form.teacher_name),
    ].filter(Boolean).join(" · ");

    return (
      <div className="card mt-8 space-y-5 p-6">
        <div>
          <p className="eyebrow">Unpaid</p>
          <h2 className="mt-2 text-2xl">Order saved</h2>
          <p className="mt-2 text-muted">
            {created.child_name} · {formatLong(created.delivery_date)} · {created.quantity} mini doughnuts
            {where ? ` · ${where}` : ""}
          </p>
          <p className="mt-1 font-mono text-lg">{money(created.amount_cents)}</p>
        </div>

        <p className="text-sm text-muted">
          {created.parent_matched
            ? "This email is already on file, so the order was added to that family. Their payment link now includes it, along with anything else they still owe."
            : "This is a new family. The link below is theirs alone."}
          {" "}Nothing has been charged. The bakery will not see the order until it is paid.
        </p>

        <div className="rounded-xl border border-line bg-paper p-4">
          <p className="font-semibold">Payment link</p>
          <p className="mt-2 break-all font-mono text-xs">{payUrl(created.pay_token)}</p>
          <CopyPayLink token={created.pay_token} label="Copy pay link"
            className="btn-primary mt-4" />
        </div>

        <p className="text-sm text-muted">
          {created.confirmation_email === "sent" && (
            <>A confirmation email went to {created.parent_email}. It says payment is due and includes this link.</>
          )}
          {created.confirmation_email === "skipped" && (
            <>Email isn&rsquo;t configured here, so nothing was sent. Copy the link and send it to the family.</>
          )}
          {created.confirmation_email === "failed" && (
            <>The order is saved, but the confirmation email did not send. Copy the link and send it to the family.</>
          )}
        </p>

        <button type="button" className="btn-quiet"
          onClick={() => { setCreated(null); setForm(blank); setError(null); }}>
          Enter another order
        </button>
      </div>
    );
  }

  const unit =
    pricing.per_item_cents > 0
      ? `${money(pricing.per_item_cents)} each`
      : `${money(pricing.price_cents)} flat`;

  return (
    <form className="card mt-8 space-y-5 p-6" onSubmit={submit} autoComplete="off">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="parent_name">Parent name</label>
          <input id="parent_name" className="field" required value={form.parent_name}
            placeholder="Rachel Fishman"
            onChange={(e) => set({ parent_name: e.target.value })} />
        </div>
        <div>
          <label className="label" htmlFor="parent_email">Parent email</label>
          <input id="parent_email" type="email" className="field" required value={form.parent_email}
            placeholder="rachel@example.com"
            onChange={(e) => set({ parent_email: e.target.value })} />
          <p className="mt-1.5 text-sm text-muted">
            An email already on file is added to that family, not saved as a second parent.
          </p>
        </div>
        <div>
          <label className="label" htmlFor="child_name">Child name</label>
          <input id="child_name" className="field" required value={form.child_name}
            placeholder="Aryeh Fishman"
            onChange={(e) => set({ child_name: e.target.value })} />
        </div>
        <div>
          <label className="label" htmlFor="school_id">School</label>
          <select id="school_id" className="field" required value={form.school_id}
            onChange={(e) => set({ school_id: e.target.value })}>
            <option value="">Select a school</option>
            {schools.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="delivery_date">Delivery date</label>
          <input id="delivery_date" type="date" className="field" required value={form.delivery_date}
            onChange={(e) => set({ delivery_date: e.target.value })} />
          <p className="mt-1.5 text-sm text-muted">
            Used exactly as entered, including Shabbos, Sunday, and vacation days.
          </p>
        </div>
        <div>
          <label className="label" htmlFor="quantity">Quantity</label>
          <input id="quantity" type="number" min={1} max={MAX_ONE_TIME_QUANTITY} step={1}
            className="field" required value={form.quantity}
            onChange={(e) => set({ quantity: e.target.value })} />
          <p className="mt-1.5 text-sm text-muted">
            {quantity
              ? `${quantity} × ${unit} from ${pricing.name} = ${money(amount)}`
              : `Enter 1–${MAX_ONE_TIME_QUANTITY} mini doughnuts.`}
          </p>
        </div>
        <div>
          <label className="label" htmlFor="grade">Grade <span className="font-normal text-muted">(optional)</span></label>
          <input id="grade" className="field" value={form.grade} placeholder="3"
            onChange={(e) => set({ grade: e.target.value })} />
        </div>
        <div>
          <label className="label" htmlFor="teacher_name">Teacher <span className="font-normal text-muted">(optional)</span></label>
          <input id="teacher_name" className="field" value={form.teacher_name}
            placeholder="Rebbe / Morah / Teacher"
            onChange={(e) => set({ teacher_name: e.target.value })} />
        </div>
        <div>
          <label className="label" htmlFor="birthday">Birthday <span className="font-normal text-muted">(optional)</span></label>
          <input id="birthday" type="date" className="field" value={form.birthday}
            onChange={(e) => set({ birthday: e.target.value })} />
        </div>
        <div>
          <label className="label" htmlFor="allergy_notes">Allergies <span className="font-normal text-muted">(optional)</span></label>
          <input id="allergy_notes" className="field" value={form.allergy_notes}
            onChange={(e) => set({ allergy_notes: e.target.value })} />
        </div>
      </div>

      {error && <p className="rounded-xl bg-berryl px-4 py-3 text-sm">{error}</p>}

      <button className="btn-primary w-full" disabled={busy || !ready}>
        {busy ? "Saving…" : `Create unpaid order${quantity ? ` · ${money(amount)}` : ""}`}
      </button>
    </form>
  );
}
