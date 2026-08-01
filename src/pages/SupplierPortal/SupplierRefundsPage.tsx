import { useEffect, useState } from "react";
import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import { ApiRequestError } from "../../api/types/api.types";
import {
  refundsService,
  type RefundRequestDetail,
  type RefundRequestStatus,
  type SpringPage,
} from "../../api/services/refunds.service";

const STATUS_COLORS: Record<RefundRequestStatus, string> = {
  PENDING_REVIEW: "bg-yellow-100 text-yellow-700",
  APPROVED: "bg-brand-100 text-brand-700",
  DROPOFF_SELECTED: "bg-brand-100 text-brand-700",
  COURIER_REQUESTED: "bg-brand-100 text-brand-700",
  RECEIVED: "bg-brand-100 text-brand-700",
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

const truncate = (s: string, n = 8) => (s.length > n ? `${s.slice(0, n)}…` : s);

/**
 * Read-only refunds list for suppliers — shows refund requests that involve the
 * supplier's products. Suppliers cannot act on refunds (approval/payment is admin-only).
 */
export default function SupplierRefundsPage() {
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
      .listForSupplier({ status: statusFilter || undefined, page, size }, ac.signal)
      .then((r) => {
        setData(r.data);
        setError(null);
      })
      .catch((e) => {
        if ((e as DOMException)?.name !== "AbortError") {
          setError(e instanceof ApiRequestError ? e.message : "Failed to load refunds");
        }
      })
      .finally(() => setLoading(false));
    return () => ac.abort();
  }, [statusFilter, page]);

  return (
    <>
      <PageMeta title="Refunds | Supplier Portal" description="Refunds affecting your products" />
      <PageBreadcrumb pageTitle="Refunds" />

      <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
        <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
          Refund requests that involve your products. This view is read-only — refund
          approvals and payments are handled by the store administrators.
        </p>

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
          <div className="rounded-xl border-2 border-dashed border-gray-200 p-5 text-center dark:border-gray-700">
            <p className="text-gray-500 dark:text-gray-400">No refunds involving your products.</p>
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
                    <th className="pb-3">Status</th>
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
                      <td className="py-3">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[req.status]}`}>
                          {req.status}
                        </span>
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
    </>
  );
}
