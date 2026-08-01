import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router";
import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import { usersService, rolesService, ApiRequestError } from "../../api";
import { isSuperAdmin } from "../../auth/roles";
import type { Role } from "../../types/roles.types";
import type { AdminEmailLookup } from "../../types";

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function FormField({
  label,
  required,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium text-gray-600 dark:text-gray-400">
        {label}
        {required && <span className="ml-0.5 text-red-500">*</span>}
      </label>
      {children}
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}

const inputClass =
  "w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-2.5 text-sm text-gray-800 dark:text-white placeholder-gray-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-400/20 transition-all";

interface FormState {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}

type FieldErrors = Partial<Record<keyof FormState | "roleIds", string>>;

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(iso));
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function NewAdmin() {
  const navigate = useNavigate();
  const superAdmin = isSuperAdmin();

  const [roles, setRoles] = useState<Role[]>([]);
  const [rolesLoading, setRolesLoading] = useState(true);
  const [roleError, setRoleError] = useState<string | null>(null);

  const [form, setForm] = useState<FormState>({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
  });
  const [roleIds, setRoleIds] = useState<string[]>([]);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  /**
   * Who currently owns the entered email.
   *
   * "An account with this email already exists" was a dead end whenever the holder was a customer
   * or a stale record — neither is visible on the Admins page, so there was nothing to act on.
   */
  const [conflict, setConflict] = useState<AdminEmailLookup | null>(null);
  const [promoting, setPromoting] = useState(false);

  const loadRoles = useCallback(() => {
    setRolesLoading(true);
    setRoleError(null);
    rolesService
      .getAllRoles()
      .then((res) => {
        const list = res.data ?? [];
        setRoles(list);
        if (list.length === 0) {
          setRoleError("No roles are available to assign.");
        }
      })
      .catch((err: unknown) => {
        setRoleError(
          err instanceof ApiRequestError
            ? `Could not load roles: ${err.message}`
            : "Could not load roles. Check your connection and that you're signed in as a Super Admin."
        );
      })
      .finally(() => setRolesLoading(false));
  }, []);

  useEffect(() => {
    if (superAdmin) loadRoles();
  }, [superAdmin, loadRoles]);

  const set =
    (key: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement>) => {
      setForm((prev) => ({ ...prev, [key]: e.target.value }));
      setFieldErrors((prev) => ({ ...prev, [key]: undefined }));
      if (key === "email") {
        setConflict(null);
        setSubmitError(null);
      }
    };

  function toggleRole(roleId: string) {
    setRoleIds((prev) =>
      prev.includes(roleId) ? prev.filter((id) => id !== roleId) : [...prev, roleId]
    );
    setFieldErrors((prev) => ({ ...prev, roleIds: undefined }));
  }

  const validate = (): boolean => {
    const errs: FieldErrors = {};
    if (!form.firstName.trim()) errs.firstName = "First name is required.";
    if (!form.lastName.trim()) errs.lastName = "Last name is required.";
    if (!form.email.trim()) errs.email = "Email is required.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      errs.email = "Enter a valid email address.";
    if (form.password.length < 8) errs.password = "Password must be at least 8 characters.";
    else if (form.password.length > 100) errs.password = "Password must be at most 100 characters.";
    else if (!/[A-Z]/.test(form.password) || !/[a-z]/.test(form.password) || !/\d/.test(form.password))
      errs.password = "Include an upper-case letter, a lower-case letter and a number.";
    if (roleIds.length === 0) errs.roleIds = "Select at least one role.";
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    setSubmitError(null);
    setConflict(null);

    usersService
      .createAdmin({
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim(),
        password: form.password,
        roleIds,
      })
      .then((res) => {
        const authCredentialId = res.data?.authCredentialId;
        navigate(authCredentialId ? `/admin/admins/${authCredentialId}` : "/admin/admins");
      })
      .catch((err: unknown) => {
        const message =
          err instanceof ApiRequestError
            ? err.message
            : "Failed to create admin. Please try again.";
        setSubmitError(message);

        // On a clash, ask the server what actually holds the address so the operator can act on it
        // rather than guessing at an account they cannot see.
        if (err instanceof ApiRequestError && err.statusCode === 409) {
          usersService
            .lookupEmail(form.email.trim())
            .then((res) => {
              if (!res.data.available) setConflict(res.data);
            })
            .catch(() => {
              /* The message alone still stands; the lookup is an enhancement. */
            });
        }
      })
      .finally(() => setLoading(false));
  };

  function promote() {
    if (!conflict?.userId) return;
    setPromoting(true);
    setSubmitError(null);
    usersService
      .promoteToAdmin(conflict.userId, roleIds)
      .then((res) => {
        const authCredentialId = res.data?.authCredentialId;
        navigate(authCredentialId ? `/admin/admins/${authCredentialId}` : "/admin/admins");
      })
      .catch((err: unknown) => {
        setSubmitError(
          err instanceof ApiRequestError ? err.message : "Failed to promote this account."
        );
      })
      .finally(() => setPromoting(false));
  }

  if (!superAdmin) {
    return (
      <>
        <PageMeta
          title="Create Admin | Buyology Dashboard"
          description="Create a new admin account."
        />
        <PageBreadcrumb pageTitle="Create Admin" />
        <div className="rounded-xl border border-amber-200 dark:border-amber-800/40 bg-amber-50 dark:bg-amber-500/5 px-4 py-2.5">
          <p className="text-sm text-amber-700 dark:text-amber-400">
            Only a Super Admin can create admin accounts.
          </p>
        </div>
      </>
    );
  }

  const conflictName =
    conflict && [conflict.firstName, conflict.lastName].filter(Boolean).join(" ");

  return (
    <>
      <PageMeta
        title="Create Admin | Buyology Dashboard"
        description="Create a new admin account and assign roles."
      />
      <PageBreadcrumb pageTitle="Create Admin" />

      <div className="max-w-2xl">
        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          {submitError && (
            <div className="rounded-xl border border-red-200 dark:border-red-800/40 bg-red-50 dark:bg-red-500/5 px-4 py-2">
              <p className="text-sm text-red-600 dark:text-red-400">{submitError}</p>
            </div>
          )}

          {/* ── Email conflict, explained and actionable ───────────────────── */}
          {conflict && (
            <div className="rounded-xl border border-amber-200 dark:border-amber-800/40 bg-amber-50 dark:bg-amber-500/5 px-4 py-2.5">
              <h3 className="text-sm font-semibold text-amber-800 dark:text-amber-300">
                {conflict.email} is already taken
              </h3>
              <p className="mt-1 text-sm text-amber-700 dark:text-amber-400">{conflict.reason}</p>

              <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs sm:grid-cols-4">
                {[
                  ["Account", conflictName || "—"],
                  ["Type", conflict.userType ?? "—"],
                  ["Status", conflict.status ?? "—"],
                  ["Joined", conflict.joinedAt ? formatDate(conflict.joinedAt) : "—"],
                ].map(([label, value]) => (
                  <div key={label}>
                    <dt className="text-amber-600/70 dark:text-amber-500/70">{label}</dt>
                    <dd className="font-medium text-amber-800 dark:text-amber-300">{value}</dd>
                  </div>
                ))}
              </dl>

              <div className="mt-4 flex flex-wrap gap-3">
                {conflict.promotable && (
                  <button
                    type="button"
                    onClick={promote}
                    disabled={promoting || roleIds.length === 0}
                    className="rounded-xl bg-amber-500 hover:bg-amber-600 px-4 py-2 text-sm font-semibold text-white transition-colors disabled:opacity-40"
                  >
                    {promoting ? "Promoting…" : "Promote this account to admin"}
                  </button>
                )}
                {conflict.authCredentialId && conflict.userType === "ADMIN" && (
                  <button
                    type="button"
                    onClick={() => navigate(`/admin/admins/${conflict.authCredentialId}`)}
                    className="rounded-xl border border-amber-300 dark:border-amber-700 px-4 py-2 text-sm font-medium text-amber-700 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-500/10 transition-colors"
                  >
                    Open that admin
                  </button>
                )}
              </div>
              {conflict.promotable && (
                <p className="mt-2 text-xs text-amber-600 dark:text-amber-500">
                  {roleIds.length === 0
                    ? "Select at least one role first — the promoted account needs it to sign in."
                    : "Promoting converts the account to an admin: it keeps its order history, but from then on signs in through the dashboard rather than the storefront."}
                </p>
              )}
            </div>
          )}

          {/* ── Account ──────────────────────────────────────────────────── */}
          <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
            <h2 className="mb-4 text-base font-semibold text-gray-800 dark:text-white/90">
              Admin Account
            </h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField label="First name" required error={fieldErrors.firstName}>
                <input
                  type="text"
                  placeholder="John"
                  maxLength={100}
                  value={form.firstName}
                  onChange={set("firstName")}
                  className={`${inputClass} ${fieldErrors.firstName ? "border-red-400 focus:ring-red-400/20" : ""}`}
                />
              </FormField>

              <FormField label="Last name" required error={fieldErrors.lastName}>
                <input
                  type="text"
                  placeholder="Smith"
                  maxLength={100}
                  value={form.lastName}
                  onChange={set("lastName")}
                  className={`${inputClass} ${fieldErrors.lastName ? "border-red-400 focus:ring-red-400/20" : ""}`}
                />
              </FormField>

              <FormField label="Email" required error={fieldErrors.email}>
                <input
                  type="email"
                  placeholder="admin@buyology.online"
                  maxLength={150}
                  value={form.email}
                  onChange={set("email")}
                  className={`${inputClass} ${fieldErrors.email ? "border-red-400 focus:ring-red-400/20" : ""}`}
                />
              </FormField>

              <FormField label="Initial password" required error={fieldErrors.password}>
                <input
                  type="password"
                  placeholder="Min 8 characters"
                  minLength={8}
                  maxLength={100}
                  value={form.password}
                  onChange={set("password")}
                  className={`${inputClass} ${fieldErrors.password ? "border-red-400 focus:ring-red-400/20" : ""}`}
                />
              </FormField>
            </div>
          </div>

          {/* ── Roles ────────────────────────────────────────────────────── */}
          <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
            <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-gray-800 dark:text-white/90">Roles</h2>
                <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                  Pick one or more. You can change these later from the admin's detail page.
                </p>
              </div>
              <button
                type="button"
                onClick={() => navigate("/admin/roles")}
                className="rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                Manage roles
              </button>
            </div>

            {rolesLoading ? (
              <div className="animate-pulse space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-14 rounded-xl bg-gray-100 dark:bg-gray-800" />
                ))}
              </div>
            ) : roles.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">No roles available.</p>
            ) : (
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {roles.map((role) => {
                  const checked = roleIds.includes(role.id);
                  return (
                    <label
                      key={role.id}
                      className={`flex cursor-pointer items-start gap-2.5 rounded-xl border px-3 py-2.5 transition-colors hover:bg-gray-50 dark:hover:bg-white/[0.02] ${
                        checked
                          ? "border-brand-300 dark:border-brand-500/40 bg-brand-50/60 dark:bg-brand-500/10"
                          : "border-gray-200 dark:border-gray-700"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleRole(role.id)}
                        className="mt-0.5 h-4 w-4 shrink-0 rounded border-gray-300 text-brand-500 focus:ring-brand-400/30"
                      />
                      <span className="min-w-0">
                        <span className="block text-sm font-medium text-gray-800 dark:text-white/90">
                          {role.name.replace(/_/g, " ")}
                        </span>
                        <span className="block text-xs text-gray-500 dark:text-gray-400">
                          {role.description ||
                            `${role.permissionCodes.length} permission${role.permissionCodes.length === 1 ? "" : "s"}`}
                        </span>
                      </span>
                    </label>
                  );
                })}
              </div>
            )}

            {fieldErrors.roleIds && (
              <p className="mt-2 text-xs text-red-500">{fieldErrors.roleIds}</p>
            )}
            {roleError && (
              <p className="mt-1.5 flex items-center gap-2 text-xs text-red-500">
                {roleError}
                <button
                  type="button"
                  onClick={loadRoles}
                  className="font-semibold text-brand-500 hover:text-brand-600 underline"
                >
                  Retry
                </button>
              </p>
            )}
          </div>

          {/* ── Actions ──────────────────────────────────────────────────── */}
          <div className="flex items-center justify-end gap-3 pb-4">
            <button
              type="button"
              onClick={() => navigate("/admin/admins")}
              disabled={loading}
              className="rounded-xl border border-gray-200 dark:border-gray-700 px-4 py-2.5 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-40"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="rounded-xl bg-brand-600 hover:bg-brand-700 px-4 py-2.5 text-sm font-semibold text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {loading ? "Creating…" : "Create Admin"}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
