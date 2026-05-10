import { useEffect, useMemo, useState } from "react";
import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import { ApiRequestError } from "../../api/types/api.types";
import {
  refundsService,
  type RefundRequestDetail,
  type RefundRequestStatus,
  type RefundSetting,
  type SpringPage,
} from "../../api/services/refunds.service";

// Status → Tailwind chip classes. Mirrors the colour table agreed in the plan.
const STATUS_COLORS: Record<RefundRequestStatus, string> = {
  PENDING_REVIEW: "bg-yellow-100 text-yellow-700",
  APPROVED: "bg-blue-100 text-blue-700",
  DROPOFF_SELECTED: "bg-blue-100 text-blue-700",
  COURIER_REQUESTED: "bg-blue-100 text-blue-700",
  RECEIVED: "bg-blue-100 text-blue-700",
  REJECTED: "bg-red-100 text-red-700",
  PAID: "bg-green-100 text-green-700",
  FAILED: "bg-red-100 text-red-700",
};

const ALL_STATUSES: RefundRequestStatus[] = [
  "PENDING_REVIEW",
  "APPROVED",
  "DROPOFF_SELECTED",
  "COURIER_REQUESTED",
  "RECEIVED",
  "REJECTED",
  "PAID",
  "FAILED",
];

type Tab = "requests" | "settings";

const truncate = (s: string, n = 8) => (s.length > n ? `${s.slice(0, n)}…` : s);

