import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import { ApiRequestError } from "../../api/types/api.types";
import {
  payoutsService,
  type PayoutRequestDetail,
  type PayoutRequestStatus,
  type SupplierPayoutAccount,
} from "../../api/services/payouts.service";

const STATUS_COLORS: Record<PayoutRequestStatus, string> = {
  PENDING: "bg-yellow-100 text-yellow-700",
  PAID: "bg-green-100 text-green-700",
  REJECTED: "bg-red-100 text-red-700",
};

export default function PayoutDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [request, setRequest] = useState<PayoutRequestDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [note, setNote] = useState("");
  const [rejectNote, setRejectNote] = useState("");
  const [busy, setBusy] = useState<null | "paid" | "reject">(null);
  const [actionMsg, setActionMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [confirmingPaid, setConfirmingPaid] = useState(false);

  useEffect(() => {
    if (!id) return;
    const ac = new AbortController();
    setLoading(true);
    payoutsService
      .getById(id, ac.signal)
      .then((r) => {
        setRequest(r.data);
        setNote(r.data.adminNote ?? "");
        setLoadError(null);
      })
      .catch((e) => {
        if ((e as DOMException)?.name !== "AbortError") {
          setLoadError(e instanceof ApiRequestError ? e.message : "Failed to load payout request");
        }
      })
      .finally(() => setLoading(false));
    return () => ac.abort();
  }, [id]);

  const snapshot = useMemo<SupplierPayoutAccount | null>(() => {
    if (!request?.accountSnapshotJson) return null;
    try {
      return JSON.parse(request.accountSnapshotJson) as SupplierPayoutAccount;
    } catch {
      return null;
    }
  }, [request]);

  if (loading) {
    return (
      <>
        <PageMeta title="Payout request | Buyology" description="Payout request details" />
        <PageBreadcrumb pageTitle="Payout request" />
        <p className="text-sm text-gray-500">Loading…</p>
      </>
    );
  }

  if (loadError || !request) {
    return (
      <>
        <PageMeta title="Payout request | Buyology" description="Payout request details" />
        <PageBreadcrumb pageTitle="Payout request" />
        <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
          <p className="text-sm text-red-600">{loadError ?? "Payout request not found."}</p>
          <Link
            to="/payouts"
            className="mt-4 inline-block rounded-lg border border-gray-300 px-3 py-1.5 text-xs dark:border-gray-600 dark:text-gray-300"
          >
            Back to payouts
          </Link>
        </div>
      </>
    );
  }

  const canAct = request.status === "PENDING";

  const run = async (
    kind: NonNullable<typeof busy>,
    fn: () => Promise<{ data: PayoutRequestDetail }>,
    okMsg: string
  ) => {
    setBusy(kind);
    setActionMsg(null);
    try {
      const r = await fn();
      setRequest(r.data);
      setNote(r.data.adminNote ?? "");
      setRejectNote("");
      setActionMsg({ kind: "ok", text: okMsg });
    } catch (e) {
      setActionMsg({
        kind: "err",
        text: e instanceof ApiRequestError ? e.message : "Action failed",
      });
    } finally {
      setBusy(null);
      setConfirmingPaid(false);
    }
  };

  return (
    <>
      <PageMeta title="Payout request | Buyology" description="Payout request details" />
      <PageBreadcrumb pageTitle="Payout request" />

      <div className="mb-4 flex items-center justify-between">
        <button
          onClick={() => navigate("/payouts")}
          className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs dark:border-gray-600 dark:text-gray-300"
        >
          ← Back to payouts
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold dark:text-white">Payout request</h3>
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
                ["Supplier ID", <span key="s" className="font-mono text-xs">{request.supplierId}</span>],
                ["Amount", <strong key="a">AED {Number(request.amountAed).toFixed(2)}</strong>],
                ["Order items", `${request.orderItemIds.length}`],
                ["Created", new Date(request.createdAt).toLocaleString()],
                ["Paid", request.paidAt ? new Date(request.paidAt).toLocaleString() : "—"],
                request.adminNote ? ["Admin note", request.adminNote] : null,
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
            <h4 className="mb-3 text-sm font-medium text-gray-700 dark:text-gray-300">
              Payout destination (snapshot at request time)
            </h4>
            {snapshot ? (
              <dl className="space-y-2 text-sm">
                {[
                  ["Legal name", snapshot.legalName],
                  ["Bank name", snapshot.bankName],
                  ["Account holder", snapshot.accountHolderName],
                  ["IBAN", snapshot.iban],
                  ["SWIFT / BIC", snapshot.swiftCode],
                  ["Wallet provider", snapshot.walletProvider],
                  ["Wallet number", snapshot.walletNumber],
                ]
                  .filter(([, v]) => v != null && v !== "")
                  .map(([k, v]) => (
                    <div key={k as string} className="flex gap-3">
                      <dt className="w-36 shrink-0 text-gray-500 dark:text-gray-400">{k}</dt>
                      <dd className="break-words text-gray-800 dark:text-gray-200 font-mono text-xs">
                        {v}
                      </dd>
                    </div>
                  ))}
              </dl>
            ) : (
              <p className="text-sm text-gray-500">Snapshot unavailable.</p>
            )}
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
            <h4 className="mb-3 text-sm font-medium text-gray-700 dark:text-gray-300">
              Order items being settled ({request.orderItemIds.length})
            </h4>
            <ul className="grid grid-cols-1 gap-1 font-mono text-xs text-gray-600 dark:text-gray-400 md:grid-cols-2">
              {request.orderItemIds.map((oid) => (
                <li key={oid} className="truncate">{oid}</li>
              ))}
            </ul>
          </div>
        </div>

        <div className="lg:col-span-1">
          <div className="sticky top-6 space-y-4 rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Actions</h4>

            {!canAct && (
              <p className="text-sm text-gray-500">
                No actions available for status <strong>{request.status}</strong>.
              </p>
            )}

            {canAct && (
              <>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Admin note (optional — e.g. bank transfer reference)
                  </label>
                  <textarea
                    rows={3}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                  />
                </div>

                {!confirmingPaid && (
                  <button
                    onClick={() => setConfirmingPaid(true)}
                    disabled={busy !== null}
                    className="w-full rounded-lg bg-green-600 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
                  >
                    Mark as paid
                  </button>
                )}

                {confirmingPaid && (
                  <div className="space-y-2 rounded-lg border border-yellow-300 bg-yellow-50 p-3 dark:bg-yellow-900/20">
                    <p className="text-sm text-gray-800 dark:text-gray-200">
                      Confirm you have disbursed{" "}
                      <strong>AED {Number(request.amountAed).toFixed(2)}</strong> to this supplier.
                      This locks the order items into a paid payout.
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() =>
                          run(
                            "paid",
                            () => payoutsService.markPaid(request.id, note || undefined),
                            "Marked as paid"
                          )
                        }
                        disabled={busy !== null}
                        className="flex-1 rounded-lg bg-green-600 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
                      >
                        {busy === "paid" ? "Saving…" : "Confirm"}
                      </button>
                      <button
                        onClick={() => setConfirmingPaid(false)}
                        disabled={busy !== null}
                        className="rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:text-gray-300"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                <div className="pt-2 border-t border-gray-100 dark:border-gray-800">
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Rejection note (required to reject)
                  </label>
                  <textarea
                    rows={3}
                    value={rejectNote}
                    onChange={(e) => setRejectNote(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                  />
                  <button
                    onClick={() =>
                      run(
                        "reject",
                        () => payoutsService.reject(request.id, rejectNote),
                        "Payout request rejected"
                      )
                    }
                    disabled={busy !== null || rejectNote.trim().length === 0}
                    className="mt-2 w-full rounded-lg border border-red-300 bg-white py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50 dark:bg-gray-900"
                  >
                    {busy === "reject" ? "Rejecting…" : "Reject"}
                  </button>
                </div>
              </>
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
    </>
  );
}
