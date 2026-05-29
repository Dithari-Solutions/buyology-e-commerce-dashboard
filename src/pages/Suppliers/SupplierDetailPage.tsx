import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";
import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import {
  suppliersService,
  type SupplierApplication,
  type SupplierDetail,
} from "../../api/services/suppliers.service";
import { storesService } from "../../api/services/stores.service";
import type { Store } from "../../types/store.types";

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-700",
  APPROVED: "bg-green-100 text-green-700",
  REJECTED: "bg-red-100 text-red-700",
  ACTIVE: "bg-green-100 text-green-700",
  SUSPENDED: "bg-yellow-100 text-yellow-700",
  TRASHED: "bg-gray-200 text-gray-700",
};

export default function SupplierDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [app, setApp] = useState<SupplierApplication | null>(null);
  const [supplier, setSupplier] = useState<SupplierDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  // Profile edit
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({ businessName: "", contactEmail: "", contactPhone: "" });
  const [saving, setSaving] = useState(false);

  // Approval flow (pending only)
  const [stores, setStores] = useState<Store[]>([]);
  const [selectedStoreIds, setSelectedStoreIds] = useState<string[]>([]);
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectInput, setShowRejectInput] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Assigned stores (post-approval)
  const [assignedIds, setAssignedIds] = useState<Set<string>>(new Set());
  const [storeBusy, setStoreBusy] = useState<string | null>(null);

  const [resendBusy, setResendBusy] = useState(false);

  const refresh = async (signal?: AbortSignal) => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const appRes = await suppliersService.getApplication(id);
      const a = appRes.data as SupplierApplication;
      setApp(a);

      if (a.supplierId) {
        const [sRes, assigned, allStores] = await Promise.all([
          suppliersService.getSupplier(a.supplierId),
          suppliersService.listAssignedStores(a.supplierId),
          storesService.getAll(signal),
        ]);
        const s = sRes.data as SupplierDetail;
        setSupplier(s);
        setEditForm({
          businessName: s.businessName,
          contactEmail: s.contactEmail,
          contactPhone: s.contactPhone ?? "",
        });
        setAssignedIds(new Set((assigned.data ?? []).map((x) => x.id)));
        setStores(allStores.data ?? []);
      } else {
        // Pending/rejected: still need stores list for approval flow
        const all = await storesService.getAll(signal);
        setStores(all.data ?? []);
      }
    } catch (e: unknown) {
      setError((e as Error).message ?? "Failed to load");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const ac = new AbortController();
    refresh(ac.signal);
    return () => ac.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const saveProfile = async () => {
    if (!supplier) return;
    setSaving(true);
    try {
      await suppliersService.updateSupplier(supplier.id, {
        businessName: editForm.businessName.trim(),
        contactEmail: editForm.contactEmail.trim(),
        contactPhone: editForm.contactPhone.trim() || undefined,
      });
      setFlash({ kind: "ok", text: "Profile updated." });
      setEditing(false);
      await refresh();
    } catch (e: unknown) {
      setFlash({ kind: "err", text: (e as Error).message ?? "Update failed" });
    } finally {
      setSaving(false);
    }
  };

  const handleApprove = async () => {
    if (!app) return;
    if (selectedStoreIds.length === 0) {
      setFlash({ kind: "err", text: "Select at least one store before approving." });
      return;
    }
    setActionLoading(true);
    try {
      await suppliersService.approveApplication(app.id, selectedStoreIds);
      await refresh();
    } catch {
      setFlash({ kind: "err", text: "Failed to approve. Please try again." });
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!app || !rejectReason.trim()) {
      setFlash({ kind: "err", text: "Rejection reason is required." });
      return;
    }
    setActionLoading(true);
    try {
      await suppliersService.rejectApplication(app.id, rejectReason);
      await refresh();
    } catch {
      setFlash({ kind: "err", text: "Failed to reject. Please try again." });
    } finally {
      setActionLoading(false);
    }
  };

  const runLifecycle = async (op: "freeze" | "unfreeze" | "trash" | "restore") => {
    if (!supplier) return;
    if (op === "trash" && !confirm("Move supplier to trash? Will be permanently deleted after 30 days.")) return;
    try {
      if (op === "freeze") await suppliersService.freezeSupplier(supplier.id);
      else if (op === "unfreeze") await suppliersService.unfreezeSupplier(supplier.id);
      else if (op === "trash") await suppliersService.trashSupplier(supplier.id);
      else await suppliersService.restoreSupplier(supplier.id);
      await refresh();
    } catch (e: unknown) {
      setFlash({ kind: "err", text: (e as Error).message ?? "Action failed" });
    }
  };

  const handleResendSetup = async () => {
    if (!supplier) return;
    setResendBusy(true);
    try {
      await suppliersService.resendSupplierSetup(supplier.id);
      setFlash({ kind: "ok", text: "Set-password email re-sent." });
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } }; message?: string };
      setFlash({ kind: "err", text: err?.response?.data?.message ?? err?.message ?? "Failed" });
    } finally {
      setResendBusy(false);
    }
  };

  const toggleStore = async (storeId: string) => {
    if (!supplier) return;
    setStoreBusy(storeId);
    try {
      if (assignedIds.has(storeId)) {
        await suppliersService.unassignStore(supplier.id, storeId);
      } else {
        await suppliersService.assignStore(supplier.id, storeId);
      }
      const next = await suppliersService.listAssignedStores(supplier.id);
      setAssignedIds(new Set((next.data ?? []).map((x) => x.id)));
    } catch (e: unknown) {
      setFlash({ kind: "err", text: (e as Error).message ?? "Failed" });
    } finally {
      setStoreBusy(null);
    }
  };

  if (loading && !app) return <p className="p-6 text-sm text-gray-500">Loading…</p>;
  if (error || !app) return <p className="p-6 text-sm text-red-500">{error ?? "Not found"}</p>;

  const trashCutoff = supplier?.deletedAt
    ? new Date(new Date(supplier.deletedAt).getTime() + 30 * 24 * 3600 * 1000)
    : null;

  return (
    <>
      <PageMeta title={`${app.businessName ?? app.fullName} | Supplier`} description="Supplier detail" />
      <PageBreadcrumb pageTitle="Supplier Detail" />

      <div className="mb-4">
        <button onClick={() => navigate("/suppliers")} className="text-sm text-brand-500 hover:underline">
          ← Back to suppliers
        </button>
      </div>

      {flash && (
        <div className={`mb-4 rounded-lg px-4 py-2 text-sm ${
          flash.kind === "ok" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
        }`}>
          {flash.text}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Application info + (if approved) supplier profile */}
        <div className="lg:col-span-2 space-y-6">
          <section className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-semibold text-gray-800 dark:text-white">Application</h2>
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[app.status]}`}>
                {app.status}
              </span>
            </div>
            <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
              {[
                ["Full Name", app.fullName],
                ["Business Name", app.businessName ?? "—"],
                ["Seller Type", app.sellerType?.replace(/_/g, " ") ?? "—"],
                ["Country", app.country ?? "—"],
                ["City", app.city ?? "—"],
                ["Email", app.email],
                ["Phone", app.phoneNumber ?? "—"],
                ["Categories", app.productCategories ?? "—"],
                ["Main Brands", app.mainBrands ?? "—"],
                ["Submitted", new Date(app.createdAt).toLocaleString()],
              ].map(([k, v]) => (
                <div key={k}>
                  <dt className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">{k}</dt>
                  <dd className="mt-1 text-sm text-gray-800 dark:text-gray-200 break-words">{v}</dd>
                </div>
              ))}
            </dl>

            {app.tradeLicenseUrl && (
              <p className="mt-3 text-xs">
                <a href={app.tradeLicenseUrl} target="_blank" rel="noreferrer" className="text-brand-600 underline">
                  View trade license document ↗
                </a>
              </p>
            )}

            {app.rejectionReason && (
              <div className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-400">
                <strong>Rejection Reason:</strong> {app.rejectionReason}
              </div>
            )}
          </section>

          {/* Supplier profile (post-approval, editable) */}
          {supplier && (
            <section className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-base font-semibold text-gray-800 dark:text-white">Supplier profile</h2>
                {!editing ? (
                  <button onClick={() => setEditing(true)} className="rounded-lg bg-gray-100 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300">
                    Edit
                  </button>
                ) : (
                  <div className="flex gap-2">
                    <button onClick={saveProfile} disabled={saving} className="rounded-lg bg-brand-500 px-3 py-1.5 text-xs text-white hover:bg-brand-600 disabled:opacity-50">
                      {saving ? "Saving…" : "Save"}
                    </button>
                    <button onClick={() => setEditing(false)} className="rounded-lg bg-gray-100 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300">
                      Cancel
                    </button>
                  </div>
                )}
              </div>

              <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Status</dt>
                  <dd className="mt-1">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[supplier.status]}`}>
                      {supplier.status}
                    </span>
                  </dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Business name</dt>
                  <dd className="mt-1">
                    {editing ? (
                      <input
                        value={editForm.businessName}
                        onChange={(e) => setEditForm({ ...editForm, businessName: e.target.value })}
                        className="w-full rounded border border-gray-300 px-2 py-1 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                      />
                    ) : supplier.businessName}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Contact email</dt>
                  <dd className="mt-1">
                    {editing ? (
                      <input
                        type="email"
                        value={editForm.contactEmail}
                        onChange={(e) => setEditForm({ ...editForm, contactEmail: e.target.value })}
                        className="w-full rounded border border-gray-300 px-2 py-1 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                      />
                    ) : supplier.contactEmail}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Contact phone</dt>
                  <dd className="mt-1">
                    {editing ? (
                      <input
                        value={editForm.contactPhone}
                        onChange={(e) => setEditForm({ ...editForm, contactPhone: e.target.value })}
                        className="w-full rounded border border-gray-300 px-2 py-1 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                      />
                    ) : supplier.contactPhone ?? "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Created</dt>
                  <dd className="mt-1 text-sm text-gray-800 dark:text-gray-200">{new Date(supplier.createdAt).toLocaleString()}</dd>
                </div>
                {supplier.frozenAt && (
                  <div>
                    <dt className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Frozen at</dt>
                    <dd className="mt-1 text-sm text-gray-800 dark:text-gray-200">{new Date(supplier.frozenAt).toLocaleString()}</dd>
                  </div>
                )}
                {supplier.deletedAt && (
                  <div>
                    <dt className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Trashed at</dt>
                    <dd className="mt-1 text-sm text-gray-800 dark:text-gray-200">{new Date(supplier.deletedAt).toLocaleString()}</dd>
                  </div>
                )}
              </dl>
            </section>
          )}

          {/* Assigned stores (post-approval) */}
          {supplier && (
            <section className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
              <h2 className="mb-4 text-base font-semibold text-gray-800 dark:text-white">Assigned stores</h2>
              {stores.length === 0 ? (
                <p className="text-xs text-gray-500">No stores configured.</p>
              ) : (
                <ul className="divide-y divide-gray-100 dark:divide-gray-800">
                  {stores.map((s) => {
                    const isAssigned = assignedIds.has(s.id);
                    return (
                      <li key={s.id} className="flex items-center justify-between py-2">
                        <span className="text-sm text-gray-800 dark:text-gray-200">{s.name}</span>
                        <button
                          onClick={() => toggleStore(s.id)}
                          disabled={storeBusy === s.id}
                          className={`rounded-md px-3 py-1 text-xs font-medium disabled:opacity-50 ${
                            isAssigned
                              ? "border border-red-300 text-red-700 hover:bg-red-50"
                              : "bg-brand-600 text-white hover:bg-brand-700"
                          }`}
                        >
                          {storeBusy === s.id ? "…" : isAssigned ? "Remove" : "Assign"}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          )}

          {/* Pending application: approve / reject */}
          {app.status === "PENDING" && !supplier && (
            <section className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
              <h2 className="mb-4 text-base font-semibold text-gray-800 dark:text-white">Review</h2>
              <div className="space-y-4">
                <div>
                  <p className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                    Assign stores (required to approve)
                  </p>
                  <div className="max-h-48 space-y-1 overflow-y-auto rounded-lg border border-gray-200 p-2 dark:border-gray-700">
                    {stores.map((s) => (
                      <label key={s.id} className="flex cursor-pointer items-center gap-2">
                        <input
                          type="checkbox"
                          checked={selectedStoreIds.includes(s.id)}
                          onChange={() => setSelectedStoreIds((prev) =>
                            prev.includes(s.id) ? prev.filter((x) => x !== s.id) : [...prev, s.id]
                          )}
                          className="h-4 w-4 rounded border-gray-300 text-brand-600"
                        />
                        <span className="text-xs text-gray-700 dark:text-gray-300">{s.name ?? s.id}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button onClick={handleApprove} disabled={actionLoading} className="rounded-lg bg-green-500 px-4 py-2 text-sm font-medium text-white hover:bg-green-600 disabled:opacity-50">
                    {actionLoading ? "Processing…" : "Approve supplier"}
                  </button>
                  {!showRejectInput ? (
                    <button onClick={() => setShowRejectInput(true)} className="rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50">
                      Reject application
                    </button>
                  ) : (
                    <div className="w-full space-y-2">
                      <textarea
                        rows={3}
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                        placeholder="Rejection reason…"
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                      />
                      <div className="flex gap-2">
                        <button onClick={() => setShowRejectInput(false)} className="rounded-lg border border-gray-300 px-4 py-2 text-xs text-gray-600">
                          Cancel
                        </button>
                        <button onClick={handleReject} disabled={actionLoading} className="rounded-lg bg-red-500 px-4 py-2 text-xs font-medium text-white hover:bg-red-600 disabled:opacity-50">
                          {actionLoading ? "Rejecting…" : "Confirm reject"}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </section>
          )}
        </div>

        {/* Sidebar: lifecycle */}
        <div className="space-y-6">
          {supplier && (
            <section className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
              <h2 className="mb-4 text-base font-semibold text-gray-800 dark:text-white">Lifecycle</h2>
              <div className="flex flex-col gap-2">
                {supplier.status === "ACTIVE" && (
                  <button onClick={() => runLifecycle("freeze")} className="rounded-lg bg-yellow-100 px-3 py-2 text-xs font-medium text-yellow-700 hover:bg-yellow-200">
                    Freeze
                  </button>
                )}
                {supplier.status === "SUSPENDED" && (
                  <button onClick={() => runLifecycle("unfreeze")} className="rounded-lg bg-brand-100 px-3 py-2 text-xs font-medium text-brand-700 hover:bg-brand-200">
                    Unfreeze
                  </button>
                )}
                {supplier.status !== "TRASHED" && (
                  <button onClick={() => runLifecycle("trash")} className="rounded-lg bg-red-100 px-3 py-2 text-xs font-medium text-red-700 hover:bg-red-200">
                    Move to trash
                  </button>
                )}
                {supplier.status === "TRASHED" && (
                  <button onClick={() => runLifecycle("restore")} className="rounded-lg bg-green-100 px-3 py-2 text-xs font-medium text-green-700 hover:bg-green-200">
                    Restore
                  </button>
                )}
                {app.passwordSet === false && (
                  <button onClick={handleResendSetup} disabled={resendBusy} className="rounded-lg bg-amber-100 px-3 py-2 text-xs font-medium text-amber-700 hover:bg-amber-200 disabled:opacity-60">
                    {resendBusy ? "Sending…" : "Resend set-password email"}
                  </button>
                )}
              </div>
              {trashCutoff && (
                <p className="mt-3 text-xs text-gray-500">
                  Will be permanently deleted on {trashCutoff.toLocaleDateString()}.
                </p>
              )}
            </section>
          )}
        </div>
      </div>
    </>
  );
}
