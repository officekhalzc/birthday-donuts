"use client";

import { useState } from "react";

/**
 * A family's personal payment page. The token is their only credential, so the
 * link is theirs alone — it shows their orders, their total, and nothing else.
 * Every unpaid order for that email shares this one link.
 */
export function payUrl(token: string): string {
  const origin = typeof window === "undefined" ? "" : window.location.origin;
  return `${origin}/pay/${token}`;
}

export function CopyPayLink({
  token, className, label = "Copy pay link",
}: {
  token: string;
  className?: string;
  label?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    const url = payUrl(token);
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard access can be refused; show the link so it can be copied by hand.
      window.prompt("Copy this payment link:", url);
    }
  }

  return (
    <button type="button" onClick={copy} className={className}>
      {copied ? "Copied" : label}
    </button>
  );
}
