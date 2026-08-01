import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router";
import PageMeta from "../../components/common/PageMeta";
import Badge from "../../components/ui/badge/Badge";
import { couriersService, ApiRequestError } from "../../api";
import { env } from "../../config/env";
import type { CourierDetail as CourierDetailType, CourierStatus, VehicleType } from "../../types";

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

function fullName(first: string, last: string): string {
  return [first, last].filter(Boolean).join(" ") || "Unknown";
}

function initials(first: string, last: string): string {
  return ((first?.[0] ?? "") + (last?.[0] ?? "")).toUpperCase() || "?";
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
// Sub-components
// ---------------------------------------------------------------------------

function SectionCard({ title, children }: { title: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03] overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800">
        <h2 className="text-base font-semibold text-gray-800 dark:text-white/90">{title}</h2>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function ProfileField({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 py-2.5 border-b border-gray-100 dark:border-gray-800 last:border-0">
      <span className="w-full sm:w-44 flex-shrink-0 text-xs font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500">
        {label}
      </span>
      <span className="text-sm text-gray-700 dark:text-gray-300">{value}</span>
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03] p-5">
        <div className="flex items-center gap-4 mb-5">
          <div className="h-16 w-16 rounded-full bg-gray-200 dark:bg-gray-700" />
          <div className="space-y-2">
            <div className="h-5 w-40 rounded-full bg-gray-200 dark:bg-gray-700" />
            <div className="h-3 w-28 rounded-full bg-gray-100 dark:bg-gray-800" />
          </div>
        </div>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-3 rounded-full bg-gray-100 dark:bg-gray-800 mb-3" style={{ width: `${50 + (i % 3) * 15}%` }} />
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Status Update Modal
// ---------------------------------------------------------------------------

const STATUS_OPTIONS: CourierStatus[] = ["ACTIVE", "OFFLINE", "SUSPENDED"];

function StatusModal({
  current,
  onConfirm,
  onClose,
  loading,
}: {
  current: CourierStatus;
  onConfirm: (status: CourierStatus) => void;
  onClose: () => void;
  loading: boolean;
}) {
  const [status, setStatus] = useState<CourierStatus>(current);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-6 shadow-xl">
        <h3 className="mb-4 text-base font-semibold text-gray-800 dark:text-white/90">
          Update Courier Status
        </h3>

        <div className="mb-4">
          <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
            New Status
          </label>
          <div className="flex flex-wrap gap-2">
            {STATUS_OPTIONS.map((s) => (
              <button
                key={s}
                onClick={() => setStatus(s)}
                className={`rounded-xl border px-3 py-1.5 text-xs font-semibold transition-all ${
                  status === s
                    ? "border-brand-500 bg-brand-500 text-white"
                    : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={loading}
            className="rounded-xl border border-gray-200 dark:border-gray-700 px-5 py-2.5 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-40"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(status)}
            disabled={loading || status === current}
            className="rounded-xl bg-brand-500 hover:bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {loading ? "Saving…" : "Update Status"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Delete Confirm Modal
// ---------------------------------------------------------------------------

function DeleteModal({
  name,
  onConfirm,
  onClose,
  loading,
}: {
  name: string;
  onConfirm: () => void;
  onClose: () => void;
  loading: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-6 shadow-xl">
        <div className="mb-4 flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 dark:bg-red-500/10 text-red-500">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6l-1 14H6L5 6" />
              <path d="M10 11v6M14 11v6" />
              <path d="M9 6V4h6v2" />
            </svg>
          </span>
          <h3 className="text-base font-semibold text-gray-800 dark:text-white/90">Delete Courier</h3>
        </div>
        <p className="mb-6 text-sm text-gray-500 dark:text-gray-400">
          Are you sure you want to permanently delete <span className="font-semibold text-gray-700 dark:text-gray-300">{name}</span>? This action cannot be undone.
        </p>
        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={loading}
            className="rounded-xl border border-gray-200 dark:border-gray-700 px-5 py-2.5 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-40"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="rounded-xl bg-red-500 hover:bg-red-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors disabled:opacity-40"
          >
            {loading ? "Deleting…" : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function CourierDetail() {
  const { courierId } = useParams<{ courierId: string }>();
  const navigate = useNavigate();

  const [courier, setCourier] = useState<CourierDetailType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  const [showStatusModal, setShowStatusModal] = useState(false);
  const [statusLoading, setStatusLoading] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [availabilityLoading, setAvailabilityLoading] = useState(false);

  useEffect(() => {
    if (!courierId) return;
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    setNotFound(false);

    couriersService
      .getById(courierId, controller.signal)
      .then((data) => setCourier(data))
      .catch((err: unknown) => {
        if (err instanceof Error && err.name === "AbortError") return;
        if (err instanceof ApiRequestError && err.statusCode === 404) {
          setNotFound(true);
        } else {
          setError(err instanceof ApiRequestError ? err.message : "Failed to load courier.");
        }
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [courierId]);

  const handleStatusUpdate = (status: CourierStatus) => {
    if (!courierId) return;
    setStatusLoading(true);
    setStatusError(null);
    couriersService
      .updateStatus(courierId, { status })
      .then((res) => {
        setCourier((prev) => prev ? { ...prev, accountStatus: res.accountStatus } : prev);
        setShowStatusModal(false);
      })
      .catch((err: unknown) => {
        setStatusError(err instanceof ApiRequestError ? err.message : "Failed to update status.");
      })
      .finally(() => setStatusLoading(false));
  };

  const handleDelete = () => {
    if (!courierId) return;
    setDeleteLoading(true);
    setDeleteError(null);
    couriersService
      .delete(courierId)
      .then(() => navigate("/admin/couriers"))
      .catch((err: unknown) => {
        setDeleteError(err instanceof ApiRequestError ? err.message : "Failed to delete courier.");
        setDeleteLoading(false);
      });
  };

  const handleAvailabilityToggle = () => {
    if (!courierId || !courier) return;
    setAvailabilityLoading(true);
    couriersService
      .updateAvailability(courierId, !courier.isAvailable)
      .then((res) => {
        setCourier((prev) => prev ? { ...prev, isAvailable: res.isAvailable } : prev);
      })
      .catch((err: unknown) => {
        const message = err instanceof ApiRequestError ? err.message : "Failed to update availability.";
        alert(message);
      })
      .finally(() => setAvailabilityLoading(false));
  };

  // ── Not found ──────────────────────────────────────────────────────────────

  if (notFound) {
    return (
      <>
        <PageMeta title="Courier Not Found | Buyology Dashboard" description="" />
        <div className="flex flex-col items-center justify-center py-32 text-center">
          <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" className="mb-4 text-gray-300 dark:text-gray-600">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 8v4l3 3" />
            <line x1="18" y1="11" x2="23" y2="16" />
            <line x1="23" y1="11" x2="18" y2="16" />
          </svg>
          <h1 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-1">Courier not found</h1>
          <p className="text-sm text-gray-400 dark:text-gray-500 mb-5">
            The courier you're looking for doesn't exist or the ID is invalid.
          </p>
          <button
            onClick={() => navigate("/admin/couriers")}
            className="rounded-xl border border-gray-200 dark:border-gray-700 px-5 py-2.5 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            ← Back to Couriers
          </button>
        </div>
      </>
    );
  }

  // ── Error ──────────────────────────────────────────────────────────────────

  if (error) {
    return (
      <>
        <PageMeta title="Error | Buyology Dashboard" description="" />
        <div className="flex flex-col items-center justify-center py-32 text-center">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mb-3 text-red-400">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <p className="text-sm font-medium text-red-600 dark:text-red-400 mb-4">{error}</p>
          <button
            onClick={() => navigate("/admin/couriers")}
            className="rounded-xl border border-gray-200 dark:border-gray-700 px-5 py-2.5 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            ← Back to Couriers
          </button>
        </div>
      </>
    );
  }

  return (
    <>
      <PageMeta
        title={courier ? `${fullName(courier.firstName, courier.lastName)} | Buyology Dashboard` : "Courier | Buyology Dashboard"}
        description="View and manage courier account details."
      />

      {/* Modals */}
      {showStatusModal && courier && (
        <StatusModal
          current={courier.accountStatus}
          onConfirm={handleStatusUpdate}
          onClose={() => { setShowStatusModal(false); setStatusError(null); }}
          loading={statusLoading}
        />
      )}
      {showDeleteModal && courier && (
        <DeleteModal
          name={fullName(courier.firstName, courier.lastName)}
          onConfirm={handleDelete}
          onClose={() => { setShowDeleteModal(false); setDeleteError(null); }}
          loading={deleteLoading}
        />
      )}

      {/* Back + title */}
      <div className="mb-5 flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 rounded-xl border border-gray-200 dark:border-gray-700 px-3 py-2 text-xs font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          Back
        </button>
        <h1 className="text-xl font-semibold text-gray-800 dark:text-white/90">
          {loading ? "Loading…" : fullName(courier?.firstName ?? "", courier?.lastName ?? "")}
        </h1>
      </div>

      {loading ? (
        <DetailSkeleton />
      ) : courier ? (
        <div className="space-y-6">

          {/* Inline errors */}
          {(statusError || deleteError) && (
            <div className="rounded-2xl border border-red-200 dark:border-red-800/40 bg-red-50 dark:bg-red-500/5 px-5 py-3">
              <p className="text-sm text-red-600 dark:text-red-400">{statusError ?? deleteError}</p>
            </div>
          )}

          {/* ── Section 1: Profile ─────────────────────────────────────── */}
          <SectionCard title="Profile">
            <div className="flex flex-col sm:flex-row gap-6">
              {/* Avatar */}
              <div className="flex-shrink-0">
                {courier.profileImageUrl ? (
                  <img
                    src={`${env.courierImageBaseUrl}${courier.profileImageUrl}`}
                    alt={fullName(courier.firstName, courier.lastName)}
                    className="h-20 w-20 rounded-full object-cover border-2 border-gray-100 dark:border-gray-700"
                  />
                ) : (
                  <div className="flex h-20 w-20 items-center justify-center rounded-full bg-brand-100 dark:bg-brand-500/20 text-brand-600 dark:text-brand-400 text-xl font-bold border-2 border-gray-100 dark:border-gray-700">
                    {initials(courier.firstName, courier.lastName)}
                  </div>
                )}
              </div>

              {/* Fields */}
              <div className="flex-1">
                <ProfileField
                  label="Full name"
                  value={<span className="font-medium text-gray-800 dark:text-white/90">{fullName(courier.firstName, courier.lastName)}</span>}
                />
                <ProfileField label="Phone" value={courier.phone} />
                <ProfileField
                  label="Email"
                  value={courier.email ?? <span className="italic text-gray-400 dark:text-gray-500">No email</span>}
                />
                <ProfileField
                  label="Status"
                  value={<Badge size="sm" color={statusBadgeColor(courier.accountStatus)}>{courier.accountStatus}</Badge>}
                />
                <ProfileField
                  label="Vehicle type"
                  value={<Badge size="sm" color={vehicleBadgeColor(courier.vehicleType)}>{courier.vehicleType}</Badge>}
                />
                <ProfileField label="Member since" value={formatDate(courier.createdAt)} />
              </div>
            </div>
          </SectionCard>

          {/* ── Section 2: Vehicle ─────────────────────────────────────── */}
          <SectionCard title="Vehicle Details">
            <ProfileField label="Vehicle type" value={courier.vehicleType} />
            {courier.vehicleMake && <ProfileField label="Make" value={courier.vehicleMake} />}
            {courier.vehicleModel && <ProfileField label="Model" value={courier.vehicleModel} />}
            {courier.vehicleYear && <ProfileField label="Year" value={String(courier.vehicleYear)} />}
            {courier.vehicleColor && <ProfileField label="Color" value={courier.vehicleColor} />}
            {courier.licensePlate && <ProfileField label="License plate" value={courier.licensePlate} />}
            {courier.vehicleRegistrationUrl && (
              <ProfileField
                label="Registration doc"
                value={
                  <a href={`${env.courierImageBaseUrl}${courier.vehicleRegistrationUrl}`} target="_blank" rel="noopener noreferrer" className="text-brand-500 hover:underline break-all">
                    View document
                  </a>
                }
              />
            )}
          </SectionCard>

          {/* ── Section 3: Driving Licence (conditional) ────────────────── */}
          {courier.requiresDrivingLicense && (
            <SectionCard title="Driving Licence">
              {courier.drivingLicenseNumber && (
                <ProfileField label="Licence number" value={courier.drivingLicenseNumber} />
              )}
              {courier.drivingLicenseExpiry && (
                <ProfileField label="Expiry date" value={courier.drivingLicenseExpiry} />
              )}
              {courier.drivingLicenceImageUrl && (
                <ProfileField
                  label="Licence image"
                  value={
                    <a href={`${env.courierImageBaseUrl}${courier.drivingLicenceImageUrl}`} target="_blank" rel="noopener noreferrer" className="text-brand-500 hover:underline">
                      View image
                    </a>
                  }
                />
              )}
            </SectionCard>
          )}

          {/* ── Actions ───────────────────────────────────────────────── */}
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => navigate(`/admin/couriers/${courierId}/edit`)}
              className="flex items-center gap-2 rounded-xl border border-gray-200 dark:border-gray-700 px-5 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
              Edit Profile
            </button>
            <button
              onClick={handleAvailabilityToggle}
              disabled={availabilityLoading}
              className={`flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-medium transition-colors disabled:opacity-40 ${
                courier.isAvailable
                  ? "border border-yellow-200 dark:border-yellow-800/40 text-yellow-600 dark:text-yellow-400 hover:bg-yellow-50 dark:hover:bg-yellow-500/5"
                  : "border border-green-200 dark:border-green-800/40 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-500/5"
              }`}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="1" />
                <path d="M12 2v6m0 4v6" />
              </svg>
              {courier.isAvailable ? "Mark Unavailable" : "Mark Available"}
            </button>
            <button
              onClick={() => setShowStatusModal(true)}
              className="flex items-center gap-2 rounded-xl border border-gray-200 dark:border-gray-700 px-5 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
              Update Status
            </button>
            <button
              onClick={() => setShowDeleteModal(true)}
              className="flex items-center gap-2 rounded-xl border border-red-200 dark:border-red-800/40 px-5 py-2.5 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/5 transition-colors"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6l-1 14H6L5 6" />
                <path d="M10 11v6M14 11v6" />
                <path d="M9 6V4h6v2" />
              </svg>
              Delete Courier
            </button>
          </div>

        </div>
      ) : null}
    </>
  );
}
