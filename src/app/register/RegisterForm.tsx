"use client";

import { useMemo, useState } from "react";
import { suggestCelebrationDate, formatLong, money, type SchoolYear, type NoSchoolDate } from "@/lib/dates";

type School = { id: string; name: string; short_name: string | null };
type Pricing = { price_cents: number; per_item_cents: number };
type Child = {
  first_name: string; last_name: string; birthday: string;
  school_id: string; grade: string; teacher_name: string;
  quantity: number;
  allergy_notes: string; notes: string;
};

const blankChild = (lastName: string, schoolId: string): Child => ({
  first_name: "", last_name: lastName, birthday: "",
  school_id: schoolId, grade: "", teacher_name: "",
  quantity: 25,
  allergy_notes: "", notes: "",
});

const priceFor = (qty: number, p: Pricing | null) =>
  !p ? 0 : p.per_item_cents > 0 ? p.per_item_cents * qty : p.price_cents;

export default function RegisterForm({
  schools, pricing, year, noSchool,
}: {
  schools: School[]; pricing: Pricing | null; year: SchoolYear;
  noSchool: NoSchoolDate[];
}) {
  const [step, setStep] = useState(1);
  const [parent, setParent] = useState({
    first_name: "", last_name: "", email: "", phone: "",
  });
  const [children, setChildren] = useState<Child[]>([blankChild("", schools[0]?.id ?? "")]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const update = (i: number, patch: Partial<Child>) =>
    setChildren((cs) => cs.map((c, j) => (j === i ? { ...c, ...patch } : c)));

  const celebrations = useMemo(
    () =>
      children.map((c) =>
        c.birthday ? suggestCelebrationDate(c.birthday, year, noSchool, c.school_id) : null
      ),
    [children, year, noSchool]
  );

  const total = useMemo(
    () => children.reduce((sum, c) => sum + priceFor(c.quantity, pricing), 0),
    [children, pricing]
  );

  function continueToChildren() {
    setError(null);
    setChildren((cs) => cs.map((c) => (c.last_name ? c : { ...c, last_name: parent.last_name })));
    setStep(2);
  }

  async function submit() {
    setBusy(true); setError(null);
    try {
      const res = await fetch("/api/registrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ parent, children }),
      });
      const json = await res.json();
      if (!res.ok || !json.url) {
        throw new Error(json.error ?? "Something went wrong. Please try again.");
      }
      // Square's own checkout page. Stay busy so the button cannot be
      // pressed twice while the browser is navigating away.
      window.location.href = json.url;
    } catch (e: any) {
      setError(e.message);
      setBusy(false);
    }
  }

  const stepValid =
    step === 1
      ? Boolean(parent.first_name && parent.last_name && parent.email.includes("@") && parent.phone)
      : step === 2
      ? children.every((c) => c.first_name && c.last_name && c.birthday && c.school_id && c.grade && c.teacher_name && c.quantity > 0)
      : true;

  return (
    <div className="mt-10">
      <ol className="mb-8 flex gap-2 text-xs font-semibold">
        {["Your details", "Your children", "Payment"].map((label, i) => (
          <li key={label}
            className={`flex-1 rounded-pill px-3 py-2 text-center ${
              step === i + 1 ? "bg-ink text-white" : step > i + 1 ? "bg-pistachiol text-pistachio" : "bg-white border border-line text-muted"
            }`}>
            {label}
          </li>
        ))}
      </ol>

      {/* ---------- Step 1: parent ---------- */}
      {step === 1 && (
        <div className="card space-y-4 p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Your first name</label>
              <input className="field" value={parent.first_name}
                onChange={(e) => setParent({ ...parent, first_name: e.target.value })} />
            </div>
            <div>
              <label className="label">Your last name</label>
              <input className="field" value={parent.last_name}
                onChange={(e) => setParent({ ...parent, last_name: e.target.value })} />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Email</label>
              <input type="email" className="field" value={parent.email}
                onChange={(e) => setParent({ ...parent, email: e.target.value })} />
            </div>
            <div>
              <label className="label">Phone</label>
              <input type="tel" className="field" value={parent.phone}
                onChange={(e) => setParent({ ...parent, phone: e.target.value })} />
            </div>
          </div>
          <p className="rounded-xl bg-paper px-4 py-3 text-sm text-muted">
            We use this to send your confirmation and a reminder before each birthday.
            There&rsquo;s no account and no password to remember.
          </p>
          {error && <p className="rounded-xl bg-berryl px-4 py-3 text-sm">{error}</p>}
          <button className="btn-primary w-full" disabled={!stepValid} onClick={continueToChildren}>
            Continue
          </button>
        </div>
      )}

      {/* ---------- Step 2: children ---------- */}
      {step === 2 && (
        <div className="space-y-6">
          {children.map((c, i) => {
            const celebration = celebrations[i];
            return (
              <div key={i} className="card p-6">
                <div className="mb-5 flex items-center justify-between">
                  <span className="eyebrow">Child {i + 1}</span>
                  {children.length > 1 && (
                    <button className="text-sm font-semibold text-berry hover:underline"
                      onClick={() => setChildren((cs) => cs.filter((_, j) => j !== i))}>
                      Remove
                    </button>
                  )}
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="label">First name</label>
                    <input className="field" value={c.first_name}
                      onChange={(e) => update(i, { first_name: e.target.value })} />
                  </div>
                  <div>
                    <label className="label">Last name</label>
                    <input className="field" value={c.last_name}
                      onChange={(e) => update(i, { last_name: e.target.value })} />
                  </div>
                  <div>
                    <label className="label">Birthday</label>
                    <input type="date" className="field" value={c.birthday}
                      onChange={(e) => update(i, { birthday: e.target.value })} />
                  </div>
                  <div>
                    <label className="label">School</label>
                    <select className="field" value={c.school_id}
                      onChange={(e) => update(i, { school_id: e.target.value })}>
                      {schools.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="label">Grade</label>
                    <input className="field" placeholder="3" value={c.grade}
                      onChange={(e) => update(i, { grade: e.target.value })} />
                  </div>
                  <div>
                    <label className="label">Class / Rebbe / Teacher</label>
                    <input className="field" placeholder="Rebbe / Morah / Teacher name" value={c.teacher_name}
                      onChange={(e) => update(i, { teacher_name: e.target.value })} />
                  </div>
                </div>

                {celebration && (
                  <div className="mt-5 rounded-xl bg-paper px-4 py-3.5 text-sm">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <span className="text-muted">Child&rsquo;s birthday</span>
                      <span className="font-mono">{formatLong(c.birthday)}</span>
                    </div>
                    <div className="mt-2 flex flex-wrap items-baseline justify-between gap-2">
                      <span className="font-semibold">Scheduled school celebration</span>
                      <span className="font-mono font-medium text-berry">{formatLong(celebration.date)}</span>
                    </div>
                    {celebration.reason && (
                      <p className="mt-2 text-muted">{celebration.reason}. The office can change this.</p>
                    )}
                  </div>
                )}

                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="label">How many mini doughnuts?</label>
                    <input type="number" min={1} max={80} className="field" value={c.quantity}
                      onChange={(e) => update(i, { quantity: Number(e.target.value) })} />
                    <p className="mt-1.5 text-sm text-muted">
                      Enough for the class, plus a few for the rebbe or morah. An estimate is
                      fine &mdash; the office confirms the final count.
                    </p>
                  </div>
                  <div className="self-start rounded-xl bg-paper px-4 py-3.5">
                    <p className="text-sm text-muted">Cost for this birthday</p>
                    <p className="mt-1 font-mono text-xl">{money(priceFor(c.quantity, pricing))}</p>
                  </div>
                </div>

                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="label">Allergy information</label>
                    <input className="field" placeholder="Nut-free classroom" value={c.allergy_notes}
                      onChange={(e) => update(i, { allergy_notes: e.target.value })} />
                  </div>
                  <div>
                    <label className="label">Notes for the office</label>
                    <input className="field" value={c.notes}
                      onChange={(e) => update(i, { notes: e.target.value })} />
                  </div>
                </div>
              </div>
            );
          })}

          <button className="btn-quiet w-full"
            onClick={() => setChildren((cs) => [...cs, blankChild(parent.last_name, schools[0]?.id ?? "")])}>
            + Add another child
          </button>

          <div className="flex gap-3">
            <button className="btn-quiet" onClick={() => setStep(1)}>Back</button>
            <button className="btn-primary flex-1" disabled={!stepValid} onClick={() => setStep(3)}>
              Continue to payment
            </button>
          </div>
        </div>
      )}

      {/* ---------- Step 3: payment ---------- */}
      {step === 3 && (
        <div className="space-y-6">
          <div className="card p-6">
            <h2 className="text-xl">Review</h2>
            <ul className="mt-4 divide-y divide-line">
              {children.map((c, i) => (
                <li key={i} className="flex items-baseline justify-between gap-4 py-3">
                  <div>
                    <p className="font-semibold">{c.first_name} {c.last_name}</p>
                    <p className="text-sm text-muted">
                      {celebrations[i] ? formatLong(celebrations[i]!.date) : "\u2014"} · {c.quantity} mini doughnuts
                    </p>
                  </div>
                  <span className="font-mono text-sm">{money(priceFor(c.quantity, pricing))}</span>
                </li>
              ))}
            </ul>
            <div className="mt-4 flex items-baseline justify-between border-t border-line pt-4">
              <span className="font-semibold">Total for the year</span>
              <span className="font-mono text-lg">{money(total)}</span>
            </div>
            <p className="mt-3 text-sm text-muted">
              You&rsquo;ll pay this now on Square&rsquo;s secure checkout page. Your card
              details never touch this website. Nothing is confirmed with the bakery
              until the payment goes through.
            </p>
          </div>

          {error && <p className="rounded-xl bg-berryl px-4 py-3 text-sm">{error}</p>}

          <div className="flex gap-3">
            <button className="btn-quiet" onClick={() => setStep(2)}>Back</button>
            <button className="btn-primary flex-1" disabled={busy} onClick={submit}>
              {busy ? "Opening secure checkout…" : `Pay ${money(total)} and finish`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
