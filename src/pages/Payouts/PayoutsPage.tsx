import { useEffect, useState } from "react";
import { Link } from "react-router";
import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import { ApiRequestError } from "../../api/types/api.types";
import {
  payoutsService,
  type PayoutRequestDetail,
  type PayoutRequestStatus,
} from "../../api/services/payouts.service";
import type { SpringPage } from "../../api/services/refunds.service";

const STATUS_COLORS: Record<PayoutRequestStatus, string> = {
  PENDING: "bg-yellow-100 text-yellow-700",
  PAID: "bg-green-100 text-green-700",
  REJECTED: "bg-red-100 text-red-700",
};

const ALL_STATUSES: PayoutRequestStatus[] = ["PENDING", "PAID", "REJECTED"];

const truncate = (s: string, n = 8) => (s.length > n ? `${s.slice(0, n)}…` : s);

export default function PayoutsPage() {
  const [statusFilter, setStatusFilter] = useState<"" | PayoutRequestStatus>("PENDING");
  const [page, setPage] = useState(0);
  const size = 20;
  const [data, setData] = useState<SpringPage<PayoutRequestDetail> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const ac = new AbortController();
    setLoading(true);
    payoutsService
      .list({ status: statusFilter || undefined, page, size }, ac.signal)
      .then((r) => {
        setData(r.data);
        setError(null);
      })
      .catch((e) => {
        if ((e as DOMException)?.name !== "AbortError") {
          setError(e instanceof ApiRequestError ? e.message : "Failed to load payout requests");
        }
      })
      .finally(() => setLoading(false));
    return () => ac.abort();
  }, [statusFilter, page]);

  return (
    <>
      <PageMeta title="Payouts | Buyology" description="Manage supplier payout requests" />
      <PageBreadcrumb pageTitle="Payouts" />

      <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="mb-4 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <label className="text-xs uppercase text-gray-500">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => {
                setPage(0);
                setStatusFilter(e.target.value as "" | PayoutRequestStatus);
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
            <p className="text-gray-500 dark:text-gray-400">No payout requests.</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-left text-xs uppercase text-gray-500 dark:border-gray-800">
                    <th className="pb-3 pr-4">Request</th>
                    <th className="pb-3 pr-4">Supplier</th>
                    <th className="pb-3 pr-4">Amount</th>
                    <th className="pb-3 pr-4">Items</th>
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
                        {truncate(req.supplierId)}
                      </td>
                      <td className="py-3 pr-4 font-medium text-gray-800 dark:text-gray-200">
                        AED {Number(req.amountAed).toFixed(2)}
                      </td>
                      <td className="py-3 pr-4 text-gray-700 dark:text-gray-300">
                        {req.orderItemIds.length}
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
                          to={`/payouts/${req.id}`}
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
    </>
  );
}
