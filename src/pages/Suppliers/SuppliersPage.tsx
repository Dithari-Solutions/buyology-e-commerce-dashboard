import { useEffect, useState } from "react";
import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import { suppliersService, type SupplierApplication } from "../../api/services/suppliers.service";
import { storesService } from "../../api/services/stores.service";
import type { Store } from "../../types/store.types";

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-700",
  APPROVED: "bg-green-100 text-green-700",
  REJECTED: "bg-red-100 text-red-700",
};

const TABS = ["ALL", "PENDING", "APPROVED", "REJECTED"] as const;

export default function SuppliersPage() {
  const [applications, setApplications] = useState<SupplierApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<(typeof TABS)[number]>("ALL");
  const [selected, setSelected] = useState<SupplierApplication | null>(null);
  const [stores, setStores] = useState<Store[]>([]);
  const [selectedStoreIds, setSelectedStoreIds] = useState<string[]>([]);
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectInput, setShowRejectInput] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const ac = new AbortController();
    const params = tab !== "ALL" ? { status: tab } : undefined;
    suppliersService
      .listApplications(params)
      .then((r) => setApplications(r.data?.content ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
    storesService.getAll(ac.signal).then((r) => setStores(r.data ?? [])).catch(() => {});
    return () => ac.abort();
  }, [tab]);

  function openDetail(app: SupplierApplication) {
    setSelected(app);
    setSelectedStoreIds([]);
    setRejectReason("");
    setShowRejectInput(false);
    setError("");
  }

  function toggleStore(id: string) {
    setSelectedStoreIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  async function handleApprove() {
    if (!selected || selectedStoreIds.length === 0) {
      setError("Select at least one store before approving.");
      return;
    }
    setActionLoading(true);
    setError("");
    try {
      await suppliersService.approveApplication(selected.id, selectedStoreIds);
      setApplications((prev) =>
        prev.map((a) => (a.id === selected.id ? { ...a, status: "APPROVED" } : a))
      );
      setSelected(null);
    } catch {
      setError("Failed to approve. Please try again.");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleReject() {
    if (!selected || !rejectReason.trim()) {
      setError("Rejection reason is required.");
      return;
    }
    setActionLoading(true);
    setError("");
    try {
      await suppliersService.rejectApplication(selected.id, rejectReason);
      setApplications((prev) =>
        prev.map((a) =>
          a.id === selected.id ? { ...a, status: "REJECTED", rejectionReason: rejectReason } : a
        )
      );
      setSelected(null);
    } catch {
      setError("Failed to reject. Please try again.");
    } finally {
      setActionLoading(false);
    }
  }

  const displayed = tab === "ALL" ? applications : applications.filter((a) => a.status === tab);

  return (
    <>
      <PageMeta title="Supplier Applications | Buyology" description="Review supplier applications" />
      <PageBreadcrumb pageTitle="Supplier Applications" />

      <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="mb-4 flex items-center gap-2">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`rounded-full px-4 py-1.5 text-xs font-medium transition-colors ${
                tab === t
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {loading ? (
          <p className="text-sm text-gray-500">Loading…</p>
        ) : displayed.length === 0 ? (
          <div className="rounded-xl border-2 border-dashed border-gray-200 p-8 text-center dark:border-gray-700">
            <p className="text-gray-500 dark:text-gray-400">No applications found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-800 text-left text-xs uppercase text-gray-500">
                  <th className="pb-3 pr-4">Name / Business</th>
                  <th className="pb-3 pr-4">Seller Type</th>
                  <th className="pb-3 pr-4">Email</th>
                  <th className="pb-3 pr-4">Submitted</th>
                  <th className="pb-3 pr-4">Status</th>
                  <th className="pb-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {displayed.map((app) => (
                  <tr key={app.id}>
                    <td className="py-3 pr-4 font-medium text-gray-800 dark:text-gray-200">
                      <div>{app.fullName}</div>
                      {app.businessName && (
                        <div className="text-xs text-gray-400">{app.businessName}</div>
                      )}
                    </td>
                    <td className="py-3 pr-4 text-gray-600 dark:text-gray-400 text-xs">
                      {app.sellerType.replace(/_/g, " ")}
                    </td>
                    <td className="py-3 pr-4 text-gray-600 dark:text-gray-400">{app.email}</td>
                    <td className="py-3 pr-4 text-gray-500 text-xs">
                      {new Date(app.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-3 pr-4">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[app.status]}`}>
                        {app.status}
                      </span>
                    </td>
                    <td className="py-3">
                      <button
                        onClick={() => openDetail(app)}
                        className="rounded-lg bg-gray-100 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
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
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/40 p-4">
          <div className="h-full w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl overflow-y-auto dark:bg-gray-900">
            <div className="mb-6 flex items-center justify-between">
              <h3 className="text-lg font-semibold dark:text-white">Application Detail</h3>
              <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600 text-xl">
                ✕
              </button>
            </div>

            <dl className="space-y-3 text-sm mb-6">
              {[
                ["Full Name", selected.fullName],
                ["Business Name", selected.businessName ?? "—"],
                ["Seller Type", selected.sellerType?.replace(/_/g, " ") ?? "—"],
                ["Country", selected.country ?? "—"],
                ["City", selected.city ?? "—"],
                ["Email", selected.email],
                ["Phone", selected.phoneNumber ?? "—"],
                ["Preferred Contact", selected.preferredContact],
                ["Categories", selected.productCategories ?? "—"],
                ["Main Brands", selected.mainBrands ?? "—"],
                ["Product Condition", selected.productCondition ?? "—"],
                ["Initial Listing Range", selected.initialListingRange ?? "—"],
                ["Sells Elsewhere", selected.sellsElsewhere ?? "—"],
                ["Provides Images", selected.canProvideImages ?? "—"],
                ["Dispatch Time", selected.avgDispatchTime ?? "—"],
                ["Handles Returns", selected.handlesReturns ?? "—"],
                ["Has Trade License", selected.hasTradeLicense ?? "—"],
                ["Website / Social", selected.websiteOrSocialLink ?? "—"],
                ["Why Buyology", selected.whyBuyology ?? "—"],
              ].map(([k, v]) => (
                <div key={k as string} className="flex gap-3">
                  <dt className="w-36 shrink-0 text-gray-500 dark:text-gray-400 text-xs">{k}</dt>
                  <dd className="text-gray-800 dark:text-gray-200 break-words text-xs">{v}</dd>
                </div>
              ))}
              {selected.tradeLicenseUrl && (
                <div className="flex gap-3">
                  <dt className="w-36 shrink-0 text-gray-500 dark:text-gray-400 text-xs">Trade License</dt>
                  <dd>
                    <a
                      href={selected.tradeLicenseUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-blue-600 underline"
                    >
                      View Document ↗
                    </a>
                  </dd>
                </div>
              )}
            </dl>

            {selected.status === "PENDING" && (
              <div className="border-t border-gray-100 dark:border-gray-800 pt-4 space-y-4">
                {error && <p className="text-red-500 text-xs">{error}</p>}

                {/* Store assignment for approval */}
                <div>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Assign Stores (required to approve)
                  </p>
                  <div className="max-h-40 overflow-y-auto space-y-1 border border-gray-200 rounded-lg p-2 dark:border-gray-700">
                    {stores.map((s) => (
                      <label key={s.id} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedStoreIds.includes(s.id)}
                          onChange={() => toggleStore(s.id)}
                          className="h-4 w-4 rounded border-gray-300 text-blue-600"
                        />
                        <span className="text-xs text-gray-700 dark:text-gray-300">{s.name ?? s.id}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <button
                  onClick={handleApprove}
                  disabled={actionLoading}
                  className="w-full rounded-lg bg-green-500 py-2 text-sm font-medium text-white hover:bg-green-600 disabled:opacity-50"
                >
                  {actionLoading ? "Processing…" : "Approve Supplier"}
                </button>

                {!showRejectInput ? (
                  <button
                    onClick={() => setShowRejectInput(true)}
                    className="w-full rounded-lg border border-red-300 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
                  >
                    Reject Application
                  </button>
                ) : (
                  <div className="space-y-2">
                    <textarea
                      rows={3}
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      placeholder="Rejection reason…"
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

            {selected.status === "REJECTED" && selected.rejectionReason && (
              <div className="border-t border-gray-100 dark:border-gray-800 pt-4">
                <p className="text-xs text-gray-500 dark:text-gray-400">Rejection reason:</p>
                <p className="text-sm text-red-600 mt-1">{selected.rejectionReason}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
