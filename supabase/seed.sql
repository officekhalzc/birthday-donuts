-- ============================================================
-- Starter data for the JDBY-YTT Birthday Mini Doughnut Program
-- Run AFTER schema.sql.
--
-- School, pricing, staff emails and the school calendar are all filled in.
-- Read the two notes marked >>> CHECK <<< before you run this.
-- ============================================================

-- ------------------------------------------------------------
-- 1. School year
--
-- First day of school for YTT is Wed Aug 26, 2026 (first full day Aug 27),
-- taken from the published JDBY-YTT calendar.
--
-- >>> CHECK <<< The school hasn't published past Feb 1, 2027, so the end
-- date below is an estimate based on last year (last day of Limudei Chol
-- was June 18, 2025). Update it once the full calendar is out.
-- ------------------------------------------------------------
insert into school_years (label, starts_on, ends_on, is_active) values
  ('2026–2027', '2026-08-26', '2027-06-24', true);

-- ------------------------------------------------------------
-- 2. Schools
--
-- Both divisions share one calendar, so closures below apply to both.
-- Delete the JDBY row if the program is boys-only to start.
-- ------------------------------------------------------------
insert into schools (name, short_name, address, contact_name, contact_email, phone) values
  ('Yeshivas Tiferes Tzvi', 'YTT',  '6317 N. California Ave, Chicago, IL 60659', 'Front Office', 'office@jdbyytt.org', '773-973-6150'),
  ('Joan Dachs Bais Yaakov', 'JDBY', '3200 W. Peterson Ave, Chicago, IL 60659',  'Front Office', 'office@jdbyytt.org', '773-583-5329');

-- ------------------------------------------------------------
-- 3. Pricing — $1.70 per mini doughnut
--    Stored in cents. Change this row and the registration form,
--    the totals and Square checkout all follow automatically.
--    No delivery fee: Manna prices delivery into the per-donut rate.
-- ------------------------------------------------------------
insert into packages (name, description, price_cents, per_item_cents, sort_order) values
  ('Birthday Mini Doughnuts',
   'Mini doughnuts baked the morning of the celebration and delivered to the classroom.',
   0, 170, 1);

-- ============================================================
-- 4. Days with no delivery
--
-- PART A is taken directly from the published JDBY-YTT calendar
-- (Aug 2026 – Feb 1 2027). These are confirmed.
--
-- PART B is projected from last year's calendar plus the 5787 Hebrew
-- dates, because the school hasn't published past February yet.
-- >>> CHECK <<< Replace Part B when the full calendar comes out.
--
-- Fast days are included even where school is in session, since a
-- birthday celebration with doughnuts doesn't belong on a taanis.
-- ============================================================

-- ---------- PART A: confirmed ----------
insert into no_school_dates (school_year_id, date, reason)
select y.id, d.date, d.reason from school_years y,
(values
  -- Rosh Hashanah
  ('2026-09-11'::date, 'Erev Rosh Hashanah — no school'),
  ('2026-09-12'::date, 'Rosh Hashanah'),
  ('2026-09-13'::date, 'Rosh Hashanah'),
  ('2026-09-14'::date, 'Tzom Gedaliah — fast day, early dismissal'),

  -- Yom Kippur
  ('2026-09-20'::date, 'Erev Yom Kippur — no school'),
  ('2026-09-21'::date, 'Yom Kippur — no school'),

  -- Succos recess: last day of school Wed Sep 23, resumes Tue Oct 6
  ('2026-09-24'::date, 'Succos recess'),
  ('2026-09-25'::date, 'Succos recess'),
  ('2026-09-26'::date, 'Succos recess'),
  ('2026-09-27'::date, 'Succos recess'),
  ('2026-09-28'::date, 'Succos recess'),
  ('2026-09-29'::date, 'Succos recess'),
  ('2026-09-30'::date, 'Succos recess'),
  ('2026-10-01'::date, 'Succos recess'),
  ('2026-10-02'::date, 'Succos recess'),
  ('2026-10-03'::date, 'Succos recess'),
  ('2026-10-04'::date, 'Succos recess'),
  ('2026-10-05'::date, 'Succos recess'),

  -- Chanukah vacation: Thu Dec 10 – Sun Dec 13, resumes Mon Dec 14
  ('2026-12-10'::date, 'Chanukah vacation'),
  ('2026-12-11'::date, 'Chanukah vacation'),
  ('2026-12-12'::date, 'Chanukah vacation'),
  ('2026-12-13'::date, 'Chanukah vacation'),

  ('2026-12-20'::date, 'Asarah B''Teves — fast day, early dismissal'),

  -- Midwinter break begins Wed Jan 27. The published calendar ends Feb 1;
  -- last year the break ran through the Sunday and school resumed Monday.
  ('2027-01-27'::date, 'Midwinter break'),
  ('2027-01-28'::date, 'Midwinter break'),
  ('2027-01-29'::date, 'Midwinter break'),
  ('2027-01-30'::date, 'Midwinter break'),
  ('2027-01-31'::date, 'Midwinter break'),
  ('2027-02-01'::date, 'Midwinter break — CONFIRM end date'),
  ('2027-02-02'::date, 'Midwinter break — CONFIRM end date')
) as d(date, reason)
where y.label = '2026–2027';

