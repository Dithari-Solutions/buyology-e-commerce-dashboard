import { useEffect, useState } from "react";
import PageMeta from "../components/common/PageMeta";
import PageBreadcrumb from "../components/common/PageBreadCrumb";
import { getRolesFromToken, hasRole } from "../api/client";
import { usersService } from "../api/services/users.service";
import { suppliersService } from "../api/services/suppliers.service";
import { getUserIdFromToken } from "../api/client";

interface AdminProfile {
  id?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  status?: string;
  userType?: string;
  lastLoginAt?: string | null;
  createdAt?: string | null;
}

interface SupplierProfile {
  id: string;
  businessName: string;
  contactEmail: string;
  contactPhone?: string;
  status: string;
  frozenAt?: string | null;
  deletedAt?: string | null;
  createdAt: string;
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:gap-3">
      <dt className="w-40 shrink-0 text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
        {label}
      </dt>
      <dd className="text-sm font-medium text-gray-800 dark:text-gray-100 break-words">
        {value || <span className="text-gray-400">—</span>}
      </dd>
    </div>
  );
}

export default function UserProfiles() {
  const [admin, setAdmin] = useState<AdminProfile | null>(null);
  const [supplier, setSupplier] = useState<SupplierProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");

  const isSupplier = hasRole("SUPPLIER");
  const roles = getRolesFromToken();

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");

    const authCredId = getUserIdFromToken();
    const promises: Promise<unknown>[] = [];

    if (authCredId) {
      promises.push(
        usersService
          .getById(authCredId)
          .then((res) => {
            if (cancelled) return;
            const d = res.data as Partial<AdminProfile & { userId?: string }> | undefined;
            if (d) {
              setAdmin({
                id: d.id,
                email: d.email,
                firstName: d.firstName,
                lastName: d.lastName,
                status: d.status,
                userType: d.userType,
                lastLoginAt: d.lastLoginAt ?? null,
                createdAt: d.createdAt ?? null,
              });
            }
          })
          .catch(() => {
            // Non-admin roles can't hit /api/admin/users — that's expected; just skip.
          }),
      );
    }

    if (isSupplier) {
      promises.push(
        suppliersService
          .getCurrentSupplier()
          .then((res) => {
            if (cancelled) return;
            if (res.data) setSupplier(res.data);
          })
          .catch((e: unknown) => {
            if (cancelled) return;
            setError((e as Error).message ?? "Could not load supplier profile.");
          }),
      );
    }

    Promise.all(promises).finally(() => {
      if (!cancelled) setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [isSupplier]);

  return (
    <>
      <PageMeta title="Profile | Buyology" description="Your dashboard profile" />
      <PageBreadcrumb pageTitle="Profile" />

      {loading ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-6 text-center text-sm text-gray-500 dark:border-gray-800 dark:bg-white/[0.03]">
          Loading…
        </div>
      ) : (
        <div className="space-y-6">
          {error && (
            <div className="rounded-md bg-red-50 px-4 py-2 text-sm text-red-700">{error}</div>
          )}

          {/* Account section — always shown */}
          <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
            <h3 className="mb-5 text-base font-semibold text-gray-800 dark:text-white">
              Account
            </h3>
            <dl className="space-y-3">
              <Field
                label="Name"
                value={[admin?.firstName, admin?.lastName].filter(Boolean).join(" ")}
              />
              <Field label="Email" value={admin?.email} />
              <Field label="User type" value={admin?.userType ?? (isSupplier ? "SUPPLIER" : "—")} />
              <Field label="Roles" value={roles.length > 0 ? roles.join(", ") : "—"} />
              <Field label="Status" value={admin?.status} />
              <Field
                label="Last login"
                value={admin?.lastLoginAt ? new Date(admin.lastLoginAt).toLocaleString() : null}
              />
              <Field
                label="Member since"
                value={admin?.createdAt ? new Date(admin.createdAt).toLocaleDateString() : null}
              />
            </dl>
          </div>

          {/* Supplier section — only when SUPPLIER role */}
          {isSupplier && (
            <div className="rounded-2xl border border-purple-200 bg-purple-50/50 p-6 dark:border-purple-900/40 dark:bg-purple-500/5">
              <h3 className="mb-5 text-base font-semibold text-purple-900 dark:text-purple-300">
                Supplier details
              </h3>
              {supplier ? (
                <dl className="space-y-3">
                  <Field label="Business name" value={supplier.businessName} />
                  <Field label="Contact email" value={supplier.contactEmail} />
                  <Field label="Contact phone" value={supplier.contactPhone} />
                  <Field
                    label="Supplier status"
                    value={
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          supplier.status === "ACTIVE"
                            ? "bg-green-100 text-green-700"
                            : supplier.status === "SUSPENDED"
                            ? "bg-yellow-100 text-yellow-700"
                            : supplier.status === "TRASHED"
                            ? "bg-gray-200 text-gray-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {supplier.status}
                      </span>
                    }
                  />
                  {supplier.frozenAt && (
                    <Field
                      label="Frozen at"
                      value={new Date(supplier.frozenAt).toLocaleString()}
                    />
                  )}
                  {supplier.deletedAt && (
                    <Field
                      label="Trashed at"
                      value={new Date(supplier.deletedAt).toLocaleString()}
                    />
                  )}
                  <Field
                    label="Onboarded"
                    value={new Date(supplier.createdAt).toLocaleDateString()}
                  />
                </dl>
              ) : (
                <p className="text-sm text-gray-500">Supplier record not found.</p>
              )}
            </div>
          )}
        </div>
      )}
    </>
  );
}
