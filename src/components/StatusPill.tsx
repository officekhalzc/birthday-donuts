import { ORDER_STATUS_LABEL, PAYMENT_STATUS_LABEL, STATUS_COLOR } from "@/lib/types";
import type { OrderStatus, PaymentStatus } from "@/lib/types";
import { Sprinkle } from "./SprinkleRule";

export function StatusPill({ status }: { status: OrderStatus }) {
  const color = STATUS_COLOR[status];
  return (
    <span className="pill" style={{ background: `${color}1A`, color }}>
      <Sprinkle color={color} />
      {ORDER_STATUS_LABEL[status]}
    </span>
  );
}

export function PaymentPill({ status }: { status: PaymentStatus }) {
  const color = STATUS_COLOR[status];
  return (
    <span className="pill" style={{ background: `${color}1A`, color }}>
      {PAYMENT_STATUS_LABEL[status]}
    </span>
  );
}
