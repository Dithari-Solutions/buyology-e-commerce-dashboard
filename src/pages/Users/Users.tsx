import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router";
import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import Badge from "../../components/ui/badge/Badge";
import { usersService, ApiRequestError } from "../../api";
import type { UserListItem, UserStatus, UserType } from "../../types";

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

function fullName(firstName: string | null, lastName: string | null): string {
  const name = [firstName, lastName].filter(Boolean).join(" ");
  return name || "—";
}

type BadgeColor = "success" | "error" | "warning" | "info" | "light";

function statusBadgeColor(status: UserStatus): BadgeColor {
  return status === "ACTIVE" ? "success" : "error";
}

function typeBadgeColor(type: UserType): BadgeColor {
  return type === "ADMIN" ? "error" : "info";
}

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------

function SkeletonRow() {
  return (
    <tr className="border-b border-gray-100 dark:border-gray-800 animate-pulse">
      {Array.from({ length: 6 }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <div className="h-4 rounded-full bg-gray-200 dark:bg-gray-700" style={{ width: `${60 + (i % 3) * 20}%` }} />
        </td>
      ))}
    </tr>
  );
}

// ---------------------------------------------------------------------------
// Row
// ---------------------------------------------------------------------------

function UserRow({
  user,
  onView,
}: {
  user: UserListItem;
  onView: (authCredentialId: string) => void;
}) {
  return (
    <tr
      className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors cursor-pointer"
      onClick={() => onView(user.authCredentialId)}
    >
      <td className="px-4 py-3">
        <span className="text-sm font-medium text-gray-800 dark:text-white/90">
          {fullName(user.firstName, user.lastName)}
        </span>
      </td>
      <td className="px-4 py-3">
        <span className="text-sm text-gray-500 dark:text-gray-400">
          {user.email ?? <span className="italic text-gray-400 dark:text-gray-500">No email</span>}
        </span>
      </td>
      <td className="px-4 py-3">
        <Badge size="sm" color={typeBadgeColor(user.userType)}>
          {user.userType}
        </Badge>
      </td>
      <td className="px-4 py-3">
        <Badge size="sm" color={statusBadgeColor(user.status)}>
          {user.status}
        </Badge>
      </td>
      <td className="px-4 py-3">
        <span className="text-sm text-gray-500 dark:text-gray-400">
          {formatDate(user.joinedAt)}
        </span>
      </td>
      <td className="px-4 py-3">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onView(user.authCredentialId);
          }}
          className="rounded-xl border border-gray-200 dark:border-gray-700 px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          View
        </button>
      </td>
    </tr>
  );
}

// ---------------------------------------------------------------------------
// Pagination
// ---------------------------------------------------------------------------

