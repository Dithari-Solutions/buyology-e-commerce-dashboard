import { useEffect, useState } from "react";
import PageMeta from "../components/common/PageMeta";
import PageBreadcrumb from "../components/common/PageBreadCrumb";
import { getRolesFromToken, hasRole } from "../api/client";
import { usersService } from "../api/services/users.service";
import { suppliersService } from "../api/services/suppliers.service";
import { mfaService } from "../api/services/mfa.service";
import { ApiRequestError } from "../api/types/api.types";
import type { MfaStatusData } from "../types/auth.types";
import Button from "../components/ui/button/Button";
import Input from "../components/form/input/InputField";
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

function SecuritySection() {
  const [status, setStatus] = useState<MfaStatusData | null>(null);
  const [loading, setLoading] = useState(true);

  // Recovery-code regeneration
  const [showRegen, setShowRegen] = useState(false);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [regenError, setRegenError] = useState("");
  const [newCodes, setNewCodes] = useState<string[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    mfaService
      .status()
      .then((res) => {
        if (!cancelled) setStatus(res.data ?? null);
      })
      .catch(() => {
        if (!cancelled) setStatus(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleRegenerate(e: React.FormEvent) {
    e.preventDefault();
    setRegenError("");
    setBusy(true);
    try {
      const res = await mfaService.regenerateRecoveryCodes(code.trim());
      setNewCodes(res.data ?? []);
      setCode("");
    } catch (err) {
      setRegenError(err instanceof ApiRequestError ? err.message : "Could not regenerate codes.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
      <h3 className="mb-4 text-base font-semibold text-gray-800 dark:text-white">Security</h3>

      {loading ? (
        <p className="text-sm text-gray-500">Loading…</p>
      ) : (
        <dl className="space-y-3">
          <Field
            label="Two-factor auth"
            value={
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                  status?.enabled ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"
                }`}
              >
                {status?.enabled ? "Enabled (Google Authenticator)" : "Not enrolled"}
              </span>
            }
          />
          {status?.enabled && status.enrolledAt && (
            <Field label="Enrolled" value={new Date(status.enrolledAt).toLocaleString()} />
          )}
          {status?.enabled && (
            <Field
              label="Recovery codes"
              value={`${status.unusedRecoveryCodes ?? 0} unused`}
            />
          )}

          {status?.enabled && (
            <div className="pt-2">
              {!showRegen && !newCodes && (
                <Button variant="outline" size="sm" onClick={() => setShowRegen(true)}>
                  Regenerate recovery codes
                </Button>
              )}

              {showRegen && !newCodes && (
                <form onSubmit={handleRegenerate} className="max-w-xs space-y-2">
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Enter a current authenticator code to generate a new set. This invalidates your
                    old recovery codes.
                  </p>
                  <Input type="text" placeholder="123456" value={code} onChange={(e) => setCode(e.target.value)} />
                  {regenError && <p className="text-xs text-red-500">{regenError}</p>}
                  <div className="flex gap-2">
                    <Button size="sm" disabled={busy || code.trim().length < 6}>
                      {busy ? "Generating…" : "Generate"}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setShowRegen(false);
                        setRegenError("");
                        setCode("");
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              )}

              {newCodes && (
                <div className="max-w-md">
                  <p className="mb-2 text-xs text-gray-500 dark:text-gray-400">
                    Your new recovery codes — save them now, they won't be shown again.
                  </p>
                  <div className="grid grid-cols-2 gap-2 font-mono text-sm text-gray-800 dark:text-gray-100">
                    {newCodes.map((rc) => (
                      <div key={rc} className="rounded-md bg-gray-50 dark:bg-gray-900 px-3 py-2 text-center tracking-wider">
                        {rc}
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigator.clipboard?.writeText(newCodes.join("\n"))}
                    >
                      Copy
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => {
                        setNewCodes(null);
                        setShowRegen(false);
                        setStatus((s) => (s ? { ...s, unusedRecoveryCodes: newCodes.length } : s));
                      }}
                    >
                      Done
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </dl>
      )}
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
        <div className="rounded-xl border border-gray-200 bg-white p-4 text-center text-sm text-gray-500 dark:border-gray-800 dark:bg-gray-900">
          Loading…
        </div>
      ) : (
        <div className="space-y-4">
          {error && (
            <div className="rounded-md bg-red-50 px-4 py-2 text-sm text-red-700">{error}</div>
          )}

          {/* Account section — always shown */}
          <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
            <h3 className="mb-4 text-base font-semibold text-gray-800 dark:text-white">
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

          {/* Security section — 2FA status & recovery codes */}
          <SecuritySection />

          {/* Supplier section — only when SUPPLIER role */}
          {isSupplier && (
            <div className="rounded-xl border border-purple-200 bg-purple-50/50 p-4 dark:border-purple-900/40 dark:bg-purple-500/5">
              <h3 className="mb-4 text-base font-semibold text-purple-900 dark:text-purple-300">
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
