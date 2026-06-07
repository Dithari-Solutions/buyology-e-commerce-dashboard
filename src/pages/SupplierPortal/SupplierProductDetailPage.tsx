import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router";
import PageMeta from "../../components/common/PageMeta";
import Badge from "../../components/ui/badge/Badge";
import { Modal } from "../../components/ui/modal";
import { suppliersService } from "../../api";
import { ApiRequestError } from "../../api";
import type { SupplierProductChange } from "../../api/services/suppliers.service";
import type { Product, ProductMedia, ProductStatus, AvailabilityStatus } from "../../types";
import { getImageUrl } from "../../utils/imageUrl";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

type BadgeColor = "success" | "error" | "warning" | "info" | "light";

function statusColor(status: ProductStatus): BadgeColor {
  return status === "ACTIVE" ? "success" : "error";
}

function productTypeColor(type: string): string {
  switch (type) {
    case "SIMPLE":
      return "bg-brand-100 text-brand-700 dark:bg-brand-500/10 dark:text-brand-400";
    case "DIY":
      return "bg-purple-100 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400";
    case "ACCESSORY":
      return "bg-orange-100 text-orange-700 dark:bg-orange-500/10 dark:text-orange-400";
    default:
      return "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300";
  }
}

// ---------------------------------------------------------------------------
// Loading skeleton
// ---------------------------------------------------------------------------

function DetailSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03] p-6">
        <div className="space-y-3">
          <div className="h-7 w-64 rounded-lg bg-gray-200 dark:bg-gray-700" />
          <div className="h-4 w-40 rounded-full bg-gray-100 dark:bg-gray-800" />
          <div className="h-4 w-full max-w-lg rounded bg-gray-100 dark:bg-gray-800" />
        </div>
      </div>
      <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03] h-56" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Supplier Product Detail (read-only — mirrors the admin product detail)
// ---------------------------------------------------------------------------

