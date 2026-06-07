import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router";
import PageMeta from "../../components/common/PageMeta";
import Badge from "../../components/ui/badge/Badge";
import { usersService, ApiRequestError } from "../../api";
import { rolesService } from "../../api/services/roles.service";
import { mfaService } from "../../api/services/mfa.service";
import { isSuperAdmin } from "../../auth/roles";
import { getUserIdFromToken } from "../../api";
import type { UserDetail } from "../../types";
import type { Role, Permission, UserRole, UserPermissionOverride } from "../../types/roles.types";
import { ROLE_PERMISSIONS } from "../../types/roles.types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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
// Sub-components
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

function Spinner() {
  return (
    <svg
      className="animate-spin h-4 w-4 text-brand-500"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
}

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
      </div>
      <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03] p-5 space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-10 rounded-xl bg-gray-100 dark:bg-gray-800" />
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Confirm dialog (simple inline)
// ---------------------------------------------------------------------------

function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  confirmColor,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  confirmColor: string;
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
            className="rounded-xl border border-gray-200 dark:border-gray-700 px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className={`rounded-xl px-4 py-2 text-sm font-medium text-white transition-colors ${confirmColor}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Toast
// ---------------------------------------------------------------------------

interface Toast {
  id: number;
  message: string;
  type: "success" | "error";
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function AdminDetail() {
  const { authCredentialId } = useParams<{ authCredentialId: string }>();
  const navigate = useNavigate();

  // ── User data ──────────────────────────────────────────────────────────────
  const [user, setUser] = useState<UserDetail | null>(null);
  const [userLoading, setUserLoading] = useState(true);
  const [userError, setUserError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  // ── Reference data ─────────────────────────────────────────────────────────
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [refLoading, setRefLoading] = useState(true);

  // ── User assignments ───────────────────────────────────────────────────────
  const [userRoles, setUserRoles] = useState<UserRole[]>([]);
  const [userPermissions, setUserPermissions] = useState<UserPermissionOverride[]>([]);
  const [accessLoading, setAccessLoading] = useState(false);

  // ── Mutation loading per role / permission ─────────────────────────────────
  const [roleLoading, setRoleLoading] = useState<Record<string, boolean>>({});
  const [permLoading, setPermLoading] = useState<Record<string, boolean>>({});

  // ── Confirm dialog ─────────────────────────────────────────────────────────
  const [confirm, setConfirm] = useState<{
    open: boolean;
    title: string;
    message: string;
    confirmLabel: string;
    confirmColor: string;
    onConfirm: () => void;
  }>({
    open: false,
    title: "",
    message: "",
    confirmLabel: "",
    confirmColor: "bg-brand-500 hover:bg-brand-600",
    onConfirm: () => {},
  });

  // ── Toasts ─────────────────────────────────────────────────────────────────
  const [toasts, setToasts] = useState<Toast[]>([]);
  let toastId = 0;

  function showToast(message: string, type: "success" | "error") {
    const id = ++toastId;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3500);
  }

  // ── Load user detail ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!authCredentialId) return;
    const controller = new AbortController();
    setUserLoading(true);
    setUserError(null);
    setNotFound(false);

    usersService
      .getById(authCredentialId, controller.signal)
      .then((res) => setUser(res.data))
      .catch((err: unknown) => {
        if (err instanceof Error && err.name === "AbortError") return;
        if (err instanceof ApiRequestError && err.statusCode === 404) {
          setNotFound(true);
        } else {
          setUserError(
            err instanceof ApiRequestError ? err.message : "Failed to load admin user."
          );
        }
      })
      .finally(() => setUserLoading(false));

    return () => controller.abort();
  }, [authCredentialId]);

  // ── Load reference data (roles + permissions) ──────────────────────────────
  useEffect(() => {
    const controller = new AbortController();
    setRefLoading(true);

    Promise.all([
      rolesService.getAllRoles(controller.signal),
      rolesService.getAllPermissions(controller.signal),
    ])
      .then(([rolesRes, permsRes]) => {
        setRoles(rolesRes.data);
        setPermissions(permsRes.data);
      })
      .catch((err: unknown) => {
        if (err instanceof Error && err.name === "AbortError") return;
      })
      .finally(() => setRefLoading(false));

    return () => controller.abort();
  }, []);

  // ── Load user's current assignments ───────────────────────────────────────
  const loadUserAccess = (userId: string) => {
    setAccessLoading(true);
    Promise.all([
      rolesService.getUserRoles(userId),
      rolesService.getUserPermissions(userId),
    ])
      .then(([rolesRes, permsRes]) => {
        setUserRoles(rolesRes.data);
        setUserPermissions(permsRes.data);
      })
      .catch(() => {})
      .finally(() => setAccessLoading(false));
  };

  useEffect(() => {
    if (user?.userId) {
      loadUserAccess(user.userId);
    }
  }, [user?.userId]);

  // ── Derived state ──────────────────────────────────────────────────────────
  const assignedRoleIds = useMemo(
    () => new Set(userRoles.map((r) => r.roleId)),
    [userRoles]
  );

  const superadminRole = useMemo(
    () => roles.find((r) => r.name === "SUPERADMIN"),
    [roles]
  );

  const hasSuperadmin = superadminRole ? assignedRoleIds.has(superadminRole.id) : false;

  const effectivePermissions = useMemo(() => {
    const fromRoles = new Set<string>(
      roles
        .filter((r) => assignedRoleIds.has(r.id))
        .flatMap((r) => ROLE_PERMISSIONS[r.name] ?? [])
    );
    userPermissions.forEach(({ permissionCode, effect }) => {
      if (effect === "DENY") fromRoles.delete(permissionCode);
      if (effect === "ALLOW") fromRoles.add(permissionCode);
    });
    return fromRoles;
  }, [assignedRoleIds, userPermissions, roles]);

  // ── Role actions ───────────────────────────────────────────────────────────
  const assignRole = async (roleId: string) => {
    if (!user) return;
    setRoleLoading((prev) => ({ ...prev, [roleId]: true }));
    try {
      await rolesService.assignRole({
        userId: user.userId,
        roleId,
        assignedBy: getUserIdFromToken() ?? undefined,
      });
      await loadUserAccess(user.userId);
      showToast("Role assigned.", "success");
    } catch (err: unknown) {
      if (err instanceof ApiRequestError && err.statusCode === 409) {
        // already assigned — refresh silently
        await loadUserAccess(user.userId);
      } else {
        showToast(
          err instanceof ApiRequestError ? err.message : "Failed to assign role.",
          "error"
        );
      }
    } finally {
      setRoleLoading((prev) => ({ ...prev, [roleId]: false }));
    }
  };

  const removeRole = async (roleId: string) => {
    if (!user) return;
    setRoleLoading((prev) => ({ ...prev, [roleId]: true }));
    try {
      await rolesService.removeRole(user.userId, roleId);
      await loadUserAccess(user.userId);
      showToast("Role removed.", "success");
    } catch (err: unknown) {
      showToast(
        err instanceof ApiRequestError ? err.message : "Failed to remove role.",
        "error"
      );
    } finally {
      setRoleLoading((prev) => ({ ...prev, [roleId]: false }));
    }
  };

  const grantFullAccess = () => {
    if (!superadminRole) return;
    setConfirm({
      open: true,
      title: "Grant Full Access",
      message:
        "This will assign the SUPERADMIN role, giving unrestricted access to all modules. Are you sure?",
      confirmLabel: "Grant Full Access",
      confirmColor: "bg-yellow-500 hover:bg-yellow-600",
      onConfirm: async () => {
        setConfirm((prev) => ({ ...prev, open: false }));
        await assignRole(superadminRole.id);
      },
    });
  };

  const revokeFullAccess = () => {
    if (!superadminRole) return;
    setConfirm({
      open: true,
      title: "Revoke Full Access",
      message: "This will remove the SUPERADMIN role from this user.",
      confirmLabel: "Revoke",
      confirmColor: "bg-red-500 hover:bg-red-600",
      onConfirm: async () => {
        setConfirm((prev) => ({ ...prev, open: false }));
        await removeRole(superadminRole.id);
      },
    });
  };

  // ── Two-factor reset (SUPERADMIN only) ──────────────────────────────────────
  const [mfaResetBusy, setMfaResetBusy] = useState(false);

  const resetMfa = () => {
    if (!user) return;
    setConfirm({
      open: true,
      title: "Reset two-factor authentication",
      message:
        "This wipes the user's Google Authenticator enrollment and recovery codes. They will be " +
        "forced to set up 2FA again on their next sign-in. Use this for lost-device recovery.",
      confirmLabel: "Reset 2FA",
      confirmColor: "bg-red-500 hover:bg-red-600",
      onConfirm: async () => {
        setConfirm((prev) => ({ ...prev, open: false }));
        setMfaResetBusy(true);
        try {
          const res = await mfaService.resetUserMfa(user.userId);
          showToast(res.message || "Two-factor authentication reset.", "success");
        } catch (err: unknown) {
          showToast(
            err instanceof ApiRequestError ? err.message : "Failed to reset 2FA.",
            "error"
          );
        } finally {
          setMfaResetBusy(false);
        }
      },
    });
  };

  // ── Permission override actions ────────────────────────────────────────────
  const setPermissionOverride = async (
    permissionId: string,
    effect: "ALLOW" | "DENY"
  ) => {
    if (!user) return;
    setPermLoading((prev) => ({ ...prev, [permissionId]: true }));
    try {
      // If an override already exists, remove it first then re-assign
      const existing = userPermissions.find((p) => p.permissionId === permissionId);
      if (existing) {
        await rolesService.removePermission(user.userId, permissionId);
      }
      await rolesService.assignPermission({
        userId: user.userId,
        permissionId,
        effect,
        assignedBy: getUserIdFromToken() ?? undefined,
      });
      await loadUserAccess(user.userId);
      showToast(`Permission ${effect === "ALLOW" ? "allowed" : "denied"}.`, "success");
    } catch (err: unknown) {
      showToast(
        err instanceof ApiRequestError ? err.message : "Failed to update permission.",
        "error"
      );
    } finally {
      setPermLoading((prev) => ({ ...prev, [permissionId]: false }));
    }
  };

  const clearPermissionOverride = async (permissionId: string) => {
    if (!user) return;
    setPermLoading((prev) => ({ ...prev, [permissionId]: true }));
    try {
      await rolesService.removePermission(user.userId, permissionId);
      await loadUserAccess(user.userId);
      showToast("Override cleared.", "success");
    } catch (err: unknown) {
      showToast(
        err instanceof ApiRequestError ? err.message : "Failed to clear override.",
        "error"
      );
    } finally {
      setPermLoading((prev) => ({ ...prev, [permissionId]: false }));
    }
  };

  // ── Group permissions by module ────────────────────────────────────────────
  const permissionsByModule = useMemo(() => {
    const groups: Record<string, Permission[]> = {};
    permissions.forEach((p) => {
      const module = p.code.split(":")[0];
      const label =
        module === "review"
          ? "Reviews"
          : module === "question"
          ? "Questions"
          : module === "courier"
          ? "Courier"
          : module === "store"
          ? "Store"
          : module;
      if (!groups[label]) groups[label] = [];
      groups[label].push(p);
    });
    return groups;
  }, [permissions]);

  // ── Not found ──────────────────────────────────────────────────────────────
  if (notFound) {
    return (
      <>
        <PageMeta title="Admin Not Found | Buyology Dashboard" description="" />
        <div className="flex flex-col items-center justify-center py-32 text-center">
          <p className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-1">
            Admin user not found
          </p>
          <button
            onClick={() => navigate("/admin/admins")}
            className="mt-4 rounded-xl border border-gray-200 dark:border-gray-700 px-5 py-2.5 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            ← Back to Admins
          </button>
        </div>
      </>
    );
  }

  if (userError) {
    return (
      <>
        <PageMeta title="Error | Buyology Dashboard" description="" />
        <div className="flex flex-col items-center justify-center py-32 text-center">
          <p className="text-sm font-medium text-red-600 dark:text-red-400 mb-4">{userError}</p>
          <button
            onClick={() => navigate("/admin/admins")}
            className="rounded-xl border border-gray-200 dark:border-gray-700 px-5 py-2.5 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            ← Back to Admins
          </button>
        </div>
      </>
    );
  }

  const isLoading = userLoading || refLoading;

  return (
    <>
      <PageMeta
        title={
          user
            ? `${fullName(user.firstName, user.lastName)} — Roles | Buyology Dashboard`
            : "Admin | Buyology Dashboard"
        }
        description="Manage roles and permissions for this admin user."
      />

      {/* Confirm dialog */}
      <ConfirmDialog
        {...confirm}
        onCancel={() => setConfirm((prev) => ({ ...prev, open: false }))}
      />

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

      {/* Back + title */}
      <div className="mb-5 flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 rounded-xl border border-gray-200 dark:border-gray-700 px-3 py-2 text-xs font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          Back
        </button>
        <h1 className="text-xl font-semibold text-gray-800 dark:text-white/90">
          {isLoading
            ? "Loading…"
            : `${fullName(user?.firstName ?? null, user?.lastName ?? null)} — Roles & Permissions`}
        </h1>
      </div>

      {isLoading ? (
        <DetailSkeleton />
      ) : user ? (
        <div className="space-y-6">
          {/* ── Profile card ───────────────────────────────────────────────── */}
          <SectionCard title="Profile">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full bg-brand-100 dark:bg-brand-500/20 text-brand-600 dark:text-brand-400 text-lg font-bold">
                {initials(user.firstName, user.lastName)}
              </div>
              <div>
                <p className="text-base font-semibold text-gray-800 dark:text-white/90">
                  {fullName(user.firstName, user.lastName)}
                </p>
                <p className="text-sm text-gray-400 dark:text-gray-500">{user.email ?? "—"}</p>
              </div>
              <div className="ml-auto">
                <Badge size="sm" color={user.status === "ACTIVE" ? "success" : "error"}>
                  {user.status}
                </Badge>
              </div>
            </div>
          </SectionCard>

          {/* ── Roles ─────────────────────────────────────────────────────── */}
          <SectionCard
            title={
              <span className="flex items-center gap-2">
                Roles
                {accessLoading && <Spinner />}
              </span>
            }
          >
            <div className="space-y-3">
              {/* Role checkboxes */}
              {roles.map((role) => {
                const checked = assignedRoleIds.has(role.id);
                const busy = roleLoading[role.id] ?? false;
                return (
                  <label
                    key={role.id}
                    className={`flex items-start gap-3 rounded-xl border p-4 cursor-pointer transition-colors ${
                      checked
                        ? "border-brand-300 dark:border-brand-500 bg-brand-50 dark:bg-brand-500/10"
                        : "border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-white/[0.02]"
                    }`}
                  >
                    <div className="relative mt-0.5 flex-shrink-0">
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={busy}
                        onChange={(e) => {
                          if (e.target.checked) {
                            assignRole(role.id);
                          } else {
                            removeRole(role.id);
                          }
                        }}
                        className="h-4 w-4 rounded border-gray-300 text-brand-500 focus:ring-brand-500 cursor-pointer"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-gray-800 dark:text-white/90">
                          {role.name}
                        </span>
                        {role.isSystem && (
                          <span className="rounded-full bg-gray-100 dark:bg-gray-800 px-2 py-0.5 text-xs text-gray-500 dark:text-gray-400">
                            system
                          </span>
                        )}
                        {busy && <Spinner />}
                      </div>
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                        {role.description}
                      </p>
                    </div>
                  </label>
                );
              })}

              {/* Effective permissions summary */}
              {effectivePermissions.size > 0 && (
                <div className="mt-4 rounded-xl bg-gray-50 dark:bg-white/[0.02] border border-gray-100 dark:border-gray-800 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-2">
                    Effective Permissions ({effectivePermissions.size})
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {Array.from(effectivePermissions).map((code) => (
                      <span
                        key={code}
                        className="rounded-full bg-brand-100 dark:bg-brand-500/20 px-2.5 py-0.5 text-xs font-mono text-brand-700 dark:text-brand-400"
                      >
                        {code}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Grant / Revoke Full Access */}
              <div className="mt-4 rounded-xl border border-yellow-200 dark:border-yellow-500/30 bg-yellow-50 dark:bg-yellow-500/10 p-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-yellow-800 dark:text-yellow-300">
                      Full Access (SUPERADMIN)
                    </p>
                    <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-0.5">
                      Grants unrestricted access to every module. Use with caution.
                    </p>
                  </div>
                  {hasSuperadmin ? (
                    <button
                      onClick={revokeFullAccess}
                      disabled={roleLoading[superadminRole?.id ?? ""] ?? false}
                      className="flex-shrink-0 rounded-xl bg-red-500 hover:bg-red-600 disabled:opacity-50 px-4 py-2 text-sm font-medium text-white transition-colors flex items-center gap-2"
                    >
                      {(roleLoading[superadminRole?.id ?? ""] ?? false) && <Spinner />}
                      Revoke Full Access
                    </button>
                  ) : (
                    <button
                      onClick={grantFullAccess}
                      disabled={roleLoading[superadminRole?.id ?? ""] ?? false}
                      className="flex-shrink-0 rounded-xl bg-yellow-500 hover:bg-yellow-600 disabled:opacity-50 px-4 py-2 text-sm font-medium text-white transition-colors flex items-center gap-2"
                    >
                      {(roleLoading[superadminRole?.id ?? ""] ?? false) && <Spinner />}
                      ⚡ Grant Full Access
                    </button>
                  )}
                </div>
              </div>
            </div>
          </SectionCard>

          {/* ── Two-factor (SUPERADMIN only) ───────────────────────────────── */}
          {isSuperAdmin() && (
            <SectionCard title="Two-Factor Authentication">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-gray-800 dark:text-white/90">
                    Reset Google Authenticator
                  </p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                    Removes this user's 2FA enrollment and recovery codes. They must re-enroll on
                    their next sign-in. Use for lost-device recovery.
                  </p>
                </div>
                <button
                  onClick={resetMfa}
                  disabled={mfaResetBusy}
                  className="flex-shrink-0 rounded-xl bg-red-500 hover:bg-red-600 disabled:opacity-50 px-4 py-2 text-sm font-medium text-white transition-colors flex items-center gap-2"
                >
                  {mfaResetBusy && <Spinner />}
                  Reset 2FA
                </button>
              </div>
            </SectionCard>
          )}

          {/* ── Permission Overrides ───────────────────────────────────────── */}
          <SectionCard
            title={
              <span className="flex items-center gap-2">
                Permission Overrides
                {accessLoading && <Spinner />}
              </span>
            }
          >
            <p className="text-xs text-gray-400 dark:text-gray-500 mb-4">
              Grant or deny individual permissions directly, regardless of assigned roles.
              <span className="ml-1 font-medium text-green-600 dark:text-green-400">ALLOW</span> adds a permission;{" "}
              <span className="ml-1 font-medium text-red-600 dark:text-red-400">DENY</span> removes it.
            </p>

            <div className="space-y-6">
              {Object.entries(permissionsByModule).map(([module, perms]) => (
                <div key={module}>
                  <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
                    {module}
                  </h3>
                  <div className="space-y-1.5">
                    {perms.map((perm) => {
                      const override = userPermissions.find(
                        (p) => p.permissionId === perm.id
                      );
                      const busy = permLoading[perm.id] ?? false;
                      const fromRole = effectivePermissions.has(perm.code) && !override;

                      return (
                        <div
                          key={perm.id}
                          className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-white/[0.02] px-4 py-2.5"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <span className="font-mono text-xs text-gray-600 dark:text-gray-300 truncate">
                              {perm.code}
                            </span>
                            {fromRole && !override && (
                              <span className="rounded-full bg-brand-100 dark:bg-brand-500/20 px-2 py-0.5 text-xs text-brand-600 dark:text-brand-400 flex-shrink-0">
                                via role
                              </span>
                            )}
                            {override?.effect === "ALLOW" && (
                              <span className="rounded-full bg-green-100 dark:bg-green-500/20 px-2 py-0.5 text-xs font-medium text-green-700 dark:text-green-400 flex-shrink-0">
                                ALLOW
                              </span>
                            )}
                            {override?.effect === "DENY" && (
                              <span className="rounded-full bg-red-100 dark:bg-red-500/20 px-2 py-0.5 text-xs font-medium text-red-700 dark:text-red-400 flex-shrink-0">
                                DENY
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            {busy ? (
                              <Spinner />
                            ) : (
                              <>
                                <button
                                  onClick={() => setPermissionOverride(perm.id, "ALLOW")}
                                  disabled={override?.effect === "ALLOW"}
                                  className="rounded-lg border border-green-300 dark:border-green-500/50 bg-white dark:bg-transparent px-2.5 py-1 text-xs font-medium text-green-700 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-500/10 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                >
                                  Allow
                                </button>
                                <button
                                  onClick={() => setPermissionOverride(perm.id, "DENY")}
                                  disabled={override?.effect === "DENY"}
                                  className="rounded-lg border border-red-300 dark:border-red-500/50 bg-white dark:bg-transparent px-2.5 py-1 text-xs font-medium text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                >
                                  Deny
                                </button>
                                {override && (
                                  <button
                                    onClick={() => clearPermissionOverride(perm.id)}
                                    className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-transparent px-2.5 py-1 text-xs font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                                  >
                                    Clear
                                  </button>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}

              {permissions.length === 0 && (
                <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-6">
                  No permissions loaded.
                </p>
              )}
            </div>
          </SectionCard>
        </div>
      ) : null}
    </>
  );
}
