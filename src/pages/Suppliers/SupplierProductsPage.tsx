import { useEffect, useState } from "react";
import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import { suppliersService, type SupplierProduct } from "../../api/services/suppliers.service";

const STATUS_COLORS: Record<string, string> = {
  PENDING_REVIEW: "bg-yellow-100 text-yellow-700",
  APPROVED: "bg-green-100 text-green-700",
  REJECTED: "bg-red-100 text-red-700",
};

const TABS = ["ALL", "PENDING_REVIEW", "APPROVED", "REJECTED"] as const;

export default function SupplierProductsPage() {
  const [products, setProducts] = useState<SupplierProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<(typeof TABS)[number]>("PENDING_REVIEW");
  const [selected, setSelected] = useState<SupplierProduct | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectInput, setShowRejectInput] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");

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
      setSelected(null);
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
      setSelected(null);
    } catch {
      setError("Failed to reject. Please try again.");
    } finally {
      setActionLoading(false);
    }
  }

  return (
    <>
      <PageMeta title="Supplier Products Review | Buyology" description="Review supplier product submissions" />
      <PageBreadcrumb pageTitle="Supplier Products Review" />

      <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
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
          <div className="rounded-xl border-2 border-dashed border-gray-200 p-8 text-center dark:border-gray-700">
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
                        className="rounded-lg bg-gray-100 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                      >
                        Review
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Review drawer */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/40 p-4">
          <div className="h-full w-full max-w-md rounded-2xl bg-white p-6 shadow-xl overflow-y-auto dark:bg-gray-900">
            <div className="mb-6 flex items-center justify-between">
              <h3 className="text-lg font-semibold dark:text-white">Product Review</h3>
              <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600 text-xl">
                ✕
              </button>
            </div>

            <dl className="space-y-3 text-sm mb-6">
              {[
                ["Product ID", selected.id],
                ["SKU", selected.sku],
                ["Status", selected.status],
                ["Review Status", selected.supplierStatus?.replace(/_/g, " ")],
                ["Supplier ID", selected.supplierId ?? "—"],
              ].map(([k, v]) => (
                <div key={k as string} className="flex gap-3">
                  <dt className="w-32 shrink-0 text-gray-500 dark:text-gray-400 text-xs">{k}</dt>
                  <dd className="text-gray-800 dark:text-gray-200 break-words text-xs font-mono">{v}</dd>
                </div>
              ))}
              {selected.supplierRejectionReason && (
                <div className="flex gap-3">
                  <dt className="w-32 shrink-0 text-gray-500 dark:text-gray-400 text-xs">Rejection Reason</dt>
                  <dd className="text-red-600 text-xs">{selected.supplierRejectionReason}</dd>
                </div>
              )}
            </dl>

            {selected.supplierStatus === "PENDING_REVIEW" && (
              <div className="border-t border-gray-100 dark:border-gray-800 pt-4 space-y-3">
                {error && <p className="text-red-500 text-xs">{error}</p>}

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
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
