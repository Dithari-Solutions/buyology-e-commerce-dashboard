import { useCallback, useEffect, useState } from "react";
import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import { suppliersService, type SupplierProduct } from "../../api/services/suppliers.service";
import { ApiRequestError } from "../../api/types/api.types";

/**
 * Supplier trash: products the supplier has requested to delete and that were
 * approved/removed. Restore is superadmin-approved (files a RESTORE request).
 */
export default function SupplierTrashPage() {
  const [items, setItems] = useState<SupplierProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    suppliersService
      .listMyTrash({ size: 50 })
      .then((r) => {
        setItems(r.data?.content ?? []);
        setError(null);
      })
      .catch((e) => setError(e instanceof ApiRequestError ? e.message : "Failed to load trash"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function requestRestore(id: string) {
    setBusyId(id);
    setMsg(null);
    try {
      await suppliersService.restoreMyProduct(id); // files a RESTORE change request
      setMsg({ kind: "ok", text: "Restore request submitted for approval." });
    } catch (e) {
      setMsg({ kind: "err", text: e instanceof ApiRequestError ? e.message : "Failed to submit request." });
    } finally {
      setBusyId(null);
    }
  }

  return (
    <>
      <PageMeta title="Trash | Supplier Portal" description="Your deleted products" />
      <PageBreadcrumb pageTitle="Trash" />

      <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
        <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
          Deleted products. Restoring requires superadmin approval.
        </p>

        {msg && (
          <div className={`mb-4 rounded-xl px-4 py-2.5 text-sm ${msg.kind === "ok" ? "bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-400" : "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400"}`}>
            {msg.text}
          </div>
        )}

        {loading ? (
          <p className="text-sm text-gray-500">Loading…</p>
        ) : error ? (
          <p className="text-sm text-red-600">{error}</p>
        ) : items.length === 0 ? (
          <div className="rounded-xl border-2 border-dashed border-gray-200 p-5 text-center dark:border-gray-700">
            <p className="text-gray-500 dark:text-gray-400">Trash is empty.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-800 text-left text-xs uppercase text-gray-500">
                  <th className="pb-3 pr-4">SKU</th>
                  <th className="pb-3 pr-4">Status</th>
                  <th className="pb-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {items.map((p) => (
                  <tr key={p.id}>
                    <td className="py-3 pr-4 font-mono text-xs text-gray-800 dark:text-gray-200">{p.sku}</td>
                    <td className="py-3 pr-4 text-xs text-gray-500">{p.status}</td>
                    <td className="py-3">
                      <button
                        disabled={busyId === p.id}
                        onClick={() => requestRestore(p.id)}
                        className="rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-700 disabled:opacity-50"
                      >
                        Request Restore
                      </button>
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
