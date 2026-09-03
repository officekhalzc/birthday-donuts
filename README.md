# School Birthday Mini Donut Program

A working web application, not a mockup. Parents register a child once, the
system figures out which school day the celebration lands on, and Manna
Bakehouse gets a clean production sheet every morning.

Three kinds of people sign in, and each sees a different thing:

| Role | Sees |
|---|---|
| **Parent** | Only their own children, dates and payments |
| **Bakery** | What to bake and where to deliver it — no parent contact details, no money |
| **Administrator** | Everything, plus every edit and the CSV export |

That separation is enforced in the database itself (Postgres row-level
security), not just hidden in the interface.

---

## What's in here

```
supabase/schema.sql      the database — run this first
supabase/seed.sql        starter school year, schools and mini donut packages
src/app/page.tsx         homepage
src/app/register/        the parent sign-up flow (3 steps, multiple children)
src/app/dashboard/       parent dashboard
src/app/admin/           admin list + calendar, edit panel, school-year rollover
src/app/bakery/          bakery dashboard and the printable production sheet
src/app/api/             registration, Square, status changes, CSV, daily emails
src/lib/dates.ts         the celebration-date rules (Shabbos, Sunday, vacation)
```

---

## Setup, step by step

You need accounts at **Supabase**, **Vercel** and **Resend**, plus access to
**Manna Bakehouse's Square account** (they create the application and send you
the credentials — payments settle straight to the bakery).
Budget about an hour the first time.

### 1. Create the database

1. Go to supabase.com and create a new project. Write down the database
   password it gives you.
2. Open **SQL Editor** in the left sidebar.
3. Paste the entire contents of `supabase/schema.sql` and press Run.
4. Open `supabase/seed.sql`, change the school names and prices to match your
   program, paste it in and press Run.

### 2. Collect your keys

Copy `.env.example` to a file called `.env.local` and fill it in:

| Where to find it | Goes in |
|---|---|
| Supabase → Project Settings → API → Project URL | `NEXT_PUBLIC_SUPABASE_URL` |
| Supabase → same page → `anon public` key | `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| Supabase → same page → `service_role` key | `SUPABASE_SERVICE_ROLE_KEY` |
| Square → Developer Console → your app → Access token | `SQUARE_ACCESS_TOKEN` |
| Square → same page → Location ID | `SQUARE_LOCATION_ID` |
| Square → Webhooks → your subscription → Signature key | `SQUARE_WEBHOOK_SIGNATURE_KEY` |
| Resend → API Keys | `RESEND_API_KEY` |

The `service_role` key can do anything to your database. It only ever runs on
the server. Never paste it into a browser or share it.

`CRON_SECRET` is any long random string you make up — it stops strangers from
triggering your reminder emails.

### 3. Run it on your own computer first

```bash
npm install
npm run dev
```

Open http://localhost:3000. Register yourself as a test parent so you can see
the flow a real parent will see.

### 4. Make yourself the administrator

After you sign up, go back to Supabase → SQL Editor and run:

```sql
update profiles set role = 'admin' where email = 'you@yourdomain.org';
```

Sign out and back in. You'll now see **Admin** and **Bakery** in the menu.

Do the same for the bakery once they've created their own account:

```sql
update profiles set role = 'bakery' where email = 'orders@mannabakehouse.com';
```

### 5. Put it online

1. Push this folder to a new GitHub repository.
2. Go to vercel.com → **Add New Project** → import that repository.
3. Before clicking Deploy, open **Environment Variables** and paste in every
   line from your `.env.local`.
4. Deploy. Vercel gives you an address like `your-project.vercel.app`.

### 6. Connect your domain

1. In Vercel: **Settings → Domains → Add**, and enter e.g.
   `birthdays.yourdomain.org`.
2. Vercel shows you a DNS record to create. At your DNS provider add:
   - a **CNAME** record, name `birthdays`, value `cname.vercel-dns.com`
   - (or for a bare domain, an **A** record pointing to `76.76.21.21`)
3. Wait for it to go green — usually minutes, occasionally a few hours.
4. Set `NEXT_PUBLIC_SITE_URL` in Vercel to the final address and redeploy, so
   the links inside emails point to the right place.

### 7. Switch on payments

1. Square Developer Console → your application → **Webhooks → Subscriptions →
   Add subscription**.
2. URL: `https://birthdays.yourdomain.org/api/square/webhook`
3. Select the events `payment.created`, `payment.updated` and `refund.updated`.
4. Copy the **signature key** into `SQUARE_WEBHOOK_SIGNATURE_KEY`, then redeploy.

