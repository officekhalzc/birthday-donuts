-- ============================================================
-- Migration: payment happens at registration, and the bakery only ever
-- sees orders that have been paid for.
--
-- Run this after 001_stripe_to_square.sql, in the Supabase SQL editor.
-- ============================================================

-- ---------- The kitchen only bakes what has been paid for ----------
-- Previously this view showed every non-cancelled order regardless of
-- payment. Since registration now goes straight to Square checkout, an
-- abandoned checkout leaves an unpaid order behind — and that order must
-- not turn into doughnuts at 5am. Filtering here rather than in the app
-- means every screen and the printed production sheet agree.
create or replace view bakery_orders with (security_invoker = on) as
select
  o.id           as order_id,
  o.delivery_date,
  o.donut_count,
  o.status,
  o.bakery_notes,
  c.first_name   as child_first_name,
  c.last_name    as child_last_name,
  c.allergy_notes,
  r.grade,
  r.teacher_name,
  r.special_instructions,
  p.name         as package_name,
  s.name         as school_name,
  s.short_name   as school_short_name
from orders o
join registrations r on r.id = o.registration_id
join children c      on c.id = r.child_id
join schools s       on s.id = r.school_id
join packages p      on p.id = r.package_id
where o.status <> 'cancelled'
  and o.payment_status = 'paid';

-- ---------- Everyone now pays for the year at registration ----------
-- The per-birthday option is gone from the form. Existing rows are moved
-- across so nothing is left referring to a choice parents can no longer make.
update registrations set payment_plan = 'annual' where payment_plan <> 'annual';
