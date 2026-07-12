import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router";
import PageMeta from "../../components/common/PageMeta";
import Badge from "../../components/ui/badge/Badge";
import { usersService, ApiRequestError } from "../../api";
import {
  b2bMembershipService,
  type MembershipApplication,
  type ApplicationStatus,
} from "../../api/services/b2b-membership.service";
import ConvertToB2bModal from "./ConvertToB2bModal";
import { env } from "../../config/env";
import type { UserDetail as UserDetailType, UserStatus, UserType, CartItem } from "../../types";

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

function formatDob(dob: string): string {
  const [year, month, day] = dob.split("-");
  const date = new Date(Number(year), Number(month) - 1, Number(day));
  return new Intl.DateTimeFormat("en-US", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "AED",
    minimumFractionDigits: 2,
  }).format(amount);
}

type BadgeColor = "success" | "error" | "warning" | "info" | "light";

function statusBadgeColor(status: UserStatus): BadgeColor {
  return status === "ACTIVE" ? "success" : "error";
}

function typeBadgeColor(type: UserType): BadgeColor {
  return type === "ADMIN" ? "error" : "info";
}

function b2bStatusColor(status: ApplicationStatus): BadgeColor {
  switch (status) {
    case "APPROVED":
      return "success";
    case "PENDING":
      return "warning";
    case "UNDER_REVIEW":
      return "info";
    case "REJECTED":
      return "error";
    default:
      return "light";
  }
}