The URL must match what you registered character for character — a trailing
slash or an http/https mismatch makes every signature check fail, and is the
usual reason a webhook that "should work" silently doesn't.

Test on sandbox first (`SQUARE_ENVIRONMENT=sandbox`) with card
`4111 1111 1111 1111`, CVV `111`, any future expiry, any valid postal code.
To check the failure paths: `4000 0000 0000 0002` declines, CVV `911` is
rejected, postal code `99999` mismatches.

Flip `SQUARE_ENVIRONMENT` to `production` and swap in the production
credentials when you're happy. No code changes are needed to go live.

Card numbers never touch this website. Parents type them on Square's own page.

### 7b. Checking the Square connection

If checkout ever says "we couldn't open the payment page", open:

```
https://your-site/api/square/health
```

It reports which environment the site is pointed at, which variables are
present, and what Square says when asked to list the account's locations.
That separates the three things that actually go wrong: a token belonging to
the other environment, a location id belonging to the other environment, and
a stale pinned API version. It returns no secrets and cannot change anything,
so it is safe to leave deployed.

Note that sandbox and production have completely separate location ids — a
real location id will never work with a sandbox token.

### 8. Switch on email

1. Resend → **Domains** → add your domain and create the DNS records it asks
   for. This is what stops your reminders landing in spam.
2. Set `EMAIL_FROM` to something on that domain, e.g.
   `"Birthday Mini Donuts <birthdays@yourdomain.org>"`.
3. `vercel.json` already schedules the daily job at 13:00 UTC (8am Chicago).
   Nothing else to do — Vercel picks it up on deploy.

Until `RESEND_API_KEY` is set, emails are written to the server log instead of
being sent. Everything else still works.

---

## How the celebration date is chosen

`src/lib/dates.ts` holds all of it. Starting from the child's birthday it walks
forward to the first day that is:

- a delivery weekday (Monday–Friday by default), **and**
- inside the school year, **and**
- not listed in the `no_school_dates` table

So a Shabbos birthday moves to Monday; a birthday during Pesach vacation moves
to the first day back. The parent sees both dates and the reason, live, while
they're filling in the form.

Two things to keep current:

- **Add your no-school days** each year — Yom Tov, vacations, in-service days.
  Admin → Supabase → `no_school_dates`, or via SQL as shown in `seed.sql`.
- **If a school has Sunday sessions**, change `DEFAULT_DELIVERY_DAYS` in
  `dates.ts` to include `0`.

Every suggested date is a suggestion. The administrator can set any date by
hand in the edit panel, which is also how you combine two birthdays onto one
day.

---

## Everyday use

**Office.** `/admin` — search, filter, switch between list and calendar. Click
any order to change the date, the class size, the mini donut count, allergy notes,
payment status, or to refund or cancel. **Export to CSV** opens in Excel.

**Bakery.** `/bakery` — orders grouped by delivery date, with one button to
move each along: Upcoming → Confirmed → Baking → Ready for delivery →
Delivered. Marking an order delivered emails the parent automatically.

**Production sheet.** `/bakery/production` — grouped by school, with the day's
total in a box at the bottom. Print it (Ctrl/⌘ + P); the on-screen chrome
drops away.

**New school year.** `/admin/school-year` — create the year and copy every
family forward. Grades and teachers come across unchanged, so bump them in the
orders list. Parents never re-enter anything.

---

## Things to decide before you launch

- **Pricing.** The seed data prices per mini donut. If you'd rather charge a flat
  fee per birthday, set `per_item_cents` to 0 and put the amount in
  `price_cents`.
- **Who pays.** The system supports both paying yearly and paying per birthday.
  If you only want one, remove the other option in step 3 of the registration
  form.
- **Email confirmation.** Supabase → Authentication → Providers → Email
  controls whether parents must click a link before signing in. Turning it on
  is safer; turning it off is smoother.
- **Backups.** Supabase's free tier keeps limited backups. Once real families
  are in it, the paid tier is worth it.
