-- ============================================================
-- School Birthday Mini Donut Program — database schema
-- Run this once in the Supabase SQL editor.
--
-- Only school staff and the bakery have logins. Parents fill in the public
-- registration form and never create an account, so anything a parent submits
-- is written by the server using the service-role key.
-- ============================================================

create extension if not exists "pgcrypto";

-- ---------- enumerations ----------
create type staff_role      as enum ('admin', 'bakery');
create type payment_plan    as enum ('annual', 'per_birthday');
create type payment_status  as enum ('unpaid', 'pending', 'paid', 'refunded');
create type order_status    as enum ('upcoming', 'confirmed', 'baking', 'ready_for_delivery', 'delivered', 'cancelled');
create type date_source     as enum ('auto', 'admin');

-- ---------- staff logins ----------
-- One row per login. Mirrors auth.users. Parents never appear here.
create table profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  role        staff_role not null default 'bakery',
  first_name  text not null default '',
  last_name   text not null default '',
  email       text not null,
  created_at  timestamptz not null default now()
);

-- ---------- parents (no login) ----------
create table parents (
  id          uuid primary key default gen_random_uuid(),
  first_name  text not null,
  last_name   text not null,
  email       text not null,
  phone       text,
  -- The secret in the payment link we email out.
  pay_token   uuid not null default gen_random_uuid(),
  notes       text,
  created_at  timestamptz not null default now()
);
create unique index on parents (lower(email));
create unique index on parents (pay_token);

-- ---------- schools, years, classes ----------
create table school_years (
  id          uuid primary key default gen_random_uuid(),
  label       text not null unique,          -- e.g. '2026–2027'
  starts_on   date not null,
  ends_on     date not null,
  is_active   boolean not null default false
);

create table schools (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  short_name    text,                        -- e.g. 'YTT'
  address       text,
  contact_name  text,
  contact_email text,
  phone         text,
  is_active     boolean not null default true
);

create table classes (
  id             uuid primary key default gen_random_uuid(),
  school_id      uuid not null references schools(id) on delete cascade,
  school_year_id uuid not null references school_years(id) on delete cascade,
  grade          text not null,              -- text, so 'Pre-1A' and 'K' work
  teacher_name   text not null,              -- Rebbe / Morah / Teacher
  approx_size    int,
  unique (school_id, school_year_id, grade, teacher_name)
);
create index on classes (school_year_id);

-- Days the bakery must not deliver: Yom Tov, vacation, in-service days.
-- school_id null == applies to every school.
create table no_school_dates (
  id             uuid primary key default gen_random_uuid(),
  school_year_id uuid not null references school_years(id) on delete cascade,
  school_id      uuid references schools(id) on delete cascade,
  date           date not null,
  reason         text
);
create index on no_school_dates (school_year_id, date);

-- ---------- children ----------
create table children (
  id            uuid primary key default gen_random_uuid(),
  parent_id     uuid not null references parents(id) on delete cascade,
  first_name    text not null,
  last_name     text not null,
  birthday      date not null,
  allergy_notes text,
  notes         text,
  created_at    timestamptz not null default now()
);
create index on children (parent_id);

-- ---------- packages (admin-editable, no code changes) ----------
create table packages (
  id                uuid primary key default gen_random_uuid(),
  name              text not null,
  description       text,
  price_cents       int not null default 0,       -- flat price per birthday
  per_item_cents  int not null default 0,       -- optional per-mini donut price
  is_active         boolean not null default true,
  sort_order        int not null default 0
);

-- ---------- registrations ----------
-- One row = one child, one school year.
create table registrations (
  id                    uuid primary key default gen_random_uuid(),
  school_year_id        uuid not null references school_years(id) on delete cascade,
  child_id              uuid not null references children(id) on delete cascade,
  school_id             uuid not null references schools(id),
  class_id              uuid references classes(id),
  grade                 text not null,
  teacher_name          text not null,
  package_id            uuid not null references packages(id),
  quantity            int not null default 25,   -- how many donuts the parent ordered
  celebration_date      date not null,
  celebration_source    date_source not null default 'auto',
  celebration_reason    text,                      -- 'Birthday falls on Shabbos', etc.
  payment_plan          payment_plan not null default 'per_birthday',
  admin_notes           text,
  special_instructions  text,
  created_at            timestamptz not null default now(),
  unique (child_id, school_year_id)
);
create index on registrations (school_year_id, celebration_date);

-- ---------- orders ----------
-- The bakery-facing unit of work. Admin can adjust the final count.
create table orders (
  id                 uuid primary key default gen_random_uuid(),
  registration_id    uuid not null references registrations(id) on delete cascade,
  school_year_id     uuid not null references school_years(id) on delete cascade,
  delivery_date      date not null,
  donut_count       int not null,
  status             order_status not null default 'upcoming',
  payment_status     payment_status not null default 'unpaid',
  amount_cents       int not null default 0,
  confirmed_at       timestamptz,
  delivered_at       timestamptz,
  cancelled_at       timestamptz,
  bakery_notes       text,
  created_at         timestamptz not null default now()
);
create index on orders (delivery_date);
create index on orders (school_year_id, status);
create index on orders (registration_id);

-- ---------- payments ----------
create table payments (
  id                       uuid primary key default gen_random_uuid(),
  parent_id                uuid not null references parents(id) on delete cascade,
  school_year_id           uuid not null references school_years(id),
  order_id                 uuid references orders(id) on delete set null,
  plan                     payment_plan not null,
  amount_cents             int not null,
  status                   payment_status not null default 'pending',
  square_order_id          text,
  square_payment_id        text,
  square_payment_link_id   text,
  paid_at                  timestamptz,
  refunded_at              timestamptz,
  created_at               timestamptz not null default now()
);
create index on payments (parent_id);
create index on payments (square_order_id) where square_order_id is not null;
create index on payments (square_payment_id) where square_payment_id is not null;

