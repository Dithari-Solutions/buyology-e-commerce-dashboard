import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router";
import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import Badge from "../../components/ui/badge/Badge";
import { Modal } from "../../components/ui/modal";
import { storesService, ApiRequestError } from "../../api";
import type { Store, StoreStatus } from "../../types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(iso));
}

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

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------

function SkeletonRow() {
  return (
    <tr className="border-b border-gray-100 dark:border-gray-800">
      <td className="px-4 py-2.5">
        <div className="space-y-2">
          <div className="h-3.5 w-40 rounded-full bg-gray-200 dark:bg-gray-700 animate-pulse" />
          <div className="h-2.5 w-24 rounded-full bg-gray-100 dark:bg-gray-800 animate-pulse" />
        </div>
      </td>
      {[1, 2, 3, 4, 5].map((i) => (
        <td key={i} className="px-4 py-2.5">
          <div className="h-3 w-20 rounded-full bg-gray-100 dark:bg-gray-800 animate-pulse" />
        </td>
      ))}
    </tr>
  );
}

// ---------------------------------------------------------------------------
// Delete Confirm Modal
// ---------------------------------------------------------------------------

function DeleteConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  storeName,
  deleting,
  deleteError,
}: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  storeName: string;
  deleting: boolean;
  deleteError: string | null;
}) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} className="mx-4 max-w-sm w-full p-4 sm:p-5">
      <div className="flex flex-col items-center text-center">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-error-50 dark:bg-error-500/10 mb-4">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="text-error-500">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6l-1 14H6L5 6" />
            <path d="M10 11v6M14 11v6" />
            <path d="M9 6V4h6v2" />
          </svg>
        </div>
        <h3 className="text-base font-semibold text-gray-800 dark:text-white/90 mb-1">Delete Store</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Are you sure you want to delete</p>
        <p className="text-sm font-semibold text-gray-800 dark:text-white/90 mb-4">"{storeName}"?</p>
        <p className="text-xs text-gray-400 dark:text-gray-500 mb-4">
          This is a soft-delete. The store data will be preserved but hidden.
        </p>
        {deleteError && (
          <p className="mb-4 w-full rounded-xl border border-red-200 dark:border-red-800/40 bg-red-50 dark:bg-red-500/5 px-4 py-2.5 text-xs text-red-600 dark:text-red-400">
            {deleteError}
          </p>
        )}
        <div className="flex w-full gap-3">
          <button
            onClick={onClose}
            disabled={deleting}
            className="flex-1 rounded-xl border border-gray-200 dark:border-gray-700 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={deleting}
            className="flex-1 rounded-xl bg-error-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-error-600 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {deleting && (
              <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
            )}
            {deleting ? "Deleting…" : "Delete"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

type StatusFilter = StoreStatus | "ALL";

export default function Stores() {
  const navigate = useNavigate();
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");

  // Delete modal
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deletingStore, setDeletingStore] = useState<Store | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const fetchStores = useCallback((signal?: AbortSignal) => {
    setLoading(true);
    setError(null);
    storesService
      .getAll(signal)
      .then((res) => setStores(res.data))
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

  // ── Filtering ─────────────────────────────────────────────────────────────

  const filtered = stores.filter((s) => {
    const term = search.toLowerCase();
    const matchesSearch =
      s.name.toLowerCase().includes(term) ||
      s.slug.toLowerCase().includes(term) ||
      s.countryName.toLowerCase().includes(term) ||
      (s.contactEmail ?? "").toLowerCase().includes(term);
    const matchesStatus = statusFilter === "ALL" || s.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // ── Stats ─────────────────────────────────────────────────────────────────

  const activeCount = stores.filter((s) => s.status === "ACTIVE").length;
  const pendingCount = stores.filter((s) => s.status === "PENDING_APPROVAL").length;
  const inactiveCount = stores.filter((s) => s.status === "INACTIVE" || s.status === "SUSPENDED").length;

  const stats = [
    {
      label: "Total Stores",
      value: stores.length,
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
      ),
      color: "text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-500/10",
    },
    {
      label: "Active",
      value: activeCount,
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
          <polyline points="22 4 12 14.01 9 11.01" />
        </svg>
      ),
      color: "text-success-600 dark:text-success-400 bg-success-50 dark:bg-success-500/10",
    },
    {
      label: "Pending Approval",
      value: pendingCount,
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
      ),
      color: "text-warning-600 dark:text-warning-400 bg-warning-50 dark:bg-warning-500/10",
    },
    {
      label: "Inactive / Suspended",
      value: inactiveCount,
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <circle cx="12" cy="12" r="10" />
          <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
        </svg>
      ),
      color: "text-error-600 dark:text-error-400 bg-error-50 dark:bg-error-500/10",
    },
  ];

  const filterOptions: { label: string; value: StatusFilter }[] = [
    { label: "All", value: "ALL" },
    { label: "Active", value: "ACTIVE" },
    { label: "Pending", value: "PENDING_APPROVAL" },
    { label: "Inactive", value: "INACTIVE" },
    { label: "Suspended", value: "SUSPENDED" },
  ];

  // ── Delete ────────────────────────────────────────────────────────────────

  function openDelete(store: Store, e: React.MouseEvent) {
    e.stopPropagation();
    setDeletingStore(store);
    setDeleteError(null);
    setDeleteModalOpen(true);
  }

  async function handleDelete() {
    if (!deletingStore) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await storesService.delete(deletingStore.id);
      setDeleteModalOpen(false);
      setDeletingStore(null);
      fetchStores();
    } catch (err: unknown) {
      setDeleteError(err instanceof ApiRequestError ? err.message : "Failed to delete store.");
    } finally {
      setDeleting(false);
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <>
      <PageMeta
        title="Stores | Buyology Dashboard"
        description="Manage all stores in the Buyology platform."
      />
      <PageBreadcrumb pageTitle="Stores" />

      {/* Stats row */}
      <div className="mb-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="flex items-center gap-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4"
          >
            <span className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl ${stat.color}`}>
              {stat.icon}
            </span>
            <div>
              <p className="text-xl font-bold text-gray-800 dark:text-white/90 leading-none">
                {loading ? "—" : stat.value}
              </p>
              <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-base font-semibold text-gray-800 dark:text-white/90">
          All Stores
          {!loading && (
            <span className="ml-2 text-sm font-normal text-gray-400">({filtered.length})</span>
          )}
        </h2>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          {/* Status filter */}
          <div className="flex gap-1 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60 p-1">
            {filterOptions.map(({ label, value }) => (
              <button
                key={value}
                onClick={() => setStatusFilter(value)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                  statusFilter === value
                    ? "bg-white dark:bg-gray-700 text-gray-800 dark:text-white shadow-theme-xs"
                    : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Search */}
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

          {/* New Store */}
          <button
            onClick={() => navigate("/stores/new")}
            className="flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-700 transition-colors whitespace-nowrap"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            New Store
          </button>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-red-200 dark:border-red-800/40 bg-red-50 dark:bg-red-500/5 py-16 text-center">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mb-3 text-red-400">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <p className="text-sm font-medium text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Table */}
      {!error && (
        <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900">
                  {["Store", "Country", "Status", "Contact", "Slug", "Created", "Actions"].map((col) => (
                    <th
                      key={col}
                      className="px-4 py-2.5 first:pl-5 text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500"
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading && Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)}

                {!loading &&
                  filtered.map((store) => (
                    <tr
                      key={store.id}
                      onClick={() => navigate(`/stores/${store.id}`)}
                      className="border-b border-gray-100 dark:border-gray-800 transition-colors hover:bg-brand-50/50 dark:hover:bg-white/[0.02] cursor-pointer"
                    >
                      {/* Store name */}
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-brand-50 dark:bg-brand-500/10 text-brand-500">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                              <polyline points="9 22 9 12 15 12 15 22" />
                            </svg>
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-gray-800 dark:text-white/90">{store.name}</p>
                            <p className="mt-0.5 text-xs text-gray-400">{store.translations.length} translations</p>
                          </div>
                        </div>
                      </td>

                      {/* Country */}
                      <td className="px-4 py-2.5 text-sm text-gray-600 dark:text-gray-300">{store.countryName}</td>

                      {/* Status */}
                      <td className="px-4 py-2.5">
                        <Badge size="sm" color={statusColor(store.status)}>
                          {statusLabel(store.status)}
                        </Badge>
                      </td>

                      {/* Contact */}
                      <td className="px-4 py-2.5">
                        <p className="text-xs text-gray-600 dark:text-gray-300">{store.contactEmail ?? "—"}</p>
                        <p className="text-xs text-gray-400">{store.contactPhone ?? ""}</p>
                      </td>

                      {/* Slug */}
                      <td className="px-4 py-2.5">
                        <code className="rounded bg-gray-100 dark:bg-gray-800 px-2 py-0.5 text-xs font-mono text-gray-600 dark:text-gray-300">
                          {store.slug}
                        </code>
                      </td>

                      {/* Created */}
                      <td className="px-4 py-2.5 text-xs text-gray-500 dark:text-gray-400">
                        {formatDate(store.createdAt)}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-2.5" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => navigate(`/stores/${store.id}`)}
                            className="flex items-center justify-center h-8 w-8 rounded-lg text-gray-400 hover:text-brand-500 hover:bg-brand-50 dark:hover:bg-brand-500/10 transition-colors"
                            title="View Details"
                          >
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                              <circle cx="12" cy="12" r="3" />
                            </svg>
                          </button>
                          <button
                            onClick={(e) => openDelete(store, e)}
                            className="flex items-center justify-center h-8 w-8 rounded-lg text-gray-400 hover:text-error-500 hover:bg-error-50 dark:hover:bg-error-500/10 transition-colors"
                            title="Delete"
                          >
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <polyline points="3 6 5 6 21 6" />
                              <path d="M19 6l-1 14H6L5 6" />
                              <path d="M10 11v6M14 11v6" />
                              <path d="M9 6V4h6v2" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>

          {/* Empty state */}
          {!loading && filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" className="mb-4 text-gray-300 dark:text-gray-600">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                <polyline points="9 22 9 12 15 12 15 22" />
              </svg>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                {search || statusFilter !== "ALL" ? "No stores match your filters." : "No stores found."}
              </p>
              {(search || statusFilter !== "ALL") && (
                <button
                  onClick={() => { setSearch(""); setStatusFilter("ALL"); }}
                  className="mt-3 text-xs text-brand-500 hover:text-brand-600 dark:text-brand-400 transition-colors"
                >
                  Clear filters
                </button>
              )}
              {!search && statusFilter === "ALL" && (
                <button
                  onClick={() => navigate("/stores/new")}
                  className="mt-3 text-xs text-brand-500 hover:text-brand-600 dark:text-brand-400 transition-colors"
                >
                  Create your first store
                </button>
              )}
            </div>
          )}
        </div>
      )}

      <DeleteConfirmModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={handleDelete}
        storeName={deletingStore?.name ?? ""}
        deleting={deleting}
        deleteError={deleteError}
      />
    </>
  );
}
