import type { DiscountStatus, DiscountType } from "../types";

/**
 * Shared maths and clock rules for a store product's discount and the window it runs in.
 *
 * The flash sale is not a second pricing system: it is the existing store_products discount
 * (FIXED / PERCENTAGE) plus a validity window (`discountStartsAt` … `discountEndsAt`). Every
 * screen that shows or edits a discount reads these helpers so the dashboard cannot disagree
 * with itself — the Flash Sale page, the store-product table and the assign form all compute
 * the sale price and the LIVE / SCHEDULED / ENDED state here.
 *
 * ONE PRICE PER LISTING. There is exactly one number a customer is shown for a product, and it
 * comes from the store_products row: `storePrice`, with this discount applied. A variant identifies
 * which SKU a line is and caps its stock; it never decides what that line costs. So there is no
 * per-variant price arithmetic in this file, and nothing here should grow one — a second notion of
 * "the price" is how a screen ends up advertising 900 for something the checkout charges 1000 for.
 */

/**
 * The business clock. The UAE has never observed DST, so a fixed +04:00 offset is exact and
 * saves pulling a timezone library in just to resolve one zone.
 */
export const DUBAI_TIME_ZONE = "Asia/Dubai";
const DUBAI_UTC_OFFSET = "+04:00";

const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

/** The fields any discount-carrying row must expose for the window rules below. */
export interface DiscountWindow {
  discountType?: DiscountType | null;
  discountValue?: number | null;
  discountStartsAt?: string | null;
  discountEndsAt?: string | null;
  /** The server's own verdict, when it sent one. Reconciled with the dates in resolveDiscountStatus. */
  discountStatus?: DiscountStatus | null;
}

export type DiscountWindowStatus = "NONE" | "SCHEDULED" | "LIVE" | "ENDED";

/**
 * The lowest unit price a DISCOUNT may produce — the backend's StoreProduct.MIN_UNIT_PRICE, floored
 * in the one place a discounted unit price is computed there and therefore floored here too.
 *
 * A percentage of exactly 100 is allowed by the API (it refuses only ABOVE 100) and arithmetics its
 * way to zero; legacy rows can hold a percentage above 100 or a fixed value of zero or less, which
 * give a free or negative line. The shop charges a cent instead. A preview that showed 0.00 would be
 * showing a price the shop will not charge.
 */
const MIN_UNIT_PRICE = 0.01;

/** Exact cents from a 2-decimal figure — `Math.round` because a bare `* 100` carries float error. */
function toCents(amount: number): number {
  return Math.round(amount * 100);
}

/**
 * The price this discount produces, or null when there is no discount to produce one.
 *
 * DIGIT FOR DIGIT the backend's StoreProduct.effectivePrice arithmetic — PERCENTAGE takes that many
 * percent off the store price, rounded to two decimals HALF_UP, then floored at MIN_UNIT_PRICE;
 * FIXED *is* the new price, unrounded, floored the same way. It has to be exact rather than close:
 * this is what the admin reads before committing a campaign, and a second copy of pricing arithmetic
 * that disagrees with the charge path by a cent is a price they did not intend to set. Prices are
 * VAT-inclusive throughout Buyology, so a sale price is a gross price too — nothing is added on top
 * of it here or server-side.
 *
 * TWO things the server does that this deliberately does not, both because of what the callers need:
 *
 *  - It takes no dates and asks no clock, so it answers what the discount CHARGES rather than what
 *    the listing is charged today. Every caller here needs exactly that: the figure to show for a
 *    scheduled sale (what it will charge) or an ended one (what it did), both of which the server's
 *    effectivePrice deliberately reports as the plain store price. For a LIVE row the callers show
 *    the server's own `effectivePrice` instead of calling this — see the Flash Sale table.
 *  - Where there is no discount the server answers storePrice; this answers null, because a caller
 *    filling a "Sale price" cell has to know there is no sale rather than be handed the normal price
 *    a second time.
 */
