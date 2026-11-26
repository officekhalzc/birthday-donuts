/**
 * Shared rules for an office one-time order.
 *
 * The public registration route is deliberately not reused: it walks the
 * celebration date off Shabbos, Sunday, and vacation days, and it requires a
 * birthday. A one-time order keeps the date the office typed.
 */

/** Highest quantity the office form will accept. Guards a stray extra digit. */
export const MAX_ONE_TIME_QUANTITY = 999;

export type PackagePrice = {
  price_cents: number;
  per_item_cents: number;
};

/**
 * Price of one order from the active package.
 * A per-doughnut rate wins; otherwise the flat package price is the whole order.
 * 170 cents × 25 = 4250 ($42.50). 170 × 24 = 4080 ($40.80).
 */
export function orderAmountCents(pkg: PackagePrice, quantity: number): number {
  return pkg.per_item_cents > 0 ? pkg.per_item_cents * quantity : pkg.price_cents;
}

/** "Aryeh Fishman" → first Aryeh, last Fishman. One word stays the first name. */
export function splitPersonName(full: string): { first_name: string; last_name: string } {
  const parts = full.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { first_name: "", last_name: "" };
  if (parts.length === 1) return { first_name: parts[0], last_name: "" };
  return {
    first_name: parts.slice(0, -1).join(" "),
    last_name: parts[parts.length - 1],
  };
}

/**
 * A real calendar day written YYYY-MM-DD.
 * The string is checked, not rewritten, so a typed date cannot shift a day.
 */
export function isCalendarDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  return dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d;
}

/** Whole number of mini doughnuts, or null when it isn't one. */
export function parseQuantity(value: unknown): number | null {
  const n =
    typeof value === "number"
      ? value
      : typeof value === "string" && value.trim() !== ""
        ? Number(value)
        : NaN;
  if (!Number.isInteger(n) || n < 1 || n > MAX_ONE_TIME_QUANTITY) return null;
  return n;
}

export function displayName(first: string, last: string): string {
  return [first.trim(), last.trim()].filter(Boolean).join(" ");
}
