"use client";

import { useState } from "react";

/** Sends the parent to Square's checkout page. No card details touch this site. */
export default function PayButton({ token, label }: { token: string; label: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function go() {
    setBusy(true); setError(null);
    try {
      const res = await fetch("/api/square/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const json = await res.json();
      if (!res.ok || !json.url) throw new Error(json.error ?? "Could not start the payment.");
      window.location.href = json.url;
    } catch (e: any) {
      setError(e.message);
      setBusy(false);
    }
  }

  return (
    <div className="shrink-0">
      <button onClick={go} disabled={busy} className="btn-primary">
        {busy ? "Opening secure checkout…" : label}
      </button>
      {error && <p className="mt-2 text-sm text-berry">{error}</p>}
    </div>
  );
}
