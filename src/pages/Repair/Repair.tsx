import { useEffect, useState } from "react";
import { Navigate } from "react-router";
import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import { isRepair, isSuperAdmin } from "../../auth/roles";
import { repairService } from "../../api/services/repair.service";
import type { RepairRequest, RepairStatus } from "../../api/services/repair.service";

const STATUS_LABELS: Record<RepairStatus, string> = {
  SUBMITTED: "Submitted",
  AWAITING_DEVICE: "Awaiting device",
  UNDER_REVIEW: "Under review",
  PRICE_ESTIMATED: "Waiting for customer approval",
  IN_REPAIR: "In repair",
  COMPLETED: "Completed",
  DECLINED: "Declined",
  CANCELLED: "Cancelled",
};

const STATUS_COLORS: Record<RepairStatus, string> = {
  SUBMITTED: "bg-brand-100 text-brand-700",
  AWAITING_DEVICE: "bg-indigo-100 text-indigo-700",
  UNDER_REVIEW: "bg-blue-100 text-blue-700",
  PRICE_ESTIMATED: "bg-amber-100 text-amber-700",
  IN_REPAIR: "bg-yellow-100 text-yellow-700",
  COMPLETED: "bg-green-100 text-green-700",
  DECLINED: "bg-red-100 text-red-700",
  CANCELLED: "bg-gray-100 text-gray-600",
};

const DELIVERY_LABELS: Record<string, string> = {
  COURIER_PICKUP: "Courier pickup",
  STORE_DROPOFF: "Store drop-off",
  COURIER_RETURN: "Courier return",
  STORE_PICKUP: "Store pickup",
};

/** Statuses an admin can move a request to directly (the special transitions have dedicated buttons). */
const STATUS_OPTIONS: RepairStatus[] = ["IN_REPAIR", "COMPLETED", "CANCELLED"];