export function computeEffectivePrice(
  storePrice: number,
  discountType: DiscountType | "" | null | undefined,
  discountValue: number | null | undefined
): number | null {
  if (!discountType || discountValue == null) return null;
  if (!Number.isFinite(storePrice)) return null;

  let unit: number;
  if (discountType === "PERCENTAGE") {
    // Both figures are DECIMAL(12,2) server-side, so BigDecimal's product is exact and a float
    // `storePrice * (1 - discountValue / 100)` is not. Done in integers — cents times hundredths of a
    // percent — the product is exact here too, and the rounding below is the only approximation.
    const tenThousandths = toCents(storePrice) * (10000 - toCents(discountValue));
    // setScale(2, HALF_UP). A negative result — a legacy percentage above 100 — rounds away from zero
    // there and towards it here, which nothing can observe: the floor replaces every one of them.
    unit = Math.floor(tenThousandths / 10000 + 0.5) / 100;
  } else if (discountType === "FIXED") {
    // FIXED *is* the price and the server does not re-scale it, so neither does this.
    unit = discountValue;
  } else {
    return null;
  }
  return unit < MIN_UNIT_PRICE ? MIN_UNIT_PRICE : unit;
}

/**
 * Where a discount sits relative to its window, at `now`.
 *
 * The two NULL rules are the backward-compatibility contract with every discount that existed
 * before the window did, and they are load-bearing: a NULL start means "already started", a
 * NULL end means "never ends". So a discount with no dates is LIVE — an ordinary permanent
 * markdown, priced exactly as it was before the flash sale shipped.
 *
 * The end instant itself still counts as live (ENDED only once `now` is past it), matching how
 * the backend treats a promo code's expiry.
 */
export function discountWindowStatus(row: DiscountWindow, now: number = Date.now()): DiscountWindowStatus {
  if (!row.discountType || row.discountValue == null) return "NONE";

  const startsAt = row.discountStartsAt ? Date.parse(row.discountStartsAt) : null;
  if (startsAt !== null && !Number.isNaN(startsAt) && startsAt > now) return "SCHEDULED";

  const endsAt = row.discountEndsAt ? Date.parse(row.discountEndsAt) : null;
  if (endsAt !== null && !Number.isNaN(endsAt) && endsAt < now) return "ENDED";

  return "LIVE";
}

/**
 * THE status of a discount, for every screen that badges one.
 *
 * Two sources have to be reconciled and neither is trusted alone. `discountStatus` is the server's
 * own verdict, decided on the clock the customer is actually charged against — but it is as old as
 * the last fetch, and these tables stay open for hours while a sale lapses underneath them. The
 * dates are read against the current tick, but against the browser's clock, which can be wrong.
 *
 * So LIVE is returned only when both agree, and where they disagree the less generous answer wins:
 * a dashboard that hides a running sale costs an admin a refresh, while one that badges a finished
 * sale as live gets a campaign relaunched at prices nobody reviewed.
 */
export function resolveDiscountStatus(row: DiscountWindow, now: number = Date.now()): DiscountWindowStatus {
  const derived = discountWindowStatus(row, now);
  // No discount on the row at all — there is nothing for the server's verdict to qualify.
  if (derived === "NONE") return "NONE";
  const reported = row.discountStatus;
  // Absent, or NONE against a row that plainly carries a discount: a backend that predates the
  // flag. The dates are all there is, and for an undated discount they say LIVE, as they always did.
  if (!reported || reported === "NONE") return derived;
  if (reported === "ENDED" || derived === "ENDED") return "ENDED";
  if (reported === "SCHEDULED" || derived === "SCHEDULED") return "SCHEDULED";
  return "LIVE";
}

