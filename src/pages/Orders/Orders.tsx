import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router";
import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import Badge from "../../components/ui/badge/Badge";
import { storesService, ApiRequestError } from "../../api";
import type { Store, StoreStatus } from "../../types";

type BadgeColor = "success" | "error" | "warning" | "info" | "light";

function statusColor(status: StoreStatus): BadgeColor {
  switch (status) {
    case "ACTIVE":
      return "success";
    case "INACTIVE":
      return "error";
    case "SUSPENDED":
      return "error";
    case "PENDING_APPROVAL":
      return "warning";
  }
}

function statusLabel(status: StoreStatus): string {
  switch (status) {
    case "ACTIVE":
      return "Active";
    case "INACTIVE":
      return "Inactive";
    case "SUSPENDED":
      return "Suspended";
    case "PENDING_APPROVAL":
      return "Pending";
  }
}

function SkeletonRow() {
  return (
    <tr className="border-b border-gray-100 dark:border-gray-800">
      <td className="px-5 py-4">
        <div className="space-y-2">
          <div className="h-3.5 w-40 rounded-full bg-gray-200 dark:bg-gray-700 animate-pulse" />
          <div className="h-2.5 w-24 rounded-full bg-gray-100 dark:bg-gray-800 animate-pulse" />
        </div>
      </td>
      {[1, 2, 3].map((i) => (
        <td key={i} className="px-4 py-4">
          <div className="h-3 w-20 rounded-full bg-gray-100 dark:bg-gray-800 animate-pulse" />
        </td>
      ))}
    </tr>
  );
}

export default function Orders() {
  const navigate = useNavigate();
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const fetchStores = useCallback((signal?: AbortSignal) => {
    setLoading(true);
    setError(null);
    storesService
      .getAll(signal)
      .then((res) => setStores(Array.isArray(res.data) ? res.data : []))
      .catch((err: unknown) => {
        if (err instanceof Error && err.name === "AbortError") return;
        setError(err instanceof ApiRequestError ? err.message : "Failed to load stores.");
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    fetchStores(controller.signal);
    return () => controller.abort();
  }, [fetchStores]);

  const filtered = Array.isArray(stores) 
    ? stores.filter((s) => {
        const term = search.toLowerCase();
        return (
          s.name.toLowerCase().includes(term) ||
          s.slug.toLowerCase().includes(term) ||
          s.countryName.toLowerCase().includes(term)
        );
      })
    : [];

  return (
    <>
      <PageMeta
        title="Orders - Select Store | Buyology Dashboard"
        description="Select a store to view its orders."
      />
      <PageBreadcrumb pageTitle="Orders" />

      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90">
          Select Store to View Orders
          {!loading && (
            <span className="ml-2 text-sm font-normal text-gray-400">({filtered?.length || 0})</span>
          )}
        </h2>

        <div className="relative w-full sm:w-64">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </span>
          <input
            type="text"
            placeholder="Search stores…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 py-2.5 pl-9 pr-4 text-sm text-gray-800 dark:text-white placeholder-gray-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-400/20 transition-all"
          />
        </div>
      </div>

      {error && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-red-200 dark:border-red-800/40 bg-red-50 dark:bg-red-500/5 py-16 text-center">
          <p className="text-sm font-medium text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {!error && (
        <div className="overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03]">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-white/[0.02]">
                  <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">Store</th>
                  <th className="px-4 py-3.5 text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">Country</th>
                  <th className="px-4 py-3.5 text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">Status</th>
                  <th className="px-4 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading && Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)}
                {!loading && filtered.map((store) => (
                  <tr
                    key={store.id}
                    onClick={() => navigate(`/orders/${store.id}`)}
                    className="border-b border-gray-100 dark:border-gray-800 transition-colors hover:bg-brand-50/50 dark:hover:bg-white/[0.02] cursor-pointer"
                  >
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-brand-50 dark:bg-brand-500/10 text-brand-500">
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                            <polyline points="9 22 9 12 15 12 15 22" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-800 dark:text-white/90">{store.name}</p>
                          <p className="mt-0.5 text-xs text-gray-400">{store.slug}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-600 dark:text-gray-300">{store.countryName}</td>
                    <td className="px-4 py-4">
                      <Badge size="sm" color={statusColor(store.status)}>
                        {statusLabel(store.status)}
                      </Badge>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <button className="text-brand-500 hover:text-brand-600 text-sm font-medium">
                        View Orders
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!loading && filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-center text-gray-500">
              No stores found.
            </div>
          )}
        </div>
      )}
    </>
  );
}
