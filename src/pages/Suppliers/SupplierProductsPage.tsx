import { useEffect, useState } from "react";
import { Link } from "react-router";
import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import Badge from "../../components/ui/badge/Badge";
import { suppliersService, type SupplierProduct } from "../../api/services/suppliers.service";
import { productsService } from "../../api/services/products.service";
import { ApiRequestError } from "../../api";
import type { Product, ProductMedia, ProductStatus } from "../../types";
import { getImageUrl } from "../../utils/imageUrl";
import { hasRole } from "../../api/client";

const STATUS_COLORS: Record<string, string> = {
  PENDING_REVIEW: "bg-yellow-100 text-yellow-700",
  APPROVED: "bg-green-100 text-green-700",
  REJECTED: "bg-red-100 text-red-700",
};

const TABS = ["ALL", "PENDING_REVIEW", "APPROVED", "REJECTED"] as const;

type BadgeColor = "success" | "error" | "warning" | "light";

function productStatusColor(status: ProductStatus | string): BadgeColor {
  if (status === "ACTIVE") return "success";
  if (status === "INACTIVE") return "warning";
  return "error";
}

export default function SupplierProductsPage() {
  const [products, setProducts] = useState<SupplierProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<(typeof TABS)[number]>("PENDING_REVIEW");
  const [selected, setSelected] = useState<SupplierProduct | null>(null);
  const [detail, setDetail] = useState<Product | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");
  const [previewMedia, setPreviewMedia] = useState<ProductMedia | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectInput, setShowRejectInput] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");

  const isSuperAdmin = hasRole("SUPERADMIN");

  function load(status: (typeof TABS)[number]) {
    setLoading(true);
    suppliersService
      .listSupplierProducts(status !== "ALL" ? { supplierStatus: status } : undefined)
      .then((r) => setProducts(r.data?.content ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(tab); }, [tab]);

  function openDetail(p: SupplierProduct) {
    setSelected(p);
    setRejectReason("");
    setShowRejectInput(false);
    setError("");
    setDetail(null);
    setPreviewMedia(null);
    setDetailError("");
    setDetailLoading(true);
    productsService
      .getById(p.id)
      .then((res) => {
        setDetail(res.data);
        const primary =
          res.data.media.find((m) => m.isPrimary) ?? res.data.media[0] ?? null;
        setPreviewMedia(primary);
      })
      .catch((e) => {
        setDetailError(
          e instanceof ApiRequestError ? e.message : "Failed to load product details."
        );
      })
      .finally(() => setDetailLoading(false));
  }

  function closeDetail() {
    setSelected(null);
    setDetail(null);
    setPreviewMedia(null);
  }

  async function handleApprove() {
    if (!selected) return;
    setActionLoading(true);
    setError("");
    try {
      await suppliersService.approveProduct(selected.id);
      setProducts((prev) =>
        prev.map((p) => (p.id === selected.id ? { ...p, supplierStatus: "APPROVED", status: "ACTIVE" } : p))
      );
      closeDetail();
    } catch {
      setError("Failed to approve. Please try again.");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleReject() {
    if (!selected || !rejectReason.trim()) { setError("Reason is required."); return; }
    setActionLoading(true);
    setError("");
    try {
      await suppliersService.rejectProduct(selected.id, rejectReason);
      setProducts((prev) =>
        prev.map((p) =>
          p.id === selected.id
            ? { ...p, supplierStatus: "REJECTED", supplierRejectionReason: rejectReason }
            : p
        )
      );
      closeDetail();
    } catch {
      setError("Failed to reject. Please try again.");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleSetStatus(next: "ACTIVE" | "INACTIVE") {
    if (!selected) return;
    setActionLoading(true);
    setError("");
    try {
      await productsService.setStatus(selected.id, next);
      setProducts((prev) =>
        prev.map((p) => (p.id === selected.id ? { ...p, status: next } : p))
      );
      setDetail((d) => (d ? { ...d, status: next } : d));
    } catch {
      setError(`Failed to ${next === "ACTIVE" ? "activate" : "deactivate"} product.`);
    } finally {
      setActionLoading(false);
    }
  }

  async function handleDelete() {
    if (!selected) return;
    if (!window.confirm("Move this product to trash? It can be restored from the Trash page.")) return;
    setActionLoading(true);
    setError("");
    try {
      await productsService.remove(selected.id);
      setProducts((prev) => prev.filter((p) => p.id !== selected.id));
      closeDetail();
    } catch {
      setError("Failed to delete product.");
    } finally {
      setActionLoading(false);
    }
  }

  return (
    <>
      <PageMeta title="Supplier Products Review | Buyology" description="Review supplier product submissions" />
      <PageBreadcrumb pageTitle="Supplier Products Review" />

      <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
        <div className="mb-4 flex items-center gap-2 flex-wrap">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`rounded-full px-4 py-1.5 text-xs font-medium transition-colors ${
                tab === t
                  ? "bg-brand-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400"
              }`}
            >
              {t.replace(/_/g, " ")}
            </button>
          ))}
        </div>

        {loading ? (
          <p className="text-sm text-gray-500">Loading…</p>
        ) : products.length === 0 ? (
          <div className="rounded-xl border-2 border-dashed border-gray-200 p-5 text-center dark:border-gray-700">
            <p className="text-gray-500 dark:text-gray-400">No products found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-800 text-left text-xs uppercase text-gray-500">
                  <th className="pb-3 pr-4">SKU</th>
                  <th className="pb-3 pr-4">Product Status</th>
                  <th className="pb-3 pr-4">Review Status</th>
                  <th className="pb-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {products.map((p) => (
                  <tr key={p.id}>
                    <td className="py-3 pr-4 font-mono text-gray-800 dark:text-gray-200 text-xs">{p.sku}</td>
                    <td className="py-3 pr-4 text-gray-600 dark:text-gray-400 text-xs">{p.status}</td>
                    <td className="py-3 pr-4">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[p.supplierStatus] ?? "bg-gray-100 text-gray-600"}`}>
                        {p.supplierStatus?.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="py-3">
                      <button
                        onClick={() => openDetail(p)}
                        className="rounded-lg bg-brand-50 px-3 py-1.5 text-xs font-medium text-brand-600 hover:bg-brand-100 dark:bg-brand-500/10 dark:text-brand-400"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Detail drawer */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-stretch justify-end bg-black/40" onClick={closeDetail}>
          <div
            className="h-full w-full max-w-lg overflow-y-auto bg-white p-4 shadow-theme-lg dark:bg-gray-900"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-semibold dark:text-white">Product Details</h3>
              <button onClick={closeDetail} className="text-gray-400 hover:text-gray-600 text-lg">
                ✕
              </button>
            </div>

            {detailLoading ? (
              <p className="text-sm text-gray-500">Loading product…</p>
            ) : detailError ? (
              <p className="text-sm text-red-500">{detailError}</p>
            ) : detail ? (
              <div className="space-y-4">
                {/* Media gallery */}
                {detail.media.length > 0 && (
                  <div>
                    <div className="flex items-center justify-center overflow-hidden rounded-xl border border-gray-100 bg-gray-50 dark:border-gray-800 dark:bg-gray-900/40 min-h-56 max-h-80">
                      {previewMedia?.mediaType === "VIDEO" ? (
                        <video src={getImageUrl(previewMedia.url)} controls className="max-h-80 max-w-full object-contain" />
                      ) : previewMedia ? (
                        <img src={getImageUrl(previewMedia.url)} alt={detail.title} className="max-h-80 max-w-full object-contain" />
                      ) : null}
                    </div>
                    {detail.media.length > 1 && (
                      <div className="mt-2 flex gap-2 overflow-x-auto">
                        {detail.media.map((m) => (
                          <button
                            key={m.id}
                            onClick={() => setPreviewMedia(m)}
                            className={`h-10 w-10 flex-shrink-0 overflow-hidden rounded-lg border-2 transition-all ${
                              previewMedia?.id === m.id
                                ? "border-brand-500"
                                : "border-gray-200 dark:border-gray-700 hover:border-brand-300"
                            }`}
                          >
                            {m.mediaType === "VIDEO" ? (
                              <div className="flex h-full w-full items-center justify-center bg-gray-100 text-gray-400 dark:bg-gray-800">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3" /></svg>
                              </div>
                            ) : (
                              <img src={getImageUrl(m.thumbnailUrl ?? m.url)} alt="" className="h-full w-full object-cover" />
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Title + status */}
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <h4 className="text-base font-semibold text-gray-900 dark:text-white">{detail.title}</h4>
                    <Badge size="sm" color={productStatusColor(detail.status)}>{detail.status}</Badge>
                  </div>
                  {detail.description && (
                    <p className="mt-2 whitespace-pre-line text-sm text-gray-600 dark:text-gray-300">
                      {detail.description}
                    </p>
                  )}
                </div>

                {/* Key facts */}
                <dl className="grid grid-cols-2 gap-3 rounded-xl border border-gray-100 p-4 text-sm dark:border-gray-800">
                  {[
                    ["SKU", detail.sku],
                    ["Type", detail.productType],
                    ["Availability", detail.availabilityStatus?.replace(/_/g, " ")],
                    ["Brand", detail.brandName ?? "—"],
                    ["Review Status", selected.supplierStatus?.replace(/_/g, " ")],
                    ["Supplier ID", selected.supplierId ?? "—"],
                  ].map(([k, v]) => (
                    <div key={k as string}>
                      <dt className="text-xs text-gray-500 dark:text-gray-400">{k}</dt>
                      <dd className="mt-0.5 break-words text-gray-800 dark:text-gray-200">{v || "—"}</dd>
                    </div>
                  ))}
                </dl>

                {/* Specs */}
                {detail.specs.length > 0 && (
                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Specifications</p>
                    <div className="divide-y divide-gray-100 rounded-xl border border-gray-100 dark:divide-gray-800 dark:border-gray-800">
                      {detail.specs.map((s) => (
                        <div key={s.id} className="flex justify-between gap-3 px-4 py-2.5 text-sm">
                          <span className="text-gray-500 dark:text-gray-400">{s.name}</span>
                          <span className="text-right font-medium text-gray-800 dark:text-gray-200">
                            {s.options.map((o) => `${o.value}${o.unit ? ` ${o.unit}` : ""}`).join(", ")}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Variants */}
                {detail.variants.length > 0 && (
                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Variants ({detail.variants.length})
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {detail.variants.map((v) => (
                        <span key={v.id} className="rounded-lg bg-gray-100 px-2.5 py-1 font-mono text-xs text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                          {v.sku}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {selected.supplierRejectionReason && (
                  <div className="rounded-lg bg-red-50 px-4 py-2.5 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-400">
                    <span className="font-medium">Rejection reason: </span>{selected.supplierRejectionReason}
                  </div>
                )}

                <Link
                  to={`/products/${detail.id}`}
                  className="inline-block text-xs font-medium text-brand-500 hover:underline"
                >
                  Open full product page →
                </Link>
              </div>
            ) : null}

            {/* Actions */}
            <div className="mt-4 space-y-3 border-t border-gray-100 pt-4 dark:border-gray-800">
              {error && <p className="text-xs text-red-500">{error}</p>}

              {/* Review actions */}
              {selected.supplierStatus === "PENDING_REVIEW" && (
                <>
                  <button
                    onClick={handleApprove}
                    disabled={actionLoading}
                    className="w-full rounded-lg bg-green-500 py-2 text-sm font-medium text-white hover:bg-green-600 disabled:opacity-50"
                  >
                    {actionLoading ? "Processing…" : "Approve — Make Live"}
                  </button>

                  {!showRejectInput ? (
                    <button
                      onClick={() => setShowRejectInput(true)}
                      className="w-full rounded-lg border border-red-300 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
                    >
                      Reject Product
                    </button>
                  ) : (
                    <div className="space-y-2">
                      <textarea
                        rows={3}
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                        placeholder="Explain why this product is being rejected…"
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => setShowRejectInput(false)}
                          className="flex-1 rounded-lg border border-gray-300 py-2 text-xs text-gray-600"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleReject}
                          disabled={actionLoading}
                          className="flex-1 rounded-lg bg-red-500 py-2 text-xs font-medium text-white hover:bg-red-600 disabled:opacity-50"
                        >
                          {actionLoading ? "Rejecting…" : "Confirm Reject"}
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Superadmin-only product controls */}
              {isSuperAdmin && detail && detail.status !== "DELETED" && (
                <div className="space-y-2">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                    Superadmin controls
                  </p>
                  <div className="flex gap-2">
                    {detail.status === "ACTIVE" ? (
                      <button
                        onClick={() => handleSetStatus("INACTIVE")}
                        disabled={actionLoading}
                        className="flex-1 rounded-lg border border-yellow-300 py-2 text-xs font-medium text-yellow-700 hover:bg-yellow-50 disabled:opacity-50 dark:border-yellow-500/40 dark:text-yellow-400"
                      >
                        Deactivate
                      </button>
                    ) : (
                      <button
                        onClick={() => handleSetStatus("ACTIVE")}
                        disabled={actionLoading}
                        className="flex-1 rounded-lg border border-green-300 py-2 text-xs font-medium text-green-700 hover:bg-green-50 disabled:opacity-50 dark:border-green-500/40 dark:text-green-400"
                      >
                        Activate
                      </button>
                    )}
                    <button
                      onClick={handleDelete}
                      disabled={actionLoading}
                      className="flex-1 rounded-lg bg-red-500 py-2 text-xs font-medium text-white hover:bg-red-600 disabled:opacity-50"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
