import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router";
import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import { usersService, rolesService, ApiRequestError } from "../../api";
import { isSuperAdmin } from "../../auth/roles";
import type { Role } from "../../types/roles.types";

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

const selectClass =
  "w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-2.5 text-sm text-gray-800 dark:text-white focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-400/20 transition-all";

interface FormState {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  roleId: string;
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
    roleId: "",
  });
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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

  const set = (key: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm((prev) => ({ ...prev, [key]: e.target.value }));
    setFieldErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const validate = (): boolean => {
    const errs: Partial<Record<keyof FormState, string>> = {};
    if (!form.firstName.trim()) errs.firstName = "First name is required.";
    if (!form.lastName.trim()) errs.lastName = "Last name is required.";
    if (!form.email.trim()) errs.email = "Email is required.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = "Enter a valid email address.";
    if (form.password.length < 8) errs.password = "Password must be at least 8 characters.";
    if (form.password.length > 100) errs.password = "Password must be at most 100 characters.";
    if (!form.roleId) errs.roleId = "Select a role.";
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    setSubmitError(null);

    usersService
      .createAdmin({
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim(),
        password: form.password,
        roleIds: [form.roleId],
      })
      .then((res) => {
        const authCredentialId = res.data?.authCredentialId;
        navigate(authCredentialId ? `/admin/admins/${authCredentialId}` : "/admin/admins");
      })
      .catch((err: unknown) => {
        setSubmitError(
          err instanceof ApiRequestError ? err.message : "Failed to create admin. Please try again."
        );
      })
      .finally(() => setLoading(false));
  };

  if (!superAdmin) {
    return (
      <>
        <PageMeta title="Create Admin | Buyology Dashboard" description="Create a new admin account." />
        <PageBreadcrumb pageTitle="Create Admin" />
        <div className="rounded-2xl border border-amber-200 dark:border-amber-800/40 bg-amber-50 dark:bg-amber-500/5 px-5 py-4">
          <p className="text-sm text-amber-700 dark:text-amber-400">
            Only a Super Admin can create admin accounts.
          </p>
        </div>
      </>
    );
  }

  return (
    <>
      <PageMeta title="Create Admin | Buyology Dashboard" description="Create a new admin account and assign a role." />
      <PageBreadcrumb pageTitle="Create Admin" />

      <div className="max-w-2xl">
        <form onSubmit={handleSubmit} noValidate className="space-y-6">

          {submitError && (
            <div className="rounded-2xl border border-red-200 dark:border-red-800/40 bg-red-50 dark:bg-red-500/5 px-5 py-3">
              <p className="text-sm text-red-600 dark:text-red-400">{submitError}</p>
            </div>
          )}

          {/* ── Account ──────────────────────────────────────────────────── */}
          <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03] p-6">
            <h2 className="mb-5 text-base font-semibold text-gray-800 dark:text-white/90">Admin Account</h2>
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

          {/* ── Role ─────────────────────────────────────────────────────── */}
          <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03] p-6">
            <h2 className="mb-1 text-base font-semibold text-gray-800 dark:text-white/90">Role</h2>
            <p className="mb-5 text-xs text-gray-400 dark:text-gray-500">
              Determines what this admin can access. You can adjust roles later from the admin's detail page.
            </p>
            <FormField label="Role" required error={fieldErrors.roleId}>
              <select
                value={form.roleId}
                onChange={set("roleId")}
                disabled={rolesLoading || roles.length === 0}
                className={`${selectClass} ${fieldErrors.roleId ? "border-red-400 focus:ring-red-400/20" : ""}`}
              >
                <option value="">
                  {rolesLoading ? "Loading roles…" : roles.length === 0 ? "No roles available" : "Select a role"}
                </option>
                {roles.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}{r.description ? ` — ${r.description}` : ""}
                  </option>
                ))}
              </select>
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
            </FormField>
          </div>

          {/* ── Actions ──────────────────────────────────────────────────── */}
          <div className="flex items-center justify-end gap-3 pb-6">
            <button
              type="button"
              onClick={() => navigate("/admin/admins")}
              disabled={loading}
              className="rounded-xl border border-gray-200 dark:border-gray-700 px-5 py-2.5 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-40"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="rounded-xl bg-brand-500 hover:bg-brand-600 px-6 py-2.5 text-sm font-semibold text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {loading ? "Creating…" : "Create Admin"}
            </button>
          </div>

        </form>
      </div>
    </>
  );
}
