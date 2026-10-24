/**
 * Warranty lengths are stored in whole months. Admins may type them in months or years; these
 * helpers convert both ways and format them the same way everywhere ("1 year", "18 months").
 */

export type WarrantyUnit = "months" | "years";

/** Ten years, matching the backend limit. */
export const MAX_WARRANTY_MONTHS = 120;

/** Dithari's public warranty checker; it opens straight on the card for ?serial=. */
export const DITHARI_WARRANTY_URL = "https://v2.dithari.com/warranty";

export function dithariWarrantyUrl(serial: string): string {
  return `${DITHARI_WARRANTY_URL}?serial=${encodeURIComponent(serial)}`;
}

export function formatWarranty(months: number | null | undefined): string {
  if (months == null || months < 1) return "No warranty";
  if (months % 12 === 0) {
    const years = months / 12;
    return `${years} ${years === 1 ? "year" : "years"}`;
  }
  return `${months} ${months === 1 ? "month" : "months"}`;
}

/** The friendliest way to show a stored length in a number + unit input. */
export function splitWarranty(months: number): { value: string; unit: WarrantyUnit } {
  return months % 12 === 0
    ? { value: String(months / 12), unit: "years" }
    : { value: String(months), unit: "months" };
}

/** Months for a typed number + unit, or an error message when it is not a usable length. */
export function warrantyMonthsFrom(
  value: string,
  unit: WarrantyUnit,
): { months: number; error?: undefined } | { months?: undefined; error: string } {
  const trimmed = value.trim();
  if (trimmed === "") return { error: "Enter the warranty length." };
  const n = Number(trimmed);
  if (!Number.isInteger(n) || n < 1) return { error: "Use a whole number of at least 1." };
  const months = unit === "years" ? n * 12 : n;
  if (months > MAX_WARRANTY_MONTHS) return { error: "A warranty can be at most 10 years (120 months)." };
  return { months };
}
