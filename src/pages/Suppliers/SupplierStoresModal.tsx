import { useEffect, useState } from "react";
import { suppliersService } from "../../api/services/suppliers.service";
import { storesService } from "../../api/services/stores.service";
import type { Store } from "../../types/store.types";

interface Props {
  supplierId: string;
  supplierName?: string;
  onClose: () => void;
}

export default function SupplierStoresModal({ supplierId, supplierName, onClose }: Props) {
  const [allStores, setAllStores] = useState<Store[]>([]);
  const [assignedIds, setAssignedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string>("");

  const reload = async () => {
    setLoading(true);
    try {
      const [storesRes, assigned] = await Promise.all([
        storesService.getAll(),
        suppliersService.listAssignedStores(supplierId),
      ]);
      setAllStores(storesRes.data ?? []);
      setAssignedIds(new Set((assigned.data ?? []).map((s) => s.id)));
    } catch (e: unknown) {
      setErr((e as Error).message ?? "Could not load stores.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supplierId]);

  const toggle = async (storeId: string) => {
    setBusy(storeId);
    setErr("");
    try {
      if (assignedIds.has(storeId)) {
        await suppliersService.unassignStore(supplierId, storeId);
      } else {
        await suppliersService.assignStore(supplierId, storeId);
      }
      await reload();
    } catch (e: unknown) {
      setErr((e as Error).message ?? "Action failed");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-lg rounded-xl bg-white p-4 shadow-theme-lg dark:bg-gray-900">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-gray-800 dark:text-white">
              Manage stores
            </h3>
            {supplierName && (
              <p className="text-xs text-gray-500">{supplierName}</p>
            )}
          </div>
          <button onClick={onClose} className="text-lg text-gray-400 hover:text-gray-600">
            ✕
          </button>
        </div>

        {err && (
          <div className="mb-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{err}</div>
        )}

        {loading ? (
          <div className="py-5 text-center text-sm text-gray-500">Loading…</div>
        ) : allStores.length === 0 ? (
          <div className="py-5 text-center text-sm text-gray-500">
            No stores configured.
          </div>
        ) : (
          <ul className="max-h-[60vh] divide-y divide-gray-100 overflow-y-auto rounded-md border border-gray-200 dark:divide-gray-800 dark:border-gray-700">
            {allStores.map((s) => {
              const isAssigned = assignedIds.has(s.id);
              return (
                <li key={s.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium text-gray-800 dark:text-gray-100">
                      {s.name}
                    </div>
                  </div>
                  <button
                    onClick={() => toggle(s.id)}
                    disabled={busy === s.id}
                    className={`rounded-md px-3 py-1.5 text-xs font-medium disabled:opacity-50 ${
                      isAssigned
                        ? "border border-red-300 bg-white text-red-700 hover:bg-red-50"
                        : "bg-brand-600 text-white hover:bg-brand-700"
                    }`}
                  >
                    {busy === s.id ? "…" : isAssigned ? "Remove" : "Assign"}
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        <div className="mt-4 flex justify-end">
          <button
            onClick={onClose}
            className="rounded-md bg-gray-100 px-4 py-2 text-sm text-gray-700 hover:bg-gray-200"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
