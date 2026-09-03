import type { Config } from "@netlify/functions";

/**
 * Daily trigger for the reminder emails.
 *
 * The email logic itself lives in src/app/api/cron/reminders/route.ts — this
 * function only calls it on a schedule, because Netlify does not read the
 * "crons" block in vercel.json. Keeping both means the project deploys to
 * either host without changes.
 *
 * 13:00 UTC is 8am Chicago in summer (CDT) and 7am in winter (CST). Cron on
 * Netlify is always UTC, so the local hour shifts with daylight saving. If you
 * would rather it stay at 8am year round, change this to "0 14 * * *" for the
 * winter months.
 */
export default async (req: Request) => {
  const base = Netlify.env.get("NEXT_PUBLIC_SITE_URL") ?? Netlify.env.get("URL");

  if (!base) {
    console.error(
      "Reminders skipped: neither NEXT_PUBLIC_SITE_URL nor URL is set, so there is no address to call."
    );
    return;
  }

  const secret = Netlify.env.get("CRON_SECRET");
  if (!secret) {
    console.warn(
      "CRON_SECRET is not set. The reminders route will accept the call, but it is also open to anyone who finds the URL."
    );
  }

  const endpoint = `${base.replace(/\/$/, "")}/api/cron/reminders`;

  try {
    const res = await fetch(endpoint, {
      headers: secret ? { authorization: `Bearer ${secret}` } : {},
    });
    const body = await res.text();

    if (!res.ok) {
      console.error(`Reminders failed: ${res.status} ${res.statusText} — ${body}`);
      return;
    }

    console.log(`Reminders sent: ${body}`);
  } catch (err) {
    console.error(`Reminders could not reach ${endpoint}:`, err);
  }
};

export const config: Config = {
  schedule: "0 13 * * *",
};
