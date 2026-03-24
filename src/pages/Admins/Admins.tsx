import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import PageMeta from "../../components/common/PageMeta";
import Badge from "../../components/ui/badge/Badge";
import { usersService, ApiRequestError } from "../../api";
import type { UserListItem, UserStatus } from "../../types";

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

export default function Admins() {
  const navigate = useNavigate();

  const [admins, setAdmins] = useState<UserListItem[]>([]);
  const [filtered, setFiltered] = useState<UserListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | UserStatus>("ALL");

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);

    usersService
      .getAll(0, 200, controller.signal)
      .then((res) => {
        const onlyAdmins = res.data.users.filter((u) => u.userType === "ADMIN");
        setAdmins(onlyAdmins);
        setFiltered(onlyAdmins);
      })
      .catch((err: unknown) => {
        if (err instanceof Error && err.name === "AbortError") return;
        setError(
          err instanceof ApiRequestError ? err.message : "Failed to load admins."
        );
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, []);

  useEffect(() => {
    let result = admins;
    if (statusFilter !== "ALL") {
      result = result.filter((u) => u.status === statusFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (u) =>
          fullName(u.firstName, u.lastName).toLowerCase().includes(q) ||
          (u.email ?? "").toLowerCase().includes(q)
      );
    }
    setFiltered(result);
  }, [admins, search, statusFilter]);

  const totalActive = admins.filter((u) => u.status === "ACTIVE").length;
  const totalSuspended = admins.filter((u) => u.status === "SUSPENDED").length;

  return (
    <>
      <PageMeta title="Admins | Buyology Dashboard" description="Manage admin users and assign roles & permissions." />

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-800 dark:text-white/90">Admins</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Assign roles and permissions to admin users.
        </p>
      </div>

      {/* Stats */}
      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
        {[
          { label: "Total Admins", value: admins.length, color: "text-brand-600 dark:text-brand-400" },
          { label: "Active", value: totalActive, color: "text-green-600 dark:text-green-400" },
          { label: "Suspended", value: totalSuspended, color: "text-red-600 dark:text-red-400" },
        ].map((s) => (
          <div
            key={s.label}
            className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03] px-5 py-4"
          >
            <p className="text-xs font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500">
              {s.label}
            </p>
            <p className={`mt-1 text-2xl font-bold ${s.color}`}>{loading ? "—" : s.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        {/* Search */}
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

        {/* Status filter */}
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
      <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03] overflow-hidden">
        {loading ? (
          <div className="p-5">
            <TableSkeleton />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-20 text-center px-5">
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
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center px-5">
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
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-800">
                  {["Admin", "Email", "Status", "Joined", ""].map((h) => (
                    <th
                      key={h}
                      className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((admin) => (
                  <tr
                    key={admin.authCredentialId}
                    className="border-b border-gray-100 dark:border-gray-800 last:border-0 hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors cursor-pointer"
                    onClick={() => navigate(`/admin/admins/${admin.authCredentialId}`)}
                  >
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-brand-100 dark:bg-brand-500/20 text-brand-600 dark:text-brand-400 text-sm font-bold">
                          {initials(admin.firstName, admin.lastName)}
                        </div>
                        <span className="text-sm font-medium text-gray-800 dark:text-white/90">
                          {fullName(admin.firstName, admin.lastName)}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        {admin.email ?? "—"}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <Badge size="sm" color={statusColor(admin.status)}>
                        {admin.status}
                      </Badge>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        {formatDate(admin.joinedAt)}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right">
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
        )}
      </div>
    </>
  );
}
