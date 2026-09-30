import { useCallback, useEffect, useMemo, useState } from "react";
import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import Badge from "../../components/ui/badge/Badge";
import { Modal } from "../../components/ui/modal";
import { flashSaleService, storeProductsService, ApiRequestError } from "../../api";
import { FLASH_SALE_PAGE_SIZE, readFlashSaleTotal } from "../../api/services/flashSale.service";
import type {
  AssignFlashSaleRequest,
  DiscountType,
  FlashSaleItem,
  FlashSaleStatus,
  Store,
  StoreProductResponse,
} from "../../types";
import { useStoreCurrencies } from "../../hooks/useStoreCurrencies";
import { productLabel } from "../../utils/storeProduct";
import {
  computeEffectivePrice,
  serverSaysLive,
  dubaiEndOfDayInstant,
  dubaiInstant,
  formatDubai,
  formatDubaiSaleEnd,
  formatMoney,
  formatTimeLeft,
  isFlashSale,
  resolveDiscountStatus,
} from "../../utils/flashSale";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function discountLabel(
  discountType: DiscountType | null,
  discountValue: number | null,
  currency: string
): string {
  if (!discountType || discountValue == null) return "—";
  return discountType === "PERCENTAGE"
    ? `${discountValue}% OFF`
    : `Sale: ${formatMoney(discountValue, currency)}`;
}

/**
 * What a sale price takes off, as a percentage — how a one-price batch reads row by row. Null when
 * there is no price to take it off: a listing stored at zero has no percentage to be off it, and
 * dividing by it renders "-Infinity% off" in the column an admin is reading to sanity-check a batch.
 */
function percentOff(storePrice: number, salePrice: number): number | null {
  if (!(storePrice > 0)) return null;
  return Math.round((1 - salePrice / storePrice) * 100);
}

/** The discount a listing ALREADY carries, or null. */
interface ExistingSale {
  /** SCHEDULED / LIVE / ENDED — never NONE, which is what null stands for. */
  state: "SCHEDULED" | "LIVE" | "ENDED";
  /** The discount itself: "20% OFF", "Sale: AED 999.00". */
  what: string;
  /** What the shop charges for it today, when the discount is running. */
  chargingNow: number | null;
}

/**
 * What saving this batch would REPLACE on a listing.
 *
 * Every id in the batch gets the discount and the window this modal sets — the API writes all four
 * columns, it does not merge — so a product already at 40% off quietly becomes 20% off, and a
 * campaign running right now has its end date moved. That is an overwrite an admin has to be shown
 * before it happens, on the row and again in the batch summary, or the only visible consequence is
 * on the shop.
 */
function existingSale(
  sp: StoreProductResponse,
  currency: string,
  now: number
): ExistingSale | null {
  const state = resolveDiscountStatus(sp, now);
  if (state === "NONE") return null;
  return {
    state,
    what: discountLabel(sp.discountType, sp.discountValue, currency),
    chargingNow: state === "LIVE" && sp.effectivePrice < sp.storePrice ? sp.effectivePrice : null,
  };
}

/** The same thing as one phrase, for the picker row and the impact list. */
function existingSaleNote(sale: ExistingSale, sp: StoreProductResponse): string {
  const through = sp.discountEndsAt ? `through ${formatDubaiSaleEnd(sp.discountEndsAt)}` : "with no end date";
  if (sale.state === "LIVE") return `Already on sale: ${sale.what}, ${through}`;
  if (sale.state === "SCHEDULED") return `Sale already scheduled: ${sale.what}, ${through}`;
  return `A finished sale is still on this listing: ${sale.what}`;
}

/**
 * The state to badge this row with: the shared rule, plus the one thing specific to this page.
 *
 * A flash-sale row carries a discount by definition, so NONE can only mean the row lost its
 * discount underneath us. Saying ENDED is the safe half of that: never claim a sale is running.
 */
function statusOf(item: FlashSaleItem, now: number): FlashSaleStatus {
  const status = resolveDiscountStatus(item, now);
  return status === "NONE" ? "ENDED" : status;
}

const STATUS_COLOR: Record<FlashSaleStatus, "success" | "info" | "error"> = {
  LIVE: "success",
  SCHEDULED: "info",
  ENDED: "error",
};

// ---------------------------------------------------------------------------
// Shared style constants — same set the store-product screens use
// ---------------------------------------------------------------------------

const inputCls =
  "w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-2.5 text-sm text-gray-800 dark:text-white placeholder-gray-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-400/20 transition-all";

const labelCls = "block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1";

const selectCls =
  "w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-2.5 text-sm text-gray-800 dark:text-white focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-400/20 transition-all";

