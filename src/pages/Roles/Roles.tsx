import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Navigate, useNavigate } from "react-router";
import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import Badge from "../../components/ui/badge/Badge";
import { rolesService } from "../../api/services/roles.service";
import { ApiRequestError } from "../../api";
import { isSuperAdmin } from "../../auth/roles";
import type { Role, Permission, RoleHolder } from "../../types/roles.types";

// ─── Styles (match the dashboard's form conventions — see Admins/NewAdmin.tsx) ───

const inputClass =
  "w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-2.5 text-sm text-gray-800 dark:text-white placeholder-gray-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-400/20 transition-all";

const cardClass =
  "rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03]";

// ─── Helpers ────────────────────────────────────────────────────────────────

/** "store:product:assign" → module "store", so the matrix can group by area. */
function moduleOf(code: string): string {
  const head = code.split(":")[0] ?? "other";
  return head.charAt(0).toUpperCase() + head.slice(1);
}

/** "store:product:assign" → "Product assign" — the part that varies within a module. */
function actionOf(code: string): string {
  const parts = code.split(":").slice(1);
  if (parts.length === 0) return code;
  const label = parts.join(" ").replace(/[-_]/g, " ");
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function roleLabel(name: string): string {
  return name.replace(/_/g, " ");
}

function holderName(holder: RoleHolder): string {
  const name = [holder.firstName, holder.lastName].filter(Boolean).join(" ");
  return name || holder.email || "Unknown";
}

function errorMessage(err: unknown, fallback: string): string {
  if (err instanceof ApiRequestError) return err.message;
  return fallback;
}

function isAbort(err: unknown): boolean {
  return err instanceof Error && err.name === "AbortError";
}

// ─── Confirm dialog ─────────────────────────────────────────────────────────

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

// ─── Role create / edit modal ───────────────────────────────────────────────

function RoleFormModal({
  open,
  role,
  onClose,
  onSaved,
}: {
  open: boolean;
  role: Role | null;
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setName(role?.name ?? "");
    setDescription(role?.description ?? "");
    setError(null);
    setSubmitting(false);
  }, [open, role]);

  if (!open) return null;

  const editing = role !== null;
  const nameLocked = editing && (role.locked || role.isSystem);

  function submit() {
    const trimmed = name.trim();
    if (!nameLocked && trimmed.length < 2) {
      setError("Role name must be at least 2 characters.");
      return;
    }
    setSubmitting(true);
    setError(null);

    const request = editing
      ? rolesService.updateRole(role.id, {
          ...(nameLocked ? {} : { name: trimmed }),
          description: description.trim(),
        })
      : rolesService.createRole({ name: trimmed, description: description.trim() });

    request
      .then(() => onSaved(editing ? "Role updated." : "Role created."))
      .catch((err: unknown) =>
        setError(errorMessage(err, editing ? "Failed to update role." : "Failed to create role."))
      )
      .finally(() => setSubmitting(false));
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 backdrop-blur-sm px-4 py-8"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !submitting) onClose();
      }}
    >
      <div className="w-full max-w-lg rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-xl">
        <div className="flex items-start justify-between gap-4 border-b border-gray-100 dark:border-gray-800 px-6 py-4">
          <div>
            <h3 className="text-base font-semibold text-gray-800 dark:text-white/90">
              {editing ? `Edit ${roleLabel(role.name)}` : "New role"}
            </h3>
            <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
              {editing
                ? "Update the role's name and description."
                : "Create a custom role, then grant it permissions from the matrix."}
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={submitting}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 disabled:opacity-50"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {error && (
            <div className="rounded-xl border border-red-200 dark:border-red-800/40 bg-red-50 dark:bg-red-500/10 px-4 py-3 text-sm text-red-600 dark:text-red-400">
              {error}
            </div>
          )}

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Name {!nameLocked && <span className="text-red-500">*</span>}
            </label>
            <input
              className={inputClass}
              value={name}
              disabled={nameLocked}
              onChange={(e) => setName(e.target.value.toUpperCase())}
              placeholder="CONTENT_EDITOR"
            />
            <p className="mt-1.5 text-xs text-gray-400 dark:text-gray-500">
              {nameLocked
                ? "Built-in roles cannot be renamed — access checks across the platform reference them by name."
                : "Letters, numbers and underscores. Saved in upper case."}
            </p>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Description
            </label>
            <textarea
              className={`${inputClass} min-h-[80px] resize-y`}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What this role is allowed to do"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-gray-100 dark:border-gray-800 px-6 py-4">
          <button
            onClick={onClose}
            disabled={submitting}
            className="rounded-xl border border-gray-200 dark:border-gray-700 px-4 py-2.5 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={submitting}
            className="rounded-xl bg-brand-500 hover:bg-brand-600 px-6 py-2.5 text-sm font-semibold text-white disabled:opacity-50 transition-colors"
          >
            {submitting ? "Saving…" : editing ? "Save changes" : "Create role"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Permission create modal ────────────────────────────────────────────────

function PermissionFormModal({
  open,
  onClose,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setCode("");
    setDescription("");
    setError(null);
    setSubmitting(false);
  }, [open]);

  if (!open) return null;

  function submit() {
    const trimmed = code.trim().toLowerCase();
    if (!/^[a-z][a-z0-9]*(:[a-z0-9]+)+$/.test(trimmed)) {
      setError("Use lower-case colon-separated segments, e.g. store:product:assign");
      return;
    }
    setSubmitting(true);
    setError(null);
    rolesService
      .createPermission({ code: trimmed, description: description.trim() })
      .then(() => onSaved("Permission created."))
      .catch((err: unknown) => setError(errorMessage(err, "Failed to create permission.")))
      .finally(() => setSubmitting(false));
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 backdrop-blur-sm px-4 py-8"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !submitting) onClose();
      }}
    >
      <div className="w-full max-w-lg rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-xl">
        <div className="flex items-start justify-between gap-4 border-b border-gray-100 dark:border-gray-800 px-6 py-4">
          <div>
            <h3 className="text-base font-semibold text-gray-800 dark:text-white/90">
              New permission
            </h3>
            <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
              A permission only takes effect once the backend guards an endpoint with its code.
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={submitting}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 disabled:opacity-50"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {error && (
            <div className="rounded-xl border border-red-200 dark:border-red-800/40 bg-red-50 dark:bg-red-500/10 px-4 py-3 text-sm text-red-600 dark:text-red-400">
              {error}
            </div>
          )}

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Code <span className="text-red-500">*</span>
            </label>
            <input
              className={`${inputClass} font-mono`}
              value={code}
              onChange={(e) => setCode(e.target.value.toLowerCase())}
              placeholder="store:product:assign"
            />
            <p className="mt-1.5 text-xs text-gray-400 dark:text-gray-500">
              Lower case, colon separated. Codes are permanent once created.
            </p>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Description
            </label>
            <input
              className={inputClass}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Assign products to a store"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-gray-100 dark:border-gray-800 px-6 py-4">
          <button
            onClick={onClose}
            disabled={submitting}
            className="rounded-xl border border-gray-200 dark:border-gray-700 px-4 py-2.5 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={submitting}
            className="rounded-xl bg-brand-500 hover:bg-brand-600 px-6 py-2.5 text-sm font-semibold text-white disabled:opacity-50 transition-colors"
          >
            {submitting ? "Saving…" : "Create permission"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Page ───────────────────────────────────────────────────────────────────

interface ToastItem {
  id: number;
  message: string;
  type: "success" | "error";
}

export default function Roles() {
  const allowed = isSuperAdmin();
  const navigate = useNavigate();

  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
  /** Draft permission selection for the selected role — saved as one atomic PUT. */
  const [draft, setDraft] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  const [holders, setHolders] = useState<RoleHolder[]>([]);
  const [holdersLoading, setHoldersLoading] = useState(false);

  const [roleModalOpen, setRoleModalOpen] = useState(false);
  const [roleBeingEdited, setRoleBeingEdited] = useState<Role | null>(null);
  const [permissionModalOpen, setPermissionModalOpen] = useState(false);

  const [confirmDelete, setConfirmDelete] = useState<Role | null>(null);
  const [confirmDeletePermission, setConfirmDeletePermission] = useState<Permission | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [tab, setTab] = useState<"permissions" | "members" | "catalog">("permissions");

  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const toastIdRef = useRef(0);

  const showToast = useCallback((message: string, type: "success" | "error") => {
    const id = ++toastIdRef.current;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3500);
  }, []);

  const selectedRole = useMemo(
    () => roles.find((r) => r.id === selectedRoleId) ?? null,
    [roles, selectedRoleId]
  );

  // ── Load roles + permission catalog ──────────────────────────────────────

  const load = useCallback(
    (signal?: AbortSignal) => {
      setLoading(true);
      setError(null);
      Promise.all([rolesService.getAllRoles(signal), rolesService.getAllPermissions(signal)])
        .then(([roleRes, permRes]) => {
          setRoles(roleRes.data);
          setPermissions(permRes.data);
          setSelectedRoleId((current) => {
            if (current && roleRes.data.some((r) => r.id === current)) return current;
            return roleRes.data[0]?.id ?? null;
          });
        })
        .catch((err: unknown) => {
          if (isAbort(err)) return;
          setError(errorMessage(err, "Failed to load roles and permissions."));
        })
        .finally(() => setLoading(false));
    },
    []
  );

  useEffect(() => {
    if (!allowed) return;
    const controller = new AbortController();
    load(controller.signal);
    return () => controller.abort();
  }, [allowed, load]);

  // Reset the draft whenever the selected role (or its saved permissions) changes.
  useEffect(() => {
    setDraft(new Set(selectedRole?.permissionCodes ?? []));
  }, [selectedRole]);

  // ── Load holders when the members tab is opened ───────────────────────────

  useEffect(() => {
    if (!allowed || tab !== "members" || !selectedRoleId) return;
    const controller = new AbortController();
    setHoldersLoading(true);
    setHolders([]);
    rolesService
      .getRoleHolders(selectedRoleId, controller.signal)
      .then((res) => setHolders(res.data))
      .catch((err: unknown) => {
        if (isAbort(err)) return;
        showToast(errorMessage(err, "Failed to load role members."), "error");
      })
      .finally(() => setHoldersLoading(false));
    return () => controller.abort();
  }, [allowed, tab, selectedRoleId, showToast]);

  // ── Permission matrix ────────────────────────────────────────────────────

  const permissionsByModule = useMemo(() => {
    const grouped = new Map<string, Permission[]>();
    for (const permission of permissions) {
      const key = moduleOf(permission.code);
      const bucket = grouped.get(key);
      if (bucket) bucket.push(permission);
      else grouped.set(key, [permission]);
    }
    return Array.from(grouped.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [permissions]);

  const savedCodes = useMemo(
    () => new Set(selectedRole?.permissionCodes ?? []),
    [selectedRole]
  );

  const dirty = useMemo(() => {
    if (draft.size !== savedCodes.size) return true;
    for (const code of draft) if (!savedCodes.has(code)) return true;
    return false;
  }, [draft, savedCodes]);

  const editable = selectedRole !== null && !selectedRole.locked;

  function toggleCode(code: string) {
    if (!editable) return;
    setDraft((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  }

  function toggleModule(modulePermissions: Permission[], enable: boolean) {
    if (!editable) return;
    setDraft((prev) => {
      const next = new Set(prev);
      for (const permission of modulePermissions) {
        if (enable) next.add(permission.code);
        else next.delete(permission.code);
      }
      return next;
    });
  }

  function savePermissions() {
    if (!selectedRole || !editable) return;
    const idsByCode = new Map(permissions.map((p) => [p.code, p.id]));
    const permissionIds = Array.from(draft)
      .map((code) => idsByCode.get(code))
      .filter((id): id is string => Boolean(id));

    setSaving(true);
    rolesService
      .setRolePermissions(selectedRole.id, permissionIds)
      .then((res) => {
        setRoles((prev) => prev.map((r) => (r.id === res.data.id ? res.data : r)));
        showToast(`Permissions saved for ${roleLabel(res.data.name)}.`, "success");
      })
      .catch((err: unknown) =>
        showToast(errorMessage(err, "Failed to save permissions."), "error")
      )
      .finally(() => setSaving(false));
  }

  // ── Delete handlers ──────────────────────────────────────────────────────

  function deleteRole() {
    if (!confirmDelete) return;
    setDeleting(true);
    rolesService
      .deleteRole(confirmDelete.id)
      .then(() => {
        showToast(`Role ${roleLabel(confirmDelete.name)} deleted.`, "success");
        setConfirmDelete(null);
        if (selectedRoleId === confirmDelete.id) setSelectedRoleId(null);
        load();
      })
      .catch((err: unknown) => {
        showToast(errorMessage(err, "Failed to delete role."), "error");
        setConfirmDelete(null);
      })
      .finally(() => setDeleting(false));
  }

  function deletePermission() {
    if (!confirmDeletePermission) return;
    setDeleting(true);
    rolesService
      .deletePermission(confirmDeletePermission.id)
      .then(() => {
        showToast(`Permission ${confirmDeletePermission.code} deleted.`, "success");
        setConfirmDeletePermission(null);
        load();
      })
      .catch((err: unknown) => {
        showToast(errorMessage(err, "Failed to delete permission."), "error");
        setConfirmDeletePermission(null);
      })
      .finally(() => setDeleting(false));
  }

  if (!allowed) return <Navigate to="/" replace />;

  return (
    <>
      <PageMeta
        title="Roles & Permissions | Buyology Dashboard"
        description="Define roles, grant permissions, and see who holds each role."
      />
      <PageBreadcrumb pageTitle="Roles & Permissions" />

      <ConfirmDialog
        open={confirmDelete !== null}
        title="Delete role"
        message={`Delete ${confirmDelete ? roleLabel(confirmDelete.name) : ""}? Anyone holding it loses its access immediately.`}
        confirmLabel="Delete role"
        confirmColor="bg-red-500 hover:bg-red-600"
        loading={deleting}
        onConfirm={deleteRole}
        onCancel={() => setConfirmDelete(null)}
      />
      <ConfirmDialog
        open={confirmDeletePermission !== null}
        title="Delete permission"
        message={`Delete ${confirmDeletePermission?.code ?? ""}? This only works if no role or user override still grants it.`}
        confirmLabel="Delete permission"
        confirmColor="bg-red-500 hover:bg-red-600"
        loading={deleting}
        onConfirm={deletePermission}
        onCancel={() => setConfirmDeletePermission(null)}
      />

      <RoleFormModal
        open={roleModalOpen}
        role={roleBeingEdited}
        onClose={() => setRoleModalOpen(false)}
        onSaved={(message) => {
          setRoleModalOpen(false);
          showToast(message, "success");
          load();
        }}
      />
      <PermissionFormModal
        open={permissionModalOpen}
        onClose={() => setPermissionModalOpen(false)}
        onSaved={(message) => {
          setPermissionModalOpen(false);
          showToast(message, "success");
          load();
        }}
      />

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

      {/* Header */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-gray-800 dark:text-white/90">
            Roles &amp; Permissions
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Grant permissions to roles here; assign roles to people from an admin's page.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => setPermissionModalOpen(true)}
            className="rounded-xl border border-gray-200 dark:border-gray-700 px-4 py-2.5 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            + Permission
          </button>
          <button
            onClick={() => {
              setRoleBeingEdited(null);
              setRoleModalOpen(true);
            }}
            className="rounded-xl bg-brand-500 hover:bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors"
          >
            + Create Role
          </button>
        </div>
      </div>

      {error ? (
        <div className={`${cardClass} flex flex-col items-center justify-center gap-3 py-20 px-5`}>
          <p className="text-sm font-medium text-red-600 dark:text-red-400">{error}</p>
          <button
            onClick={() => load()}
            className="rounded-xl border border-gray-200 dark:border-gray-700 px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            Retry
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
          {/* Role list */}
          <div className={`${cardClass} overflow-hidden self-start`}>
            <div className="border-b border-gray-100 dark:border-gray-800 px-5 py-3.5">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                Roles {!loading && `(${roles.length})`}
              </h2>
            </div>
            {loading ? (
              <div className="animate-pulse space-y-3 p-5">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="h-12 rounded-xl bg-gray-100 dark:bg-gray-800" />
                ))}
              </div>
            ) : roles.length === 0 ? (
              <p className="px-5 py-10 text-center text-sm text-gray-500 dark:text-gray-400">
                No roles yet.
              </p>
            ) : (
              <ul>
                {roles.map((role) => {
                  const active = role.id === selectedRoleId;
                  return (
                    <li key={role.id}>
                      <button
                        onClick={() => setSelectedRoleId(role.id)}
                        className={`flex w-full items-start justify-between gap-3 border-b border-gray-100 dark:border-gray-800 px-5 py-3.5 text-left transition-colors last:border-0 ${
                          active
                            ? "bg-brand-50 dark:bg-brand-500/10"
                            : "hover:bg-gray-50 dark:hover:bg-white/[0.02]"
                        }`}
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span
                              className={`truncate text-sm font-medium ${
                                active
                                  ? "text-brand-600 dark:text-brand-400"
                                  : "text-gray-800 dark:text-white/90"
                              }`}
                            >
                              {roleLabel(role.name)}
                            </span>
                            {role.locked ? (
                              <Badge size="sm" color="warning">
                                Locked
                              </Badge>
                            ) : role.isSystem ? (
                              <Badge size="sm" color="light">
                                Built-in
                              </Badge>
                            ) : null}
                          </div>
                          <p className="mt-0.5 truncate text-xs text-gray-500 dark:text-gray-400">
                            {role.permissionCodes.length} permission
                            {role.permissionCodes.length === 1 ? "" : "s"} · {role.userCount} user
                            {role.userCount === 1 ? "" : "s"}
                          </p>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* Detail panel */}
          <div className={`${cardClass} overflow-hidden`}>
            {!selectedRole ? (
              <p className="px-5 py-20 text-center text-sm text-gray-500 dark:text-gray-400">
                {loading ? "Loading…" : "Select a role to manage its permissions."}
              </p>
            ) : (
              <>
                <div className="border-b border-gray-100 dark:border-gray-800 px-5 py-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90">
                        {roleLabel(selectedRole.name)}
                      </h2>
                      <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
                        {selectedRole.description || "No description."}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setRoleBeingEdited(selectedRole);
                          setRoleModalOpen(true);
                        }}
                        className="rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                      >
                        Edit
                      </button>
                      {!selectedRole.locked && !selectedRole.isSystem && (
                        <button
                          onClick={() => setConfirmDelete(selectedRole)}
                          className="rounded-lg border border-red-200 dark:border-red-800/50 px-3 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </div>

                  {selectedRole.locked && (
                    <div className="mt-4 rounded-xl border border-amber-200 dark:border-amber-800/40 bg-amber-50 dark:bg-amber-500/10 px-4 py-3 text-sm text-amber-700 dark:text-amber-400">
                      {roleLabel(selectedRole.name)} always holds every permission. It is the
                      recovery path for any other permission mistake, so it cannot be edited here.
                    </div>
                  )}

                  {/* Tabs */}
                  <div className="mt-4 flex gap-2">
                    {(
                      [
                        ["permissions", "Permissions"],
                        ["members", `Members (${selectedRole.userCount})`],
                        ["catalog", "Permission catalog"],
                      ] as const
                    ).map(([key, label]) => (
                      <button
                        key={key}
                        onClick={() => setTab(key)}
                        className={`rounded-xl px-4 py-2 text-sm font-medium transition-colors ${
                          tab === key
                            ? "bg-brand-500 text-white"
                            : "border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Permission matrix */}
                {tab === "permissions" && (
                  <>
                    <div className="divide-y divide-gray-100 dark:divide-gray-800">
                      {permissionsByModule.length === 0 ? (
                        <p className="px-5 py-16 text-center text-sm text-gray-500 dark:text-gray-400">
                          No permissions defined yet.
                        </p>
                      ) : (
                        permissionsByModule.map(([module, modulePermissions]) => {
                          const selectedCount = modulePermissions.filter((p) =>
                            draft.has(p.code)
                          ).length;
                          const allSelected = selectedCount === modulePermissions.length;
                          return (
                            <div key={module} className="px-5 py-4">
                              <div className="mb-3 flex items-center justify-between gap-3">
                                <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                                  {module}
                                  <span className="ml-2 font-normal normal-case tracking-normal text-gray-400 dark:text-gray-500">
                                    {selectedCount}/{modulePermissions.length}
                                  </span>
                                </h3>
                                {editable && (
                                  <button
                                    onClick={() => toggleModule(modulePermissions, !allSelected)}
                                    className="text-xs font-medium text-brand-600 dark:text-brand-400 hover:underline"
                                  >
                                    {allSelected ? "Clear all" : "Select all"}
                                  </button>
                                )}
                              </div>
                              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
                                {modulePermissions.map((permission) => {
                                  const checked = draft.has(permission.code);
                                  return (
                                    <label
                                      key={permission.id}
                                      className={`flex items-start gap-2.5 rounded-xl border px-3 py-2.5 transition-colors ${
                                        editable
                                          ? "cursor-pointer hover:bg-gray-50 dark:hover:bg-white/[0.02]"
                                          : "cursor-not-allowed opacity-60"
                                      } ${
                                        checked
                                          ? "border-brand-300 dark:border-brand-500/40 bg-brand-50/60 dark:bg-brand-500/10"
                                          : "border-gray-200 dark:border-gray-700"
                                      }`}
                                    >
                                      <input
                                        type="checkbox"
                                        checked={checked}
                                        disabled={!editable}
                                        onChange={() => toggleCode(permission.code)}
                                        className="mt-0.5 h-4 w-4 shrink-0 rounded border-gray-300 text-brand-500 focus:ring-brand-400/30 disabled:opacity-50"
                                      />
                                      <span className="min-w-0">
                                        <span className="block truncate text-sm font-medium text-gray-800 dark:text-white/90">
                                          {actionOf(permission.code)}
                                        </span>
                                        <span className="block truncate font-mono text-xs text-gray-400 dark:text-gray-500">
                                          {permission.code}
                                        </span>
                                      </span>
                                    </label>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>

                    {editable && (
                      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 dark:border-gray-800 px-5 py-4">
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {dirty
                            ? `${draft.size} selected — unsaved changes`
                            : `${draft.size} permission${draft.size === 1 ? "" : "s"} granted`}
                        </p>
                        <div className="flex gap-3">
                          <button
                            onClick={() => setDraft(new Set(selectedRole.permissionCodes))}
                            disabled={!dirty || saving}
                            className="rounded-xl border border-gray-200 dark:border-gray-700 px-4 py-2.5 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 transition-colors"
                          >
                            Reset
                          </button>
                          <button
                            onClick={savePermissions}
                            disabled={!dirty || saving}
                            className="rounded-xl bg-brand-500 hover:bg-brand-600 px-6 py-2.5 text-sm font-semibold text-white disabled:opacity-50 transition-colors"
                          >
                            {saving ? "Saving…" : "Save permissions"}
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                )}

                {/* Members */}
                {tab === "members" && (
                  <div className="overflow-x-auto">
                    {holdersLoading ? (
                      <div className="animate-pulse space-y-3 p-5">
                        {Array.from({ length: 4 }).map((_, i) => (
                          <div key={i} className="h-12 rounded-xl bg-gray-100 dark:bg-gray-800" />
                        ))}
                      </div>
                    ) : holders.length === 0 ? (
                      <p className="px-5 py-16 text-center text-sm text-gray-500 dark:text-gray-400">
                        Nobody holds this role yet. Assign it from an admin's page.
                      </p>
                    ) : (
                      <table className="w-full text-left">
                        <thead>
                          <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50/60 dark:bg-white/[0.02]">
                            {["Name", "Email", "Type", "Status", ""].map((col) => (
                              <th
                                key={col}
                                className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500"
                              >
                                {col}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {holders.map((holder) => (
                            <tr
                              key={holder.userId}
                              className="border-b border-gray-100 dark:border-gray-800 last:border-0"
                            >
                              <td className="px-5 py-3.5 text-sm font-medium text-gray-800 dark:text-white/90">
                                {holderName(holder)}
                              </td>
                              <td className="px-5 py-3.5 text-sm text-gray-500 dark:text-gray-400">
                                {holder.email ?? "—"}
                              </td>
                              <td className="px-5 py-3.5">
                                <Badge
                                  size="sm"
                                  color={holder.userType === "ADMIN" ? "info" : "light"}
                                >
                                  {holder.userType ?? "—"}
                                </Badge>
                              </td>
                              <td className="px-5 py-3.5">
                                <Badge
                                  size="sm"
                                  color={holder.status === "ACTIVE" ? "success" : "error"}
                                >
                                  {holder.status ?? "—"}
                                </Badge>
                              </td>
                              <td className="px-5 py-3.5 text-right">
                                {holder.authCredentialId && (
                                  <button
                                    onClick={() =>
                                      navigate(`/admin/admins/${holder.authCredentialId}`)
                                    }
                                    className="rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                                  >
                                    Open
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}

                {/* Permission catalog */}
                {tab === "catalog" && (
                  <div className="overflow-x-auto">
                    {permissions.length === 0 ? (
                      <p className="px-5 py-16 text-center text-sm text-gray-500 dark:text-gray-400">
                        No permissions defined yet.
                      </p>
                    ) : (
                      <table className="w-full text-left">
                        <thead>
                          <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50/60 dark:bg-white/[0.02]">
                            {["Code", "Description", "Granted by", ""].map((col) => (
                              <th
                                key={col}
                                className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500"
                              >
                                {col}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {permissions.map((permission) => {
                            const grantedBy = roles.filter((r) =>
                              r.permissionCodes.includes(permission.code)
                            );
                            return (
                              <tr
                                key={permission.id}
                                className="border-b border-gray-100 dark:border-gray-800 last:border-0"
                              >
                                <td className="px-5 py-3.5 font-mono text-sm text-gray-800 dark:text-white/90">
                                  {permission.code}
                                </td>
                                <td className="px-5 py-3.5 text-sm text-gray-500 dark:text-gray-400">
                                  {permission.description || "—"}
                                </td>
                                <td className="px-5 py-3.5">
                                  {grantedBy.length === 0 ? (
                                    <span className="text-sm text-gray-400 dark:text-gray-500">
                                      No roles
                                    </span>
                                  ) : (
                                    <div className="flex flex-wrap gap-1.5">
                                      {grantedBy.map((r) => (
                                        <Badge key={r.id} size="sm" color="light">
                                          {roleLabel(r.name)}
                                        </Badge>
                                      ))}
                                    </div>
                                  )}
                                </td>
                                <td className="px-5 py-3.5 text-right">
                                  <button
                                    onClick={() => setConfirmDeletePermission(permission)}
                                    className="rounded-lg border border-red-200 dark:border-red-800/50 px-3 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                                  >
                                    Delete
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
