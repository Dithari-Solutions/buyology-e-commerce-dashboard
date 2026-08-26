import { useEffect, useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router";
import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import { isProcurement, isSuperAdmin } from "../../auth/roles";
import { sellService } from "../../api/services/sell.service";
import type { DeviceCondition, SellRequest, SellStatus } from "../../api/services/sell.service";
import {
  CONDITION_LABELS,
  CONDITION_OPTIONS,
  PAYOUT_LABELS,
  SELL_DELIVERY_LABELS,
  SELL_STATUS_COLORS,
  SELL_STATUS_LABELS,
  SELL_STATUS_OPTIONS,
  money,
} from "./sellUi";

/**
 * Procurement's view of one sell request: the device as the customer described it, the advisory AI
 * valuation, and the actions that move it along — receive the device, send the offer, then record
 * the payout once the customer has collected their money at the store.
 */
export default function SellRequestDetail() {
  const allowed = isSuperAdmin() || isProcurement();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [selected, setSelected] = useState<SellRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Offer form
  const [price, setPrice] = useState("");
  const [priceCurrency, setPriceCurrency] = useState("AED");
  const [validFor, setValidFor] = useState("");
  const [inspectedCondition, setInspectedCondition] = useState<DeviceCondition>("GOOD");
  const [offerNote, setOfferNote] = useState("");

  // Generic status update
  const [newStatus, setNewStatus] = useState<SellStatus>("CANCELLED");
  const [note, setNote] = useState("");

  const seedForms = (r: SellRequest) => {
    setPrice(r.offerPrice != null ? String(r.offerPrice) : "");
    setPriceCurrency((r.offerPriceCurrency ?? "AED").toUpperCase());
    setValidFor(r.offerValidFor ?? "");
    // Default the inspection grade to what procurement already recorded, else the AI's read of the
    // photos, else the customer's own claim — each is a better starting point than a fixed value.
    setInspectedCondition(r.inspectedCondition ?? r.aiEstimateCondition ?? r.deviceCondition);
    setOfferNote(r.adminNote ?? "");
    setNewStatus("CANCELLED");
    setNote("");
  };

  useEffect(() => {
    if (!allowed || !id) return;
    const ac = new AbortController();
    setLoading(true);
    // GET /{id} also clears the admin "unread" flag server-side.
    sellService
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
  if (notFound) return <Navigate to="/procurement/sell-requests" replace />;

  const applyResult = (updated: SellRequest) => {
    setSelected(updated);
    seedForms(updated);
  };

  const run = async (fn: () => Promise<{ data: SellRequest }>, failMsg: string) => {
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
    selected && run(() => sellService.markReceived(selected.id), "Failed to mark the device as received.");

  const handleGenerateEstimate = () =>
    selected &&
    run(
      () => sellService.generateEstimate(selected.id),
      "Couldn't produce a valuation for this device.",
    );

  const handleSetOffer = () => {
    if (!selected) return;
    const value = parseFloat(price);
    if (!Number.isFinite(value) || value <= 0) {
      setError("Enter a valid offer greater than 0.");
      return;
    }
    run(
      () =>
        sellService.setOffer(selected.id, {
          price: value,
          currency: priceCurrency.trim().toUpperCase() || "AED",
          validFor: validFor.trim() || undefined,
          inspectedCondition,
          note: offerNote.trim() || undefined,
        }),
      "Failed to send the offer."
    );
  };

  const handleMarkPaidOut = () =>
    selected && run(() => sellService.markPaidOut(selected.id), "Failed to record the payout.");

  const handleUpdateStatus = () =>
    selected &&
    run(
      () => sellService.updateStatus(selected.id, newStatus, note.trim() || undefined),
      "Failed to update the request status."
    );

  const canReceive = selected && (selected.status === "SUBMITTED" || selected.status === "AWAITING_DEVICE");
  const canOffer = selected && (selected.status === "UNDER_REVIEW" || selected.status === "OFFER_MADE");
  const canPayOut = selected && selected.status === "ACCEPTED";

  return (
    <>
      <PageMeta title="Sell request | Buyology" description="Sell request details" />
      <PageBreadcrumb pageTitle="Request details" />

      <button
        onClick={() => navigate("/procurement/sell-requests")}
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M15 18l-6-6 6-6" />
        </svg>
        Back to sell requests
      </button>

      {loading ? (
        <p className="text-sm text-gray-500">Loading…</p>
      ) : !selected ? (
        <p className="text-sm text-gray-500">Sell request not found.</p>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px]">
          {/* Left — request details */}
          <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
            <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-gray-800 dark:text-white">{selected.productName}</h2>
                <p className="font-mono text-xs text-gray-400">{selected.reference ?? selected.id}</p>
              </div>
              <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${SELL_STATUS_COLORS[selected.status]}`}>
                {SELL_STATUS_LABELS[selected.status]}
              </span>
            </div>

            {selected.imageUrls && selected.imageUrls.length > 0 && (
              <div className="mb-6 grid grid-cols-4 gap-2 sm:grid-cols-6">
                {selected.imageUrls.map((url, i) => (
                  <a key={i} href={url} target="_blank" rel="noreferrer">
                    <img
                      src={url}
                      alt={`Device ${i + 1}`}
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
                ["Condition (customer)", CONDITION_LABELS[selected.deviceCondition]],
                [
                  "Condition (inspected)",
                  selected.inspectedCondition ? CONDITION_LABELS[selected.inspectedCondition] : "—",
                ],
                ["Details", selected.description],
                ["Email", selected.contactEmail ?? "—"],
                ["Phone", selected.contactPhone ?? "—"],
                [
                  "Delivery",
                  selected.inboundDeliveryMethod
                    ? SELL_DELIVERY_LABELS[selected.inboundDeliveryMethod] ?? selected.inboundDeliveryMethod
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
                    ? SELL_DELIVERY_LABELS[selected.returnDeliveryMethod] ?? selected.returnDeliveryMethod
                    : "—",
                ],
                [
                  "Offer",
                  selected.offerPrice != null
                    ? `${money(selected.offerPrice, selected.offerPriceCurrency)}${
                        selected.offerValidFor ? ` · ${selected.offerValidFor}` : ""
                      }`
                    : "—",
                ],
                [
                  "Payout",
                  selected.payoutMethod
                    ? `${PAYOUT_LABELS[selected.payoutMethod] ?? selected.payoutMethod}${
                        selected.paidOutAt ? ` · paid ${new Date(selected.paidOutAt).toLocaleString()}` : ""
                      }`
                    : "—",
                ],
                ["Note", selected.adminNote ?? "—"],
                ["Device received", selected.deviceReceivedAt ? new Date(selected.deviceReceivedAt).toLocaleString() : "—"],
                ["Submitted", selected.submittedAt ? new Date(selected.submittedAt).toLocaleString() : "—"],
                ["Updated", new Date(selected.updatedAt).toLocaleString()],
              ].map(([k, v]) => (
                <div key={k as string} className="flex gap-3">
                  <dt className="w-40 shrink-0 text-gray-500 dark:text-gray-400">{k}</dt>
                  <dd className="text-gray-800 dark:text-gray-200 break-words">{v}</dd>
                </div>
              ))}
            </dl>
          </div>

          {/* Right — procurement actions */}
          <div className="space-y-6">
            {/* AI suggestion — advisory only; clicking "use" just prefills the offer form below. */}
            {selected.aiEstimateMinPrice != null && selected.aiEstimateMaxPrice != null && (
              <div className="rounded-xl border border-violet-200 bg-violet-50/60 p-4 dark:border-violet-900/40 dark:bg-violet-900/10">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <h4 className="text-sm font-semibold text-gray-800 dark:text-white">AI valuation</h4>
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
                {selected.aiEstimateCondition && (
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Reads as <strong>{CONDITION_LABELS[selected.aiEstimateCondition]}</strong> from the photos
                    {selected.aiEstimateCondition !== selected.deviceCondition && (
                      <> — customer claimed {CONDITION_LABELS[selected.deviceCondition]}</>
                    )}
                  </p>
                )}
                {selected.aiEstimateSummary && (
                  <p className="mt-1 text-xs leading-relaxed text-gray-600 dark:text-gray-400">
                    {selected.aiEstimateSummary}
                  </p>
                )}
                {canOffer && (
                  <button
                    onClick={() => {
                      const mid =
                        (Number(selected.aiEstimateMinPrice) + Number(selected.aiEstimateMaxPrice)) / 2;
                      setPrice(mid.toFixed(2));
                      setPriceCurrency((selected.aiEstimateCurrency ?? "AED").toUpperCase());
                      if (selected.aiEstimateCondition) setInspectedCondition(selected.aiEstimateCondition);
                    }}
                    className="mt-3 w-full rounded-lg border border-violet-300 bg-white py-2 text-sm font-medium text-violet-700 hover:bg-violet-50 dark:border-violet-800 dark:bg-transparent dark:text-violet-300"
                  >
                    Use this valuation
                  </button>
                )}
                <p className="mt-2 text-[11px] leading-relaxed text-gray-500 dark:text-gray-400">
                  Generated by AI from the customer's photos and description against our buy-back policy.
                  Review before sending — the customer only receives the offer you send below.
                </p>
              </div>
            )}

            {/* No valuation. Previously this rendered nothing at all, which read as "this device
                can't be valued" rather than "the valuation never ran" — and left resubmitting the
                whole form as the only way to get one, losing the customer's original photos. */}
            {selected.aiEstimateMinPrice == null && (
              <div className="rounded-xl border border-dashed border-gray-300 p-4 dark:border-gray-700">
                <h4 className="text-sm font-semibold text-gray-800 dark:text-white">No AI valuation</h4>
                <p className="mt-1 text-xs leading-relaxed text-gray-500 dark:text-gray-400">
                  This request was submitted without one. Run it now against the customer's original
                  photos and description — nothing needs to be resubmitted.
                </p>
                <button
                  onClick={handleGenerateEstimate}
                  disabled={busy}
                  className="mt-3 w-full rounded-lg border border-violet-300 bg-white py-2 text-sm font-medium text-violet-700 hover:bg-violet-50 disabled:opacity-50 dark:border-violet-800 dark:bg-transparent dark:text-violet-300"
                >
                  {busy ? "Valuing the device…" : "Generate valuation"}
                </button>
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
                    {SELL_DELIVERY_LABELS[selected.inboundDeliveryMethod ?? ""] ?? selected.inboundDeliveryMethod}
                  </strong>
                  {selected.previousInboundDeliveryMethod && (
                    <>
                      {" "}— was{" "}
                      {SELL_DELIVERY_LABELS[selected.previousInboundDeliveryMethod] ??
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
                  Mark the device as received to start the inspection and unlock the offer form.
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

            {/* Send / update offer */}
            {canOffer && (
              <div className="space-y-3 rounded-xl border border-amber-100 bg-amber-50/50 p-4 dark:border-amber-900/40 dark:bg-amber-900/10">
                <h4 className="text-sm font-semibold text-gray-800 dark:text-white">
                  {selected.status === "OFFER_MADE" ? "Update offer" : "Send offer"}
                </h4>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">
                      We pay
                    </label>
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
                    Inspected condition
                  </label>
                  <select
                    value={inspectedCondition}
                    onChange={(e) => setInspectedCondition(e.target.value as DeviceCondition)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                  >
                    {CONDITION_OPTIONS.map((c) => (
                      <option key={c} value={c}>
                        {CONDITION_LABELS[c]}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">
                    Offer validity
                  </label>
                  <input
                    type="text"
                    value={validFor}
                    onChange={(e) => setValidFor(e.target.value)}
                    placeholder="e.g. valid for 7 days"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">
                    Note (optional)
                  </label>
                  <textarea
                    rows={2}
                    value={offerNote}
                    onChange={(e) => setOfferNote(e.target.value)}
                    placeholder="Anything the customer should know about the offer…"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                  />
                </div>
                <button
                  onClick={handleSetOffer}
                  disabled={busy}
                  className="w-full rounded-lg bg-amber-500 py-2 text-sm font-medium text-white hover:bg-amber-600 disabled:opacity-50"
                >
                  {busy ? "Sending…" : selected.status === "OFFER_MADE" ? "Update offer" : "Send offer"}
                </button>
              </div>
            )}

            {/* Record the payout */}
            {canPayOut && (
              <div className="rounded-xl border border-teal-100 bg-teal-50/50 p-4 dark:border-teal-900/40 dark:bg-teal-900/10">
                <h4 className="mb-2 text-sm font-semibold text-gray-800 dark:text-white">Pay the customer</h4>
                <p className="mb-3 text-xs text-gray-500 dark:text-gray-400">
                  The customer accepted {money(selected.offerPrice, selected.offerPriceCurrency)} and chose{" "}
                  {PAYOUT_LABELS[selected.payoutMethod ?? "STORE_CASH"]}. Record the payout once the money has
                  changed hands — the request then closes as paid.
                </p>
                <button
                  onClick={handleMarkPaidOut}
                  disabled={busy}
                  className="w-full rounded-lg bg-teal-600 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50"
                >
                  {busy ? "Saving…" : "Mark as paid"}
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
                  onChange={(e) => setNewStatus(e.target.value as SellStatus)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                >
                  {SELL_STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>
                      {SELL_STATUS_LABELS[s]}
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
