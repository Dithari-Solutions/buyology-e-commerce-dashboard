import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router";
import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import Badge from "../../components/ui/badge/Badge";
import { couriersService, ApiRequestError } from "../../api";
import type { CourierSummary, CourierStatus, VehicleType } from "../../types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fullName(first: string, last: string): string {
  return [first, last].filter(Boolean).join(" ") || "—";
}

type BadgeColor = "success" | "error" | "warning" | "info" | "light";

function statusBadgeColor(status: CourierStatus): BadgeColor {
  switch (status) {
    case "ACTIVE": return "success";
    case "SUSPENDED": return "error";
    case "OFFLINE": return "light";
  }
}

function vehicleBadgeColor(type: VehicleType): BadgeColor {
  switch (type) {
    case "CAR": return "info";
    case "SCOOTER": return "warning";
    case "BICYCLE": return "success";
    case "FOOT": return "light";
  }
}

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------

function SkeletonRow() {
  return (
    <tr className="border-b border-gray-100 dark:border-gray-800 animate-pulse">
      {Array.from({ length: 5 }).map((_, i) => (
        <td key={i} className="px-4 py-2.5">
          <div className="h-4 rounded-full bg-gray-200 dark:bg-gray-700" style={{ width: `${55 + (i % 3) * 20}%` }} />
        </td>
      ))}
    </tr>
  );
}

// ---------------------------------------------------------------------------
// Row
// ---------------------------------------------------------------------------