function Spinner() {
  return (
    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Assign-to-sale Modal
// ---------------------------------------------------------------------------

interface AssignModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAssigned: () => void;
  /** Resolved once for the whole page — see useStoreCurrencies. */
  stores: Store[];
  currencyOf: (storeId: string) => string;
  /** Why the store list is empty, when it is empty because of a failure rather than a shop with none. */
  storesError: string | null;
}

function AssignToFlashSaleModal({
  isOpen,
  onClose,
  onAssigned,
  stores,
  currencyOf,
  storesError,
}: AssignModalProps) {
  const [storeId, setStoreId] = useState("");

  const [products, setProducts] = useState<StoreProductResponse[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [productsError, setProductsError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string[]>([]);

  const [discountType, setDiscountType] = useState<DiscountType>("PERCENTAGE");
  const [discountValue, setDiscountValue] = useState("");
  const [startDate, setStartDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endDate, setEndDate] = useState("");
  const [endTime, setEndTime] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // The currency every price in this modal is in. A batch is one store's listings, so it is one
  // currency — and a fixed sale price typed against the wrong one is a whole mispriced campaign.
  const currency = currencyOf(storeId);

  // Stores drive the product picker: the batch is addressed by store-product id, so the admin
  // picks a store first and then the rows inside it.
  useEffect(() => {
    // Selection is cleared with the store, INCLUDING when the store is cleared back to blank.
    // Rows the admin can no longer see are how the wrong product goes on sale, and ids left over from
    // a store whose products are no longer loaded resolve to no rows at all — which validate() below
    // has to refuse rather than post an empty batch.
    setSelected([]);
    if (!storeId) {
      setProducts([]);
      setProductsError(null);
      return;
    }
    const ctrl = new AbortController();
    (async () => {
      setProductsLoading(true);
      setProductsError(null);
      try {
        const res = await storeProductsService.list(storeId, ctrl.signal);
        setProducts(res.data ?? []);
      } catch (err) {
        if ((err as { name?: string }).name === "AbortError") return;
        setProductsError(err instanceof ApiRequestError ? err.message : "Failed to load store products.");
      } finally {
        setProductsLoading(false);
      }
    })();
    return () => ctrl.abort();
  }, [storeId]);

  const value = parseFloat(discountValue) || 0;

  const startsAt = startDate ? dubaiInstant(startDate, startTime) : null;
  // With no time given, the end is midnight after that day — so "ends 31 March" runs through all
  // of 31 March in Dubai rather than stopping at breakfast.
  const endsAt = endDate ? (endTime ? dubaiInstant(endDate, endTime) : dubaiEndOfDayInstant(endDate)) : null;

  const selectedProducts = useMemo(
    () => products.filter((p) => selected.includes(p.id)),
    [products, selected]
  );

  // Which of this store's listings are ALREADY discounted, resolved once per load.
  //
  // Read on every render against a fresh Date.now() this would re-classify a sale as it lapsed under
  // an open modal; one instant per fetch is enough, because what this drives is a warning about what
  // saving replaces and not a price. A row whose sale ends while the modal is open is already covered
  // — the API writes over whatever is there in either case, and the warning is no less true.
  const existingSales = useMemo(() => {
    const at = Date.now();
    const map = new Map<string, ExistingSale>();
    products.forEach((p) => {
      const sale = existingSale(p, currency, at);
      if (sale) map.set(p.id, sale);
    });
    return map;
  }, [products, currency]);

  // What the batch will actually charge, row by row. One discount across products of different
  // values lands differently on each of them, and a single FIXED price is the case where that is
  // almost always a mistake — so it is spelled out before saving, not discovered afterwards.
  //
  // Only ONE price per row, and it is the listing's: a variant identifies a line and caps its stock,
  // it does not carry a price of its own. There is deliberately no per-variant preview here — an
  // earlier version of this screen had one, and it described a charge the checkout does not make.
  const impact = useMemo(
    () =>
      selectedProducts.map((p) => {
        const salePrice = computeEffectivePrice(p.storePrice, discountType, value);
        return {
          product: p,
          salePrice,
          off: salePrice != null ? percentOff(p.storePrice, salePrice) : null,
          replaces: existingSales.get(p.id) ?? null,
        };
      }),
    [selectedProducts, discountType, value, existingSales]
  );

  // How much of this selection is an overwrite rather than a new sale. Counted separately from the
  // row notes because a batch of forty is scrolled past, and "6 of these are already on sale" is the
  // sentence that stops a campaign being replaced by accident.
  const replacingLive = impact.filter((r) => r.replaces && r.replaces.state !== "ENDED").length;

  // And how much of it no customer can see. Counted for the same reason: the per-row tag is on the
  // picker, which is scrolled past, and "3 of these are hidden" is what stops a campaign being
  // launched with a third of it invisible.
  const notVisible = impact.filter((r) => !r.product.isActive || !r.product.b2cEnabled).length;

  const visible = products.filter((p) =>
    search
      ? (p.productTitle ?? "").toLowerCase().includes(search.toLowerCase()) ||
        p.productSku.toLowerCase().includes(search.toLowerCase())
      : true
  );

  /** Everything the API will refuse, checked here so the admin sees it before saving. */
  function validate(): string | null {
    if (selected.length === 0) return "Select at least one product.";
    if (selectedProducts.length === 0) {
      return "The products selected are no longer in this store's list — pick them again.";
    }
    if (!(value > 0)) return "Enter a discount above zero.";
    if (discountType === "PERCENTAGE" && value >= 100) return "A percentage discount must be under 100%.";
    if (discountType === "FIXED") {
      // A FIXED value IS the sale price, so at or above the store price it is a price rise wearing a
      // sale badge. Checked per product because one fixed price is applied to the whole batch.
      const tooHigh = selectedProducts.find((p) => value >= p.storePrice);
      if (tooHigh) {
        return `${productLabel(tooHigh)} sells for ${formatMoney(
          tooHigh.storePrice,
          currency
        )} — a fixed sale price of ${formatMoney(value, currency)} is not a discount.`;
      }
    }
    // dubaiInstant answers null both for "nothing was typed" and for "what was typed cannot be read",
    // and the two must not share a message. An unreadable START is the dangerous one: indistinguishable
    // from no start at all, it would post a batch that goes live immediately instead of on the day the
    // admin set. Refused here so the date on screen and the date in the payload cannot differ.
    if (startDate && !startsAt) {
      return "That start date and time could not be read — set them again, or clear the start.";
    }
    if (endDate && !endsAt) {
      return "That end date and time could not be read — set them again.";
    }
    if (!endsAt) return "An end date is required — a sale with no end is just a permanent markdown.";
    if (Date.parse(endsAt) <= Date.now()) return "That end date has already passed in Dubai.";
    // A time needs a day to belong to: the payload carries instants, so a start time with no start
    // date would simply be dropped and the sale would go live immediately instead.
    if (startTime && !startDate) {
      return "Set a start date as well, or clear the start time — a time with no date is not a start.";
    }
    if (startsAt && Date.parse(startsAt) >= Date.parse(endsAt)) return "The sale has to start before it ends.";
    return null;
  }

  async function handleSubmit() {
    const problem = validate();
    if (problem) {
      setError(problem);
      return;
    }
    const payload: AssignFlashSaleRequest = {
      items: selectedProducts.map((p) => ({ storeProductId: p.id })),
      discountType,
      discountValue: value,
      endsAt: endsAt as string,
      ...(startsAt && { startsAt }),
    };
    setSubmitting(true);
    setError(null);
    try {
      await flashSaleService.assign(payload);
      onAssigned();
      onClose();
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : "Failed to put these products on sale.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-2xl w-full">
      <div className="p-6 space-y-5">
        <div>
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Add Products to the Flash Sale</h3>
          <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
            One discount and one window, applied to every product you pick.
          </p>
        </div>

        {/* Store */}
        <div>
          <label className={labelCls}>Store *</label>
          <select className={selectCls} value={storeId} onChange={(e) => setStoreId(e.target.value)}>
            <option value="">Select a store…</option>
            {stores.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} — {s.countryName}
                {currencyOf(s.id) && ` (${currencyOf(s.id)})`}
              </option>
            ))}
          </select>
          {/* An empty picker with no explanation is where this modal became a dead end: the admin
              cannot get past the first field and nothing on screen says why. */}
          {stores.length === 0 && (
            <p className={`mt-1 text-xs ${storesError ? "text-red-500" : "text-gray-400"}`}>
              {storesError
                ? `${storesError} Close this, retry loading the stores, and try again.`
                : "There are no stores to put a sale in yet — create one first."}
            </p>
          )}
        </div>

        {/* Products */}
        {storeId && (
          <div>
            <div className="flex items-end justify-between gap-3">
              <label className={labelCls}>
                Products * {selected.length > 0 && <span className="text-brand-500">({selected.length} selected)</span>}
              </label>
              {selected.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSelected([])}
                  className="mb-1 text-xs font-medium text-gray-500 hover:text-gray-700 dark:text-gray-400"
                >
                  Clear
                </button>
              )}
            </div>
            <input
              type="text"
              className={inputCls}
              placeholder="Search this store's products by name or SKU…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />

            <div className="mt-2 max-h-56 overflow-y-auto rounded-xl border border-gray-100 dark:border-gray-700 divide-y divide-gray-50 dark:divide-gray-700/50">
              {productsLoading ? (
                <div className="flex items-center justify-center gap-2 py-6 text-gray-400">
                  <Spinner />
                  <span className="text-sm">Loading…</span>
                </div>
              ) : productsError ? (
                <p className="py-4 text-center text-sm text-red-500">{productsError}</p>
              ) : visible.length === 0 ? (
                // Two different facts, and they were both reported as the first one. "No products in
                // this store" sent an admin to go and assign products to a store that already had
                // four hundred of them, because the search box two lines up had "iphone 16" in it.
                <p className="py-4 text-center text-sm text-gray-400">
                  {products.length === 0 ? (
                    "No products in this store."
                  ) : (
                    <>
                      Nothing here matches “{search}”. {products.length}{" "}
                      {products.length === 1 ? "product is" : "products are"} assigned to this store.
                    </>
                  )}
                </p>
              ) : (
                visible.map((p) => {
                  const isSelected = selected.includes(p.id);
                  // What this row is on TODAY. The preview beside it is computed from storePrice, which
                  // is right — a new discount replaces the old one rather than compounding with it —
                  // but that made an already-discounted listing look untouched, so the row showed a
                  // "normal price" the shop has not charged for a fortnight and said nothing about the
                  // campaign the save would overwrite.
                  const already = existingSales.get(p.id) ?? null;
                  const preview = computeEffectivePrice(p.storePrice, discountType, value);
                  // Whether a customer can see this listing at all. A sale on a listing that is
                  // switched off, or switched out of the consumer shop, discounts nothing: the row
                  // sits on the Flash Sale table looking live, the campaign is counted as N products,
                  // and the shop shows N-minus-the-hidden-ones. The picker is where that is cheap to
                  // notice — afterwards it takes a visit to the storefront to find out.
                  const hidden = !p.isActive ? "Inactive" : !p.b2cEnabled ? "Not in the shop" : null;
                  return (
                    <label
                      key={p.id}
                      title={productLabel(p)}
                      className="flex cursor-pointer items-center gap-3 px-4 py-2.5 transition-colors hover:bg-brand-50/60 dark:hover:bg-brand-500/10"
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() =>
                          setSelected((ids) => (isSelected ? ids.filter((id) => id !== p.id) : [...ids, p.id]))
                        }
                      />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-1.5">
                          <span className="min-w-0 truncate text-sm font-medium text-gray-800 dark:text-white">
                            {productLabel(p)}
                          </span>
                          {hidden && (
                            <span
                              className="shrink-0 rounded-full bg-gray-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-gray-500 dark:bg-gray-700 dark:text-gray-300"
                              title={
                                hidden === "Inactive"
                                  ? "This listing is switched off in the store, so no customer sees it — a sale on it discounts nothing until it is reactivated."
                                  : "This listing is out of the consumer shop (B2C off), so a flash sale on it reaches no shopper."
                              }
                            >
                              {hidden}
                            </span>
                          )}
                        </span>
                        <span className="block font-mono text-xs text-gray-400">{p.productSku}</span>
                        {already && (
                          <span
                            className={`mt-0.5 block text-xs ${
                              already.state === "ENDED" ? "text-gray-400" : "text-amber-600 dark:text-amber-400"
                            }`}
                          >
                            {existingSaleNote(already, p)}
                            {isSelected && already.state !== "ENDED" && " — this save replaces it"}
                          </span>
                        )}
                      </span>
                      <span className="shrink-0 text-right text-xs">
                        <span
                          className={
                            already?.chargingNow != null
                              ? "block text-gray-400 line-through"
                              : "block text-gray-500 dark:text-gray-400"
                          }
                        >
                          {formatMoney(p.storePrice, currency)}
                        </span>
                        {/* Today's price, when it is not the one above it. The new sale is worked out
                            from storePrice — a discount replaces, it does not stack — so both figures
                            have to be on the row for the preview underneath to mean anything. */}
                        {already?.chargingNow != null && (
                          <span className="block text-amber-600 dark:text-amber-400">
                            now {formatMoney(already.chargingNow, currency)}
                          </span>
                        )}
                        {isSelected && preview !== null && preview > 0 && preview < p.storePrice && (
                          <span className="block font-semibold text-green-600 dark:text-green-400">
                            → {formatMoney(preview, currency)}
                          </span>
                        )}
                      </span>
                    </label>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* Discount */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Discount *</label>
            <select
              className={selectCls}
              value={discountType}
              onChange={(e) => setDiscountType(e.target.value as DiscountType)}
            >
              <option value="PERCENTAGE">Percentage (%)</option>
              <option value="FIXED">Fixed Sale Price</option>
            </select>
          </div>
          <div>
            <label className={labelCls}>
              {discountType === "PERCENTAGE"
                ? "Discount % (1–99)"
                : `Fixed Sale Price${currency ? ` (${currency})` : ""}`}
            </label>
            <input
              type="number"
              min={discountType === "PERCENTAGE" ? 1 : 0.01}
              max={discountType === "PERCENTAGE" ? 99 : undefined}
              step={discountType === "PERCENTAGE" ? 1 : 0.01}
              className={inputCls}
              placeholder={discountType === "PERCENTAGE" ? "e.g. 25" : "e.g. 999.00"}
              value={discountValue}
              onChange={(e) => setDiscountValue(e.target.value)}
            />
          </div>
        </div>

        {/* What this batch does to each product it is applied to */}
        {impact.length > 0 && value > 0 && (
          <div className="space-y-2">
            {replacingLive > 0 && (
              <p className="rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-100 dark:border-amber-500/20 px-4 py-2.5 text-xs text-amber-700 dark:text-amber-400">
                <strong>
                  {replacingLive} of these {replacingLive === 1 ? "products is" : "products are"} already on a
                  sale
                </strong>{" "}
                that is running or scheduled. Saving replaces its discount and its dates with the ones above —
                it is not added on top, and the old campaign cannot be recovered from this screen. The rows
                below say which.
              </p>
            )}
            {notVisible > 0 && (
              <p className="rounded-xl bg-gray-50 dark:bg-white/[0.03] border border-gray-100 dark:border-gray-700 px-4 py-2.5 text-xs text-gray-600 dark:text-gray-300">
                <strong>
                  {notVisible} of these {notVisible === 1 ? "listings is" : "listings are"} not visible to
                  customers
                </strong>{" "}
                — switched off in the store, or out of the consumer shop. The sale saves and the row appears
                here, but no shopper sees the price until the listing is turned back on.
              </p>
            )}
            {discountType === "FIXED" && impact.length > 1 && (
              <p className="rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-100 dark:border-amber-500/20 px-4 py-2.5 text-xs text-amber-700 dark:text-amber-400">
                One fixed price of <strong>{formatMoney(value, currency)}</strong> charges the same for all{" "}
                {impact.length} products, whatever each normally sells for — so the discount it works out to is
                different on every row below. A percentage keeps each product's own price relationship.
              </p>
            )}
            <div className="rounded-xl border border-gray-100 dark:border-gray-700">
              <p className="border-b border-gray-100 dark:border-gray-700 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                What customers will pay
              </p>
              <div className="max-h-40 divide-y divide-gray-50 dark:divide-gray-700/50 overflow-y-auto">
                {impact.map(({ product, salePrice, off, replaces }) => (
                  <div key={product.id} className="px-4 py-2 text-xs">
                    <div className="flex items-center gap-3">
                      <span
                        className="min-w-0 flex-1 truncate text-gray-700 dark:text-gray-300"
                        title={productLabel(product)}
                      >
                        {productLabel(product)}
                      </span>
                      <span className="shrink-0 text-gray-400 line-through">
                        {formatMoney(product.storePrice, currency)}
                      </span>
                      <span className="shrink-0 font-semibold text-green-600 dark:text-green-400">
                        {salePrice === null ? "—" : formatMoney(salePrice, currency)}
                      </span>
                      <span
                        className={`w-16 shrink-0 text-right ${
                          off !== null && off <= 0 ? "font-medium text-red-500" : "text-gray-500 dark:text-gray-400"
                        }`}
                      >
                        {off === null ? "" : `${off}% off`}
                      </span>
                    </div>
                    {/* The struck-through figure above is the listing's NORMAL price, which is what
                        the new discount is worked out from. When something else is being charged
                        today, that is what is actually being replaced, so it is named here. */}
                    {replaces && (
                      <p
                        className={`mt-0.5 ${
                          replaces.state === "ENDED" ? "text-gray-400" : "text-amber-600 dark:text-amber-400"
                        }`}
                      >
                        Replaces: {existingSaleNote(replaces, product)}
                        {replaces.chargingNow != null &&
                          ` (charging ${formatMoney(replaces.chargingNow, currency)} today)`}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Window */}
        <div className="space-y-3 border-t border-gray-100 dark:border-gray-700 pt-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Ends on *</label>
              <input
                type="date"
                className={inputCls}
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <div>
              <label className={labelCls}>Ends at (optional)</label>
              <input
                type="time"
                className={inputCls}
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
              />
            </div>
            <div>
              <label className={labelCls}>Starts on (optional)</label>
              <input
                type="date"
                className={inputCls}
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div>
              <label className={labelCls}>Starts at (optional)</label>
              <input
                type="time"
                className={inputCls}
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
            </div>
          </div>

          <p className="text-xs text-gray-400">
            Dates and times are Dubai time (GMT+4). Leave the end time blank and the sale runs through the whole
            of that day. Leave the start blank and it goes live as soon as you save.
          </p>

          {endsAt && (
            <div className="rounded-xl bg-brand-50 dark:bg-brand-500/10 border border-brand-100 dark:border-brand-500/20 px-4 py-2.5 text-xs text-brand-700 dark:text-brand-400">
              Runs from <strong>{startsAt ? formatDubai(startsAt) : "now"}</strong> through{" "}
              {/* Which reading of the end belongs here depends on which box was filled in. With no time
                  given the end is the "whole of that day" shorthand, so it is written as the day typed —
                  the stored instant is the midnight after it, and printing that would name a date nobody
                  entered. With a time given the end is an exact instant, and the caption has to be exact
                  too: an explicit end time of 00:00 read through the day-shorthand said the day BEFORE
                  the one in the box, which is the same off-by-a-day the shorthand exists to prevent,
                  pointing the other way. */}
              <strong>{endTime ? formatDubai(endsAt) : formatDubaiSaleEnd(endsAt)}</strong>. After that the
              customer pays the normal price again — nothing has to be switched off by hand.
            </div>
          )}
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-60 transition-colors"
          >
            {submitting && <Spinner />}
            Put on Flash Sale
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Remove Confirm Modal
// ---------------------------------------------------------------------------

interface RemoveConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  productTitle: string;
  removing: boolean;
  /** Why the last attempt failed. Shown here, beside the button that failed. */
  error: string | null;
  onConfirm: () => void;
}

function RemoveConfirmModal({
  isOpen,
  onClose,
  productTitle,
  removing,
  error,
  onConfirm,
}: RemoveConfirmModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-sm w-full">
      <div className="p-6 space-y-4">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Remove from Flash Sale</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          <span className="font-medium text-gray-700 dark:text-gray-200">{productTitle}</span> goes back to its
          normal store price. The discount and its dates are cleared; the product stays assigned to the store.
        </p>
        {error && <p className="text-sm text-red-500">{error}</p>}
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={removing}
            className="flex items-center gap-2 rounded-xl bg-red-500 px-4 py-2 text-sm font-medium text-white hover:bg-red-600 disabled:opacity-60 transition-colors"
          >
            {removing && <Spinner />}
            {error ? "Try Again" : "Remove"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Flash Sale Page
// ---------------------------------------------------------------------------

export default function FlashSalePage() {
  const [items, setItems] = useState<FlashSaleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // The listing is one page deep, so what did not fit has to be said out loud — a sale that never
  // appears cannot be cleared from here. Both halves are kept: how many rows arrived, and how many
  // the server says there are (null when its message did not carry a total).
  const [shown, setShown] = useState(0);
  const [total, setTotal] = useState<number | null>(null);
  const [showAssign, setShowAssign] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<FlashSaleItem | null>(null);
  const [removing, setRemoving] = useState(false);
  // A failed remove is the confirm modal's problem, not the table's. Reported through `error` it
  // replaced the whole table with an error card — behind the modal that was still covering the
  // message, so the admin lost the list and never saw why.
  const [removeError, setRemoveError] = useState<string | null>(null);

  // The row carries storeId and neither a store name nor a currency — the shared store-product DTO
  // has never had either — so both are resolved here, best-effort. Losing a label must not cost the
  // table, but a price with no currency on a table spanning stores in different ones is a number
  // an admin can act on wrongly.
  const { stores, nameOf, currencyOf, storesError, reload: reloadStores } = useStoreCurrencies();

  const [storeFilter, setStoreFilter] = useState("");

  // The flash-sale endpoint deliberately leaves ended sales out: their prices have already reverted.
  // But a lapsed sale still holds its discount and its stale window until somebody clears it, and
  // this is the only screen that clears one — lapsing is the normal end state of every flash sale,
  // so it has to be reachable from here. They are found by going through one store's own listings,
  // which is why a store has to be picked first.
  const [includeEnded, setIncludeEnded] = useState(false);
  const [endedItems, setEndedItems] = useState<FlashSaleItem[]>([]);
  const [endedLoading, setEndedLoading] = useState(false);
  const [endedError, setEndedError] = useState<string | null>(null);

  // One clock for the whole table. Read per row instead, and two rows could straddle the expiry
  // instant — one counting down while the next already says it ended.
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const tick = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(tick);
  }, []);

  const load = useCallback(
    async (signal?: AbortSignal) => {
      setLoading(true);
      setError(null);
      setShown(0);
      setTotal(null);
      try {
        const res = await flashSaleService.list(storeFilter || undefined, signal);
        const page = res.data ?? [];
        setItems(page);
        setShown(page.length);
        // The server says how many sales there are; a full page only says there may be more. Taking
        // the server's number means the warning states the real shortfall, and stays quiet when a
        // campaign happens to be exactly one page long. Null when the message did not carry it — see
        // readFlashSaleTotal — and the banner falls back to the page-length guess.
        setTotal(readFlashSaleTotal(res.message));
      } catch (err) {
        if ((err as { name?: string }).name === "AbortError") return;
        setError(err instanceof ApiRequestError ? err.message : "Failed to load the flash sale.");
      } finally {
        setLoading(false);
      }
    },
    [storeFilter]
  );

  const loadEnded = useCallback(
    async (signal?: AbortSignal) => {
      if (!includeEnded || !storeFilter) {
        setEndedItems([]);
        setEndedError(null);
        return;
      }
      setEndedLoading(true);
      setEndedError(null);
      try {
        const res = await storeProductsService.list(storeFilter, signal);
        setEndedItems(
          (res.data ?? []).filter((sp) => isFlashSale(sp) && resolveDiscountStatus(sp) === "ENDED")
        );
      } catch (err) {
        if ((err as { name?: string }).name === "AbortError") return;
        setEndedError(err instanceof ApiRequestError ? err.message : "Could not look for ended sales.");
      } finally {
        setEndedLoading(false);
      }
    },
    [includeEnded, storeFilter]
  );

  useEffect(() => {
    const ctrl = new AbortController();
    load(ctrl.signal);
    return () => ctrl.abort();
  }, [load]);

  useEffect(() => {
    const ctrl = new AbortController();
    loadEnded(ctrl.signal);
    return () => ctrl.abort();
  }, [loadEnded]);

  const reload = useCallback(() => {
    load();
    loadEnded();
  }, [load, loadEnded]);

  // Ended rows come after the live and scheduled ones, which arrive soonest-ending first. A sale
  // that lapsed while this page was open is in both lists; the flash-sale copy is the fresher one.
  const rows = useMemo(() => {
    const seen = new Set(items.map((i) => i.id));
    return [...items, ...endedItems.filter((i) => !seen.has(i.id))];
  }, [items, endedItems]);

  // How many sales did not fit on the page. 0 hides the warning; a number states the real shortfall;
  // null means the server sent no total and the page came back full, so all that can honestly be said
  // is "there may be more". Counted against the flash-sale page alone — the ended rows below it come
  // from a different, unpaged request.
  const missing = useMemo(() => {
    if (total != null) return Math.max(0, total - shown);
    return shown >= FLASH_SALE_PAGE_SIZE ? null : 0;
  }, [total, shown]);

  const counts = useMemo(() => {
    const tally = { LIVE: 0, SCHEDULED: 0, ENDED: 0 } as Record<FlashSaleStatus, number>;
    rows.forEach((item) => {
      tally[statusOf(item, now)] += 1;
    });
    return tally;
  }, [rows, now]);

  async function handleRemoveConfirm() {
    if (!removeTarget) return;
    setRemoving(true);
    setRemoveError(null);
    try {
      await flashSaleService.remove(removeTarget.id);
      setItems((list) => list.filter((i) => i.id !== removeTarget.id));
      setEndedItems((list) => list.filter((i) => i.id !== removeTarget.id));
      setRemoveTarget(null);
    } catch (err) {
      setRemoveError(
        err instanceof ApiRequestError ? err.message : "Failed to remove this product from the sale."
      );
    } finally {
      setRemoving(false);
    }
  }

  return (
    <>
      <PageMeta title="Flash Sale | Buyology" description="Put products on a time-limited sale" />
      <PageBreadcrumb pageTitle="Flash Sale" />

      <div className="space-y-5">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-gray-800 dark:text-white">Flash Sale</h1>
            <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
              Products on a discount that expires on its own. A sale stops applying the moment its end
              passes — there is nothing to switch off afterwards.
            </p>
          </div>
          <div className="flex items-center gap-3">
            {!loading && rows.length > 0 && (
              <div className="flex items-center gap-1.5">
                <Badge color="success">{counts.LIVE} live</Badge>
                {counts.SCHEDULED > 0 && <Badge color="info">{counts.SCHEDULED} scheduled</Badge>}
                {counts.ENDED > 0 && <Badge color="error">{counts.ENDED} ended</Badge>}
              </div>
            )}
            <button
              type="button"
              onClick={() => setShowAssign(true)}
              className="flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-600 transition-colors"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Add Products
            </button>
          </div>
        </div>

        {/* The store list failing is not a cosmetic loss on this page: a batch is addressed by store,
            so with no stores the Add Products button opens a modal whose first field has nothing in it
            and the filter below offers "Every store" alone. Silently, that read as an account with no
            stores and sent admins to go and create one. */}
        {storesError && (
          <div className="rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 px-4 py-3 text-sm">
            <p className="text-red-600 dark:text-red-400">
              {storesError} Nothing can be put on sale until the store list loads — a sale is applied to one
              store's listings.
            </p>
            <button
              type="button"
              onClick={reloadStores}
              className="mt-1.5 text-sm font-medium text-red-600 dark:text-red-400 underline"
            >
              Retry loading stores
            </button>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-wrap items-start gap-5 rounded-2xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-900 px-5 py-4">
          <div className="min-w-[240px]">
            <label className={labelCls}>Store</label>
            <select className={selectCls} value={storeFilter} onChange={(e) => setStoreFilter(e.target.value)}>
              <option value="">Every store</option>
              {stores.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} — {s.countryName}
                </option>
              ))}
            </select>
          </div>
          <div className="pt-6">
            <label
              className={`flex items-center gap-2 text-sm ${
                storeFilter ? "cursor-pointer text-gray-700 dark:text-gray-300" : "cursor-not-allowed text-gray-400"
              }`}
              title={
                storeFilter
                  ? "A sale that has ended still holds its discount and its dates until it is cleared here."
                  : "Pick a store first — ended sales are found by going through that store's own listings."
              }
            >
              <input
                type="checkbox"
                checked={includeEnded}
                disabled={!storeFilter}
                onChange={(e) => setIncludeEnded(e.target.checked)}
              />
              Show sales that have ended
              {endedLoading && <Spinner />}
            </label>
            <p className="mt-1 text-xs text-gray-400">
              {storeFilter
                ? "Their prices have already reverted, but the discount stays on the listing until it is cleared."
                : "Pick a store to find the sales that have lapsed in it."}
            </p>
          </div>
        </div>

        {missing !== 0 && (
          <p className="rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-100 dark:border-amber-500/20 px-4 py-2.5 text-xs text-amber-700 dark:text-amber-400">
            {missing === null ? (
              <>
                Showing the first {FLASH_SALE_PAGE_SIZE} sales — there are more than fit in one page.
              </>
            ) : (
              <>
                Showing {shown} of <strong>{total}</strong> sales — {missing} of them{" "}
                {missing === 1 ? "is" : "are"} not on this page.
              </>
            )}{" "}
            Pick a store above to narrow the list down to the ones you are looking for.
          </p>
        )}

        {endedError && (
          <p className="rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-100 dark:border-amber-500/20 px-4 py-2.5 text-xs text-amber-700 dark:text-amber-400">
            {endedError} The live and scheduled sales below are unaffected.
          </p>
        )}

        {/* Content */}
        {loading ? (
          <div className="flex justify-center items-center py-20 text-gray-400">
            <Spinner />
            <span className="ml-2 text-sm">Loading flash sale…</span>
          </div>
        ) : error ? (
          <div className="rounded-2xl bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 p-6 text-center">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            <button
              type="button"
              onClick={() => load()}
              className="mt-3 text-sm font-medium text-red-600 dark:text-red-400 underline"
            >
              Retry
            </button>
          </div>
        ) : rows.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-200 dark:border-gray-700 py-20 text-center">
            <p className="text-sm text-gray-400 dark:text-gray-500">
              {storeFilter
                ? "Nothing is on the flash sale in this store."
                : "Nothing is on the flash sale right now."}
            </p>
            <button
              type="button"
              onClick={() => setShowAssign(true)}
              className="mt-3 text-sm font-semibold text-brand-500 hover:text-brand-600"
            >
              Put your first products on sale
            </button>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                    <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Product
                    </th>
                    <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Store
                    </th>
                    <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Normal Price
                    </th>
                    <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Sale Price
                    </th>
                    <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Discount
                    </th>
                    <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Window (Dubai)
                    </th>
                    <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Time Left
                    </th>
                    <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-4 py-3.5" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                  {rows.map((item) => {
                    const status = statusOf(item, now);
                    // The badge takes the cautious verdict; the Sale Price caption below states what
                    // the SHOP is doing, which is the server's verdict and not this browser's clock.
                    const shopStillCharging = serverSaysLive(item, now);
                    const currency = currencyOf(item.storeId);
                    // What the discount would charge. For a LIVE row that is the API's own
                    // effectivePrice; for the others effectivePrice is back at the normal price,
                    // so the figure shown is what the window will charge (or did charge).
                    const salePrice =
                      status === "LIVE"
                        ? item.effectivePrice
                        : computeEffectivePrice(item.storePrice, item.discountType, item.discountValue ?? 0);
                    return (
                      <tr
                        key={item.id}
                        className={`transition-colors ${
                          status === "ENDED"
                            ? "bg-red-50/40 dark:bg-red-500/5"
                            : "hover:bg-gray-50/50 dark:hover:bg-white/[0.02]"
                        }`}
                      >
                        {/* Product */}
                        <td className="px-5 py-4">
                          <p
                            className="font-semibold text-gray-800 dark:text-white/90 truncate max-w-[220px]"
                            title={productLabel(item)}
                          >
                            {productLabel(item)}
                          </p>
                          <p className="mt-0.5 font-mono text-xs text-gray-400">{item.productSku}</p>
                        </td>

                        {/* Store */}
                        <td className="px-4 py-4 text-gray-600 dark:text-gray-300">
                          <span
                            className="block truncate max-w-[150px]"
                            title={nameOf(item.storeId) || item.storeId}
                          >
                            {nameOf(item.storeId) || "—"}
                          </span>
                        </td>

                        {/* Normal price */}
                        <td className="px-4 py-4 text-gray-700 dark:text-gray-300">
                          {formatMoney(item.storePrice, currency)}
                        </td>

                        {/* Sale price */}
                        <td className="px-4 py-4">
                          {salePrice === null ? (
                            <span className="text-gray-400 dark:text-gray-500">—</span>
                          ) : status === "LIVE" ? (
                            <span className="font-semibold text-green-600 dark:text-green-400">
                              {formatMoney(salePrice, currency)}
                            </span>
                          ) : (
                            <span className="text-gray-400 dark:text-gray-500">
                              {formatMoney(salePrice, currency)}
                              <span className="ml-1 text-xs">
                                {shopStillCharging
                                  ? "(the shop is still charging it — refresh)"
                                  : status === "SCHEDULED"
                                  ? "(from start)"
                                  : "(not applied)"}
                              </span>
                            </span>
                          )}
                        </td>

                        {/* Discount */}
                        <td className="px-4 py-4 text-gray-600 dark:text-gray-300">
                          {discountLabel(item.discountType, item.discountValue, currency)}
                        </td>

                        {/* Window — the end is inclusive, so it is written as the day it covers */}
                        <td className="px-4 py-4 text-xs text-gray-500 dark:text-gray-400">
                          <span className="block">Through {formatDubaiSaleEnd(item.discountEndsAt)}</span>
                          {item.discountStartsAt && (
                            <span className="block text-gray-400">Starts {formatDubai(item.discountStartsAt)}</span>
                          )}
                        </td>

                        {/* Time left */}
                        <td
                          className={`px-4 py-4 whitespace-nowrap ${
                            status === "ENDED"
                              ? "font-medium text-red-600 dark:text-red-400"
                              : "text-gray-600 dark:text-gray-300"
                          }`}
                        >
                          {formatTimeLeft(item.discountEndsAt, now)}
                        </td>

                        {/* Status */}
                        <td className="px-4 py-4">
                          <span
                            title={
                              shopStillCharging
                                ? "The shop reports this sale as live while this screen's clock puts it outside its window. The shop is what customers are charged against — refresh, and check this device's clock."
                                : undefined
                            }
                          >
                            <Badge color={STATUS_COLOR[status]}>
                              {status === "LIVE" ? "Live" : status === "SCHEDULED" ? "Scheduled" : "Ended"}
                            </Badge>
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="px-4 py-4">
                          <button
                            type="button"
                            onClick={() => {
                              setRemoveError(null);
                              setRemoveTarget(item);
                            }}
                            className="rounded-lg p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                            title={
                              status === "ENDED"
                                ? "Clear this finished sale — the discount and its dates go with it"
                                : "Remove from flash sale"
                            }
                          >
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <polyline points="3 6 5 6 21 6" />
                              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                              <path d="M10 11v6M14 11v6" />
                              <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                            </svg>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Assign Modal */}
      {showAssign && (
        <AssignToFlashSaleModal
          isOpen={showAssign}
          onClose={() => setShowAssign(false)}
          onAssigned={reload}
          stores={stores}
          currencyOf={currencyOf}
          storesError={storesError}
        />
      )}

      {/* Remove Confirm Modal */}
      {removeTarget && (
        <RemoveConfirmModal
          isOpen={!!removeTarget}
          onClose={() => {
            setRemoveTarget(null);
            setRemoveError(null);
          }}
          productTitle={productLabel(removeTarget)}
          removing={removing}
          error={removeError}
          onConfirm={handleRemoveConfirm}
        />
      )}
    </>
  );
}