-- ---------- PART B: projected, confirm when the calendar is published ----------
insert into no_school_dates (school_year_id, date, reason)
select y.id, d.date, d.reason from school_years y,
(values
  -- Purim. 5787 is a Hebrew leap year, so this is Adar II — March, not February.
  ('2027-03-22'::date, 'Taanis Esther — fast day, early dismissal (projected)'),
  ('2027-03-23'::date, 'Purim (projected)'),
  ('2027-03-24'::date, 'Shushan Purim (projected)'),

  -- Pesach break. Last year ran 12–23 Nisan; the same Hebrew dates in 5787
  -- fall on Mon Apr 19 through Fri Apr 30, resuming Mon May 3.
  ('2027-04-19'::date, 'Pesach break (projected)'),
  ('2027-04-20'::date, 'Pesach break (projected)'),
  ('2027-04-21'::date, 'Pesach break (projected)'),
  ('2027-04-22'::date, 'Pesach break (projected)'),
  ('2027-04-23'::date, 'Pesach break (projected)'),
  ('2027-04-24'::date, 'Pesach break (projected)'),
  ('2027-04-25'::date, 'Pesach break (projected)'),
  ('2027-04-26'::date, 'Pesach break (projected)'),
  ('2027-04-27'::date, 'Pesach break (projected)'),
  ('2027-04-28'::date, 'Pesach break (projected)'),
  ('2027-04-29'::date, 'Pesach break (projected)'),
  ('2027-04-30'::date, 'Pesach break (projected)'),

  -- Shavuos falls Friday and Shabbos in 2027; school should resume Mon Jun 14.
  ('2027-06-10'::date, 'Erev Shavuos — early dismissal (projected)'),
  ('2027-06-11'::date, 'Shavuos (projected)'),
  ('2027-06-12'::date, 'Shavuos (projected)')
) as d(date, reason)
where y.label = '2026–2027';

-- ------------------------------------------------------------
-- Not included, because the school calendar doesn't list them:
--   Thanksgiving (Thu Nov 26, 2026) — JDBY-YTT appears to hold school.
--   Secular winter break — not observed on last year's calendar either.
-- Add them here if that turns out to be wrong:
--   insert into no_school_dates (school_year_id, date, reason)
--   select id, '2026-11-26', 'Thanksgiving' from school_years where label = '2026–2027';
-- ------------------------------------------------------------

-- ------------------------------------------------------------
-- Staff logins
--
-- Parents never sign up. Create the two staff accounts yourself in
-- Supabase -> Authentication -> Users -> Add user, then run:
--
--   update profiles set role = 'admin'  where email = 'nourishtoflourishevent@gmail.com';
--   update profiles set role = 'bakery' where email = 'meir@themannabakehouse.com';
--
-- New logins default to 'bakery', which can only reach /admin/bakery.
-- Only 'admin' sees parent contact details, payments and the export.
-- ------------------------------------------------------------