function money(amount?: number | null, currency?: string | null): string {
  if (amount == null) return "—";
  return `${(currency ?? "AED").toUpperCase()} ${amount.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export default function Repair() {
  const allowed = isSuperAdmin() || isRepair();

  const [requests, setRequests] = useState<RepairRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const [selected, setSelected] = useState<RepairRequest | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Price form
  const [price, setPrice] = useState("");
  const [priceCurrency, setPriceCurrency] = useState("AED");
  const [estimatedTime, setEstimatedTime] = useState("");
  const [priceNote, setPriceNote] = useState("");

  // Generic status update
  const [newStatus, setNewStatus] = useState<RepairStatus>("COMPLETED");
  const [note, setNote] = useState("");

  const loadRequests = () => {
    const ac = new AbortController();
    setLoading(true);
    repairService
      .list(undefined, ac.signal)
      .then((r) => setRequests(r.data ?? []))
      .catch(() => setRequests([]))
      .finally(() => setLoading(false));
    return ac;
  };

  useEffect(() => {
    if (!allowed) return;
    const ac = loadRequests();
    return () => ac.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allowed]);

  if (!allowed) return <Navigate to="/" replace />;

  const newCount = requests.filter((r) => r.adminUnread).length;

  const openDetail = (req: RepairRequest) => {
    setSelected(req);
    setError(null);
    setPrice(req.estimatedPrice != null ? String(req.estimatedPrice) : "");
    setPriceCurrency((req.estimatedPriceCurrency ?? "AED").toUpperCase());
    setEstimatedTime(req.estimatedTime ?? "");
    setPriceNote(req.adminNote ?? "");
    setNewStatus(req.status === "IN_REPAIR" ? "COMPLETED" : "IN_REPAIR");
    setNote("");
    // The backend clears the unread flag on GET /{id}; refresh the row so the badge updates.
    repairService
      .getById(req.id)
      .then((r) => {
        setSelected(r.data);
        loadRequests();
      })
      .catch(() => {/* detail already shown from the row */});
  };

  const applyResult = (updated: RepairRequest) => {
    setSelected(updated);
    loadRequests();
  };

  const run = async (fn: () => Promise<{ data: RepairRequest }>, failMsg: string) => {
    setError(null);
    setBusy(true);
    try {
      const r = await fn();
      applyResult(r.data);
    } catch {
      setError(failMsg);
    } finally {
      setBusy(false);
    }
  };

  const handleMarkReceived = () =>
    selected && run(() => repairService.markReceived(selected.id), "Failed to mark the device as received.");

  const handleSetPrice = () => {
    if (!selected) return;
    const value = parseFloat(price);
    if (!Number.isFinite(value) || value <= 0) {
      setError("Enter a valid price greater than 0.");
      return;
    }
    run(
      () =>
        repairService.setPrice(selected.id, {
          price: value,
          currency: priceCurrency.trim().toUpperCase() || "AED",
          estimatedTime: estimatedTime.trim() || undefined,
          note: priceNote.trim() || undefined,
        }),
      "Failed to send the price estimate."
    );
  };

  const handleUpdateStatus = () =>
    selected &&
    run(
      () => repairService.updateStatus(selected.id, newStatus, note.trim() || undefined),
      "Failed to update the repair status."
    );

  const canReceive = selected && (selected.status === "SUBMITTED" || selected.status === "AWAITING_DEVICE");
  const canPrice = selected && (selected.status === "UNDER_REVIEW" || selected.status === "PRICE_ESTIMATED");

  return (
    <>
      <PageMeta title="Repairs | Buyology" description="Manage customer device-repair requests" />
      <PageBreadcrumb pageTitle="Requests" />

      <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white">
            Repair Requests
            {newCount > 0 && (
              <span className="ml-2 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                {newCount} new
              </span>
            )}
          </h2>
        </div>

        {loading ? (
          <p className="text-sm text-gray-500">Loading…</p>
        ) : requests.length === 0 ? (
          <div className="rounded-xl border-2 border-dashed border-gray-200 p-8 text-center dark:border-gray-700">
            <p className="text-gray-500 dark:text-gray-400">No repair requests yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-800 text-left text-xs uppercase text-gray-500">
                  <th className="pb-3 pr-4">Ref</th>
                  <th className="pb-3 pr-4">Device</th>
                  <th className="pb-3 pr-4">Customer</th>
                  <th className="pb-3 pr-4">Date</th>
                  <th className="pb-3 pr-4">Status</th>
                  <th className="pb-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {requests.map((req) => (
                  <tr key={req.id} className={req.adminUnread ? "bg-red-50/50 dark:bg-red-900/10" : ""}>
                    <td className="py-3 pr-4 font-mono text-xs text-gray-600 dark:text-gray-400">
                      <span className="inline-flex items-center gap-1.5">
                        {req.adminUnread && <span className="h-2 w-2 rounded-full bg-red-500" />}
                        {req.reference ?? req.id.slice(0, 8)}
                      </span>
                    </td>
                    <td className="py-3 pr-4 font-medium text-gray-800 dark:text-gray-200 break-words">
                      {req.productName}
                      <div className="text-xs text-gray-400">
                        {req.brand} · {req.model}
                      </div>
                    </td>
                    <td className="py-3 pr-4 text-gray-600 dark:text-gray-400">
                      <div>{req.contactEmail ?? "—"}</div>
                      {req.contactPhone && <div className="text-xs text-gray-400">{req.contactPhone}</div>}
                    </td>
                    <td className="py-3 pr-4 text-gray-500 text-xs">
                      {new Date(req.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-3 pr-4">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[req.status]}`}
                      >
                        {STATUS_LABELS[req.status]}
                      </span>
                    </td>
                    <td className="py-3">
                      <button
                        onClick={() => openDetail(req)}
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
          <div className="h-full w-full max-w-md rounded-2xl bg-white p-6 shadow-xl overflow-y-auto dark:bg-gray-900">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold dark:text-white">{selected.productName}</h3>
                <p className="font-mono text-xs text-gray-400">{selected.reference ?? selected.id}</p>
              </div>
              <button
                onClick={() => setSelected(null)}
                className="text-gray-400 hover:text-gray-600"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <div className="mb-4">
              <span
                className={`rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_COLORS[selected.status]}`}
              >
                {STATUS_LABELS[selected.status]}
              </span>
            </div>

            {selected.imageUrls && selected.imageUrls.length > 0 && (
              <div className="mb-6 grid grid-cols-4 gap-2">
                {selected.imageUrls.map((url, i) => (
                  <a key={i} href={url} target="_blank" rel="noreferrer">
                    <img
                      src={url}
                      alt={`Problem ${i + 1}`}
                      className="h-16 w-full rounded-lg object-cover bg-gray-50 dark:bg-gray-800"
                    />
                  </a>
                ))}
              </div>
            )}

            <dl className="space-y-3 text-sm mb-6">
              {[
                ["Brand", selected.brand],
                ["Model", selected.model],
                ["Purchase date", selected.purchaseDate ? new Date(selected.purchaseDate).toLocaleDateString() : "—"],
                ["Problem", selected.description],
                ["Email", selected.contactEmail ?? "—"],
                ["Phone", selected.contactPhone ?? "—"],
                [
                  "Delivery",
                  selected.inboundDeliveryMethod
                    ? DELIVERY_LABELS[selected.inboundDeliveryMethod] ?? selected.inboundDeliveryMethod
                    : "Not chosen yet",
                ],
                ["Store branch", selected.storeBranchName ?? "—"],
                [
                  "Courier fee",
                  selected.courierFeeAmount != null
                    ? money(selected.courierFeeAmount, selected.courierFeeCurrency)
                    : "—",
                ],
                [
                  "Return method",
                  selected.returnDeliveryMethod
                    ? DELIVERY_LABELS[selected.returnDeliveryMethod] ?? selected.returnDeliveryMethod
                    : "—",
                ],
                [
                  "Estimate",
                  selected.estimatedPrice != null
                    ? `${money(selected.estimatedPrice, selected.estimatedPriceCurrency)}${
                        selected.estimatedTime ? ` · ${selected.estimatedTime}` : ""
                      }`
                    : "—",
                ],
                ["Note", selected.adminNote ?? "—"],
                ["Device received", selected.deviceReceivedAt ? new Date(selected.deviceReceivedAt).toLocaleString() : "—"],
                ["Submitted", selected.submittedAt ? new Date(selected.submittedAt).toLocaleString() : "—"],
                ["Updated", new Date(selected.updatedAt).toLocaleString()],
              ].map(([k, v]) => (
                <div key={k as string} className="flex gap-3">
                  <dt className="w-32 shrink-0 text-gray-500 dark:text-gray-400">{k}</dt>
                  <dd className="text-gray-800 dark:text-gray-200 break-words">{v}</dd>
                </div>
              ))}
            </dl>

            {error && (
              <div className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700 dark:bg-red-900/30 dark:text-red-300">
                {error}
              </div>
            )}

            {/* Mark device received */}
            {canReceive && (
              <div className="mb-6 rounded-xl border border-blue-100 bg-blue-50/50 p-4 dark:border-blue-900/40 dark:bg-blue-900/10">
                <h4 className="mb-2 text-sm font-semibold text-gray-800 dark:text-white">Device at the store?</h4>
                <p className="mb-3 text-xs text-gray-500 dark:text-gray-400">
                  Mark the device as received to start the review and unlock pricing.
                </p>
                <button
                  onClick={handleMarkReceived}
                  disabled={busy}
                  className="w-full rounded-lg bg-blue-600 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {busy ? "Saving…" : "Mark device received"}
                </button>
              </div>
            )}

            {/* Set / update price estimate */}
            {canPrice && (
              <div className="mb-6 space-y-3 rounded-xl border border-amber-100 bg-amber-50/50 p-4 dark:border-amber-900/40 dark:bg-amber-900/10">
                <h4 className="text-sm font-semibold text-gray-800 dark:text-white">
                  {selected.status === "PRICE_ESTIMATED" ? "Update estimate" : "Send price estimate"}
                </h4>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">Price</label>
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      placeholder="0.00"
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                    />
                  </div>
                  <div className="w-24">
                    <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">Currency</label>
                    <input
                      type="text"
                      value={priceCurrency}
                      onChange={(e) => setPriceCurrency(e.target.value.toUpperCase())}
                      maxLength={3}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm uppercase dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                    />
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">
                    Estimated time
                  </label>
                  <input
                    type="text"
                    value={estimatedTime}
                    onChange={(e) => setEstimatedTime(e.target.value)}
                    placeholder="e.g. 3-5 business days"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">
                    Note (optional)
                  </label>
                  <textarea
                    rows={2}
                    value={priceNote}
                    onChange={(e) => setPriceNote(e.target.value)}
                    placeholder="Anything the customer should know about the estimate…"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                  />
                </div>
                <button
                  onClick={handleSetPrice}
                  disabled={busy}
                  className="w-full rounded-lg bg-amber-500 py-2 text-sm font-medium text-white hover:bg-amber-600 disabled:opacity-50"
                >
                  {busy ? "Sending…" : selected.status === "PRICE_ESTIMATED" ? "Update estimate" : "Send estimate"}
                </button>
              </div>
            )}

            {/* Generic status transition */}
            <div className="space-y-3 border-t border-gray-100 dark:border-gray-800 pt-4">
              <h4 className="text-sm font-semibold text-gray-800 dark:text-white">Update status</h4>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Status</label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value as RepairStatus)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                >
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>
                      {STATUS_LABELS[s]}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Note (optional)
                </label>
                <textarea
                  rows={3}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Message emailed to the customer with this update"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                />
              </div>
              <button
                onClick={handleUpdateStatus}
                disabled={busy}
                className="w-full rounded-lg bg-brand-500 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50"
              >
                {busy ? "Saving…" : "Update status"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
