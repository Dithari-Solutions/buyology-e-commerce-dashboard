import { useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router";
import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import { isSuperAdmin } from "../../auth/roles";
import { giveawayService } from "../../api/services/giveaway.service";
import type { GiveawayEntry } from "../../api/services/giveaway.service";
import type { SpringPage } from "../../api/services/refunds.service";
import { ApiRequestError } from "../../api/types/api.types";

/**
 * The giveaway entry list — the sheet a winner is drawn from.
 *
 * Read-only by design: entries are customers' own submissions and nothing here should be
 * able to edit them after the fact. Entry is one per account AND one per Instagram handle
 * (enforced by unique constraints server-side), so every row below is a distinct person as
 * far as the rules can tell.
 */
export default function Giveaway() {
  const allowed = isSuperAdmin();

  const [data, setData] = useState<SpringPage<GiveawayEntry> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!allowed) return;
    const ac = new AbortController();
    setLoading(true);
    setError(null);
    giveawayService
      .entries({ page, size: 50 }, ac.signal)
      .then((r) => setData(r.data))
      .catch((e) => {
        if ((e as DOMException)?.name !== "AbortError") {
          setError(e instanceof ApiRequestError ? e.message : "Could not load giveaway entries");
        }
      })
      .finally(() => {
        if (!ac.signal.aborted) setLoading(false);
      });
    return () => ac.abort();
  }, [allowed, page]);

  const rows = useMemo(() => {
    const all = data?.content ?? [];
    const q = query.trim().toLowerCase();
    if (!q) return all;
    return all.filter(
      (e) =>
        e.instagramHandle.toLowerCase().includes(q) ||
        (e.contactEmail ?? "").toLowerCase().includes(q),
    );
  }, [data, query]);

  if (!allowed) return <Navigate to="/" replace />;

  return (
    <>
      <PageMeta title="Giveaway | Buyology" description="Giveaway entries" />
      <PageBreadcrumb pageTitle="Entries" />

      <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white">
            Giveaway Entries
            {data && (
              <span className="ml-2 rounded-full bg-brand-100 px-2 py-0.5 text-xs font-medium text-brand-700">
                {data.totalElements} total
              </span>
            )}
          </h2>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter this page by handle or email"
            className="w-64 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
          />
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
            <p className="text-gray-500 dark:text-gray-400">
              {query ? "No entries match that filter." : "No giveaway entries yet."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs uppercase text-gray-500 dark:border-gray-800">
                  <th className="pb-3 pr-4">#</th>
                  <th className="pb-3 pr-4">Instagram</th>
                  <th className="pb-3 pr-4">Customer</th>
                  <th className="pb-3 pr-4">Phone</th>
                  <th className="pb-3">Entered</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {rows.map((entry, i) => (
                  <tr key={entry.id}>
                    <td className="py-3 pr-4 font-mono text-xs text-gray-500">
                      {(data?.number ?? 0) * (data?.size ?? 50) + i + 1}
                    </td>
                    <td className="py-3 pr-4">
                      <a
                        href={`https://instagram.com/${entry.instagramHandle}`}
                        target="_blank"
                        rel="noreferrer"
                        className="font-medium text-brand-600 hover:underline"
                        dir="ltr"
                      >
                        @{entry.instagramHandle}
                      </a>
                      {entry.instagramHandleRaw &&
                        entry.instagramHandleRaw.toLowerCase() !== entry.instagramHandle && (
                          <div className="text-xs text-gray-400" dir="ltr">
                            typed: {entry.instagramHandleRaw}
                          </div>
                        )}
                    </td>
                    <td className="py-3 pr-4 break-all text-gray-600 dark:text-gray-400">
                      {entry.contactEmail ?? "—"}
                      <div className="font-mono text-xs text-gray-400">
                        {entry.userId.slice(0, 8)}
                      </div>
                    </td>
                    <td className="py-3 pr-4 text-gray-600 dark:text-gray-400" dir="ltr">
                      {entry.contactPhone ?? "—"}
                    </td>
                    <td className="py-3 text-xs text-gray-500">
                      {new Date(entry.createdAt).toLocaleString()}
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
              page {data.number + 1} of {data.totalPages}
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
