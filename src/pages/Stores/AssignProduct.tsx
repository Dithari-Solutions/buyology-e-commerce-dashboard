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

function computeEffectivePrice(
  storePrice: number,
  discountType: DiscountType | "",
  discountValue: number
): number | null {
  if (!discountType || !storePrice) return null;
  if (discountType === "PERCENTAGE") return storePrice * (1 - discountValue / 100);
  if (discountType === "FIXED") return discountValue;
  return null;
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

  // Main form
  const [storePrice, setStorePrice] = useState("");
  const [discountType, setDiscountType] = useState<DiscountType | "">("");
  const [discountValue, setDiscountValue] = useState("");
  const [isActive, setIsActive] = useState(true);

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
    setSubmitError(null);
  }

  function updateVariantRow(idx: number, patch: Partial<VariantFormRow>) {
    setVariantRows((rows) => rows.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  }

  const effectivePreview = computeEffectivePrice(
    parseFloat(storePrice) || 0,
    discountType,
    parseFloat(discountValue) || 0
  );

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

    const variants: AssignVariantInlineRequest[] = variantRows
      .filter((r) => r.storePrice && r.stock)
      .map((r) => ({
        variantId: r.variantId,
        storePrice: parseFloat(r.storePrice),
        stock: parseInt(r.stock),
        isActive: r.isActive,
      }));

    const payload: AssignProductToStoreRequest = {
      productId: selectedProduct.id,
      storePrice: price,
      isActive,
      ...(discountType && {
        discountType: discountType as DiscountType,
        discountValue: parseFloat(discountValue) || 0,
      }),
      ...(variants.length > 0 && { variants }),
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

          {/* Search input */}
          <div>
            <label className={labelCls}>Search by name or SKU</label>
            <input
              type="text"
              className={inputCls}
              placeholder="e.g. HP ProBook or DTDX-482931"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                if (selectedProduct && e.target.value !== selectedProduct.title) {
                  setSelectedProduct(null);
                  setVariantRows([]);
                }
              }}
            />
          </div>

          {/* Product list */}
          {!selectedProduct && search.length > 0 && (
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
                filteredProducts.slice(0, 20).map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleSelectProduct(p)}
                    className="w-full flex items-center justify-between px-4 py-3 text-left bg-white dark:bg-gray-800 hover:bg-brand-50 dark:hover:bg-brand-500/10 transition-colors"
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-800 dark:text-white">{p.title}</p>
                      <p className="text-xs font-mono text-gray-400">{p.sku}</p>
                    </div>
                    <span
                      className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
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
                  setDiscountType(e.target.value as DiscountType | "");
                  setDiscountValue("");
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

            {/* Effective price preview */}
            {effectivePreview !== null && storePrice && (
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
          </div>
        )}

        {/* Step 3 — Variants */}
        {selectedProduct && variantRows.length > 0 && (
          <div className="rounded-2xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-900 p-6 shadow-sm space-y-4">
            <div>
              <h2 className="text-base font-semibold text-gray-800 dark:text-white">
                3. Variants
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                Set the store price and stock for each variant. Leave blank to skip assigning a variant now.
              </p>
            </div>

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
                      <label className={labelCls}>Store Price</label>
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
