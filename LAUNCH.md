# Launch checklist

Work top to bottom. Nothing here needs a developer, but a few items need
answers only you or the school can give.

---

## A. Everything is filled in

School (Yeshivas Tiferes Tzvi + Joan Dachs Bais Yaakov), pricing ($1.70 per
donut), your email, the bakery's email and the school calendar are all in
`seed.sql`. Nothing is left blank.

Three things still need a human eye, all marked `>>> CHECK <<<` in the file:

1. **The end of the school year.** Set to June 24, 2027 as an estimate from last
   year. Update when the school publishes.
2. **Midwinter break's last day.** The published calendar stops at Feb 1. The
   break starts Wed Jan 27; I've assumed it runs through Feb 2 and school
   resumes Feb 3, matching last year's pattern.
3. **Everything after February 2027** is projected — Purim, Pesach and Shavuos
   are calculated from the Hebrew dates plus last year's break lengths, not
   from a published calendar. Replace Part B of the no-school list when the
   school puts the full year out.

Two judgment calls I made that you may want to reverse:

- **Fast days are excluded** even though school is in session — Tzom Gedaliah,
  Asarah B'Teves and Taanis Esther. A birthday celebration with donuts on a
  taanis seemed wrong. Delete those three rows if you disagree.
- **Thanksgiving is NOT excluded.** It isn't on either the current or last
  year's calendar, so JDBY-YTT appears to hold school on Nov 26, 2026. Worth
  one phone call to confirm before a birthday lands there.

---

## B2. The sending address needs a domain

Resend won't let you send from a `gmail.com` address — you can only send from a
domain you control and have verified with DNS records. So
`nourishtoflourishevent@gmail.com` works fine as the address that *receives* the
weekly summary, but it can't be the "from" on parent emails.

`.env.example` is set up to send from **birthdays@nourishtoflourish613.org**,
since you already own that domain. In Resend, add `nourishtoflourish613.org`
under Domains and create the DNS records it gives you at Cloudflare — the same
place you set up that site's DNS.

If you'd rather the emails come from the shul's domain instead, use that and
verify it the same way.

---

## C. Accounts to create

- [ ] **Supabase** project → run `schema.sql`, then `seed.sql`
- [ ] **Square** credentials from Manna Bakehouse → sandbox set first, production set once tested
- [ ] **Resend** account → domain verified (this is what keeps reminders out of spam)
- [ ] **Vercel** account → connected to a GitHub repo holding this folder

---

## D. Deploy

Follow README steps 5 through 8. In order: push to GitHub, import to Vercel,
paste in the environment variables, add your domain, then connect the Square
webhook and the Resend domain.

- [ ] Site loads on your real domain over https
- [ ] `NEXT_PUBLIC_SITE_URL` set to that same domain and redeployed
      (email links point here — wrong value means dead payment links)

---

## E. Test before you tell any parents

Do this on **Square sandbox** first (`SQUARE_ENVIRONMENT=sandbox`), with card
`4111 1111 1111 1111`, CVV `111`, any future expiry, any valid postal code.

- [ ] Register a fake child with a **Shabbos birthday** — confirm the
      celebration date moves to the next school day
- [ ] Register one with a **birthday during Pesach** — confirm it moves past
      the whole vacation
- [ ] Register one with a **summer birthday** — confirm it lands at the start
      of the school year
- [ ] Confirmation email arrives, and its payment link opens your orders
- [ ] Pay with the test card → order flips to Paid in `/admin`
- [ ] Pay with `4000 0000 0000 0002` → order stays unpaid, nothing reaches the
      bake queue
- [ ] Double-click Pay → exactly one charge appears in the Square dashboard
- [ ] Refund a paid order from `/admin` → only that birthday is refunded, not
      the family's other birthdays
- [ ] Check a payment in the Square dashboard shows the child's name, school
      and delivery date, so Manna can reconcile it against the production sheet
- [ ] Sign in at `/admin/login` as the bakery account → confirm you **cannot**
      see parent contact details or any dollar figures
- [ ] Print the production sheet and show it to Manna Bakehouse — ask them
      directly whether it has what they need at 5am
- [ ] Delete the test registrations from Supabase before going live

Then set `SQUARE_ENVIRONMENT=production`, swap in the production credentials,
re-point the webhook subscription at the live URL, and redeploy.

---

## F. Before the first real birthday

- [ ] Agree a cutoff with the bakery: how many days ahead do they need an
      order locked? The 7-day reminder assumes about a week.
- [ ] Decide who watches the unpaid column, and what happens if a birthday
      arrives unpaid — does the bakery still deliver?
- [ ] Tell parents the registration link exists. Nothing in the system
      recruits them.