function b2bStatusLabel(status: ApplicationStatus): string {
  switch (status) {
    case "APPROVED":
      return "B2B Member";
    case "PENDING":
      return "Pending review";
    case "UNDER_REVIEW":
      return "Under review";
    case "REJECTED":
      return "Rejected";
    default:
      return status;
  }
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

// ---------------------------------------------------------------------------
// ConfirmDialog
// ---------------------------------------------------------------------------

function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  confirmColor,
  loading,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  confirmColor: string;
  loading: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
      <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 p-6 shadow-xl">
        <h3 className="text-base font-semibold text-gray-800 dark:text-white/90 mb-2">{title}</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">{message}</p>
        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            disabled={loading}
            className="rounded-xl border border-gray-200 dark:border-gray-700 px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={`rounded-xl px-4 py-2 text-sm font-medium text-white disabled:opacity-50 transition-colors ${confirmColor}`}
          >
            {loading ? "Please wait…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Toast
// ---------------------------------------------------------------------------

interface ToastItem {
  id: number;
  message: string;
  type: "success" | "error";
}

// ---------------------------------------------------------------------------
// Section Card wrapper
// ---------------------------------------------------------------------------

function SectionCard({
  title,
  children,
}: {
  title: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03] overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800">
        <h2 className="text-base font-semibold text-gray-800 dark:text-white/90">{title}</h2>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Profile field row
// ---------------------------------------------------------------------------

function ProfileField({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 py-2.5 border-b border-gray-100 dark:border-gray-800 last:border-0">
      <span className="w-full sm:w-36 flex-shrink-0 text-xs font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500">
        {label}
      </span>
      <span className="text-sm text-gray-700 dark:text-gray-300">{value}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Cart item row
// ---------------------------------------------------------------------------

function CartItemRow({ item }: { item: CartItem }) {
  return (
    <div className="rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-white/[0.02] p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-sm font-medium text-gray-800 dark:text-white/90">
            {item.productSku}
          </p>
          {item.variantSku && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Variant: {item.variantSku}
            </p>
          )}
        </div>
        <div className="text-right">
          <p className="text-sm font-semibold text-gray-800 dark:text-white/90">
            {formatCurrency(item.totalPrice)}
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500">
            {item.quantity} × {formatCurrency(item.unitPrice)}
          </p>
        </div>
      </div>
      {item.selectedSpecs.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {item.selectedSpecs.map((spec) => (
            <span
              key={spec.specOptionId}
              className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-2.5 py-1 text-xs text-gray-600 dark:text-gray-300"
            >
              {spec.colorCode && (
                <span
                  className="inline-block h-3 w-3 rounded-full border border-gray-200 dark:border-gray-600 flex-shrink-0"
                  style={{ backgroundColor: spec.colorCode }}
                />
              )}
              <span className="font-medium capitalize">{spec.groupCode}:</span>
              {spec.value}
              {spec.unit ? ` ${spec.unit}` : ""}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------

function DetailSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03] p-5">
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 rounded-full bg-gray-200 dark:bg-gray-700" />
          <div className="space-y-2">
            <div className="h-5 w-40 rounded-full bg-gray-200 dark:bg-gray-700" />
            <div className="h-3 w-28 rounded-full bg-gray-100 dark:bg-gray-800" />
          </div>
        </div>
        <div className="mt-5 space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-3 rounded-full bg-gray-100 dark:bg-gray-800" style={{ width: `${50 + (i % 3) * 15}%` }} />
          ))}
        </div>
      </div>
      <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03] p-5 space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-16 rounded-xl bg-gray-100 dark:bg-gray-800" />
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function UserDetail() {
  const { authCredentialId } = useParams<{ authCredentialId: string }>();
  const navigate = useNavigate();

  const [user, setUser] = useState<UserDetailType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  const [actionLoading, setActionLoading] = useState(false);
  const [confirmAction, setConfirmAction] = useState<"block" | "unblock" | null>(null);

  // B2B membership status for this user (derived from the applications list) + the
  // convert modal. Best-effort: the backend is the source of truth and guards duplicates.
  const [b2bApp, setB2bApp] = useState<MembershipApplication | null>(null);
  const [b2bLoading, setB2bLoading] = useState(true);
  const [convertOpen, setConvertOpen] = useState(false);

  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const toastIdRef = useRef(0);

  function showToast(message: string, type: "success" | "error") {
    const id = ++toastIdRef.current;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3500);
  }

  const loadUser = useCallback((id: string, signal?: AbortSignal) => {
    setLoading(true);
    setError(null);
    setNotFound(false);
    usersService
      .getById(id, signal)
      .then((res) => setUser(res.data))
      .catch((err: unknown) => {
        if (err instanceof Error && err.name === "AbortError") return;
        if (err instanceof ApiRequestError && err.statusCode === 404) {
          setNotFound(true);
        } else {
          setError(err instanceof ApiRequestError ? err.message : "Failed to load user.");
        }
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!authCredentialId) return;
    const controller = new AbortController();
    loadUser(authCredentialId, controller.signal);
    return () => controller.abort();
  }, [authCredentialId, loadUser]);

  // Once the user is loaded, resolve their B2B status by userId. The admin
  // applications list is small (admin-only) and mirrors how getApplication works.
  const userId = user?.userId;
  useEffect(() => {
    if (!userId) return;
    const controller = new AbortController();
    setB2bLoading(true);
    b2bMembershipService
      .listApplications(controller.signal)
      .then((res) => {
        setB2bApp((res.data ?? []).find((a) => a.userId === userId) ?? null);
      })
      .catch((err: unknown) => {
        if (err instanceof Error && err.name === "AbortError") return;
        // Non-fatal — fall back to allowing conversion; the backend blocks duplicates.
        setB2bApp(null);
      })
      .finally(() => setB2bLoading(false));
    return () => controller.abort();
  }, [userId]);

  async function handleBlockConfirm() {
    if (!user) return;
    setActionLoading(true);
    try {
      await usersService.blockUser(user.userId);
      setUser((prev) => (prev ? { ...prev, status: "SUSPENDED" } : prev));
      setConfirmAction(null);
      showToast("User blocked successfully.", "success");
    } catch (err) {
      setConfirmAction(null);
      if (err instanceof ApiRequestError && err.statusCode === 409) {
        showToast("This user is already blocked.", "error");
        if (authCredentialId) loadUser(authCredentialId);
      } else {
        showToast(
          err instanceof ApiRequestError ? err.message : "Failed to block user.",
          "error"
        );
      }
    } finally {
      setActionLoading(false);
    }
  }

  async function handleUnblockConfirm() {
    if (!user) return;
    setActionLoading(true);
    try {
      await usersService.unblockUser(user.userId);
      setUser((prev) => (prev ? { ...prev, status: "ACTIVE" } : prev));
      setConfirmAction(null);
      showToast("User unblocked successfully.", "success");
    } catch (err) {
      setConfirmAction(null);
      if (err instanceof ApiRequestError && err.statusCode === 409) {
        showToast("This user is already active.", "error");
        if (authCredentialId) loadUser(authCredentialId);
      } else {
        showToast(
          err instanceof ApiRequestError ? err.message : "Failed to unblock user.",
          "error"
        );
      }
    } finally {
      setActionLoading(false);
    }
  }

  // ── Not found ──────────────────────────────────────────────────────────────

  if (notFound) {
    return (
      <>
        <PageMeta title="User Not Found | Buyology Dashboard" description="" />
        <div className="flex flex-col items-center justify-center py-32 text-center">
          <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" className="mb-4 text-gray-300 dark:text-gray-600">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
            <line x1="18" y1="11" x2="23" y2="16" />
            <line x1="23" y1="11" x2="18" y2="16" />
          </svg>
          <h1 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-1">User not found</h1>
          <p className="text-sm text-gray-400 dark:text-gray-500 mb-5">
            The user you're looking for doesn't exist or the ID is invalid.
          </p>
          <button
            onClick={() => navigate("/admin/users")}
            className="rounded-xl border border-gray-200 dark:border-gray-700 px-5 py-2.5 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            ← Back to Users
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
            onClick={() => navigate("/admin/users")}
            className="rounded-xl border border-gray-200 dark:border-gray-700 px-5 py-2.5 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            ← Back to Users
          </button>
        </div>
      </>
    );
  }

  // ── Main ───────────────────────────────────────────────────────────────────

  return (
    <>
      <PageMeta
        title={user ? `${fullName(user.firstName, user.lastName)} | Buyology Dashboard` : "User | Buyology Dashboard"}
        description="View user profile, favorites, and active cart."
      />

      {/* Confirm dialog */}
      <ConfirmDialog
        open={confirmAction === "block"}
        title="Block Account"
        message="Blocking this account will immediately suspend the user and revoke all their active sessions. They will not be able to sign in until unblocked. Continue?"
        confirmLabel="Block Account"
        confirmColor="bg-red-500 hover:bg-red-600"
        loading={actionLoading}
        onConfirm={handleBlockConfirm}
        onCancel={() => setConfirmAction(null)}
      />
      <ConfirmDialog
        open={confirmAction === "unblock"}
        title="Unblock Account"
        message="This will restore the user's access. They will be able to sign in again immediately. Continue?"
        confirmLabel="Unblock Account"
        confirmColor="bg-brand-500 hover:bg-brand-600"
        loading={actionLoading}
        onConfirm={handleUnblockConfirm}
        onCancel={() => setConfirmAction(null)}
      />

      {/* Convert-to-B2B modal */}
      {convertOpen && user && (
        <ConvertToB2bModal
          user={{
            userId: user.userId,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            phoneNumber: user.phoneNumber,
          }}
          onClose={() => setConvertOpen(false)}
          onSuccess={(app) => {
            setB2bApp(app);
            setConvertOpen(false);
            showToast("B2B application created and sent to the review queue.", "success");
          }}
        />
      )}

      {/* Toast notifications */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 items-end">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`rounded-xl px-4 py-3 text-sm font-medium shadow-lg text-white transition-all ${
              t.type === "success" ? "bg-green-500" : "bg-red-500"
            }`}
          >
            {t.message}
          </div>
        ))}
      </div>

      {/* Back button + title */}
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
          {loading ? "Loading…" : fullName(user?.firstName ?? null, user?.lastName ?? null)}
        </h1>
      </div>

      {loading ? (
        <DetailSkeleton />
      ) : user ? (
        <div className="space-y-6">

          {/* ── Section 1: Profile ─────────────────────────────────────────── */}
          <SectionCard title="Profile">
            <div className="flex flex-col sm:flex-row gap-6">
              {/* Avatar */}
              <div className="flex-shrink-0">
                {user.avatarUrl ? (
                  <img
                    src={`${env.apiBaseUrl}${user.avatarUrl}`}
                    alt={fullName(user.firstName, user.lastName)}
                    className="h-20 w-20 rounded-full object-cover border-2 border-gray-100 dark:border-gray-700"
                  />
                ) : (
                  <div className="flex h-20 w-20 items-center justify-center rounded-full bg-brand-100 dark:bg-brand-500/20 text-brand-600 dark:text-brand-400 text-xl font-bold border-2 border-gray-100 dark:border-gray-700">
                    {initials(user.firstName, user.lastName)}
                  </div>
                )}
              </div>

              {/* Fields */}
              <div className="flex-1">
                <ProfileField
                  label="Full name"
                  value={
                    <span className="font-medium text-gray-800 dark:text-white/90">
                      {fullName(user.firstName, user.lastName)}
                    </span>
                  }
                />
                <ProfileField
                  label="Email"
                  value={user.email ?? <span className="italic text-gray-400 dark:text-gray-500">No email</span>}
                />
                <ProfileField
                  label="Phone"
                  value={user.phoneNumber ?? "—"}
                />
                <ProfileField
                  label="Date of birth"
                  value={user.dateOfBirth ? formatDob(user.dateOfBirth) : "—"}
                />
                <ProfileField
                  label="User type"
                  value={
                    <Badge size="sm" color={typeBadgeColor(user.userType)}>
                      {user.userType}
                    </Badge>
                  }
                />
                <ProfileField
                  label="Status"
                  value={
                    <Badge size="sm" color={statusBadgeColor(user.status)}>
                      {user.status}
                    </Badge>
                  }
                />
                <ProfileField
                  label="Member since"
                  value={formatDate(user.joinedAt)}
                />
                <ProfileField
                  label="Registration IP"
                  value={
                    user.registrationIp ? (
                      <code className="font-mono text-xs bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">
                        {user.registrationIp}
                      </code>
                    ) : (
                      "—"
                    )
                  }
                />
                <ProfileField
                  label="Device"
                  value={
                    user.registrationDevice ? (
                      <span
                        title={user.registrationDevice}
                        className="truncate block max-w-sm cursor-help"
                      >
                        {user.registrationDevice.length > 80
                          ? `${user.registrationDevice.slice(0, 80)}…`
                          : user.registrationDevice}
                      </span>
                    ) : (
                      "—"
                    )
                  }
                />
              </div>
            </div>
          </SectionCard>

          {/* ── Section 2: Account Actions ─────────────────────────────────── */}
          <SectionCard title="Account Actions">
            {user.status === "ACTIVE" ? (
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Block Account</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                    Suspends the user and revokes all active sessions immediately.
                  </p>
                </div>
                <button
                  onClick={() => setConfirmAction("block")}
                  className="flex-shrink-0 rounded-xl border border-red-200 dark:border-red-800/50 bg-red-50 dark:bg-red-500/10 px-4 py-2 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-500/20 transition-colors"
                >
                  Block Account
                </button>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Unblock Account</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                    Restores the user's access so they can sign in again.
                  </p>
                </div>
                <button
                  onClick={() => setConfirmAction("unblock")}
                  className="flex-shrink-0 rounded-xl border border-brand-200 dark:border-brand-800/50 bg-brand-50 dark:bg-brand-500/10 px-4 py-2 text-sm font-medium text-brand-600 dark:text-brand-400 hover:bg-brand-100 dark:hover:bg-brand-500/20 transition-colors"
                >
                  Unblock Account
                </button>
              </div>
            )}
          </SectionCard>

          {/* ── Section 2b: B2B Membership ─────────────────────────────────── */}
          <SectionCard title="B2B Membership">
            {b2bLoading ? (
              <p className="text-sm text-gray-400 dark:text-gray-500">Checking B2B status…</p>
            ) : b2bApp && b2bApp.status !== "REJECTED" ? (
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {b2bApp.companyName}
                    </p>
                    <Badge size="sm" color={b2bStatusColor(b2bApp.status)}>
                      {b2bStatusLabel(b2bApp.status)}
                    </Badge>
                  </div>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                    {b2bApp.status === "APPROVED"
                      ? "This user is an active B2B member."
                      : "A B2B application for this user is in the review queue."}
                  </p>
                </div>
                <button
                  onClick={() => navigate(`/b2b-applications/${b2bApp.id}`)}
                  className="flex-shrink-0 rounded-xl border border-gray-200 dark:border-gray-700 px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  View application
                </button>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Convert to B2B</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                    {b2bApp?.status === "REJECTED"
                      ? "A previous application was rejected. You can submit a new one with the business details."
                      : "Turn this customer into a B2B member by adding their company details and trade license."}
                  </p>
                </div>
                <button
                  onClick={() => setConvertOpen(true)}
                  className="flex-shrink-0 rounded-xl border border-brand-200 dark:border-brand-800/50 bg-brand-50 dark:bg-brand-500/10 px-4 py-2 text-sm font-medium text-brand-600 dark:text-brand-400 hover:bg-brand-100 dark:hover:bg-brand-500/20 transition-colors"
                >
                  Convert to B2B
                </button>
              </div>
            )}
          </SectionCard>

          {/* ── Section 3: Favorites ───────────────────────────────────────── */}
          <SectionCard
            title={
              <span>
                Favorites{" "}
                <span className="ml-1 text-sm font-normal text-gray-400 dark:text-gray-500">
                  ({user.favorites.total})
                </span>
              </span>
            }
          >
            {user.favorites.total === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" className="mb-3 text-gray-300 dark:text-gray-600">
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                </svg>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  This user has no saved products.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-gray-100 dark:border-gray-800">
                      <th className="pb-2 pr-6 text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                        Product SKU
                      </th>
                      <th className="pb-2 text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                        Saved On
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {user.favorites.items.map((item) => (
                      <tr
                        key={item.id}
                        className="border-b border-gray-100 dark:border-gray-800 last:border-0"
                      >
                        <td className="py-2.5 pr-6">
                          <span className="text-sm font-mono text-brand-600 dark:text-brand-400">
                            {item.productSku}
                          </span>
                        </td>
                        <td className="py-2.5">
                          <span className="text-sm text-gray-500 dark:text-gray-400">
                            {formatDate(item.savedAt)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </SectionCard>

          {/* ── Section 4: Active Cart ─────────────────────────────────────── */}
          <SectionCard
            title={
              <span>
                Active Cart{" "}
                {user.activeCart && (
                  <span className="ml-1 text-sm font-normal text-gray-400 dark:text-gray-500">
                    ({user.activeCart.items.length}{" "}
                    {user.activeCart.items.length === 1 ? "item" : "items"})
                  </span>
                )}
              </span>
            }
          >
            {!user.activeCart ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" className="mb-3 text-gray-300 dark:text-gray-600">
                  <circle cx="9" cy="21" r="1" />
                  <circle cx="20" cy="21" r="1" />
                  <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
                </svg>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  This user has no active cart.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {user.activeCart.items.map((item) => (
                  <CartItemRow key={item.id} item={item} />
                ))}
                <div className="flex items-center justify-between rounded-xl bg-brand-50 dark:bg-brand-500/10 px-4 py-3 mt-2">
                  <span className="text-sm font-semibold text-brand-700 dark:text-brand-400">
                    Cart Total
                  </span>
                  <span className="text-lg font-bold text-brand-700 dark:text-brand-400">
                    {formatCurrency(user.activeCart.totalPrice)}
                  </span>
                </div>
              </div>
            )}
          </SectionCard>

        </div>
      ) : null}
    </>
  );
}