/**
 * The server says this discount IS being applied, and our own clock says it is not.
 *
 * resolveDiscountStatus deliberately takes the less generous of the two verdicts, which is the right
 * thing to badge — but not the right thing to make a claim from. The shop charges the server's
 * answer, so wherever a screen states what is being charged ("not applied", "from start"), a browser
 * clock a few minutes fast is enough to make that statement false. This is the one direction that
 * matters: the other disagreements leave the cautious caption true anyway.
 */
export function serverSaysLive(row: DiscountWindow, now: number = Date.now()): boolean {
  return row.discountStatus === "LIVE" && discountWindowStatus(row, now) !== "LIVE";
}

/**
 * Has this sale's window run out — according to the SERVER, and never according to this browser?
 *
 * resolveDiscountStatus is the right answer to badge with, because where the two clocks disagree it
 * takes the cautious view. It is the wrong answer to *act* on. "This sale has ended, so editing its
 * discount makes the discount permanent" is a true sentence only if the sale really has ended, and
 * the dashboard submits a destructive payload off the back of it — `clearDiscountWindow`, which
 * deletes the end date. A browser clock a few hours fast is then enough to turn "edit the discount"
 * into "delete the end date" on a sale that is still running, and the campaign never expires.
 *
 * So no client-side clock reading may drive that payload. Only `discountStatus` counts here: it was
 * decided on the clock customers are charged against. Absent — a backend that predates the flag —
 * this answers false, which is the safe direction: the window stays, and the server drops it itself
 * if it really has run out (StoreProductService.update only discards a DEAD window, judged on its
 * own clock). A dashboard that asks for one confirmation too few is a nuisance; one that silently
 * un-ends a live sale is a pricing incident.
 */
export function serverSaysEnded(row: DiscountWindow): boolean {
  return row.discountStatus === "ENDED";
}

/**
 * A flash sale is a discount that ENDS — a permanent markdown is not one. Used to decide which
 * rows belong on the Flash Sale page and which are just ordinary store pricing.
 */
export function isFlashSale(row: DiscountWindow): boolean {
  return !!row.discountType && row.discountValue != null && !!row.discountEndsAt;
}

/** "HH:mm", optionally with seconds — what an `<input type="time">` emits, and nothing else. */
const WALL_CLOCK_TIME = /^\d{2}:\d{2}(:\d{2})?$/;

/**
 * Turns what an admin typed — a date, and optionally a time of day — into the UTC instant the
 * API stores. Both are read as Dubai wall-clock time, because that is the clock the admin and
 * the shop are on; the conversion happens here, at the edge, and never in the entity.
 *
 * A time this cannot read returns null, and so does a date it cannot read. It used to substitute
 * midnight for anything under four characters and build an unparseable string out of anything else,
 * and both reached the caller as a falsy instant — which every caller reads as "no start was given",
 * i.e. a sale going live at once instead of on the day that was typed. Callers must therefore treat
 * null as "the admin typed something unusable" and say so, never as "nothing was typed".
 */
export function dubaiInstant(date: string, time?: string): string | null {
  if (!date) return null;
  if (time && !WALL_CLOCK_TIME.test(time)) return null;
  // Sliced to HH:mm because the seconds are supplied below; the regex has already guaranteed the
  // first five characters are a wall-clock time.
  const wallClock = `${date}T${time ? time.slice(0, 5) : "00:00"}:00${DUBAI_UTC_OFFSET}`;
  const parsed = new Date(wallClock);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString();
}

/**
 * "Ends 31 March" means the sale runs through all of 31 March in Dubai, so the instant sent is
 * midnight at the *start* of 1 April (+04:00). Adding 24h is exact here — no DST to skip.
 */
export function dubaiEndOfDayInstant(date: string): string | null {
  const dayStart = dubaiInstant(date, "00:00");
  if (!dayStart) return null;
  return new Date(Date.parse(dayStart) + DAY_MS).toISOString();
}

