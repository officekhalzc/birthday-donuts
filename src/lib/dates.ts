/**
 * Everything to do with turning a child's actual birthday into a date the
 * bakery can actually deliver on.
 *
 * Dates are handled as plain 'YYYY-MM-DD' strings so a birthday never shifts
 * a day because of a timezone.
 */

export type SchoolYear = { id: string; label: string; starts_on: string; ends_on: string };
export type NoSchoolDate = { date: string; reason: string | null; school_id: string | null };

/**
 * Weekdays the bakery delivers. 0 = Sunday.
 *
 * Set to Monday–Friday. Note that YTT does hold school on Sunday
 * (9:15 AM – 1:15 PM), so Sunday birthdays are being moved to Monday by
 * choice, not necessity. If Manna Bakehouse can deliver on Sundays and the
 * school is happy to host, add 0 to this list and Sunday birthdays will
 * stay put.
 *
 * Friday is included, but all grades are dismissed at 12:30 PM, so a Friday
 * delivery has to arrive in the morning.
 */
export const DEFAULT_DELIVERY_DAYS = [1, 2, 3, 4, 5];

const WEEKDAY = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Shabbos"];

export function parseDate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d, 12, 0, 0);
}

export function toISO(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function addDays(iso: string, n: number): string {
  const d = parseDate(iso);
  d.setDate(d.getDate() + n);
  return toISO(d);
}

/** 'Tuesday, September 15' */
export function formatLong(iso: string): string {
  const d = parseDate(iso);
  return `${WEEKDAY[d.getDay()]}, ${d.toLocaleDateString("en-US", { month: "long", day: "numeric" })}`;
}

/** 'Sep 15, 2026' */
export function formatShort(iso: string): string {
  return parseDate(iso).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });
}

/** The child's birthday as it lands inside a given school year. */
export function birthdayInYear(birthday: string, year: SchoolYear): string {
  const [, month, day] = birthday.split("-");
  const startYear = Number(year.starts_on.slice(0, 4));
  const endYear = Number(year.ends_on.slice(0, 4));
  const inStart = `${startYear}-${month}-${day}`;
  if (inStart >= year.starts_on && inStart <= year.ends_on) return inStart;
  const inEnd = `${endYear}-${month}-${day}`;
  if (inEnd >= year.starts_on && inEnd <= year.ends_on) return inEnd;
  return inStart; // summer birthday — falls outside the year
}

export type CelebrationResult = {
  date: string;
  moved: boolean;
  reason: string | null;
};

/**
 * Pick the school celebration date.
 *
 * Walks forward from the birthday to the first day that is a delivery weekday,
 * inside the school year, and not on the no-school list. Everything it returns
 * is only a suggestion — the administrator can always override it.
 */
export function suggestCelebrationDate(
  birthday: string,
  year: SchoolYear,
  noSchool: NoSchoolDate[] = [],
  schoolId?: string,
  deliveryDays: number[] = DEFAULT_DELIVERY_DAYS
): CelebrationResult {
  const closed = new Map<string, string>();
  for (const n of noSchool) {
    if (n.school_id === null || n.school_id === schoolId) {
      closed.set(n.date, n.reason || "No school");
    }
  }

  const actual = birthdayInYear(birthday, year);

  // Summer and other out-of-year birthdays are celebrated once school is back.
  let cursor = actual;
  let reason: string | null = null;
  if (cursor < year.starts_on) {
    cursor = year.starts_on;
    reason = "Summer birthday — celebrated at the start of the school year";
  } else if (cursor > year.ends_on) {
    cursor = year.ends_on;
    reason = "Birthday falls after the last day of school";
  }

  const firstDay = parseDate(cursor).getDay();
  if (!reason) {
    if (firstDay === 6) reason = "Birthday falls on Shabbos";
    else if (firstDay === 0) reason = "Birthday falls on Sunday";
    else if (closed.has(cursor)) reason = `No school that day — ${closed.get(cursor)}`;
  }

  for (let i = 0; i < 60; i++) {
    const candidate = addDays(cursor, i);
    if (candidate > year.ends_on) break;
    const dow = parseDate(candidate).getDay();
    if (!deliveryDays.includes(dow)) continue;
    if (closed.has(candidate)) continue;
    return { date: candidate, moved: candidate !== actual, reason: candidate !== actual ? reason : null };
  }

  // Nothing ahead worked — try walking backwards instead.
  for (let i = 1; i < 60; i++) {
    const candidate = addDays(cursor, -i);
    if (candidate < year.starts_on) break;
    const dow = parseDate(candidate).getDay();
    if (!deliveryDays.includes(dow)) continue;
    if (closed.has(candidate)) continue;
    return {
      date: candidate,
      moved: true,
      reason: reason || "Moved to the closest available school day",
    };
  }

  return { date: actual, moved: false, reason: "Could not find an open school day — please set this date manually" };
}

export function money(cents: number): string {
  return (cents / 100).toLocaleString("en-US", { style: "currency", currency: "USD" });
}

/** Sunday-first grid of the weeks covering a month, for the calendar. */
export function monthGrid(year: number, month: number): string[][] {
  const first = new Date(year, month, 1, 12);
  const start = new Date(first);
  start.setDate(1 - first.getDay());
  const weeks: string[][] = [];
  const cur = new Date(start);
  for (let w = 0; w < 6; w++) {
    const week: string[] = [];
    for (let d = 0; d < 7; d++) {
      week.push(toISO(cur));
      cur.setDate(cur.getDate() + 1);
    }
    weeks.push(week);
    if (cur.getMonth() !== month && cur > new Date(year, month + 1, 1, 12)) break;
  }
  return weeks;
}
