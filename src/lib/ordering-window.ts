/**
 * When parents may place an order.
 *
 * Ordering opens on the 1st of each month. Everything here is worked out in
 * Chicago time, not the visitor's own timezone — a parent travelling, or a
 * phone set to the wrong zone, must still see the same answer as the school.
 */

const SCHOOL_TIMEZONE = "America/Chicago";

export const ONE_TIME_ORDER_EMAIL = "nourishtoflourishevent@gmail.com";

/** Today's date as the school sees it. */
export function schoolToday(now: Date = new Date()): { year: number; month: number; day: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: SCHOOL_TIMEZONE,
    year: "numeric",
    month: "numeric",
    day: "numeric",
  }).formatToParts(now);

  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  return { year: get("year"), month: get("month"), day: get("day") };
}

export type OrderingWindow = {
  isOpen: boolean;
  /** 'Sunday, November 1' — the next day ordering opens. */
  nextOpensLabel: string;
  /** Whole days until it opens. 0 when open today. */
  daysUntilOpen: number;
  /** 'November' — the month this opening covers. */
  nextOpensMonth: string;
};

export function getOrderingWindow(now: Date = new Date()): OrderingWindow {
  const { year, month, day } = schoolToday(now);
  const isOpen = day === 1;

  // The next 1st. If today is the 1st, that is today.
  const openYear = isOpen ? year : month === 12 ? year + 1 : year;
  const openMonth = isOpen ? month : month === 12 ? 1 : month + 1;

  // Midday avoids any daylight-saving edge landing on the wrong date.
  const opensOn = new Date(openYear, openMonth - 1, 1, 12, 0, 0);
  const todayNoon = new Date(year, month - 1, day, 12, 0, 0);

  const daysUntilOpen = Math.max(
    0,
    Math.round((opensOn.getTime() - todayNoon.getTime()) / 86_400_000)
  );

  return {
    isOpen,
    daysUntilOpen,
    nextOpensLabel: opensOn.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
    }),
    nextOpensMonth: opensOn.toLocaleDateString("en-US", { month: "long" }),
  };
}

/** A pre-addressed email for a birthday that can't wait for the next opening. */
export function oneTimeOrderMailto(): string {
  const subject = "One-time mini doughnut order request";
  const body = [
    "Hello,",
    "",
    "I would like to request a one-time mini doughnut order outside the usual ordering date.",
    "",
    "Child's name:",
    "Grade and class:",
    "Child's birthday:",
    "Number of mini doughnuts:",
    "Any allergy information:",
    "",
    "Thank you.",
  ].join("\n");

  return `mailto:${ONE_TIME_ORDER_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