/**
 * An instant as the value a `datetime-local` input wants ("YYYY-MM-DDTHH:mm"), in Dubai time.
 *
 * Editing an existing window round-trips through this pair rather than through the date-only
 * "end of day" shorthand: re-reading an end of "midnight after 31 March" as a bare date and
 * re-applying the shorthand would push the sale a day later every time it was saved.
 */
export function dubaiLocalInputValue(iso: string | null | undefined): string {
  if (!iso) return "";
  const at = new Date(iso);
  if (Number.isNaN(at.getTime())) return "";
  const parts = new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone: DUBAI_TIME_ZONE,
  }).formatToParts(at);
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}T${part("hour")}:${part("minute")}`;
}

/** The inverse: a `datetime-local` value, read as Dubai wall-clock, as the instant to store. */
export function dubaiInstantFromLocalInput(value: string): string | null {
  if (!value) return null;
  const [date, time] = value.split("T");
  return dubaiInstant(date, time);
}

/** An instant as Dubai wall-clock time, so an admin reads back the clock they typed against. */
export function formatDubai(iso: string | null | undefined): string {
  if (!iso) return "—";
  const at = new Date(iso);
  if (Number.isNaN(at.getTime())) return "—";
  return `${new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: DUBAI_TIME_ZONE,
  }).format(at)} Dubai`;
}

/**
 * An INCLUSIVE end instant, written back as the day the admin typed.
 *
 * "Ends 31 March" is stored as midnight at the start of 1 April in Dubai (see
 * dubaiEndOfDayInstant), so rendering that instant plainly reads "1 Apr 2026, 00:00" — a date
 * nobody entered, on a screen whose whole job is to confirm what was entered. A midnight-Dubai
 * end is therefore shown as the whole of the day before it, which is the day the sale covers.
 * Any other time of day is exact and is shown as it is.
 */
export function formatDubaiSaleEnd(iso: string | null | undefined): string {
  if (!iso) return "—";
  const at = new Date(iso);
  if (Number.isNaN(at.getTime())) return "—";
  if (!dubaiLocalInputValue(iso).endsWith("T00:00")) return formatDubai(iso);
  // Exact in Dubai, which has never observed DST, so the previous midnight is always 24h back.
  const lastDay = new Date(at.getTime() - DAY_MS);
  return `${new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: DUBAI_TIME_ZONE,
  }).format(lastDay)}, end of day Dubai`;
}

/**
 * A price with the currency it is charged in.
 *
 * Every store prices in its own country's currency, so a bare number on a screen listing more than
 * one store is ambiguous — and the number being read is one somebody is about to charge. The
 * currency is optional because it is resolved best-effort (store → country → currency): without it
 * the figure still renders, exactly as it did before.
 */
export function formatMoney(amount: number, currency?: string | null): string {
  const value = amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return currency ? `${currency} ${value}` : value;
}

function humanizeSpan(ms: number): string {
  if (ms >= DAY_MS) {
    const days = Math.floor(ms / DAY_MS);
    const hours = Math.floor((ms % DAY_MS) / HOUR_MS);
    return hours > 0 ? `${days}d ${hours}h` : `${days}d`;
  }
  if (ms >= HOUR_MS) {
    const hours = Math.floor(ms / HOUR_MS);
    const minutes = Math.floor((ms % HOUR_MS) / MINUTE_MS);
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  }
  const minutes = Math.max(1, Math.floor(ms / MINUTE_MS));
  return `${minutes}m`;
}

/**
 * How long a sale has left, or how long ago it lapsed. Expiry is silent by design — nothing
 * sweeps an ended sale away — so a lapsed row has to say so in words, not just by its dates.
 */
export function formatTimeLeft(endsAt: string | null | undefined, now: number = Date.now()): string {
  if (!endsAt) return "No end date";
  const ends = Date.parse(endsAt);
  if (Number.isNaN(ends)) return "—";
  const remaining = ends - now;
  return remaining <= 0 ? `Ended ${humanizeSpan(-remaining)} ago` : `${humanizeSpan(remaining)} left`;
}
