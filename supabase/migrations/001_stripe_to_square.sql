-- ============================================================
-- Migration: move card payments from Stripe to Square.
--
-- Run this once in the Supabase SQL editor, against the same project the
-- site already uses. It is safe to run on a database that has no payments
-- in it yet, which is the expected case before launch.
--
-- Nothing about orders, registrations or children changes. Only the three
-- columns on `payments` that recorded Stripe's identifiers, plus the
-- per-donut price.
-- ============================================================

-- ---------- 1. payments: Stripe identifiers become Square ones ----------

-- The old unique index has to go first. It was unique on the Stripe session
-- id, which forced the checkout code to store null whenever a family paid
-- for several birthdays at once. Square gives every payment link a single
-- order id that legitimately covers several of our orders, so the new index
-- is a plain one.
drop index if exists payments_stripe_checkout_session_idx;

alter table payments
  rename column stripe_checkout_session to square_order_id;

alter table payments
  rename column stripe_payment_intent to square_payment_id;

-- The payment link itself, kept for support questions: it is the record that
-- ties a row here to a specific link that was emailed out.
alter table payments
  add column if not exists square_payment_link_id text;

create index if not exists payments_square_order_id_idx
  on payments (square_order_id)
  where square_order_id is not null;

create index if not exists payments_square_payment_id_idx
  on payments (square_payment_id)
  where square_payment_id is not null;

-- ---------- 2. Pricing: $1.70 per mini doughnut ----------
-- Agreed with Manna Bakehouse, Sept 2026. Delivery is priced into this rate,
-- so there is no separate delivery charge anywhere in the system.
update packages
   set per_item_cents = 170
 where is_active = true;
