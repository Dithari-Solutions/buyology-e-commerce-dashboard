import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import { ApiRequestError } from "../../api/types/api.types";
import {
  refundsService,
  type RefundRequestDetail,
  type RefundRequestStatus,
} from "../../api/services/refunds.service";

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

export default function RefundDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [request, setRequest] = useState<RefundRequestDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [adminNote, setAdminNote] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [busy, setBusy] = useState<null | "approve" | "reject" | "received" | "pay">(null);
  const [actionMsg, setActionMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [confirmingPay, setConfirmingPay] = useState(false);

  useEffect(() => {
    if (!id) return;
    const ac = new AbortController();
    setLoading(true);
    refundsService
      .getById(id, ac.signal)
      .then((r) => {
        setRequest(r.data);
        setAdminNote(r.data.adminNote ?? "");
        setLoadError(null);
      })
      .catch((e) => {
        if ((e as DOMException)?.name !== "AbortError") {
          setLoadError(e instanceof ApiRequestError ? e.message : "Failed to load refund request");
        }
      })
      .finally(() => setLoading(false));
    return () => ac.abort();
  }, [id]);

  const courierFeeText = useMemo(() => {
    if (!request) return null;
    if (request.returnMethod !== "COURIER_PICKUP") return null;
    if (request.courierFeeAmount == null || !request.courierFeeCurrency) return null;
    return `${request.courierFeeAmount.toFixed(2)} ${request.courierFeeCurrency}`;
  }, [request]);

  if (loading) {
    return (
      <>
        <PageMeta title="Refund request | Buyology" description="Refund request details" />
        <PageBreadcrumb pageTitle="Refund request" />
        <p className="text-sm text-gray-500">Loading…</p>
      </>
    );
  }

  if (loadError || !request) {
    return (
      <>
        <PageMeta title="Refund request | Buyology" description="Refund request details" />
        <PageBreadcrumb pageTitle="Refund request" />
        <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
          <p className="text-sm text-red-600">{loadError ?? "Refund request not found."}</p>
          <Link
            to="/refunds"
            className="mt-4 inline-block rounded-lg border border-gray-300 px-3 py-1.5 text-xs dark:border-gray-600 dark:text-gray-300"
          >
            Back to refunds
          </Link>
        </div>
      </>
    );
  }

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
      setRequest(r.data);
      setAdminNote(r.data.adminNote ?? "");
      setRejectionReason("");
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

  return (
    <>
      <PageMeta title="Refund request | Buyology" description="Refund request details" />
      <PageBreadcrumb pageTitle="Refund request" />

      <div className="mb-4 flex items-center justify-between">
        <button
          onClick={() => navigate("/refunds")}
          className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs dark:border-gray-600 dark:text-gray-300"
        >
          ← Back to refunds
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left column — overview */}
        <div className="space-y-6 lg:col-span-2">
          <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold dark:text-white">Refund request</h3>
                <p className="font-mono text-xs text-gray-500">{request.id}</p>
              </div>
              <span
                className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[request.status]}`}
              >
                {request.status}
              </span>
            </div>

            <dl className="space-y-2 text-sm">
              {[
                ["Order ID", <span key="o" className="font-mono text-xs">{request.orderId}</span>],
                ["User ID", <span key="u" className="font-mono text-xs">{request.userId}</span>],
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
                      <dt className="w-36 shrink-0 text-gray-500 dark:text-gray-400">{k}</dt>
                      <dd className="break-words text-gray-800 dark:text-gray-200">{v}</dd>
                    </div>
                  );
                })}
            </dl>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
            <h4 className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
              Customer description
            </h4>
            <p className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-gray-800 dark:border-gray-700 dark:bg-gray-800/40 dark:text-gray-200">
              {request.description}
            </p>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
            <h4 className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
              Photos ({request.imageUrls.length})
            </h4>
            {request.imageUrls.length === 0 ? (
              <p className="text-sm text-gray-500">No photos uploaded.</p>
            ) : (
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
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
            )}
          </div>
        </div>

        {/* Right column — actions */}
        <div className="lg:col-span-1">
          <div className="sticky top-6 space-y-4 rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Actions</h4>

            {!canApproveReject && !canMarkReceived && !canPay && (
              <p className="text-sm text-gray-500">
                No actions available for status <strong>{request.status}</strong>.
              </p>
            )}

            {canApproveReject && (
              <>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Admin note (optional, sent on approve)
                  </label>
                  <textarea
                    rows={3}
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
                    rows={3}
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
                  This will refund{" "}
                  <strong>
                    {request.refundAmount.toFixed(2)} {request.refundCurrency}
                  </strong>{" "}
                  to the customer via Paymob. This cannot be undone.
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
              <p
                className={`text-sm ${actionMsg.kind === "ok" ? "text-green-600" : "text-red-600"}`}
              >
                {actionMsg.text}
              </p>
            )}
          </div>
        </div>
      </div>

      {lightbox && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-6"
          onClick={() => setLightbox(null)}
        >
          <img src={lightbox} alt="" className="max-h-full max-w-full rounded-lg" />
        </div>
      )}
    </>
  );
}