function CourierRow({
  courier,
  onView,
}: {
  courier: CourierSummary;
  onView: (id: string) => void;
}) {
  return (
    <tr
      className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors cursor-pointer"
      onClick={() => onView(courier.courierId)}
    >
      <td className="px-4 py-2.5">
        <span className="text-sm font-medium text-gray-800 dark:text-white/90">
          {fullName(courier.firstName, courier.lastName)}
        </span>
      </td>
      <td className="px-4 py-2.5">
        <span className="text-sm text-gray-500 dark:text-gray-400">{courier.phone}</span>
      </td>
      <td className="px-4 py-2.5">
        <Badge size="sm" color={vehicleBadgeColor(courier.vehicleType)}>
          {courier.vehicleType}
        </Badge>
      </td>
      <td className="px-4 py-2.5">
        <Badge size="sm" color={statusBadgeColor(courier.accountStatus)}>
          {courier.accountStatus}
        </Badge>
      </td>
      <td className="px-4 py-2.5">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onView(courier.courierId);
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
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-4 py-2.5 border-t border-gray-100 dark:border-gray-800">
      <p className="text-xs text-gray-500 dark:text-gray-400">
        Showing <span className="font-medium text-gray-700 dark:text-gray-300">{from}–{to}</span> of{" "}
        <span className="font-medium text-gray-700 dark:text-gray-300">{totalElements}</span> couriers
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
            if (page <= 3) pageNum = i;
            else if (page >= totalPages - 4) pageNum = totalPages - 7 + i;
            else pageNum = page - 3 + i;
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

type StatusFilter = CourierStatus | "ALL";
type VehicleFilter = VehicleType | "ALL";

const PAGE_SIZE = 20;

export default function Couriers() {
  const navigate = useNavigate();

  const [couriers, setCouriers] = useState<CourierSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [vehicleFilter, setVehicleFilter] = useState<VehicleFilter>("ALL");

  const load = useCallback(
    (
      pageNum: number,
      opts: { status: StatusFilter; vehicle: VehicleFilter; search: string },
      signal?: AbortSignal
    ) => {
      setLoading(true);
      setError(null);
      couriersService
        .getAll(
          {
            page: pageNum,
            size: PAGE_SIZE,
            status: opts.status !== "ALL" ? opts.status : undefined,
            vehicleType: opts.vehicle !== "ALL" ? opts.vehicle : undefined,
            search: opts.search || undefined,
          },
          signal
        )
        .then((res) => {
          setCouriers(res.content);
          setTotalElements(res.totalElements);
          setTotalPages(res.totalPages);
        })
        .catch((err: unknown) => {
          if (err instanceof Error && err.name === "AbortError") return;
          setError(err instanceof ApiRequestError ? err.message : "Failed to load couriers.");
        })
        .finally(() => setLoading(false));
    },
    []
  );

  useEffect(() => {
    const controller = new AbortController();
    load(page, { status: statusFilter, vehicle: vehicleFilter, search }, controller.signal);
    return () => controller.abort();
  }, [page, statusFilter, vehicleFilter, search, load]);

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const activeCount = couriers.filter((c) => c.accountStatus === "ACTIVE").length;
  const suspendedCount = couriers.filter((c) => c.accountStatus === "SUSPENDED").length;
  const offlineCount = couriers.filter((c) => c.accountStatus === "OFFLINE").length;

  const stats = [
    {
      label: "Total Couriers",
      value: totalElements,
      color: "text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-500/10",
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <circle cx="12" cy="12" r="10" />
          <path d="M12 8v4l3 3" />
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
      label: "Offline",
      value: offlineCount,
      color: "text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-500/10",
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
      ),
    },
  ];

  const statusOptions: { label: string; value: StatusFilter }[] = [
    { label: "All", value: "ALL" },
    { label: "Active", value: "ACTIVE" },
    { label: "Offline", value: "OFFLINE" },
    { label: "Suspended", value: "SUSPENDED" },
  ];

  const vehicleOptions: { label: string; value: VehicleFilter }[] = [
    { label: "All Vehicles", value: "ALL" },
    { label: "Bicycle", value: "BICYCLE" },
    { label: "Foot", value: "FOOT" },
    { label: "Scooter", value: "SCOOTER" },
    { label: "Car", value: "CAR" },
  ];

  return (
    <>
      <PageMeta
        title="Couriers | Buyology Dashboard"
        description="Manage courier accounts and track their status."
      />
      <PageBreadcrumb pageTitle="Couriers" />

      {/* Stats */}
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
          All Couriers
          {!loading && (
            <span className="ml-2 text-sm font-normal text-gray-400">({totalElements} total)</span>
          )}
        </h2>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          {/* Status filter pills */}
          <div className="flex gap-1 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60 p-1 flex-wrap">
            {statusOptions.map(({ label, value }) => (
              <button
                key={value}
                onClick={() => { setStatusFilter(value); setPage(0); }}
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

          {/* Vehicle type filter */}
          <select
            value={vehicleFilter}
            onChange={(e) => { setVehicleFilter(e.target.value as VehicleFilter); setPage(0); }}
            className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-xs font-medium text-gray-600 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-400/20 transition-all"
          >
            {vehicleOptions.map(({ label, value }) => (
              <option key={value} value={value}>{label}</option>
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
              placeholder="Search by name or phone…"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(0); }}
              className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 py-2.5 pl-9 pr-4 text-sm text-gray-800 dark:text-white placeholder-gray-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-400/20 transition-all"
            />
          </div>

          {/* Add courier */}
          <button
            onClick={() => navigate("/admin/couriers/new")}
            className="flex items-center gap-1.5 rounded-xl bg-brand-600 hover:bg-brand-700 px-4 py-2.5 text-xs font-semibold text-white transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            New Courier
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-red-200 dark:border-red-800/40 bg-red-50 dark:bg-red-500/5 py-16 text-center">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mb-3 text-red-400">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <p className="text-sm font-medium text-red-600 dark:text-red-400">{error}</p>
          <button
            onClick={() => load(page, { status: statusFilter, vehicle: vehicleFilter, search })}
            className="mt-3 text-xs text-brand-500 hover:text-brand-600 dark:text-brand-400"
          >
            Retry
          </button>
        </div>
      )}

      {/* Table */}
      {!error && (
        <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50/60 dark:bg-gray-900">
                  {["Name", "Phone", "Vehicle", "Status", "Actions"].map((col) => (
                    <th
                      key={col}
                      className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400"
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} />)
                ) : couriers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-20 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" className="text-gray-300 dark:text-gray-600">
                          <circle cx="12" cy="12" r="10" />
                          <path d="M12 8v4l3 3" />
                        </svg>
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                          {search ? "No couriers match your search." : "No couriers found."}
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
                  couriers.map((courier) => (
                    <CourierRow
                      key={courier.courierId}
                      courier={courier}
                      onView={(id) => navigate(`/admin/couriers/${id}`)}
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