export default function RefundsPage() {
  const [tab, setTab] = useState<Tab>("requests");

  return (
    <>
      <PageMeta title="Refunds | Buyology" description="Manage refund requests and settings" />
      <PageBreadcrumb pageTitle="Refunds" />

      <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="mb-4 flex items-center gap-2 border-b border-gray-100 dark:border-gray-800">
          {(["requests", "settings"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium transition ${
                tab === t
                  ? "border-brand-500 text-brand-600 dark:text-brand-400"
                  : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400"
              }`}
            >
              {t === "requests" ? "Requests" : "Settings"}
            </button>
          ))}
        </div>

        {tab === "requests" ? <RequestsTab /> : <SettingsTab />}
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Settings tab
// ─────────────────────────────────────────────────────────────────────────────

function SettingsTab() {
  const [setting, setSetting] = useState<RefundSetting | null>(null);
  const [loading, setLoading] = useState(true);
  const [windowDays, setWindowDays] = useState<string>("");
  const [feeAed, setFeeAed] = useState<string>("");
  const [enabled, setEnabled] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  useEffect(() => {
    const ac = new AbortController();
    refundsService
      .getSettings(ac.signal)
      .then((r) => {
        const s = r.data;
        setSetting(s);
        setWindowDays(String(s.refundWindowDays));
        setFeeAed(String(s.courierFeeAed));
        setEnabled(s.enabled);
      })
      .catch((e) => {
        if ((e as DOMException)?.name !== "AbortError") {
          setMsg({ kind: "err", text: e instanceof ApiRequestError ? e.message : "Failed to load settings" });
        }
      })
      .finally(() => setLoading(false));
    return () => ac.abort();
  }, []);

  const save = async () => {
    setMsg(null);
    const days = Number(windowDays);
    const fee = Number(feeAed);
    if (!Number.isFinite(days) || days < 1) {
      setMsg({ kind: "err", text: "Refund window must be a positive number of days" });
      return;
    }
    if (!Number.isFinite(fee) || fee < 0) {
      setMsg({ kind: "err", text: "Courier fee must be ≥ 0" });
      return;
    }
    setSaving(true);
    try {
      const r = await refundsService.updateSettings({
        refundWindowDays: days,
        courierFeeAed: fee,
        enabled,
      });
      setSetting(r.data);
      setMsg({ kind: "ok", text: "Settings updated" });
    } catch (e) {
      setMsg({ kind: "err", text: e instanceof ApiRequestError ? e.message : "Failed to update settings" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p className="text-sm text-gray-500">Loading settings…</p>;
  if (!setting) {
    return (
      <p className="text-sm text-red-600">{msg?.text ?? "Could not load refund settings."}</p>
    );
  }

  return (
    <div className="max-w-md space-y-4 pt-2">
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
          Refund window (days)
        </label>
        <input
          type="number"
          min={1}
          value={windowDays}
          onChange={(e) => setWindowDays(e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
        />
        <p className="mt-1 text-xs text-gray-500">
          Customers can request a refund within this many days of delivery.
        </p>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
          Courier pickup fee (AED)
        </label>
        <input
          type="number"
          min={0}
          step="0.01"
          value={feeAed}
          onChange={(e) => setFeeAed(e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
        />
        <p className="mt-1 text-xs text-gray-500">
          Converted to the customer's currency at request time.
        </p>
      </div>

      <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => setEnabled(e.target.checked)}
          className="h-4 w-4 rounded border-gray-300"
        />
        Refunds enabled
      </label>

      <button
        onClick={save}
        disabled={saving}
        className="w-full rounded-lg bg-brand-500 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50"
      >
        {saving ? "Saving…" : "Save settings"}
      </button>

      {msg && (
        <p className={`text-sm ${msg.kind === "ok" ? "text-green-600" : "text-red-600"}`}>
          {msg.text}
        </p>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Requests tab — list + drawer
// ─────────────────────────────────────────────────────────────────────────────

function RequestsTab() {
  const [statusFilter, setStatusFilter] = useState<"" | RefundRequestStatus>("");
  const [page, setPage] = useState(0);
  const size = 20;
  const [data, setData] = useState<SpringPage<RefundRequestDetail> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<RefundRequestDetail | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const ac = new AbortController();
    setLoading(true);
    refundsService
      .list({ status: statusFilter || undefined, page, size }, ac.signal)
      .then((r) => {
        setData(r.data);
        setError(null);
      })
      .catch((e) => {
        if ((e as DOMException)?.name !== "AbortError") {
          setError(e instanceof ApiRequestError ? e.message : "Failed to load refund requests");
        }
      })
      .finally(() => setLoading(false));
    return () => ac.abort();
  }, [statusFilter, page, reloadKey]);

  // Replace the row in the list when an action returns an updated detail.
  const replaceRow = (updated: RefundRequestDetail) => {
    setData((d) =>
      d
        ? { ...d, content: d.content.map((r) => (r.id === updated.id ? updated : r)) }
        : d
    );
    setSelected(updated);
  };

  const refreshList = () => setReloadKey((k) => k + 1);

  return (
    <div className="pt-2">
      <div className="mb-4 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <label className="text-xs uppercase text-gray-500">Status</label>
          <select
            value={statusFilter}
            onChange={(e) => {
              setPage(0);
              setStatusFilter(e.target.value as "" | RefundRequestStatus);
            }}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
          >
            <option value="">All</option>
            {ALL_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        {data && (
          <p className="text-xs text-gray-500">
            {data.totalElements} total · page {data.number + 1} of {Math.max(1, data.totalPages)}
          </p>
        )}
      </div>

      {loading ? (
        <p className="text-sm text-gray-500">Loading…</p>
      ) : error ? (
        <p className="text-sm text-red-600">{error}</p>
      ) : !data || data.content.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-gray-200 p-8 text-center dark:border-gray-700">
          <p className="text-gray-500 dark:text-gray-400">No refund requests.</p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs uppercase text-gray-500 dark:border-gray-800">
                  <th className="pb-3 pr-4">Request</th>
                  <th className="pb-3 pr-4">Order</th>
                  <th className="pb-3 pr-4">Amount</th>
                  <th className="pb-3 pr-4">Created</th>
                  <th className="pb-3 pr-4">Status</th>
                  <th className="pb-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {data.content.map((req) => (
                  <tr key={req.id}>
                    <td className="py-3 pr-4 font-mono text-xs text-gray-700 dark:text-gray-300">
                      {truncate(req.id)}
                    </td>
                    <td className="py-3 pr-4 font-mono text-xs text-gray-600 dark:text-gray-400">
                      {truncate(req.orderId)}
                    </td>
                    <td className="py-3 pr-4 text-gray-700 dark:text-gray-300">
                      {req.refundAmount.toFixed(2)} {req.refundCurrency}
                    </td>
                    <td className="py-3 pr-4 text-xs text-gray-500">
                      {new Date(req.createdAt).toLocaleString()}
                    </td>
                    <td className="py-3 pr-4">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[req.status]}`}
                      >
                        {req.status}
                      </span>
                    </td>
                    <td className="py-3">
                      <button
                        onClick={() => setSelected(req)}
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

          <div className="mt-4 flex items-center justify-end gap-2">
            <button
              disabled={data.first}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs disabled:opacity-50 dark:border-gray-600 dark:text-gray-300"
            >
              Prev
            </button>
            <button
              disabled={data.last}
              onClick={() => setPage((p) => p + 1)}
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs disabled:opacity-50 dark:border-gray-600 dark:text-gray-300"
            >
              Next
            </button>
          </div>
        </>
      )}

      {selected && (
        <DetailDrawer
          request={selected}
          onClose={() => setSelected(null)}
          onUpdated={(u) => {
            replaceRow(u);
            // After a terminal-ish transition, also refresh the list to reflect ordering / counts.
            refreshList();
          }}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Drawer
// ─────────────────────────────────────────────────────────────────────────────

function DetailDrawer({
  request,
  onClose,
  onUpdated,
}: {
  request: RefundRequestDetail;
  onClose: () => void;
  onUpdated: (r: RefundRequestDetail) => void;
}) {
  const [adminNote, setAdminNote] = useState(request.adminNote ?? "");
  const [rejectionReason, setRejectionReason] = useState("");
  const [busy, setBusy] = useState<null | "approve" | "reject" | "received" | "pay">(null);
  const [actionMsg, setActionMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [confirmingPay, setConfirmingPay] = useState(false);

  // Lock note/reason inputs to the latest request when the drawer is reopened.
  useEffect(() => {
    setAdminNote(request.adminNote ?? "");
    setRejectionReason("");
    setActionMsg(null);
  }, [request.id]);

  const canApproveReject = request.status === "PENDING_REVIEW";
  const canMarkReceived =
    request.status === "DROPOFF_SELECTED" || request.status === "COURIER_REQUESTED";
  const canPay = request.status === "RECEIVED";

  const run = async (
    kind: NonNullable<typeof busy>,
    fn: () => Promise<{ data: RefundRequestDetail }>,
    okMsg: string
  ) => {
    setBusy(kind);
    setActionMsg(null);
    try {
      const r = await fn();
      onUpdated(r.data);
      setActionMsg({ kind: "ok", text: okMsg });
    } catch (e) {
      setActionMsg({
        kind: "err",
        text: e instanceof ApiRequestError ? e.message : "Action failed",
      });
    } finally {
      setBusy(null);
      setConfirmingPay(false);
    }
  };

  const courierFeeText = useMemo(() => {
    if (request.returnMethod !== "COURIER_PICKUP") return null;
    if (request.courierFeeAmount == null || !request.courierFeeCurrency) return null;
    return `${request.courierFeeAmount.toFixed(2)} ${request.courierFeeCurrency}`;
  }, [request]);

  return (
    <div className="fixed inset-0 z-50 flex items-stretch justify-end bg-black/40">
      <div className="h-full w-full max-w-lg overflow-y-auto bg-white p-6 shadow-xl dark:bg-gray-900">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold dark:text-white">Refund request</h3>
            <p className="font-mono text-xs text-gray-500">{request.id}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <span
          className={`mb-4 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[request.status]}`}
        >
          {request.status}
        </span>

        <dl className="mb-6 space-y-2 text-sm">
          {[
            ["Order ID", <span key="o" className="font-mono text-xs">{request.orderId}</span>],
            ["Amount", `${request.refundAmount.toFixed(2)} ${request.refundCurrency}`],
            ["Created", new Date(request.createdAt).toLocaleString()],
            ["Approved", request.approvedAt ? new Date(request.approvedAt).toLocaleString() : "—"],
            ["Received", request.receivedAt ? new Date(request.receivedAt).toLocaleString() : "—"],
            ["Paid", request.paidAt ? new Date(request.paidAt).toLocaleString() : "—"],
            ["Return method", request.returnMethod ?? "—"],
            ["Courier fee", courierFeeText ?? "—"],
            request.adminNote ? ["Admin note", request.adminNote] : null,
            request.rejectionReason ? ["Rejection reason", request.rejectionReason] : null,
          ]
            .filter(Boolean)
            .map((row) => {
              const [k, v] = row as [string, React.ReactNode];
              return (
                <div key={k} className="flex gap-3">
                  <dt className="w-32 shrink-0 text-gray-500 dark:text-gray-400">{k}</dt>
                  <dd className="break-words text-gray-800 dark:text-gray-200">{v}</dd>
                </div>
              );
            })}
        </dl>

        <div className="mb-6">
          <h4 className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
            Customer description
          </h4>
          <p className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-gray-800 dark:border-gray-700 dark:bg-gray-800/40 dark:text-gray-200">
            {request.description}
          </p>
        </div>

        <div className="mb-6">
          <h4 className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
            Photos ({request.imageUrls.length})
          </h4>
          <div className="grid grid-cols-3 gap-2">
            {request.imageUrls.map((url, idx) => (
              <button
                key={idx}
                onClick={() => setLightbox(url)}
                className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700"
              >
                <img
                  src={url}
                  alt={`Refund photo ${idx + 1}`}
                  className="aspect-square h-full w-full object-cover"
                />
              </button>
            ))}
          </div>
        </div>

        {/* Conditional action panel */}
        <div className="space-y-4 border-t border-gray-100 pt-4 dark:border-gray-800">
          {canApproveReject && (
            <>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Admin note (optional, sent on approve)
                </label>
                <textarea
                  rows={2}
                  value={adminNote}
                  onChange={(e) => setAdminNote(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                />
              </div>
              <button
                onClick={() =>
                  run(
                    "approve",
                    () => refundsService.approve(request.id, adminNote || undefined),
                    "Request approved — customer notified"
                  )
                }
                disabled={busy !== null}
                className="w-full rounded-lg bg-brand-500 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50"
              >
                {busy === "approve" ? "Approving…" : "Approve"}
              </button>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Rejection reason (required to reject)
                </label>
                <textarea
                  rows={2}
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                />
              </div>
              <button
                onClick={() =>
                  run(
                    "reject",
                    () => refundsService.reject(request.id, rejectionReason),
                    "Request rejected — customer notified"
                  )
                }
                disabled={busy !== null || rejectionReason.trim().length === 0}
                className="w-full rounded-lg border border-red-300 bg-white py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50 dark:bg-gray-900"
              >
                {busy === "reject" ? "Rejecting…" : "Reject"}
              </button>
            </>
          )}

          {canMarkReceived && (
            <button
              onClick={() =>
                run(
                  "received",
                  () => refundsService.markReceived(request.id),
                  "Marked as received — customer notified"
                )
              }
              disabled={busy !== null}
              className="w-full rounded-lg bg-brand-500 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50"
            >
              {busy === "received" ? "Saving…" : "Mark product received"}
            </button>
          )}

          {canPay && !confirmingPay && (
            <button
              onClick={() => setConfirmingPay(true)}
              className="w-full rounded-lg bg-green-600 py-2 text-sm font-medium text-white hover:bg-green-700"
            >
              Pay refund
            </button>
          )}

          {canPay && confirmingPay && (
            <div className="space-y-2 rounded-lg border border-yellow-300 bg-yellow-50 p-3 dark:bg-yellow-900/20">
              <p className="text-sm text-gray-800 dark:text-gray-200">
                This will refund <strong>{request.refundAmount.toFixed(2)} {request.refundCurrency}</strong> to
                the customer via Paymob. This cannot be undone.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() =>
                    run(
                      "pay",
                      () => refundsService.pay(request.id),
                      "Refund processed — customer notified"
                    )
                  }
                  disabled={busy !== null}
                  className="flex-1 rounded-lg bg-green-600 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
                >
                  {busy === "pay" ? "Processing…" : "Confirm refund"}
                </button>
                <button
                  onClick={() => setConfirmingPay(false)}
                  disabled={busy !== null}
                  className="rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:text-gray-300"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {actionMsg && (
            <p className={`text-sm ${actionMsg.kind === "ok" ? "text-green-600" : "text-red-600"}`}>
              {actionMsg.text}
            </p>
          )}
        </div>
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-6"
          onClick={() => setLightbox(null)}
        >
          <img src={lightbox} alt="" className="max-h-full max-w-full rounded-lg" />
        </div>
      )}
    </div>
  );
}
