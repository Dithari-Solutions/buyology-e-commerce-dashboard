import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router";
import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import Badge from "../../components/ui/badge/Badge";
import { Modal } from "../../components/ui/modal";
import { storeProductsService, ApiRequestError } from "../../api";
import type {
  StoreProductResponse,
  StoreVariantResponse,
  UpdateStoreProductRequest,
  AssignVariantToStoreRequest,
  UpdateStoreVariantRequest,
  DiscountType,
} from "../../types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatPrice(n: number): string {
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(iso));
}

function discountLabel(sp: StoreProductResponse): string {
  if (!sp.discountType) return "—";
  if (sp.discountType === "PERCENTAGE") return `${sp.discountValue}% OFF`;
  return `Sale: ${formatPrice(sp.discountValue!)}`;
}

// ---------------------------------------------------------------------------
// Shared style constants
// ---------------------------------------------------------------------------

const inputCls =
  "w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-2.5 text-sm text-gray-800 dark:text-white placeholder-gray-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-400/20 transition-all";

const labelCls = "block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1";

const selectCls =
  "w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-2.5 text-sm text-gray-800 dark:text-white focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-400/20 transition-all";

// ---------------------------------------------------------------------------
// Spinner
// ---------------------------------------------------------------------------

function Spinner() {
  return (
    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Edit Store Product Modal
// ---------------------------------------------------------------------------

interface EditStoreProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  storeId: string;
  storeProduct: StoreProductResponse;
  onSaved: (updated: StoreProductResponse) => void;
}

function EditStoreProductModal({
  isOpen,
  onClose,
  storeId,
  storeProduct,
  onSaved,
}: EditStoreProductModalProps) {
  const [form, setForm] = useState<UpdateStoreProductRequest>({
    storePrice: storeProduct.storePrice,
    discountType: storeProduct.discountType ?? undefined,
    discountValue: storeProduct.discountValue ?? undefined,
    isActive: storeProduct.isActive,
    b2cEnabled: storeProduct.b2cEnabled,
    b2bEnabled: storeProduct.b2bEnabled,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setForm({
      storePrice: storeProduct.storePrice,
      discountType: storeProduct.discountType ?? undefined,
      discountValue: storeProduct.discountValue ?? undefined,
      isActive: storeProduct.isActive,
      b2cEnabled: storeProduct.b2cEnabled,
      b2bEnabled: storeProduct.b2bEnabled,
    });
    setError(null);
  }, [storeProduct]);

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const payload: UpdateStoreProductRequest = {
        storePrice: form.storePrice,
        isActive: form.isActive,
        discountType: form.discountType ?? null,
        discountValue: form.discountType ? form.discountValue : null,
        b2cEnabled: form.b2cEnabled,
        b2bEnabled: form.b2bEnabled,
      };
      const res = await storeProductsService.update(storeId, storeProduct.id, payload);
      onSaved(res.data);
      onClose();
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : "Failed to update.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-md w-full">
      <div className="p-4 space-y-4">
        <h3 className="text-base font-semibold text-gray-800 dark:text-white">
          Edit Store Product
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 -mt-3">
          {storeProduct.productTitle}{" "}
          <span className="font-mono text-xs text-gray-400">{storeProduct.productSku}</span>
        </p>

        {/* Store Price */}
        <div>
          <label className={labelCls}>Store Price</label>
          <input
            type="number"
            min={0}
            step={0.01}
            className={inputCls}
            value={form.storePrice ?? ""}
            onChange={(e) => setForm((f) => ({ ...f, storePrice: parseFloat(e.target.value) || 0 }))}
          />
        </div>

        {/* Discount Type */}
        <div>
          <label className={labelCls}>Discount</label>
          <select
            className={selectCls}
            value={form.discountType ?? "NONE"}
            onChange={(e) => {
              const val = e.target.value;
              setForm((f) => ({
                ...f,
                discountType: val === "NONE" ? undefined : (val as DiscountType),
                discountValue: val === "NONE" ? undefined : f.discountValue,
              }));
            }}
          >
            <option value="NONE">None</option>
            <option value="PERCENTAGE">Percentage</option>
            <option value="FIXED">Fixed Sale Price</option>
          </select>
        </div>

        {/* Discount Value */}
        {form.discountType && (
          <div>
            <label className={labelCls}>
              {form.discountType === "PERCENTAGE" ? "Discount %" : "Fixed Sale Price"}
            </label>
            <input
              type="number"
              min={0}
              step={form.discountType === "PERCENTAGE" ? 1 : 0.01}
              className={inputCls}
              value={form.discountValue ?? ""}
              onChange={(e) =>
                setForm((f) => ({ ...f, discountValue: parseFloat(e.target.value) || 0 }))
              }
            />
          </div>
        )}

        {/* Active toggle */}
        <div className="flex items-center justify-between">
          <span className={labelCls + " mb-0"}>Active on storefront</span>
          <button
            type="button"
            onClick={() => setForm((f) => ({ ...f, isActive: !f.isActive }))}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              form.isActive ? "bg-brand-500" : "bg-gray-300 dark:bg-gray-600"
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                form.isActive ? "translate-x-6" : "translate-x-1"
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
              onClick={() => setForm((f) => ({ ...f, b2cEnabled: !f.b2cEnabled }))}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                form.b2cEnabled ? "bg-brand-500" : "bg-gray-300 dark:bg-gray-600"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                  form.b2cEnabled ? "translate-x-6" : "translate-x-1"
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
              onClick={() => setForm((f) => ({ ...f, b2bEnabled: !f.b2bEnabled }))}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                form.b2bEnabled ? "bg-brand-500" : "bg-gray-300 dark:bg-gray-600"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                  form.b2bEnabled ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>

          {/* B2B-only helper */}
          {form.b2bEnabled && !form.b2cEnabled && (
            <p className="rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-100 dark:border-amber-500/20 px-4 py-2.5 text-xs text-amber-700 dark:text-amber-400">
              B2B-only: this product is hidden from the consumer shop and appears only in the B2B
              catalog (bulk orders via quote requests).
            </p>
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
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60 transition-colors"
          >
            {saving && <Spinner />}
            Save Changes
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Manage Variants Modal
// ---------------------------------------------------------------------------

interface ManageVariantsModalProps {
  isOpen: boolean;
  onClose: () => void;
  storeId: string;
  storeProduct: StoreProductResponse;
  onUpdated: (updated: StoreProductResponse) => void;
}

function ManageVariantsModal({
  isOpen,
  onClose,
  storeId,
  storeProduct,
  onUpdated,
}: ManageVariantsModalProps) {
  const [variants, setVariants] = useState<StoreVariantResponse[]>(storeProduct.variants);
  const [addForm, setAddForm] = useState<AssignVariantToStoreRequest>({
    variantId: "",
    storePrice: 0,
    stock: 0,
    isActive: true,
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<UpdateStoreVariantRequest>({});
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setVariants(storeProduct.variants);
    setError(null);
  }, [storeProduct]);

  async function handleAdd() {
    if (!addForm.variantId.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const res = await storeProductsService.assignVariant(storeId, storeProduct.id, addForm);
      const updated = { ...storeProduct, variants: [...variants, res.data] };
      setVariants(updated.variants);
      onUpdated(updated);
      setAddForm({ variantId: "", storePrice: 0, stock: 0, isActive: true });
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : "Failed to assign variant.");
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdate(v: StoreVariantResponse) {
    setSaving(true);
    setError(null);
    try {
      const res = await storeProductsService.updateVariant(storeId, storeProduct.id, v.id, editForm);
      const updatedVariants = variants.map((x) => (x.id === v.id ? res.data : x));
      setVariants(updatedVariants);
      onUpdated({ ...storeProduct, variants: updatedVariants });
      setEditingId(null);
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : "Failed to update variant.");
    } finally {
      setSaving(false);
    }
  }

  async function handleRemove(variantId: string) {
    setRemoving(variantId);
    setError(null);
    try {
      await storeProductsService.removeVariant(storeId, storeProduct.id, variantId);
      const updatedVariants = variants.filter((v) => v.id !== variantId);
      setVariants(updatedVariants);
      onUpdated({ ...storeProduct, variants: updatedVariants });
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : "Failed to remove variant.");
    } finally {
      setRemoving(null);
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-2xl w-full">
      <div className="p-4 space-y-4">
        <div>
          <h3 className="text-base font-semibold text-gray-800 dark:text-white">Manage Variants</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {storeProduct.productTitle}
          </p>
        </div>

        {/* Variant list */}
        {variants.length > 0 ? (
          <div className="divide-y divide-gray-100 dark:divide-gray-700 rounded-xl border border-gray-100 dark:border-gray-700 overflow-hidden">
            {variants.map((v) => (
              <div key={v.id} className="px-4 py-2.5 bg-white dark:bg-gray-800">
                {editingId === v.id ? (
                  <div className="space-y-3">
                    <p className="text-xs font-mono text-gray-500">{v.variantSku}</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className={labelCls}>Price</label>
                        <input
                          type="number"
                          min={0}
                          step={0.01}
                          className={inputCls}
                          defaultValue={v.storePrice}
                          onChange={(e) =>
                            setEditForm((f) => ({ ...f, storePrice: parseFloat(e.target.value) || 0 }))
                          }
                        />
                      </div>
                      <div>
                        <label className={labelCls}>Stock</label>
                        <input
                          type="number"
                          min={0}
                          className={inputCls}
                          defaultValue={v.stock}
                          onChange={(e) =>
                            setEditForm((f) => ({ ...f, stock: parseInt(e.target.value) || 0 }))
                          }
                        />
                      </div>
                    </div>
                    <div className="flex gap-2 justify-end">
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        className="rounded-lg px-3 py-1.5 text-xs font-medium text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => handleUpdate(v)}
                        disabled={saving}
                        className="flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-700 disabled:opacity-60 transition-colors"
                      >
                        {saving && <Spinner />}
                        Save
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-mono text-gray-700 dark:text-gray-300">{v.variantSku}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        {formatPrice(v.storePrice)} · Stock: {v.stock}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge color={v.isActive ? "success" : "error"}>
                        {v.isActive ? "Active" : "Inactive"}
                      </Badge>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingId(v.id);
                          setEditForm({ storePrice: v.storePrice, stock: v.stock, isActive: v.isActive });
                        }}
                        className="rounded-lg p-1.5 text-gray-400 hover:text-brand-500 hover:bg-brand-50 dark:hover:bg-brand-500/10 transition-colors"
                        title="Edit variant"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemove(v.id)}
                        disabled={removing === v.id}
                        className="rounded-lg p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors disabled:opacity-50"
                        title="Remove variant"
                      >
                        {removing === v.id ? (
                          <Spinner />
                        ) : (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                            <path d="M10 11v6M14 11v6" />
                            <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-3">
            No variants assigned yet.
          </p>
        )}

        {/* Add variant */}
        <div className="rounded-xl border border-dashed border-gray-200 dark:border-gray-700 p-4 space-y-3">
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
            Add Variant
          </p>
          <div>
            <label className={labelCls}>Global Variant ID</label>
            <input
              type="text"
              className={inputCls}
              placeholder="UUID from global product variants"
              value={addForm.variantId}
              onChange={(e) => setAddForm((f) => ({ ...f, variantId: e.target.value }))}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Store Price</label>
              <input
                type="number"
                min={0}
                step={0.01}
                className={inputCls}
                value={addForm.storePrice || ""}
                onChange={(e) => setAddForm((f) => ({ ...f, storePrice: parseFloat(e.target.value) || 0 }))}
              />
            </div>
            <div>
              <label className={labelCls}>Stock</label>
              <input
                type="number"
                min={0}
                className={inputCls}
                value={addForm.stock || ""}
                onChange={(e) => setAddForm((f) => ({ ...f, stock: parseInt(e.target.value) || 0 }))}
              />
            </div>
          </div>
          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleAdd}
              disabled={saving || !addForm.variantId.trim()}
              className="flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60 transition-colors"
            >
              {saving && <Spinner />}
              Add Variant
            </button>
          </div>
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}

        <div className="flex justify-end pt-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            Done
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
  onConfirm: () => void;
}

function RemoveConfirmModal({ isOpen, onClose, productTitle, removing, onConfirm }: RemoveConfirmModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-sm w-full">
      <div className="p-4 space-y-4">
        <h3 className="text-base font-semibold text-gray-800 dark:text-white">Remove Product from Store</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Remove <strong>{productTitle}</strong> from your store? This will hide the product from customers. The global product is not affected.
        </p>
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
            Remove
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// StoreProducts Page
// ---------------------------------------------------------------------------

export default function StoreProducts() {
  const { id: storeId } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [products, setProducts] = useState<StoreProductResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [editTarget, setEditTarget] = useState<StoreProductResponse | null>(null);
  const [variantTarget, setVariantTarget] = useState<StoreProductResponse | null>(null);
  const [removeTarget, setRemoveTarget] = useState<StoreProductResponse | null>(null);
  const [removing, setRemoving] = useState(false);

  const load = useCallback(
    async (signal?: AbortSignal) => {
      if (!storeId) return;
      setLoading(true);
      setError(null);
      try {
        const res = await storeProductsService.list(storeId, signal);
        setProducts(res.data);
      } catch (err) {
        if ((err as { name?: string }).name === "AbortError") return;
        setError(err instanceof ApiRequestError ? err.message : "Failed to load products.");
      } finally {
        setLoading(false);
      }
    },
    [storeId]
  );

  useEffect(() => {
    const ctrl = new AbortController();
    load(ctrl.signal);
    return () => ctrl.abort();
  }, [load]);

  async function handleRemoveConfirm() {
    if (!storeId || !removeTarget) return;
    setRemoving(true);
    try {
      await storeProductsService.remove(storeId, removeTarget.id);
      setProducts((ps) => ps.filter((p) => p.id !== removeTarget.id));
      setRemoveTarget(null);
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : "Failed to remove.");
    } finally {
      setRemoving(false);
    }
  }

  function handleUpdated(updated: StoreProductResponse) {
    setProducts((ps) => ps.map((p) => (p.id === updated.id ? updated : p)));
  }

  return (
    <>
      <PageMeta title="Store Products" description="Manage products assigned to this store" />
      <PageBreadcrumb pageTitle="Store Products" />

      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-gray-800 dark:text-white">Store Products</h1>
            <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
              Products assigned to this store with local pricing and stock.
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate(`/stores/${storeId}/products/assign`)}
            className="flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Assign Product
          </button>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex justify-center items-center py-20 text-gray-400">
            <Spinner />
            <span className="ml-2 text-sm">Loading products…</span>
          </div>
        ) : error ? (
          <div className="rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 p-4 text-center">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            <button
              type="button"
              onClick={() => load()}
              className="mt-3 text-sm font-medium text-red-600 dark:text-red-400 underline"
            >
              Retry
            </button>
          </div>
        ) : products.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-200 dark:border-gray-700 py-20 text-center">
            <p className="text-sm text-gray-400 dark:text-gray-500">No products assigned to this store yet.</p>
            <button
              type="button"
              onClick={() => navigate(`/stores/${storeId}/products/assign`)}
              className="mt-3 text-sm font-semibold text-brand-500 hover:text-brand-600"
            >
              Assign your first product
            </button>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-theme-xs">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Product
                    </th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Price
                    </th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Sale Price
                    </th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Discount
                    </th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Variants
                    </th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Channel
                    </th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Updated
                    </th>
                    <th className="px-4 py-2.5" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                  {products.map((sp) => {
                    const hasDiscount = sp.effectivePrice < sp.storePrice;
                    return (
                      <tr
                        key={sp.id}
                        className="hover:bg-gray-50/50 dark:hover:bg-white/[0.02] transition-colors"
                      >
                        {/* Product */}
                        <td className="px-4 py-2.5">
                          <p className="font-semibold text-gray-800 dark:text-white/90 truncate max-w-[200px]">
                            {sp.productTitle}
                          </p>
                          <p className="mt-0.5 font-mono text-xs text-gray-400">{sp.productSku}</p>
                        </td>

                        {/* Store Price */}
                        <td className="px-4 py-2.5 text-gray-700 dark:text-gray-300">
                          {formatPrice(sp.storePrice)}
                        </td>

                        {/* Effective / Sale Price */}
                        <td className="px-4 py-2.5">
                          {hasDiscount ? (
                            <span className="font-semibold text-green-600 dark:text-green-400">
                              {formatPrice(sp.effectivePrice)}
                            </span>
                          ) : (
                            <span className="text-gray-400 dark:text-gray-500">—</span>
                          )}
                        </td>

                        {/* Discount */}
                        <td className="px-4 py-2.5 text-gray-600 dark:text-gray-300">
                          {discountLabel(sp)}
                        </td>

                        {/* Variants */}
                        <td className="px-4 py-2.5">
                          <button
                            type="button"
                            onClick={() => setVariantTarget(sp)}
                            className="text-brand-500 hover:text-brand-600 hover:underline text-sm font-medium"
                          >
                            {sp.variants.length} variant{sp.variants.length !== 1 ? "s" : ""}
                          </button>
                        </td>

                        {/* Status */}
                        <td className="px-4 py-2.5">
                          <Badge color={sp.isActive ? "success" : "error"}>
                            {sp.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </td>

                        {/* Channel — B2C / B2B */}
                        <td className="px-4 py-2.5">
                          <div className="flex flex-wrap gap-1.5">
                            <Badge color={sp.b2cEnabled ? "success" : "light"}>
                              B2C {sp.b2cEnabled ? "On" : "Off"}
                            </Badge>
                            <Badge color={sp.b2bEnabled ? "info" : "light"}>
                              B2B {sp.b2bEnabled ? "On" : "Off"}
                            </Badge>
                          </div>
                        </td>

                        {/* Updated */}
                        <td className="px-4 py-2.5 text-gray-500 dark:text-gray-400">
                          {formatDate(sp.updatedAt)}
                        </td>

                        {/* Actions */}
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => setEditTarget(sp)}
                              className="rounded-lg p-1.5 text-gray-400 hover:text-brand-500 hover:bg-brand-50 dark:hover:bg-brand-500/10 transition-colors"
                              title="Edit"
                            >
                              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                              </svg>
                            </button>
                            <button
                              type="button"
                              onClick={() => setRemoveTarget(sp)}
                              className="rounded-lg p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                              title="Remove"
                            >
                              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polyline points="3 6 5 6 21 6" />
                                <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                                <path d="M10 11v6M14 11v6" />
                                <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                              </svg>
                            </button>
                          </div>
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

      {/* Edit Modal */}
      {editTarget && storeId && (
        <EditStoreProductModal
          isOpen={!!editTarget}
          onClose={() => setEditTarget(null)}
          storeId={storeId}
          storeProduct={editTarget}
          onSaved={handleUpdated}
        />
      )}

      {/* Manage Variants Modal */}
      {variantTarget && storeId && (
        <ManageVariantsModal
          isOpen={!!variantTarget}
          onClose={() => setVariantTarget(null)}
          storeId={storeId}
          storeProduct={variantTarget}
          onUpdated={(updated) => {
            handleUpdated(updated);
            setVariantTarget(updated);
          }}
        />
      )}

      {/* Remove Confirm Modal */}
      {removeTarget && (
        <RemoveConfirmModal
          isOpen={!!removeTarget}
          onClose={() => setRemoveTarget(null)}
          productTitle={removeTarget.productTitle}
          removing={removing}
          onConfirm={handleRemoveConfirm}
        />
      )}
    </>
  );
}
