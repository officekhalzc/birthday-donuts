"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { SprinkleRule } from "@/components/SprinkleRule";
import {
  getOrderingWindow,
  oneTimeOrderMailto,
  ONE_TIME_ORDER_EMAIL,
  type OrderingWindow,
} from "@/lib/ordering-window";

/**
 * Tells a parent whether ordering is open today.
 *
 * Worked out in the browser rather than on the server, because the page is
 * cached and a server-rendered date would go stale and tell someone it was
 * still the 1st a week later.
 *
 * Deliberately not a hard block: a parent who needs a birthday sorted out of
 * cycle is pointed at the office instead of being turned away.
 */
export function OrderingWindowDialog({ autoShow = true }: { autoShow?: boolean }) {
  const [window_, setWindow] = useState<OrderingWindow | null>(null);
  const [open, setOpen] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const w = getOrderingWindow();
    setWindow(w);
    if (!autoShow) return;

    // Once per browser session, so it informs without nagging.
    let alreadySeen = false;
    try {
      alreadySeen = sessionStorage.getItem("ordering-window-seen") === "1";
    } catch {
      // Private browsing or blocked storage — just show it.
    }
    if (!alreadySeen) setOpen(true);
  }, [autoShow]);

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && dismiss();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function dismiss() {
    setOpen(false);
    try {
      sessionStorage.setItem("ordering-window-seen", "1");
    } catch {
      // Nothing to do — it will simply show again next page load.
    }
  }

  if (!window_ || !open) return null;
  const { isOpen, nextOpensLabel, daysUntilOpen, nextOpensMonth } = window_;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 p-4 sm:items-center"
      onClick={dismiss}
      role="dialog"
      aria-modal="true"
      aria-labelledby="ordering-window-title"
    >
      <div
        className="card w-full max-w-md p-6 sm:p-7"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <p className="eyebrow">
            {isOpen ? "Ordering is open today" : "Ordering is closed today"}
          </p>
          <button
            ref={closeRef}
            onClick={dismiss}
            aria-label="Close"
            className="-mr-1 -mt-1 rounded-pill px-2 py-1 text-xl leading-none text-muted hover:bg-paper"
          >
            &times;
          </button>
        </div>

        {isOpen ? (
          <>
            <h2 id="ordering-window-title" className="mt-3 text-2xl">
              Welcome — ordering is open
            </h2>
            <SprinkleRule width={140} className="mt-3" />
            <p className="mt-4 leading-relaxed text-muted">
              Today is the 1st, so you can place orders for {nextOpensMonth} birthdays
              now. You&rsquo;re welcome to order for later months too if you&rsquo;d like
              to plan ahead.
            </p>
            <p className="mt-3 leading-relaxed text-muted">
              Please order at least two days before the birthday.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Link href="/register" className="btn-primary flex-1" onClick={dismiss}>
                Register my child
              </Link>
              <button onClick={dismiss} className="btn-quiet">
                Not now
              </button>
            </div>
          </>
        ) : (
          <>
            <h2 id="ordering-window-title" className="mt-3 text-2xl">
              Ordering opens {nextOpensLabel}
            </h2>
            <SprinkleRule width={140} className="mt-3" />
            <p className="mt-4 leading-relaxed text-muted">
              Orders open on the 1st of every month. The next date is{" "}
              <strong className="text-ink">{nextOpensLabel}</strong>
              {daysUntilOpen > 0 && (
                <> — {daysUntilOpen === 1 ? "tomorrow" : `${daysUntilOpen} days away`}</>
              )}
              . You&rsquo;ll be able to order for {nextOpensMonth} and any later month.
            </p>

            <div className="mt-5 rounded-xl bg-berryl px-4 py-4">
              <p className="font-semibold">Need a one-time order before then?</p>
              <p className="mt-1 text-sm text-ink/80">
                If a birthday falls before the next ordering date, email the office and
                we&rsquo;ll arrange it.
              </p>
              <a href={oneTimeOrderMailto()} className="btn-berry mt-3 w-full !py-2.5 text-sm">
                Email a one-time request
              </a>
              <p className="mt-2 break-all text-center text-xs text-muted">
                {ONE_TIME_ORDER_EMAIL}
              </p>
            </div>

            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
              <button onClick={dismiss} className="btn-quiet flex-1">
                Close
              </button>
              <Link href="/register" className="btn-quiet flex-1" onClick={dismiss}>
                Look at the form
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
