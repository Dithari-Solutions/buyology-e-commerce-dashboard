import { useCallback, useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router";
import PageMeta from "../../components/common/PageMeta";
import Badge from "../../components/ui/badge/Badge";
import { usersService, ApiRequestError } from "../../api";
import { isSuperAdmin } from "../../auth/roles";
import type { UserListItem, UserStatus } from "../../types";

const PAGE_SIZE = 20;

type BadgeColor = "success" | "error" | "warning" | "info" | "light";

function statusColor(status: UserStatus): BadgeColor {
  return status === "ACTIVE" ? "success" : "error";
}

function fullName(first: string | null, last: string | null): string {
  const n = [first, last].filter(Boolean).join(" ");
  return n || "Unknown";
}

function initials(first: string | null, last: string | null): string {
  const f = first?.[0] ?? "";
  const l = last?.[0] ?? "";
  return (f + l).toUpperCase() || "?";
}

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(iso));
}

function TableSkeleton() {
  return (
    <div className="animate-pulse space-y-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="h-14 rounded-xl bg-gray-100 dark:bg-gray-800" />
      ))}
    </div>
  );
}

function Pagination({
  page,
  totalPages,
  onChange,
}: {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
}) {
  const windowStart = Math.max(0, Math.min(page - 3, totalPages - 7));
  const pages = Array.from({ length: Math.min(7, totalPages) }, (_, i) => windowStart + i);

  return (
    <div className="flex flex-wrap items-center justify-center gap-2 border-t border-gray-100 dark:border-gray-800 px-4 py-2.5">
      <button
        onClick={() => onChange(page - 1)}
        disabled={page === 0}
        className="rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 transition-colors"
      >
        Previous
      </button>
      {pages.map((p) => (
        <button
          key={p}
          onClick={() => onChange(p)}
          className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
            p === page
              ? "border-brand-500 bg-brand-500 text-white"
              : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
          }`}
        >
          {p + 1}
        </button>
      ))}
      <button
        onClick={() => onChange(page + 1)}
        disabled={page >= totalPages - 1}
        className="rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 transition-colors"
      >
        Next
      </button>
    </div>
  );
}

export default function Admins() {
  const navigate = useNavigate();
  // The admin list is SUPERADMIN-only server-side; redirect rather than render a 403.
  const allowed = isSuperAdmin();

  const [admins, setAdmins] = useState<UserListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | UserStatus>("ALL");
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);

  // Search runs server-side, so debounce it rather than firing a request per keystroke.
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(0);
    }, 350);
    return () => clearTimeout(timer);
  }, [search]);

  const load = useCallback((pageNum: number, query: string, signal?: AbortSignal) => {
    setLoading(true);
    setError(null);

    // Server-side ADMIN filter. The list previously pulled the newest 200 users of any type and
    // filtered in the browser, so on a store with more customers than that, admins dropped off the
    // page entirely — they still blocked their email at creation time but appeared nowhere here.
    usersService
      .getAdmins(pageNum, PAGE_SIZE, query, signal)
      .then((res) => {
        setAdmins(res.data.users);
        setTotalPages(res.data.totalPages);
        setTotalElements(res.data.totalElements);
      })
      .catch((err: unknown) => {
        if (err instanceof Error && err.name === "AbortError") return;
        setError(err instanceof ApiRequestError ? err.message : "Failed to load admins.");
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!allowed) return;
    const controller = new AbortController();
    load(page, debouncedSearch, controller.signal);
    return () => controller.abort();
  }, [allowed, page, debouncedSearch, load]);

  // Status is a cheap client-side narrowing of the page already fetched.
  const visible =
    statusFilter === "ALL" ? admins : admins.filter((a) => a.status === statusFilter);

  const activeOnPage = admins.filter((u) => u.status === "ACTIVE").length;
  const suspendedOnPage = admins.filter((u) => u.status === "SUSPENDED").length;

  if (!allowed) return <Navigate to="/" replace />;

  return (
    <>
      <PageMeta
        title="Admins | Buyology Dashboard"
        description="Manage admin users and assign roles & permissions."
      />

      {/* Header */}
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-gray-800 dark:text-white/90">Admins</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Assign roles and permissions to admin users.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => navigate("/admin/roles")}
            className="rounded-xl border border-gray-200 dark:border-gray-700 px-4 py-2.5 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            Roles &amp; Permissions
          </button>
          <button
            onClick={() => navigate("/admin/admins/new")}
            className="rounded-xl bg-brand-600 hover:bg-brand-700 px-4 py-2.5 text-sm font-semibold text-white transition-colors"
          >
            + Create Admin
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="mb-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
        {[
          {
            label: "Total Admins",
            value: totalElements,
            color: "text-brand-600 dark:text-brand-400",
          },
          {
            label: "Active on page",
            value: activeOnPage,
            color: "text-green-600 dark:text-green-400",
          },
          {
            label: "Suspended on page",
            value: suspendedOnPage,
            color: "text-red-600 dark:text-red-400",
          },
        ].map((s) => (
          <div
            key={s.label}
            className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-4 py-2.5"
          >
            <p className="text-xs font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500">
              {s.label}
            </p>
            <p className={`mt-1 text-xl font-bold ${s.color}`}>{loading ? "—" : s.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <svg
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            placeholder="Search by name or email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 py-2.5 pl-9 pr-4 text-sm text-gray-800 dark:text-white/90 placeholder-gray-400 outline-none focus:border-brand-500 dark:focus:border-brand-400 transition-colors"
          />
        </div>

        <div className="flex gap-2">
          {(["ALL", "ACTIVE", "SUSPENDED"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`rounded-xl px-4 py-2.5 text-sm font-medium transition-colors ${
                statusFilter === s
                  ? "bg-brand-500 text-white"
                  : "border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
              }`}
            >
              {s === "ALL" ? "All" : s.charAt(0) + s.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden">
        {loading ? (
          <div className="p-4">
            <TableSkeleton />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-20 text-center px-4">
            <svg
              width="36"
              height="36"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              className="mb-3 text-red-400"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <p className="text-sm font-medium text-red-600 dark:text-red-400">{error}</p>
            <button
              onClick={() => load(page, debouncedSearch)}
              className="mt-3 rounded-xl border border-gray-200 dark:border-gray-700 px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              Retry
            </button>
          </div>
        ) : visible.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center px-4">
            <svg
              width="40"
              height="40"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.2"
              className="mb-3 text-gray-300 dark:text-gray-600"
            >
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
            <p className="text-sm text-gray-500 dark:text-gray-400">No admin users found.</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-gray-800">
                    {["Admin", "Email", "Roles", "Status", "Joined", ""].map((h) => (
                      <th
                        key={h}
                        className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {visible.map((admin) => (
                    <tr
                      key={admin.authCredentialId}
                      className="border-b border-gray-100 dark:border-gray-800 last:border-0 hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors cursor-pointer"
                      onClick={() => navigate(`/admin/admins/${admin.authCredentialId}`)}
                    >
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-brand-100 dark:bg-brand-500/20 text-brand-600 dark:text-brand-400 text-sm font-bold">
                            {initials(admin.firstName, admin.lastName)}
                          </div>
                          <span className="text-sm font-medium text-gray-800 dark:text-white/90">
                            {fullName(admin.firstName, admin.lastName)}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-2.5">
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          {admin.email ?? "—"}
                        </span>
                      </td>
                      <td className="px-4 py-2.5">
                        {admin.roles && admin.roles.length > 0 ? (
                          <div className="flex flex-wrap gap-1.5">
                            {admin.roles.map((role) => (
                              <Badge key={role} size="sm" color="light">
                                {role.replace(/_/g, " ")}
                              </Badge>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-amber-600 dark:text-amber-400">
                            No roles
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2.5">
                        <Badge size="sm" color={statusColor(admin.status)}>
                          {admin.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-2.5">
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          {formatDate(admin.joinedAt)}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/admin/admins/${admin.authCredentialId}`);
                          }}
                          className="rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                        >
                          Manage Roles
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {totalPages > 1 && (
              <Pagination page={page} totalPages={totalPages} onChange={setPage} />
            )}
          </>
        )}
      </div>
    </>
  );
}
