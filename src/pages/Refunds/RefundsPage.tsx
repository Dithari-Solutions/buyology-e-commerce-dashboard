import { useEffect, useState } from "react";
import { Link } from "react-router";
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

function RequestsTab() {
  const [statusFilter, setStatusFilter] = useState<"" | RefundRequestStatus>("");
  const [page, setPage] = useState(0);
  const size = 20;
  const [data, setData] = useState<SpringPage<RefundRequestDetail> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
  }, [statusFilter, page]);

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
                      <Link
                        to={`/refunds/${req.id}`}
                        className="inline-block rounded-lg bg-gray-100 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                      >
                        View
                      </Link>
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
    </div>
  );
}
