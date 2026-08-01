import { useCallback, useEffect, useState } from "react";
import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import { suppliersService } from "../../api";
import { ApiRequestError } from "../../api/types/api.types";
import type {
  PageResponse,
  SupplierProductChange,
  SupplierProductChangeStatus,
} from "../../api/services/suppliers.service";

const STATUS_COLORS: Record<SupplierProductChangeStatus, string> = {
  PENDING: "bg-yellow-100 text-yellow-700",
  APPROVED: "bg-green-100 text-green-700",
  REJECTED: "bg-red-100 text-red-700",
};

const ACTION_COLORS: Record<string, string> = {
  EDIT: "bg-brand-100 text-brand-700",
  DELETE: "bg-red-100 text-red-700",
  RESTORE: "bg-blue-100 text-blue-700",
};

const STATUSES: SupplierProductChangeStatus[] = ["PENDING", "APPROVED", "REJECTED"];

const truncate = (s: string, n = 8) => (s.length > n ? `${s.slice(0, n)}…` : s);

export default function SupplierProductChangesPage() {
  const [statusFilter, setStatusFilter] = useState<SupplierProductChangeStatus | "">("PENDING");
  const [page, setPage] = useState(0);
  const [data, setData] = useState<PageResponse<SupplierProductChange> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    suppliersService
      .listProductChanges({ status: statusFilter || undefined, page, size: 20 })
      .then((r) => {
        setData(r.data);
        setError(null);
      })
      .catch((e) => setError(e instanceof ApiRequestError ? e.message : "Failed to load change requests"))
      .finally(() => setLoading(false));
  }, [statusFilter, page]);

  useEffect(() => {
    load();
  }, [load]);

  async function approve(id: string) {
    setBusyId(id);
    try {
      await suppliersService.approveProductChange(id);
      load();
    } catch (e) {
      alert(e instanceof ApiRequestError ? e.message : "Failed to approve");
    } finally {
      setBusyId(null);
    }
  }

  async function reject(id: string) {
    const reason = window.prompt("Reason for rejecting this request?") ?? "";
    if (!reason.trim()) return;
    setBusyId(id);
    try {
      await suppliersService.rejectProductChange(id, reason.trim());
      load();
    } catch (e) {
      alert(e instanceof ApiRequestError ? e.message : "Failed to reject");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <>
      <PageMeta title="Supplier Change Requests | Buyology" description="Approve supplier product edits, deletes and restores" />
      <PageBreadcrumb pageTitle="Supplier Change Requests" />

      <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
        <div className="mb-4 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <label className="text-xs uppercase text-gray-500">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => {
                setPage(0);
                setStatusFilter(e.target.value as SupplierProductChangeStatus | "");
              }}
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
            >
              <option value="">All</option>
              {STATUSES.map((s) => (
                <option key={s} value={s}>{s}</option>
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
            <p className="text-gray-500 dark:text-gray-400">No change requests.</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-left text-xs uppercase text-gray-500 dark:border-gray-800">
                    <th className="pb-3 pr-4">Action</th>
                    <th className="pb-3 pr-4">Product</th>
                    <th className="pb-3 pr-4">Requested</th>
                    <th className="pb-3 pr-4">Status</th>
                    <th className="pb-3">Review</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {data.content.map((c) => (
                    <tr key={c.id}>
                      <td className="py-3 pr-4">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${ACTION_COLORS[c.action] ?? "bg-gray-100 text-gray-600"}`}>
                          {c.action}
                        </span>
                        {c.action === "EDIT" && c.payload && (
                          <details className="mt-1">
                            <summary className="cursor-pointer text-xs text-gray-400">view changes</summary>
                            <pre className="mt-1 max-w-md overflow-x-auto rounded bg-gray-50 p-2 text-[10px] text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                              {(() => { try { return JSON.stringify(JSON.parse(c.payload), null, 2); } catch { return c.payload; } })()}
                            </pre>
                          </details>
                        )}
                        {c.status === "REJECTED" && c.rejectionReason && (
                          <p className="mt-0.5 text-xs text-red-500">{c.rejectionReason}</p>
                        )}
                      </td>
                      <td className="py-3 pr-4 font-mono text-xs text-gray-600 dark:text-gray-400">{truncate(c.productId)}</td>
                      <td className="py-3 pr-4 text-xs text-gray-500">{new Date(c.requestedAt).toLocaleString()}</td>
                      <td className="py-3 pr-4">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[c.status]}`}>
                          {c.status}
                        </span>
                      </td>
                      <td className="py-3">
                        {c.status === "PENDING" ? (
                          <div className="flex gap-2">
                            <button
                              disabled={busyId === c.id}
                              onClick={() => approve(c.id)}
                              className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50"
                            >
                              Approve
                            </button>
                            <button
                              disabled={busyId === c.id}
                              onClick={() => reject(c.id)}
                              className="rounded-lg bg-red-100 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-200 disabled:opacity-50 dark:bg-red-500/10 dark:text-red-400"
                            >
                              Reject
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                disabled={page === 0}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs disabled:opacity-50 dark:border-gray-600 dark:text-gray-300"
              >
                Prev
              </button>
              <button
                disabled={!!data && page + 1 >= data.totalPages}
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
