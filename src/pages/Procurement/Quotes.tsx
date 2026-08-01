import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router";
import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import { isProcurement, isSuperAdmin } from "../../auth/roles";
import { b2bQuotesService } from "../../api/services/b2b-quotes.service";
import type { B2bQuote, B2bQuoteStatus } from "../../api/services/b2b-quotes.service";

const STATUS_OPTIONS: B2bQuoteStatus[] = [
  "SUBMITTED",
  "QUOTED",
  "ACCEPTED",
  "REJECTED",
  "EXPIRED",
  "CANCELLED",
  "ORDERED",
];

const STATUS_COLORS: Record<B2bQuoteStatus, string> = {
  DRAFT: "bg-gray-100 text-gray-700",
  SUBMITTED: "bg-brand-100 text-brand-700",
  QUOTED: "bg-blue-100 text-blue-700",
  ACCEPTED: "bg-green-100 text-green-700",
  REJECTED: "bg-red-100 text-red-700",
  EXPIRED: "bg-yellow-100 text-yellow-700",
  CANCELLED: "bg-gray-100 text-gray-600",
  ORDERED: "bg-emerald-100 text-emerald-700",
};

export default function Quotes() {
  const allowed = isSuperAdmin() || isProcurement();

  const [quotes, setQuotes] = useState<B2bQuote[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<B2bQuoteStatus>("SUBMITTED");

  useEffect(() => {
    if (!allowed) return;
    const ac = new AbortController();
    setLoading(true);
    b2bQuotesService
      .list(status, ac.signal)
      .then((r) => setQuotes(r.data ?? []))
      .catch(() => setQuotes([]))
      .finally(() => setLoading(false));
    return () => ac.abort();
  }, [allowed, status]);

  if (!allowed) return <Navigate to="/" replace />;

  return (
    <>
      <PageMeta title="B2B Quotes | Buyology" description="Price and manage B2B RFQ quotes" />
      <PageBreadcrumb pageTitle="Quotes" />

      <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
          <h2 className="text-base font-semibold text-gray-800 dark:text-white">B2B RFQ Quotes</h2>
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as B2bQuoteStatus)}
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        </div>

        {loading ? (
          <p className="text-sm text-gray-500">Loading…</p>
        ) : quotes.length === 0 ? (
          <div className="rounded-xl border-2 border-dashed border-gray-200 p-5 text-center dark:border-gray-700">
            <p className="text-gray-500 dark:text-gray-400">No quotes with status {status}.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-800 text-left text-xs uppercase text-gray-500">
                  <th className="pb-3 pr-4">Quote ID</th>
                  <th className="pb-3 pr-4">Country</th>
                  <th className="pb-3 pr-4">Currency</th>
                  <th className="pb-3 pr-4">Items</th>
                  <th className="pb-3 pr-4">Submitted</th>
                  <th className="pb-3 pr-4">Status</th>
                  <th className="pb-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {quotes.map((q) => (
                  <tr key={q.id}>
                    <td className="py-3 pr-4 font-mono text-xs text-gray-700 dark:text-gray-300">
                      {q.id.slice(0, 8)}…
                    </td>
                    <td className="py-3 pr-4 text-gray-600 dark:text-gray-400">{q.countryCode}</td>
                    <td className="py-3 pr-4 text-gray-600 dark:text-gray-400">{q.currency}</td>
                    <td className="py-3 pr-4 text-gray-600 dark:text-gray-400">{q.items?.length ?? 0}</td>
                    <td className="py-3 pr-4 text-gray-500 text-xs">
                      {q.submittedAt ? new Date(q.submittedAt).toLocaleString() : "—"}
                    </td>
                    <td className="py-3 pr-4">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[q.status]}`}
                      >
                        {q.status}
                      </span>
                    </td>
                    <td className="py-3">
                      <Link
                        to={`/procurement/quotes/${q.id}`}
                        className="rounded-lg bg-gray-100 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                      >
                        {q.status === "SUBMITTED" ? "Price" : "View"}
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