function Pagination({
  page,
  totalPages,
  totalElements,
  size,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  totalElements: number;
  size: number;
  onPageChange: (page: number) => void;
}) {
  const from = totalElements === 0 ? 0 : page * size + 1;
  const to = Math.min((page + 1) * size, totalElements);

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-4 py-3 border-t border-gray-100 dark:border-gray-800">
      <p className="text-xs text-gray-500 dark:text-gray-400">
        Showing <span className="font-medium text-gray-700 dark:text-gray-300">{from}–{to}</span> of{" "}
        <span className="font-medium text-gray-700 dark:text-gray-300">{totalElements}</span> users
      </p>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page === 0}
          className="rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Previous
        </button>
        {Array.from({ length: Math.min(totalPages, 7) }).map((_, i) => {
          let pageNum = i;
          if (totalPages > 7) {
            if (page <= 3) {
              pageNum = i;
            } else if (page >= totalPages - 4) {
              pageNum = totalPages - 7 + i;
            } else {
              pageNum = page - 3 + i;
            }
          }
          return (
            <button
              key={pageNum}
              onClick={() => onPageChange(pageNum)}
              className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                pageNum === page
                  ? "border-brand-500 bg-brand-500 text-white"
                  : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
              }`}
            >
              {pageNum + 1}
            </button>
          );
        })}
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages - 1}
          className="rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Next
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

type StatusFilter = UserStatus | "ALL";
type TypeFilter = UserType | "ALL";

const PAGE_SIZE = 20;

export default function Users() {
  const navigate = useNavigate();

  const [users, setUsers] = useState<UserListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("ALL");

  const load = useCallback(
    (pageNum: number, signal?: AbortSignal) => {
      setLoading(true);
      setError(null);
      usersService
        .getAll(pageNum, PAGE_SIZE, signal)
        .then((res) => {
          setUsers(res.data.users);
          setTotalElements(res.data.totalElements);
          setTotalPages(res.data.totalPages);
        })
        .catch((err: unknown) => {
          if (err instanceof Error && err.name === "AbortError") return;
          setError(err instanceof ApiRequestError ? err.message : "Failed to load users.");
        })
        .finally(() => setLoading(false));
    },
    []
  );

  useEffect(() => {
    const controller = new AbortController();
    load(page, controller.signal);
    return () => controller.abort();
  }, [page, load]);

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const filtered = users.filter((u) => {
    const term = search.toLowerCase();
    const matchesSearch =
      fullName(u.firstName, u.lastName).toLowerCase().includes(term) ||
      (u.email ?? "").toLowerCase().includes(term);
    const matchesStatus = statusFilter === "ALL" || u.status === statusFilter;
    const matchesType = typeFilter === "ALL" || u.userType === typeFilter;
    return matchesSearch && matchesStatus && matchesType;
  });

  const activeCount = users.filter((u) => u.status === "ACTIVE").length;
  const suspendedCount = users.filter((u) => u.status === "SUSPENDED").length;
  const customerCount = users.filter((u) => u.userType === "CUSTOMER").length;
  // const adminCount = users.filter((u) => u.userType === "ADMIN").length;

  const stats = [
    {
      label: "Total Users",
      value: totalElements,
      color: "text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-500/10",
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      ),
    },
    {
      label: "Active",
      value: activeCount,
      color: "text-success-600 dark:text-success-400 bg-success-50 dark:bg-success-500/10",
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
          <polyline points="22 4 12 14.01 9 11.01" />
        </svg>
      ),
    },
    {
      label: "Suspended",
      value: suspendedCount,
      color: "text-error-600 dark:text-error-400 bg-error-50 dark:bg-error-500/10",
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <circle cx="12" cy="12" r="10" />
          <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
        </svg>
      ),
    },
    {
      label: "Customers",
      value: customerCount,
      color: "text-info-600 dark:text-info-400 bg-blue-light-50 dark:bg-blue-light-500/10",
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      ),
    },
  ];

  const statusOptions: { label: string; value: StatusFilter }[] = [
    { label: "All", value: "ALL" },
    { label: "Active", value: "ACTIVE" },
    { label: "Suspended", value: "SUSPENDED" },
  ];

  const typeOptions: { label: string; value: TypeFilter }[] = [
    { label: "All Types", value: "ALL" },
    { label: "Customer", value: "CUSTOMER" },
    { label: "Admin", value: "ADMIN" },
  ];

  return (
    <>
      <PageMeta
        title="Users | Buyology Dashboard"
        description="Manage registered users and view their profiles."
      />
      <PageBreadcrumb pageTitle="Users" />

      {/* Stats */}
      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="flex items-center gap-3 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03] p-4"
          >
            <span className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl ${stat.color}`}>
              {stat.icon}
            </span>
            <div>
              <p className="text-2xl font-bold text-gray-800 dark:text-white/90 leading-none">
                {loading ? "—" : stat.value}
              </p>
              <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90">
          All Users
          {!loading && (
            <span className="ml-2 text-sm font-normal text-gray-400">
              ({totalElements} total)
            </span>
          )}
        </h2>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          {/* Status filter */}
          <div className="flex gap-1 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60 p-1">
            {statusOptions.map(({ label, value }) => (
              <button
                key={value}
                onClick={() => setStatusFilter(value)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                  statusFilter === value
                    ? "bg-white dark:bg-gray-700 text-gray-800 dark:text-white shadow-sm"
                    : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          {/* Type filter */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as TypeFilter)}
            className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-xs font-medium text-gray-600 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-400/20 transition-all"
          >
            {typeOptions.map(({ label, value }) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          {/* Search */}
          <div className="relative w-full sm:w-60">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </span>
            <input
              type="text"
              placeholder="Search by name or email…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 py-2.5 pl-9 pr-4 text-sm text-gray-800 dark:text-white placeholder-gray-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-400/20 transition-all"
            />
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-red-200 dark:border-red-800/40 bg-red-50 dark:bg-red-500/5 py-16 text-center">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mb-3 text-red-400">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <p className="text-sm font-medium text-red-600 dark:text-red-400">{error}</p>
          <button
            onClick={() => load(page)}
            className="mt-3 text-xs text-brand-500 hover:text-brand-600 dark:text-brand-400"
          >
            Retry
          </button>
        </div>
      )}

      {/* Table */}
      {!error && (
        <div className="overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03]">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50/60 dark:bg-white/[0.02]">
                  {["Name", "Email", "Type", "Status", "Joined", "Actions"].map((col) => (
                    <th
                      key={col}
                      className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400"
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} />)
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-20 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" className="text-gray-300 dark:text-gray-600">
                          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                          <circle cx="9" cy="7" r="4" />
                          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                        </svg>
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                          {search ? "No users match your search." : "No users found."}
                        </p>
                        {search && (
                          <button
                            onClick={() => setSearch("")}
                            className="text-xs text-brand-500 hover:text-brand-600 dark:text-brand-400"
                          >
                            Clear search
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  filtered.map((user) => (
                    <UserRow
                      key={user.authCredentialId}
                      user={user}
                      onView={(id) => navigate(`/admin/users/${id}`)}
                    />
                  ))
                )}
              </tbody>
            </table>
          </div>

          {!loading && totalPages > 1 && (
            <Pagination
              page={page}
              totalPages={totalPages}
              totalElements={totalElements}
              size={PAGE_SIZE}
              onPageChange={handlePageChange}
            />
          )}
        </div>
      )}
    </>
  );
}
