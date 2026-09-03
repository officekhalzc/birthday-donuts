export type OrderStatus =
  | "upcoming" | "confirmed" | "baking" | "ready_for_delivery" | "delivered" | "cancelled";
export type PaymentStatus = "unpaid" | "pending" | "paid" | "refunded";
export type PaymentPlan = "annual" | "per_birthday";
export type UserRole = "parent" | "admin" | "bakery";

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  upcoming: "Upcoming",
  confirmed: "Confirmed",
  baking: "Baking",
  ready_for_delivery: "Ready for delivery",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

export const PAYMENT_STATUS_LABEL: Record<PaymentStatus, string> = {
  unpaid: "Payment due",
  pending: "Payment processing",
  paid: "Paid",
  refunded: "Refunded",
};

/** Drives the sprinkle colour on the calendar and the pills in the tables. */
export const STATUS_COLOR: Record<string, string> = {
  upcoming: "#7A7086",
  confirmed: "#E8A33D",
  baking: "#E8A33D",
  ready_for_delivery: "#B0416B",
  delivered: "#6F9B78",
  cancelled: "#C9C2D4",
  paid: "#6F9B78",
  unpaid: "#B0416B",
  pending: "#E8A33D",
  refunded: "#7A7086",
};

export type AdminOrder = {
  order_id: string;
  delivery_date: string;
  donut_count: number;
  status: OrderStatus;
  payment_status: PaymentStatus;
  amount_cents: number;
  bakery_notes: string | null;
  registration_id: string;
  grade: string;
  teacher_name: string;
  quantity: number;
  celebration_source: "auto" | "admin";
  celebration_reason: string | null;
  special_instructions: string | null;
  admin_notes: string | null;
  payment_plan: PaymentPlan;
  child_id: string;
  child_first_name: string;
  child_last_name: string;
  birthday: string;
  allergy_notes: string | null;
  school_name: string;
  school_short_name: string | null;
  package_name: string;
  parent_id: string;
  pay_token: string;
  parent_first_name: string | null;
  parent_last_name: string | null;
  parent_email: string | null;
  parent_phone: string | null;
  school_year_id: string;
  school_year: string;
};

export type BakeryOrder = {
  order_id: string;
  delivery_date: string;
  donut_count: number;
  status: OrderStatus;
  bakery_notes: string | null;
  child_first_name: string;
  child_last_name: string;
  allergy_notes: string | null;
  grade: string;
  teacher_name: string;
  special_instructions: string | null;
  package_name: string;
  school_name: string;
  school_short_name: string | null;
};