export default function SupplierProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMedia, setSelectedMedia] = useState<ProductMedia | null>(null);

  // Pending change request for this product (blocks new requests until reviewed).
  const [pendingChange, setPendingChange] = useState<SupplierProductChange | null>(null);
  const [busy, setBusy] = useState(false);
  const [actionMsg, setActionMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  // Edit modal
  const [editOpen, setEditOpen] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    availabilityStatus: "IN_STOCK" as AvailabilityStatus,
    isSuperDeal: false,
    isLimitedStock: false,
  });

  function refreshPendingChange() {
    suppliersService
      .listMyChangeRequests({ size: 50 })
      .then((r) => {
        const pending = (r.data?.content ?? []).find(
          (c) => c.productId === id && c.status === "PENDING",
        );
        setPendingChange(pending ?? null);
      })
      .catch(() => {});
  }

  useEffect(() => {
    if (!id) return;
    const controller = new AbortController();
    setLoading(true);
    setError(null);

    suppliersService
      .getMyProductById(id, "EN", controller.signal)
      .then((res) => {
        setProduct(res.data);
        const primary = res.data.media.find((m) => m.isPrimary) ?? res.data.media[0] ?? null;
        setSelectedMedia(primary);
        setForm({
          title: res.data.title,
          description: res.data.description ?? "",
          availabilityStatus: res.data.availabilityStatus,
          isSuperDeal: res.data.isSuperDeal,
          isLimitedStock: res.data.isLimitedStock,
        });
      })
      .catch((err: unknown) => {
        if (err instanceof Error && err.name === "AbortError") return;
        setError(err instanceof ApiRequestError ? err.message : "Failed to load product.");
      })
      .finally(() => setLoading(false));

    refreshPendingChange();
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function requestDelete() {
    if (!id || !window.confirm("Request deletion of this product? A superadmin must approve.")) return;
    setBusy(true);
    setActionMsg(null);
    try {
      await suppliersService.softDeleteProduct(id); // files a DELETE change request
      setActionMsg({ kind: "ok", text: "Delete request submitted for approval." });
      refreshPendingChange();
    } catch (e) {
      setActionMsg({ kind: "err", text: e instanceof ApiRequestError ? e.message : "Failed to submit request." });
    } finally {
      setBusy(false);
    }
  }

  async function submitEdit() {
    if (!id) return;
    setBusy(true);
    setActionMsg(null);
    try {
      await suppliersService.requestEditProduct(id, {
        translations: { titleEn: form.title, descriptionEn: form.description },
        availabilityStatus: form.availabilityStatus,
        isSuperDeal: form.isSuperDeal,
        isLimitedStock: form.isLimitedStock,
      });
      setEditOpen(false);
      setActionMsg({ kind: "ok", text: "Edit request submitted for approval." });
      refreshPendingChange();
    } catch (e) {
      setActionMsg({ kind: "err", text: e instanceof ApiRequestError ? e.message : "Failed to submit request." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageMeta
        title={product ? `${product.title} | My Products` : "Product Detail | Supplier Portal"}
        description="Supplier product details"
      />

      {/* Breadcrumb */}
      <div className="mb-6 flex items-center gap-2 text-sm min-w-0">
        <Link
          to="/supplier/my-products"
          className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400 hover:text-brand-600 dark:hover:text-brand-400 transition-colors"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M15 18l-6-6 6-6" />
          </svg>
          My Products
        </Link>
        <span className="text-gray-300 dark:text-gray-700">/</span>
        <span className="text-gray-800 dark:text-white/80 font-medium truncate max-w-[240px]">
          {loading ? "Loading…" : product?.title ?? "Not found"}
        </span>
      </div>

      {/* Supplier actions (all changes require superadmin approval) */}
      {!loading && !error && product && (
        <div className="mb-4 space-y-3">
          {pendingChange && (
            <div className="rounded-xl border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-800 dark:border-yellow-500/30 dark:bg-yellow-500/10 dark:text-yellow-400">
              A <strong>{pendingChange.action}</strong> request is pending superadmin approval. You
              can submit a new request once it is reviewed.
            </div>
          )}
          {actionMsg && (
            <div className={`rounded-xl px-4 py-3 text-sm ${actionMsg.kind === "ok" ? "bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-400" : "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400"}`}>
              {actionMsg.text}
            </div>
          )}
          {product.status !== "DELETED" && (
            <div className="flex flex-wrap gap-2">
              <button
                disabled={busy || !!pendingChange}
                onClick={() => setEditOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3.5 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/60 disabled:opacity-50"
              >
                Request Edit
              </button>
              <button
                disabled={busy || !!pendingChange}
                onClick={requestDelete}
                className="inline-flex items-center gap-1.5 rounded-xl border border-error-200 dark:border-error-800/50 bg-error-50 dark:bg-error-500/10 px-3.5 py-2 text-sm font-medium text-error-600 dark:text-error-400 hover:bg-error-100 dark:hover:bg-error-500/20 disabled:opacity-50"
              >
                Request Delete
              </button>
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-red-200 dark:border-red-800/40 bg-red-50 dark:bg-red-500/5 py-20 text-center">
          <p className="text-sm font-medium text-red-600 dark:text-red-400">{error}</p>
          <button
            onClick={() => navigate("/supplier/my-products")}
            className="mt-4 rounded-xl bg-red-100 dark:bg-red-500/10 px-4 py-2 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-500/20 transition-colors"
          >
            Back to My Products
          </button>
        </div>
      )}

      {loading && <DetailSkeleton />}

      {!loading && !error && product && (
        <div className="space-y-5">
          {/* Header card */}
          <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03] p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0 flex-1">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white leading-tight">
                  {product.title}
                </h1>
                <p className="mb-3 font-mono text-sm text-gray-400 dark:text-gray-500 tracking-wide">
                  SKU: {product.sku}
                </p>
                {product.description && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed max-w-2xl">
                    {product.description}
                  </p>
                )}
              </div>
              <div className="flex flex-shrink-0 flex-row sm:flex-col items-start sm:items-end gap-2">
                <Badge size="sm" color={statusColor(product.status)}>
                  {product.status}
                </Badge>
                <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${productTypeColor(product.productType)}`}>
                  {product.productType}
                </span>
                {product.isRefurbished && (
                  <span className="inline-flex items-center rounded-full bg-amber-100 dark:bg-amber-500/10 px-2.5 py-1 text-xs font-semibold text-amber-700 dark:text-amber-400">
                    Refurbished {product.refurbGrade ? `· Grade ${product.refurbGrade}` : ""}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Media gallery */}
          {product.media.length > 0 && (
            <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03] overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400">Media</h2>
                <span className="text-xs text-gray-400 dark:text-gray-500">
                  {product.media.length} file{product.media.length !== 1 ? "s" : ""}
                </span>
              </div>
              <div className="flex items-center justify-center bg-gray-50 dark:bg-gray-900/40 min-h-64 max-h-[480px] overflow-hidden">
                {selectedMedia?.mediaType === "VIDEO" ? (
                  <video key={selectedMedia.id} src={getImageUrl(selectedMedia.url)} controls className="max-h-[480px] max-w-full object-contain" />
                ) : selectedMedia ? (
                  <img key={selectedMedia.id} src={getImageUrl(selectedMedia.url)} alt={product.title} className="max-h-[480px] max-w-full object-contain" />
                ) : null}
              </div>
              {product.media.length > 1 && (
                <div className="flex gap-2 overflow-x-auto p-4 border-t border-gray-100 dark:border-gray-800">
                  {product.media.map((m) => {
                    const isActive = selectedMedia?.id === m.id;
                    return (
                      <button
                        key={m.id}
                        onClick={() => setSelectedMedia(m)}
                        className={`relative flex-shrink-0 h-16 w-16 rounded-xl overflow-hidden border-2 transition-all ${
                          isActive
                            ? "border-brand-500 dark:border-brand-400 shadow-sm"
                            : "border-gray-200 dark:border-gray-700 hover:border-brand-300 dark:hover:border-brand-600"
                        }`}
                      >
                        {m.mediaType === "VIDEO" ? (
                          <div className="flex h-full w-full items-center justify-center bg-gray-100 dark:bg-gray-800 text-gray-400">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                              <polygon points="5 3 19 12 5 21 5 3" />
                            </svg>
                          </div>
                        ) : (
                          <img src={getImageUrl(m.thumbnailUrl ?? m.url)} alt={`Media ${m.orderIndex + 1}`} className="h-full w-full object-cover" />
                        )}
                        {m.isPrimary && (
                          <span className="absolute bottom-0.5 left-0.5 rounded-sm bg-brand-500 px-1 py-px text-[9px] font-bold leading-none text-white">
                            Primary
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Product details */}
          <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03] p-6">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-400">Product Details</h2>
            <div className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4">
              <div>
                <p className="text-xs text-gray-400 dark:text-gray-500">Category ID</p>
                <p className="mt-0.5 text-sm font-medium text-gray-700 dark:text-gray-200 font-mono truncate" title={product.categoryId}>
                  {product.categoryId.slice(0, 8)}…
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-400 dark:text-gray-500">Refurbished</p>
                <p className="mt-0.5 text-sm font-medium text-gray-700 dark:text-gray-200">
                  {product.isRefurbished ? "Yes" : "No"}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-400 dark:text-gray-500">Accessories</p>
                <p className="mt-0.5 text-sm font-medium text-gray-700 dark:text-gray-200">
                  {product.accessoryIds.length > 0 ? `${product.accessoryIds.length} linked` : "None"}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-400 dark:text-gray-500">Created</p>
                <p className="mt-0.5 text-sm font-medium text-gray-700 dark:text-gray-200">{formatDate(product.createdAt)}</p>
              </div>
            </div>
          </div>

          {/* Specs */}
          {product.specs.length > 0 && (
            <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03] overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400">Specifications</h2>
                <span className="inline-flex items-center justify-center rounded-full w-6 h-6 text-xs font-bold bg-brand-100 text-brand-700 dark:bg-brand-500/10 dark:text-brand-400">
                  {product.specs.length}
                </span>
              </div>
              <div className="divide-y divide-gray-100 dark:divide-gray-800">
                {product.specs.map((spec) => (
                  <div key={spec.id} className="px-6 py-4">
                    <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                      {spec.name}
                      <span className="ml-2 font-normal normal-case text-gray-400 dark:text-gray-500">({spec.code})</span>
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {spec.options.map((opt) => (
                        <div key={opt.id} className="flex items-center gap-1.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-white/[0.03] px-3 py-1.5">
                          <span className="text-sm font-semibold text-gray-800 dark:text-white/90">
                            {opt.value}
                            {opt.unit && <span className="ml-0.5 text-xs font-normal text-gray-400 dark:text-gray-500">{opt.unit}</span>}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Variants */}
          {product.variants.length > 0 && (
            <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03] overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400">Variants</h2>
                <span className="inline-flex items-center justify-center rounded-full w-6 h-6 text-xs font-bold bg-brand-100 text-brand-700 dark:bg-brand-500/10 dark:text-brand-400">
                  {product.variants.length}
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-white/[0.02]">
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">SKU</th>
                      <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">Spec Options</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {product.variants.map((v) => (
                      <tr key={v.id} className="transition-colors hover:bg-gray-50 dark:hover:bg-white/[0.02]">
                        <td className="px-6 py-4 font-mono text-sm text-gray-700 dark:text-gray-300">{v.sku}</td>
                        <td className="px-6 py-4 text-right text-xs text-gray-400">
                          {v.specOptionIds.length > 0 ? `${v.specOptionIds.length} spec(s)` : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Request Edit modal — submits an edit for superadmin approval */}
      <Modal isOpen={editOpen} onClose={() => !busy && setEditOpen(false)} className="mx-4 max-w-lg w-full p-6">
        <h3 className="mb-1 text-base font-semibold text-gray-800 dark:text-white/90">Request Product Edit</h3>
        <p className="mb-4 text-xs text-gray-500 dark:text-gray-400">
          Changes are submitted for superadmin approval and applied once approved.
        </p>
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">Title (EN)</label>
            <input
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">Description (EN)</label>
            <textarea
              rows={3}
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">Availability</label>
            <select
              value={form.availabilityStatus}
              onChange={(e) => setForm((f) => ({ ...f, availabilityStatus: e.target.value as AvailabilityStatus }))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
            >
              <option value="IN_STOCK">IN_STOCK</option>
              <option value="OUT_OF_STOCK">OUT_OF_STOCK</option>
              <option value="PRE_ORDER">PRE_ORDER</option>
            </select>
          </div>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
              <input type="checkbox" checked={form.isSuperDeal} onChange={(e) => setForm((f) => ({ ...f, isSuperDeal: e.target.checked }))} className="h-4 w-4 rounded border-gray-300" />
              Super deal
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
              <input type="checkbox" checked={form.isLimitedStock} onChange={(e) => setForm((f) => ({ ...f, isLimitedStock: e.target.checked }))} className="h-4 w-4 rounded border-gray-300" />
              Limited stock
            </label>
          </div>
        </div>
        <div className="mt-5 flex gap-3">
          <button
            onClick={() => setEditOpen(false)}
            disabled={busy}
            className="flex-1 rounded-xl border border-gray-200 dark:border-gray-700 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={submitEdit}
            disabled={busy}
            className="flex-1 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
          >
            {busy ? "Submitting…" : "Submit for approval"}
          </button>
        </div>
      </Modal>
    </>
  );
}
