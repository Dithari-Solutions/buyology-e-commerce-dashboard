import { useEffect, useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router";
import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import { isRepair, isSuperAdmin } from "../../auth/roles";
import { repairService } from "../../api/services/repair.service";
import type { RepairRequest, RepairStatus } from "../../api/services/repair.service";
import { DELIVERY_LABELS, STATUS_COLORS, STATUS_LABELS, STATUS_OPTIONS, money } from "./repairUi";

export default function RepairDetail() {
  const allowed = isSuperAdmin() || isRepair();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [selected, setSelected] = useState<RepairRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
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

  const seedForms = (r: RepairRequest) => {
    setPrice(r.estimatedPrice != null ? String(r.estimatedPrice) : "");
    setPriceCurrency((r.estimatedPriceCurrency ?? "AED").toUpperCase());
    setEstimatedTime(r.estimatedTime ?? "");
    setPriceNote(r.adminNote ?? "");
    setNewStatus(r.status === "IN_REPAIR" ? "COMPLETED" : "IN_REPAIR");
    setNote("");
  };

  useEffect(() => {
    if (!allowed || !id) return;
    const ac = new AbortController();
    setLoading(true);
    // GET /{id} also clears the admin "unread" flag server-side.
    repairService
      .getById(id, ac.signal)
      .then((r) => {
        setSelected(r.data);
        seedForms(r.data);
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
    return () => ac.abort();
  }, [allowed, id]);

  if (!allowed) return <Navigate to="/" replace />;
  if (notFound) return <Navigate to="/repair" replace />;

  const applyResult = (updated: RepairRequest) => {
    setSelected(updated);
    seedForms(updated);
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
      <PageMeta title="Repair request | Buyology" description="Repair request details" />
      <PageBreadcrumb pageTitle="Request details" />

      <button
        onClick={() => navigate("/repair")}
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M15 18l-6-6 6-6" />
        </svg>
        Back to requests
      </button>

      {loading ? (
        <p className="text-sm text-gray-500">Loading…</p>
      ) : !selected ? (
        <p className="text-sm text-gray-500">Repair request not found.</p>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px]">
          {/* Left — request details */}
          <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
            <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-gray-800 dark:text-white">{selected.productName}</h2>
                <p className="font-mono text-xs text-gray-400">{selected.reference ?? selected.id}</p>
              </div>
              <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_COLORS[selected.status]}`}>
                {STATUS_LABELS[selected.status]}
              </span>
            </div>

            {selected.imageUrls && selected.imageUrls.length > 0 && (
              <div className="mb-6 grid grid-cols-4 gap-2 sm:grid-cols-6">
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

            <dl className="space-y-3 text-sm">
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
                    ? `${money(selected.courierFeeAmount, selected.courierFeeCurrency)}${
                        selected.courierFeeRefundDue
                          ? " · refund due"
                          : selected.courierFeePaid
                            ? " · paid"
                            : " · unpaid"
                      }`
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
          </div>

          {/* Right — admin actions */}
          <div className="space-y-6">
            {/* AI suggestion — advisory only; clicking "use" just prefills the form below. */}
            {selected.aiEstimateMinPrice != null && selected.aiEstimateMaxPrice != null && (
              <div className="rounded-xl border border-violet-200 bg-violet-50/60 p-4 dark:border-violet-900/40 dark:bg-violet-900/10">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <h4 className="text-sm font-semibold text-gray-800 dark:text-white">AI suggestion</h4>
                  {selected.aiEstimateConfidence && (
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                        selected.aiEstimateConfidence === "HIGH"
                          ? "bg-green-100 text-green-700"
                          : selected.aiEstimateConfidence === "MEDIUM"
                            ? "bg-amber-100 text-amber-700"
                            : "bg-gray-200 text-gray-600"
                      }`}
                    >
                      {selected.aiEstimateConfidence} confidence
                    </span>
                  )}
                </div>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">
                  {money(selected.aiEstimateMinPrice, selected.aiEstimateCurrency)} –{" "}
                  {money(selected.aiEstimateMaxPrice, selected.aiEstimateCurrency)}
                </p>
                {selected.aiEstimateSummary && (
                  <p className="mt-1 text-xs leading-relaxed text-gray-600 dark:text-gray-400">
                    {selected.aiEstimateSummary}
                  </p>
                )}
                {selected.aiEstimateTime && (
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Suggested turnaround: {selected.aiEstimateTime}
                  </p>
                )}
                {canPrice && (
                  <button
                    onClick={() => {
                      const mid =
                        (Number(selected.aiEstimateMinPrice) + Number(selected.aiEstimateMaxPrice)) / 2;
                      setPrice(mid.toFixed(2));
                      setPriceCurrency((selected.aiEstimateCurrency ?? "AED").toUpperCase());
                      if (selected.aiEstimateTime) setEstimatedTime(selected.aiEstimateTime);
                    }}
                    className="mt-3 w-full rounded-lg border border-violet-300 bg-white py-2 text-sm font-medium text-violet-700 hover:bg-violet-50 dark:border-violet-800 dark:bg-transparent dark:text-violet-300"
                  >
                    Use this estimate
                  </button>
                )}
                <p className="mt-2 text-[11px] leading-relaxed text-gray-500 dark:text-gray-400">
                  Generated by AI from the customer's photos and description. Review before sending —
                  the customer only receives the estimate you send below.
                </p>
              </div>
            )}

            {/* The customer changed their mind about delivery before we got the device. Called out
                loudly because acting on the old choice wastes a courier run — or, if they'd already
                paid for a pickup they no longer want, owes them a refund we must issue by hand. */}
            {selected.inboundDeliveryChangedAt && (
              <div className="rounded-xl border border-orange-200 bg-orange-50/70 p-4 dark:border-orange-900/40 dark:bg-orange-900/10">
                <h4 className="mb-1 text-sm font-semibold text-orange-900 dark:text-orange-200">
                  Customer changed the delivery method
                </h4>
                <p className="text-xs leading-relaxed text-orange-800 dark:text-orange-300">
                  Now <strong>
                    {DELIVERY_LABELS[selected.inboundDeliveryMethod ?? ""] ?? selected.inboundDeliveryMethod}
                  </strong>
                  {selected.previousInboundDeliveryMethod && (
                    <>
                      {" "}— was{" "}
                      {DELIVERY_LABELS[selected.previousInboundDeliveryMethod] ??
                        selected.previousInboundDeliveryMethod}
                    </>
                  )}
                  , changed {new Date(selected.inboundDeliveryChangedAt).toLocaleString()}.
                </p>
                {selected.courierFeeRefundDue && (
                  <p className="mt-2 rounded-lg bg-orange-100 px-2.5 py-2 text-xs font-medium text-orange-900 dark:bg-orange-900/30 dark:text-orange-200">
                    Refund due: they paid the courier fee
                    {selected.courierFeeAmount != null && (
                      <> ({money(selected.courierFeeAmount, selected.courierFeeCurrency)})</>
                    )}{" "}
                    and then switched to a free store drop-off. Refund it manually — nothing is
                    returned automatically.
                  </p>
                )}
              </div>
            )}

            {error && (
              <div className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700 dark:bg-red-900/30 dark:text-red-300">
                {error}
              </div>
            )}

            {/* Mark device received */}
            {canReceive && (
              <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-4 dark:border-blue-900/40 dark:bg-blue-900/10">
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
              <div className="space-y-3 rounded-xl border border-amber-100 bg-amber-50/50 p-4 dark:border-amber-900/40 dark:bg-amber-900/10">
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
            <div className="space-y-3 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03]">
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
