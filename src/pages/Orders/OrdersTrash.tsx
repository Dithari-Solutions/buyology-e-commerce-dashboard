import { useCallback, useEffect, useState } from "react";
import { Link, Navigate } from "react-router";
import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import { isSuperAdmin } from "../../auth/roles";
import { ordersService, ApiRequestError } from "../../api";
import type { TrashPage } from "../../api/services/orders.service";

/** Days left before an order is destroyed, or null once that moment has passed. */
function daysLeft(purgeAt: string | null): number | null {
  if (!purgeAt) return null;
  const ms = new Date(purgeAt).getTime() - Date.now();
  return ms <= 0 ? 0 : Math.ceil(ms / 86_400_000);
}

/**
 * Deleted orders, and how long is left to change your mind.
 *
 * A deleted order is hidden everywhere else — the order lists, the customer's own history, the
 * revenue report — so this page is the only way to see one, and the only way to bring it back.
 */
export default function OrdersTrash() {
  const allowed = isSuperAdmin();

  const [data, setData] = useState<TrashPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [page, setPage] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await ordersService.listTrash(page, 20);
      setData(res.data);
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : "Could not load the trash.");
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    if (allowed) void load();
  }, [allowed, load]);

  async function restore(id: string) {
    setBusy(id);
    setError(null);
    try {
      await ordersService.restoreFromTrash(id);
      await load();
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : "Could not restore that order.");
    } finally {
      setBusy(null);
    }
  }

  if (!allowed) return <Navigate to="/" replace />;

  const rows = data?.content ?? [];

  return (
    <>
      <PageMeta title="Order trash | Buyology" description="Deleted orders awaiting permanent removal" />
      <PageBreadcrumb pageTitle="Trash" />

      <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white">
            Deleted orders
            {data && data.totalElements > 0 && (
              <span className="ml-2 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                {data.totalElements}
              </span>
            )}
          </h2>
          <p className="mt-1 text-xs text-gray-500">
            Deleted orders are hidden from every list, including the customer's own order history
            and the revenue report. They are destroyed 30 days after deletion. Orders with a
            settled payment are kept beyond that rather than destroyed automatically.
          </p>
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
            <p className="text-gray-500 dark:text-gray-400">The trash is empty.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs uppercase text-gray-500 dark:border-gray-800">
                  <th className="pb-3 pr-4">Order</th>
                  <th className="pb-3 pr-4">Status when deleted</th>
                  <th className="pb-3 pr-4">Total</th>
                  <th className="pb-3 pr-4">Deleted</th>
                  <th className="pb-3 pr-4">Destroyed in</th>
                  <th className="pb-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {rows.map((row) => {
                  const left = daysLeft(row.purgeAt);
                  return (
                    <tr key={row.id}>
                      <td className="py-3 pr-4 font-mono text-xs text-gray-600 dark:text-gray-400">
                        BUY-{row.id.slice(0, 8).toUpperCase()}
                      </td>
                      <td className="py-3 pr-4 text-gray-600 dark:text-gray-400">
                        {row.status ?? "—"}
                      </td>
                      <td className="py-3 pr-4 text-gray-800 dark:text-gray-200" dir="ltr">
                        {row.totalAmount != null
                          ? `${row.currency ?? "AED"} ${row.totalAmount.toFixed(2)}`
                          : "—"}
                      </td>
                      <td className="py-3 pr-4 text-xs text-gray-500">
                        {row.deletedAt ? new Date(row.deletedAt).toLocaleString() : "—"}
                      </td>
                      <td className="py-3 pr-4 text-xs">
                        {left === null ? (
                          <span className="text-gray-500">—</span>
                        ) : left === 0 ? (
                          <span className="font-medium text-red-600 dark:text-red-400">any time now</span>
                        ) : (
                          <span className={left <= 3 ? "font-medium text-red-600 dark:text-red-400" : "text-gray-500"}>
                            {left} day{left === 1 ? "" : "s"}
                          </span>
                        )}
                      </td>
                      <td className="py-3">
                        <button
                          type="button"
                          onClick={() => restore(row.id)}
                          disabled={busy !== null}
                          className="rounded-lg bg-brand-50 px-3 py-1.5 text-xs font-medium text-brand-600 transition-colors hover:bg-brand-100 disabled:opacity-50 dark:bg-brand-500/10 dark:text-brand-300"
                        >
                          {busy === row.id ? "Restoring…" : "Restore"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {data && data.totalElements > data.size && (
          <div className="mt-4 flex items-center justify-between text-sm text-gray-500">
            <span>
              {data.totalElements} total · page {data.page + 1}
            </span>
            <div className="flex gap-2">
              <button
                disabled={page === 0}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                className="rounded-lg border border-gray-200 px-3 py-1.5 disabled:opacity-40 dark:border-gray-700"
              >
                Prev
              </button>
              <button
                disabled={(page + 1) * data.size >= data.totalElements}
                onClick={() => setPage((p) => p + 1)}
                className="rounded-lg border border-gray-200 px-3 py-1.5 disabled:opacity-40 dark:border-gray-700"
              >
                Next
              </button>
            </div>
          </div>
        )}

        <Link to="/orders/all" className="mt-4 inline-block text-sm text-brand-600 hover:underline">
          Back to all orders
        </Link>
      </div>
    </>
  );
}
