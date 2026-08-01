import { useCallback, useEffect, useState } from "react";
import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import { storesService } from "../../api/services/stores.service";
import { courierProfilesService, type CourierProfile } from "../../api/services/courierProfiles.service";
import { ApiRequestError } from "../../api/types/api.types";
import type { Store } from "../../types/store.types";

const EMPTY = { firstName: "", lastName: "", phone: "", email: "", vehicleType: "" };

/** Admin: per-store courier profiles. Each store manages its own delivery couriers. */
export default function CourierProfilesPage() {
  const [stores, setStores] = useState<Store[]>([]);
  const [storeId, setStoreId] = useState<string>("");
  const [couriers, setCouriers] = useState<CourierProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ ...EMPTY });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  useEffect(() => {
    storesService.getAll().then((r) => {
      const list = r.data ?? [];
      setStores(list);
      if (list.length && !storeId) setStoreId(list[0].id);
    }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadCouriers = useCallback(() => {
    if (!storeId) return;
    setLoading(true);
    courierProfilesService.listByStore(storeId, false)
      .then((r) => setCouriers(r.data ?? []))
      .catch(() => setCouriers([]))
      .finally(() => setLoading(false));
  }, [storeId]);

  useEffect(() => { loadCouriers(); }, [loadCouriers]);

  async function addCourier() {
    if (!storeId || !form.firstName.trim() || !form.phone.trim()) {
      setMsg({ kind: "err", text: "First name and phone are required." });
      return;
    }
    setBusy(true);
    setMsg(null);
    try {
      await courierProfilesService.create({ storeId, ...form });
      setForm({ ...EMPTY });
      setMsg({ kind: "ok", text: "Courier added." });
      loadCouriers();
    } catch (e) {
      setMsg({ kind: "err", text: e instanceof ApiRequestError ? e.message : "Failed to add courier." });
    } finally {
      setBusy(false);
    }
  }

  async function toggleActive(c: CourierProfile) {
    try {
      await courierProfilesService.update(c.id, { active: !c.active });
      loadCouriers();
    } catch { /* ignore */ }
  }

  async function remove(c: CourierProfile) {
    if (!window.confirm(`Delete courier ${c.firstName}?`)) return;
    try {
      await courierProfilesService.remove(c.id);
      loadCouriers();
    } catch (e) {
      setMsg({ kind: "err", text: e instanceof ApiRequestError ? e.message : "Failed to delete." });
    }
  }

  const input = "rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white";

  return (
    <>
      <PageMeta title="Store Couriers | Buyology" description="Manage per-store delivery couriers" />
      <PageBreadcrumb pageTitle="Store Couriers" />

      <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900 space-y-4">
        <div className="flex items-center gap-2">
          <label className="text-xs uppercase text-gray-500">Store</label>
          <select value={storeId} onChange={(e) => setStoreId(e.target.value)} className={input}>
            {stores.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>

        {msg && (
          <div className={`rounded-xl px-4 py-2.5 text-sm ${msg.kind === "ok" ? "bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-400" : "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400"}`}>
            {msg.text}
          </div>
        )}

        {/* Add courier */}
        <div className="rounded-xl border border-gray-100 p-4 dark:border-gray-700">
          <h3 className="mb-3 text-sm font-semibold text-gray-800 dark:text-white/90">Add courier</h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <input className={input} placeholder="First name *" value={form.firstName} onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))} />
            <input className={input} placeholder="Last name" value={form.lastName} onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))} />
            <input className={input} placeholder="Phone *" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
            <input className={input} placeholder="Email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
            <input className={input} placeholder="Vehicle (e.g. BIKE)" value={form.vehicleType} onChange={(e) => setForm((f) => ({ ...f, vehicleType: e.target.value }))} />
          </div>
          <button onClick={addCourier} disabled={busy} className="mt-3 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50">
            {busy ? "Adding…" : "Add courier"}
          </button>
        </div>

        {/* Courier list */}
        {loading ? (
          <p className="text-sm text-gray-500">Loading…</p>
        ) : couriers.length === 0 ? (
          <p className="text-sm text-gray-400">No couriers for this store yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs uppercase text-gray-500 dark:border-gray-800">
                  <th className="pb-3 pr-4">Name</th>
                  <th className="pb-3 pr-4">Phone</th>
                  <th className="pb-3 pr-4">Vehicle</th>
                  <th className="pb-3 pr-4">Active</th>
                  <th className="pb-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {couriers.map((c) => (
                  <tr key={c.id}>
                    <td className="py-3 pr-4 text-gray-800 dark:text-gray-200">{c.firstName} {c.lastName ?? ""}</td>
                    <td className="py-3 pr-4 text-gray-600 dark:text-gray-400">{c.phone}</td>
                    <td className="py-3 pr-4 text-gray-500">{c.vehicleType ?? "—"}</td>
                    <td className="py-3 pr-4">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${c.active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                        {c.active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="py-3">
                      <div className="flex gap-2">
                        <button onClick={() => toggleActive(c)} className="rounded-lg bg-gray-100 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300">
                          {c.active ? "Deactivate" : "Activate"}
                        </button>
                        <button onClick={() => remove(c)} className="rounded-lg bg-red-100 px-3 py-1.5 text-xs text-red-700 hover:bg-red-200 dark:bg-red-500/10 dark:text-red-400">
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
