"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ORDER_STATUS_LABEL, STATUS_COLOR, type OrderStatus } from "@/lib/types";
import { Sprinkle } from "@/components/SprinkleRule";

const FLOW: OrderStatus[] = ["upcoming", "confirmed", "baking", "ready_for_delivery", "delivered"];

export default function StatusControl({ orderId, status }: { orderId: string; status: OrderStatus }) {
  const router = useRouter();
  const [current, setCurrent] = useState<OrderStatus>(status);
  const [busy, setBusy] = useState(false);

  async function set(next: OrderStatus) {
    setBusy(true);
    setCurrent(next);
    await fetch("/api/orders/status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ order_id: orderId, status: next }),
    });
    setBusy(false);
    router.refresh();
  }

  const nextStep = FLOW[Math.min(FLOW.indexOf(current) + 1, FLOW.length - 1)];

  return (
    <div className="shrink-0 text-right">
      <label className="sr-only" htmlFor={`status-${orderId}`}>Order status</label>
      <select id={`status-${orderId}`} className="field w-auto !py-2 text-sm" value={current}
        disabled={busy} onChange={(e) => set(e.target.value as OrderStatus)}>
        {FLOW.map((s) => <option key={s} value={s}>{ORDER_STATUS_LABEL[s]}</option>)}
      </select>

      {current !== "delivered" && (
        <button className="btn-primary mt-2 w-full !py-2 text-sm" disabled={busy} onClick={() => set(nextStep)}>
          Mark {ORDER_STATUS_LABEL[nextStep].toLowerCase()}
        </button>
      )}

      <p className="mt-2 flex items-center justify-end gap-1.5 text-xs" style={{ color: STATUS_COLOR[current] }}>
        <Sprinkle color={STATUS_COLOR[current]} /> {ORDER_STATUS_LABEL[current]}
      </p>
    </div>
  );
}