-- ---------- email log ----------
create table email_log (
  id          uuid primary key default gen_random_uuid(),
  template    text not null,
  to_email    text not null,
  order_id    uuid references orders(id) on delete set null,
  sent_at     timestamptz not null default now(),
  provider_id text,
  error       text
);
create index on email_log (template, order_id);

-- ============================================================
-- Helper functions used by the security policies
-- ============================================================
create or replace function auth_role() returns staff_role
language sql stable security definer set search_path = public as $$
  select role from profiles where id = auth.uid()
$$;

create or replace function is_admin() returns boolean
language sql stable as $$ select auth_role() = 'admin' $$;

create or replace function is_staff() returns boolean
language sql stable as $$ select auth_role() is not null $$;

-- Anyone invited through Supabase Auth becomes bakery staff by default.
-- Promote to admin with the statement at the bottom of seed.sql.
create or replace function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, email, first_name, last_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'first_name', ''),
    coalesce(new.raw_user_meta_data->>'last_name', '')
  );
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- Keep the order's mini donut count and date in step with its registration.
create or replace function sync_order_from_registration() returns trigger
language plpgsql as $$
begin
  update orders
     set delivery_date = new.celebration_date,
         donut_count  = new.quantity
   where registration_id = new.id
     and status not in ('delivered', 'cancelled');
  return new;
end $$;

create trigger registration_updated
  after update on registrations
  for each row execute function sync_order_from_registration();

-- ============================================================
-- Row level security
-- ============================================================
alter table profiles        enable row level security;
alter table parents         enable row level security;
alter table children        enable row level security;
alter table registrations   enable row level security;
alter table orders          enable row level security;
alter table payments        enable row level security;
alter table schools         enable row level security;
alter table classes         enable row level security;
alter table school_years    enable row level security;
alter table packages        enable row level security;
alter table no_school_dates enable row level security;
alter table email_log       enable row level security;

-- Staff see themselves; admin sees the whole staff list.
create policy own_profile   on profiles for select to authenticated using (id = auth.uid() or is_admin());
create policy admin_profile on profiles for all    to authenticated using (is_admin()) with check (is_admin());

-- Reference data: any signed-in staff member reads, only admin changes.
create policy read_schools  on schools         for select to authenticated using (is_staff());
create policy read_classes  on classes         for select to authenticated using (is_staff());
create policy read_years    on school_years    for select to authenticated using (is_staff());
create policy read_packages on packages        for select to authenticated using (is_staff());
create policy read_nodates  on no_school_dates for select to authenticated using (is_staff());

create policy admin_schools  on schools         for all to authenticated using (is_admin()) with check (is_admin());
create policy admin_classes  on classes         for all to authenticated using (is_admin()) with check (is_admin());
create policy admin_years    on school_years    for all to authenticated using (is_admin()) with check (is_admin());
create policy admin_packages on packages        for all to authenticated using (is_admin()) with check (is_admin());
create policy admin_nodates  on no_school_dates for all to authenticated using (is_admin()) with check (is_admin());

-- Parent contact details and money are for the school office only.
-- The bakery is deliberately excluded from all four of these tables.
create policy admin_parents  on parents       for all to authenticated using (is_admin()) with check (is_admin());
create policy admin_children on children      for all to authenticated using (is_admin()) with check (is_admin());
create policy admin_regs     on registrations for all to authenticated using (is_admin()) with check (is_admin());
create policy admin_payments on payments      for all to authenticated using (is_admin()) with check (is_admin());

-- Orders: admin does everything, bakery reads and moves the status along.
create policy read_orders   on orders for select to authenticated using (is_staff());
create policy admin_orders  on orders for all    to authenticated using (is_admin()) with check (is_admin());
create policy bakery_orders on orders for update to authenticated using (is_staff()) with check (is_staff());

create policy admin_email_log on email_log for all to authenticated using (is_admin()) with check (is_admin());

-- ============================================================
-- Views
-- ============================================================

-- Everything the admin list view needs, already joined.
create view admin_orders with (security_invoker = on) as
select
  o.id                as order_id,
  o.delivery_date,
  o.donut_count,
  o.status,
  o.payment_status,
  o.amount_cents,
  o.bakery_notes,
  r.id                as registration_id,
  r.grade,
  r.teacher_name,
  r.quantity,
  r.celebration_source,
  r.celebration_reason,
  r.special_instructions,
  r.admin_notes,
  r.payment_plan,
  c.id                as child_id,
  c.first_name        as child_first_name,
  c.last_name         as child_last_name,
  c.birthday,
  c.allergy_notes,
  s.name              as school_name,
  s.short_name        as school_short_name,
  p.name              as package_name,
  pa.id               as parent_id,
  pa.first_name       as parent_first_name,
  pa.last_name        as parent_last_name,
  pa.email            as parent_email,
  pa.phone            as parent_phone,
  pa.pay_token,
  y.id                as school_year_id,
  y.label             as school_year
from orders o
join registrations r on r.id = o.registration_id
join children c      on c.id = r.child_id
join parents pa      on pa.id = c.parent_id
join schools s       on s.id = r.school_id
join packages p      on p.id = r.package_id
join school_years y  on y.id = o.school_year_id;

-- The kitchen's view: no parent contact details, no money, and PAID ONLY.
-- An unpaid or abandoned registration must never reach the production sheet:
-- that is what makes "nothing is baked before it is paid for" true rather
-- than a promise someone has to remember to keep.
create view bakery_orders with (security_invoker = on) as
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
