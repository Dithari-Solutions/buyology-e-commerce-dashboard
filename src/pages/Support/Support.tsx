import { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router";
import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import { isSupport, isSuperAdmin } from "../../auth/roles";
import { supportService } from "../../api/services/support.service";
import type { SupportTicket, SupportTicketStatus } from "../../api/services/support.service";
import type { SpringPage } from "../../api/services/refunds.service";
import { ApiRequestError } from "../../api/types/api.types";
import { ALL_STATUSES, CATEGORY_LABELS, STATUS_COLORS, STATUS_LABELS } from "./supportUi";

/** The support-ticket queue: paginated, filterable by status, unread rows flagged. */
export default function Support() {
  const allowed = isSuperAdmin() || isSupport();
  const navigate = useNavigate();

  const [data, setData] = useState<SpringPage<SupportTicket> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<SupportTicketStatus | "">("");
  const [page, setPage] = useState(0);

  useEffect(() => {
    if (!allowed) return;
    const ac = new AbortController();
    setLoading(true);
    setError(null);
    supportService
      .list({ status, page, size: 20 }, ac.signal)
      .then((r) => setData(r.data))
      .catch((e) => {
        if ((e as DOMException)?.name !== "AbortError") {
          setError(e instanceof ApiRequestError ? e.message : "Could not load support tickets");
        }
      })
      .finally(() => {
        if (!ac.signal.aborted) setLoading(false);
      });
    return () => ac.abort();
     
  }, [allowed, status, page]);

  if (!allowed) return <Navigate to="/" replace />;

  const rows = data?.content ?? [];
  const newCount = rows.filter((t) => t.adminUnread).length;

  return (
    <>
      <PageMeta title="Support | Buyology" description="Customer support tickets" />
      <PageBreadcrumb pageTitle="Tickets" />

      <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white">
            Support Tickets
            {newCount > 0 && (
              <span className="ml-2 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                {newCount} new
              </span>
            )}
          </h2>
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value as SupportTicketStatus | "");
              setPage(0);
            }}
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
          >
            <option value="">All statuses</option>
            {ALL_STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </div>

        {error && (
          <p className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-400">
            {error}
          </p>
        )}

        {loading ? (
          <p className="text-sm text-gray-500">Loading…</p>
        ) : rows.length === 0 ? (
          <div className="rounded-xl border-2 border-dashed border-gray-200 p-8 text-center dark:border-gray-700">
            <p className="text-gray-500 dark:text-gray-400">No support tickets{status ? " with this status" : " yet"}.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-800 text-left text-xs uppercase text-gray-500">
                  <th className="pb-3 pr-4">Ref</th>
                  <th className="pb-3 pr-4">Subject</th>
                  <th className="pb-3 pr-4">Category</th>
                  <th className="pb-3 pr-4">Customer</th>
                  <th className="pb-3 pr-4">Date</th>
                  <th className="pb-3 pr-4">Status</th>
                  <th className="pb-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {rows.map((ticket) => (
                  <tr
                    key={ticket.id}
                    onClick={() => navigate(`/support/${ticket.id}`)}
                    className={`cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-white/[0.02] ${
                      ticket.adminUnread ? "bg-red-50/50 dark:bg-red-900/10" : ""
                    }`}
                  >
                    <td className="py-3 pr-4 font-mono text-xs text-gray-600 dark:text-gray-400">
                      <span className="inline-flex items-center gap-1.5">
                        {ticket.adminUnread && <span className="h-2 w-2 rounded-full bg-red-500" />}
                        {ticket.reference ?? ticket.id.slice(0, 8)}
                      </span>
                    </td>
                    <td className="max-w-[280px] py-3 pr-4 font-medium text-gray-800 dark:text-gray-200">
                      <div className="truncate">{ticket.subject}</div>
                    </td>
                    <td className="py-3 pr-4 text-gray-600 dark:text-gray-400">
                      {ticket.category ? CATEGORY_LABELS[ticket.category] ?? ticket.category : "—"}
                    </td>
                    <td className="py-3 pr-4 text-gray-600 dark:text-gray-400">
                      {ticket.contactEmail ?? "—"}
                    </td>
                    <td className="py-3 pr-4 text-xs text-gray-500">
                      {new Date(ticket.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-3 pr-4">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[ticket.status]}`}>
                        {STATUS_LABELS[ticket.status]}
                      </span>
                    </td>
                    <td className="py-3">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/support/${ticket.id}`);
                        }}
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

        {data && data.totalPages > 1 && (
          <div className="mt-4 flex items-center justify-between text-sm text-gray-500">
            <span>
              {data.totalElements} total · page {data.number + 1} of {data.totalPages}
            </span>
            <div className="flex gap-2">
              <button
                disabled={data.first}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                className="rounded-lg border border-gray-200 px-3 py-1.5 disabled:opacity-40 dark:border-gray-700"
              >
                Prev
              </button>
              <button
                disabled={data.last}
                onClick={() => setPage((p) => p + 1)}
                className="rounded-lg border border-gray-200 px-3 py-1.5 disabled:opacity-40 dark:border-gray-700"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
