import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router";
import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import { storeProductsService, productsService, ApiRequestError } from "../../api";
import type {
  AssignProductToStoreRequest,
  AssignVariantInlineRequest,
  DiscountType,
} from "../../types";
import type { Product, ProductVariant } from "../../types";
import {
  computeEffectivePrice,
  dubaiEndOfDayInstant,
  dubaiInstant,
  formatDubai,
  formatDubaiSaleEnd,
} from "../../utils/flashSale";

// ---------------------------------------------------------------------------
// Helpers
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
// Variant row state
// ---------------------------------------------------------------------------

interface VariantFormRow {
  variantId: string;
  sku: string;
  storePrice: string;
  stock: string;
  isActive: boolean;
}

// ---------------------------------------------------------------------------
// AssignProduct Page
// ---------------------------------------------------------------------------

export default function AssignProduct() {
  const { id: storeId } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // Global product catalog
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [productError, setProductError] = useState<string | null>(null);

  // Selected product
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [search, setSearch] = useState("");
  // Whether the product dropdown is open (focus-driven; browse-all when empty).
  const [pickerOpen, setPickerOpen] = useState(false);

  // Main form
  const [storePrice, setStorePrice] = useState("");
  const [discountType, setDiscountType] = useState<DiscountType | "">("");
  const [discountValue, setDiscountValue] = useState("");
  // Optional sale window. Left empty the discount behaves as it always has: live now, no end.
  const [discountStartDate, setDiscountStartDate] = useState("");
  const [discountEndDate, setDiscountEndDate] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [b2cEnabled, setB2cEnabled] = useState(true);
  const [b2bEnabled, setB2bEnabled] = useState(false);

  // Variant rows — one per global variant, pre-populated after product selection
  const [variantRows, setVariantRows] = useState<VariantFormRow[]>([]);

  // Submission
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Fetch global products on mount
  useEffect(() => {
    const ctrl = new AbortController();
    (async () => {
      setLoadingProducts(true);
      setProductError(null);
      try {
        const res = await productsService.getAll("EN", ctrl.signal);
        setProducts(res.data.filter((p) => p.status !== "DELETED"));
      } catch (err) {
        if ((err as { name?: string }).name === "AbortError") return;
        setProductError(err instanceof ApiRequestError ? err.message : "Failed to load products.");
      } finally {
        setLoadingProducts(false);
      }
    })();
    return () => ctrl.abort();
  }, []);

  // When a product is selected, initialise variant rows
  function handleSelectProduct(product: Product) {
    setSelectedProduct(product);
    setSearch(product.title);
    setPickerOpen(false);
    setVariantRows(
      product.variants.map((v: ProductVariant) => ({
        variantId: v.id,
        sku: v.sku,
        storePrice: "",
        stock: "",
        isActive: true,
      }))
    );
    setStorePrice("");
    setDiscountType("");
    setDiscountValue("");
    setDiscountStartDate("");
    setDiscountEndDate("");
    setB2cEnabled(true);
    setB2bEnabled(false);
    setSubmitError(null);
  }

  function updateVariantRow(idx: number, patch: Partial<VariantFormRow>) {
    setVariantRows((rows) => rows.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  }

  // The store price as a number, and only when it is one worth previewing against. Gated on being
  // above zero because computeEffectivePrice mirrors the server exactly, floor included: a store price
  // of nothing with a percentage off it is a sale price of one cent, which is arithmetically true and
  // useless to show under a price box that is empty or zeroed.
  const parsedStorePrice = parseFloat(storePrice);
  const previewablePrice = parsedStorePrice > 0 ? parsedStorePrice : null;
  const effectivePreview =
    previewablePrice === null
      ? null
      : computeEffectivePrice(previewablePrice, discountType, parseFloat(discountValue) || 0);

  // Dates are typed as Dubai wall-clock and converted here, at the edge. An end date with no time
  // means "through the whole of that day", i.e. midnight at the start of the next one.
  //
  // Gated on discountType for the same reason the PAYLOAD is: the two date inputs are only rendered
  // while a discount is set, and their state survives being switched back to None. Ungated, a past
  // end date typed under a discount that was then removed kept refusing the submit over a field no
  // longer on screen — with nothing left to clear it from, the form could not be saved at all.
  const windowed = !!discountType;
  const discountStartsAt = windowed && discountStartDate ? dubaiInstant(discountStartDate, "00:00") : null;
  const discountEndsAt = windowed && discountEndDate ? dubaiEndOfDayInstant(discountEndDate) : null;
  // A date the browser gave us that we could not read back. Null from the two helpers above means
  // "nothing was typed" everywhere else, so a date that is present but unusable has to be told apart
  // from it here — otherwise it is silently dropped and the listing goes on sale with no window.
  const unreadableDate =
    (windowed && !!discountStartDate && !discountStartsAt) ||
    (windowed && !!discountEndDate && !discountEndsAt);

  // Exactly the rows the payload will carry: a variant is only assigned when it has both a price and
  // a stock. Hoisted out of handleSubmit so the form and the request cannot disagree about which
  // rows count as assigned.
  const variantsToAssign: AssignVariantInlineRequest[] = variantRows
    .filter((r) => r.storePrice && r.stock)
    .map((r) => ({
      variantId: r.variantId,
      storePrice: parseFloat(r.storePrice),
      stock: parseInt(r.stock),
      isActive: r.isActive,
    }));
  // The discount above belongs to the LISTING and is charged on every line of it, variant or not, so
  // nothing below re-prices per variant. A variant's price column is store bookkeeping; the price a
  // customer pays is the one in step 2.
  const discountedValue = parseFloat(discountValue) || 0;

  const filteredProducts = products.filter((p) =>
    search
      ? p.title.toLowerCase().includes(search.toLowerCase()) ||
        p.sku.toLowerCase().includes(search.toLowerCase())
      : true
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!storeId || !selectedProduct) return;

    const price = parseFloat(storePrice);
    if (!price) {
      setSubmitError("Store price is required.");
      return;
    }

    if (unreadableDate) {
      setSubmitError("Those discount dates could not be read — re-pick them, or clear them both.");
      return;
    }
    if (discountEndsAt && Date.parse(discountEndsAt) <= Date.now()) {
      setSubmitError("That discount end date has already passed in Dubai.");
      return;
    }
    if (discountStartsAt && discountEndsAt && Date.parse(discountStartsAt) >= Date.parse(discountEndsAt)) {
      setSubmitError("The discount has to start before it ends.");
      return;
    }
    // A FIXED discount is an absolute sale price, so it has to be below the price it replaces — at or
    // above it the "sale" is a price rise wearing a sale badge. The price it has to beat is the
    // LISTING's, the one number this form sets and the only one a customer is ever charged; there is
    // no second, per-variant price for it to be measured against. The API refuses this too
    // (FlashSalePolicy.validateDiscount); said here it costs no round trip, and this request also
    // carries the store price, both channel flags and every variant row — a 400 loses all of it.
    if (discountType === "FIXED" && discountedValue >= price) {
      setSubmitError(
        `A fixed sale price of ${discountedValue} is not below the store price of ${price} — that is a `
          + "price rise, not a sale. Lower the sale price, or use a percentage discount."
      );
      return;
    }

    const payload: AssignProductToStoreRequest = {
      productId: selectedProduct.id,
      storePrice: price,
      isActive,
      b2cEnabled,
      b2bEnabled,
      ...(discountType && {
        discountType: discountType as DiscountType,
        discountValue: parseFloat(discountValue) || 0,
        ...(discountStartsAt && { discountStartsAt }),
        ...(discountEndsAt && { discountEndsAt }),
      }),
      ...(variantsToAssign.length > 0 && { variants: variantsToAssign }),
    };

    setSubmitting(true);
    setSubmitError(null);
    try {
      await storeProductsService.assign(storeId, payload);
      navigate(`/stores/${storeId}/products`);
    } catch (err) {
      setSubmitError(err instanceof ApiRequestError ? err.message : "Failed to assign product.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <PageMeta title="Assign Product" description="Assign a global product to this store" />
      <PageBreadcrumb pageTitle="Assign Product" />

      <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">

        {/* Step 1 — Select Product */}
        <div className="rounded-2xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-900 p-6 shadow-sm space-y-4">
          <h2 className="text-base font-semibold text-gray-800 dark:text-white">
            1. Select Global Product
          </h2>

          {/* Search input — focus to browse all products, type to filter */}
          <div>
            <label className={labelCls}>Browse all products, or search by name / SKU</label>
            <input
              type="text"
              className={inputCls}
              placeholder="Click to browse all products, or type a name / SKU…"
              value={search}
              onFocus={() => setPickerOpen(true)}
              onBlur={() => setTimeout(() => setPickerOpen(false), 150)}
              onChange={(e) => {
                setSearch(e.target.value);
                setPickerOpen(true);
                if (selectedProduct && e.target.value !== selectedProduct.title) {
                  setSelectedProduct(null);
                  setVariantRows([]);
                }
              }}
            />
          </div>

          {/* Product dropdown — lists ALL products on focus, filtered as you type */}
          {!selectedProduct && pickerOpen && (
            <div className="rounded-xl border border-gray-100 dark:border-gray-700 overflow-hidden divide-y divide-gray-50 dark:divide-gray-700/50 max-h-60 overflow-y-auto">
              {loadingProducts ? (
                <div className="flex items-center justify-center gap-2 py-6 text-gray-400">
                  <Spinner />
                  <span className="text-sm">Loading…</span>
                </div>
              ) : productError ? (
                <p className="py-4 text-center text-sm text-red-500">{productError}</p>
              ) : filteredProducts.length === 0 ? (
                <p className="py-4 text-center text-sm text-gray-400">No products found.</p>
              ) : (
                filteredProducts.slice(0, 50).map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onMouseDown={(e) => e.preventDefault()} /* keep input focus so onBlur doesn't pre-empt the click */
                    onClick={() => handleSelectProduct(p)}
                    className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left bg-white dark:bg-gray-800 hover:bg-brand-50 dark:hover:bg-brand-500/10 transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-800 dark:text-white truncate">{p.title}</p>
                      <p className="text-xs font-mono text-gray-400">
                        {p.sku} · {p.variants.length} variant(s) · {p.productType}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 text-xs font-semibold px-2 py-0.5 rounded-full ${
                        p.status === "ACTIVE"
                          ? "bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400"
                          : "bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400"
                      }`}
                    >
                      {p.status}
                    </span>
                  </button>
                ))
              )}
            </div>
          )}

          {/* Selected product summary */}
          {selectedProduct && (
            <div className="flex items-center justify-between rounded-xl bg-brand-50 dark:bg-brand-500/10 border border-brand-100 dark:border-brand-500/20 px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-brand-700 dark:text-brand-400">
                  {selectedProduct.title}
                </p>
                <p className="text-xs font-mono text-brand-500/70 dark:text-brand-400/60">
                  {selectedProduct.sku} · {selectedProduct.variants.length} variant(s)
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedProduct(null);
                  setVariantRows([]);
                  setSearch("");
                }}
                className="text-xs text-brand-500 hover:text-brand-700 font-medium"
              >
                Change
              </button>
            </div>
          )}
        </div>

        {/* Step 2 — Pricing & Discount */}
        {selectedProduct && (
          <div className="rounded-2xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-900 p-6 shadow-sm space-y-4">
            <h2 className="text-base font-semibold text-gray-800 dark:text-white">
              2. Pricing &amp; Discount
            </h2>

            {/* Store Price */}
            <div>
              <label className={labelCls}>Store Price *</label>
              <input
                type="number"
                min={0}
                step={0.01}
                required
                className={inputCls}
                placeholder="e.g. 45000.00"
                value={storePrice}
                onChange={(e) => setStorePrice(e.target.value)}
              />
              <p className="mt-1 text-xs text-gray-400">Price in the store&apos;s local currency.</p>
            </div>

            {/* Discount Type */}
            <div>
              <label className={labelCls}>Discount</label>
              <select
                className={selectCls}
                value={discountType}
                onChange={(e) => {
                  const next = e.target.value as DiscountType | "";
                  setDiscountType(next);
                  setDiscountValue("");
                  // The window belongs to the discount. Left behind it is state behind a hidden
                  // field: not sent, but still checked, which is how this form used to wedge.
                  if (!next) {
                    setDiscountStartDate("");
                    setDiscountEndDate("");
                  }
                }}
              >
                <option value="">None</option>
                <option value="PERCENTAGE">Percentage (%)</option>
                <option value="FIXED">Fixed Sale Price</option>
              </select>
            </div>

            {/* Discount Value */}
            {discountType && (
              <div>
                <label className={labelCls}>
                  {discountType === "PERCENTAGE" ? "Discount % (1–99)" : "Fixed Sale Price"}
                </label>
                <input
                  type="number"
                  min={discountType === "PERCENTAGE" ? 1 : 0.01}
                  max={discountType === "PERCENTAGE" ? 99 : undefined}
                  step={discountType === "PERCENTAGE" ? 1 : 0.01}
                  required
                  className={inputCls}
                  placeholder={discountType === "PERCENTAGE" ? "e.g. 10" : "e.g. 38000.00"}
                  value={discountValue}
                  onChange={(e) => setDiscountValue(e.target.value)}
                />
              </div>
            )}

            {/* Sale window — what makes a discount a flash sale rather than a markdown */}
            {discountType && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Discount starts (optional)</label>
                  <input
                    type="date"
                    className={inputCls}
                    value={discountStartDate}
                    onChange={(e) => setDiscountStartDate(e.target.value)}
                  />
                </div>
                <div>
                  <label className={labelCls}>Discount ends (optional)</label>
                  <input
                    type="date"
                    className={inputCls}
                    value={discountEndDate}
                    onChange={(e) => setDiscountEndDate(e.target.value)}
                  />
                </div>
                <p className="col-span-2 -mt-1 text-xs text-gray-400">
                  Dubai time. Leave both blank for a permanent discount; set an end date and it expires on its
                  own — the customer pays the normal price again with nothing to switch off.
                </p>
                {/* The end is inclusive, so it is read back as the day it covers — the date that
                    was typed, not the midnight that follows it. */}
                {discountEndsAt && (
                  <p className="col-span-2 text-xs text-brand-600 dark:text-brand-400">
                    Runs from {discountStartsAt ? formatDubai(discountStartsAt) : "assignment"} through{" "}
                    {formatDubaiSaleEnd(discountEndsAt)}.
                  </p>
                )}
              </div>
            )}

            {/* Effective price preview */}
            {effectivePreview !== null && (
              <div className="flex items-center gap-2 rounded-xl bg-green-50 dark:bg-green-500/10 border border-green-100 dark:border-green-500/20 px-4 py-2.5">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-green-500 flex-shrink-0">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <p className="text-sm text-green-700 dark:text-green-400">
                  Effective sell price:{" "}
                  <strong>
                    {effectivePreview.toLocaleString("en-US", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </strong>
                </p>
              </div>
            )}

            {/* Active toggle */}
            <div className="flex items-center justify-between pt-1">
              <div>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Active on storefront
                </span>
                <p className="text-xs text-gray-400">Set to inactive to hide from customers until ready.</p>
              </div>
              <button
                type="button"
                onClick={() => setIsActive((v) => !v)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  isActive ? "bg-brand-500" : "bg-gray-300 dark:bg-gray-600"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                    isActive ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>

            {/* Sales channels — B2C / B2B */}
            <div className="border-t border-gray-100 dark:border-gray-700 pt-4 space-y-4">
              {/* B2C toggle */}
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Available in consumer shop (B2C)
                  </span>
                  <p className="text-xs text-gray-400">Shown to regular shoppers in the storefront.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setB2cEnabled((v) => !v)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    b2cEnabled ? "bg-brand-500" : "bg-gray-300 dark:bg-gray-600"
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                      b2cEnabled ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>

              {/* B2B toggle */}
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Available for B2B (bulk/quotes)
                  </span>
                  <p className="text-xs text-gray-400">Listed in the B2B catalog for quote requests.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setB2bEnabled((v) => !v)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    b2bEnabled ? "bg-brand-500" : "bg-gray-300 dark:bg-gray-600"
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                      b2bEnabled ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>

              {/* B2B-only helper */}
              {b2bEnabled && !b2cEnabled && (
                <p className="rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-100 dark:border-amber-500/20 px-4 py-2.5 text-xs text-amber-700 dark:text-amber-400">
                  B2B-only: this product is hidden from the consumer shop and appears only in the B2B
                  catalog (bulk orders via quote requests).
                </p>
              )}
            </div>
          </div>
        )}

        {/* Step 3 — Variants */}
        {selectedProduct && variantRows.length > 0 && (
          <div className="rounded-2xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-900 p-6 shadow-sm space-y-4">
            <div>
              <h2 className="text-base font-semibold text-gray-800 dark:text-white">
                3. Variants
              </h2>
              {/* Not "set the store price for each variant". The store price is the listing's — the one
                  number in step 2, the only one anybody is charged — and naming this field after it is
                  what made this step read as pricing each variant separately. */}
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                Stock per variant, and what each one is worth in your own records. Leave a row blank to skip
                assigning that variant now.
              </p>
            </div>

            {/* Said once, here, because it is the thing an admin would otherwise assume the other way
                round: a cart line is priced from the LISTING whichever variant it names. Unconditional,
                because it was gated on a discount being set — and with no discount the two "Store
                Price" boxes, step 2's and each variant's, read as interchangeable prices, which is the
                misreading this paragraph exists to prevent. */}
            <p className="rounded-xl bg-brand-50 dark:bg-brand-500/10 border border-brand-100 dark:border-brand-500/20 px-4 py-2.5 text-xs text-brand-700 dark:text-brand-400">
              Every variant sells at the listing&apos;s price from step 2
              {discountType && " — discounted while the sale runs"}. The figures below are your own record of
              what each variant is worth; nothing is charged from them.
            </p>

            <div className="space-y-3">
              {variantRows.map((row, idx) => (
                <div
                  key={row.variantId}
                  className="rounded-xl border border-gray-100 dark:border-gray-700 p-4 space-y-3 bg-gray-50/50 dark:bg-gray-800/50"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-mono font-medium text-gray-700 dark:text-gray-200">
                      {row.sku}
                    </p>
                    <button
                      type="button"
                      onClick={() => updateVariantRow(idx, { isActive: !row.isActive })}
                      className={`relative inline-flex h-5 w-10 items-center rounded-full transition-colors ${
                        row.isActive ? "bg-brand-500" : "bg-gray-300 dark:bg-gray-600"
                      }`}
                      title="Toggle active"
                    >
                      <span
                        className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
                          row.isActive ? "translate-x-5" : "translate-x-0.5"
                        }`}
                      />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      {/* "Store Price" is the listing's field in step 2 and the only price a customer
                          pays. This one is a record, so it is not called by that name. */}
                      <label className={labelCls}>Recorded price</label>
                      <input
                        type="number"
                        min={0}
                        step={0.01}
                        className={inputCls}
                        placeholder="e.g. 45000.00"
                        value={row.storePrice}
                        onChange={(e) => updateVariantRow(idx, { storePrice: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className={labelCls}>Stock</label>
                      <input
                        type="number"
                        min={0}
                        className={inputCls}
                        placeholder="e.g. 12"
                        value={row.stock}
                        onChange={(e) => updateVariantRow(idx, { stock: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Submit */}
        {selectedProduct && (
          <div className="flex items-center justify-end gap-3">
            {submitError && (
              <p className="text-sm text-red-500 flex-1">{submitError}</p>
            )}
            <button
              type="button"
              onClick={() => navigate(`/stores/${storeId}/products`)}
              className="rounded-xl px-5 py-2.5 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-2 rounded-xl bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-60 transition-colors"
            >
              {submitting && <Spinner />}
              Assign Product
            </button>
          </div>
        )}
      </form>
    </>
  );
}
