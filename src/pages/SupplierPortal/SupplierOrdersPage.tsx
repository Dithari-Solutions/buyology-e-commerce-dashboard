import { useCallback, useEffect, useState } from "react";
import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import { ordersService } from "../../api/services/orders.service";
import { ApiRequestError } from "../../api/types/api.types";
import type { OrderAdminResponse, OrderStatus } from "../../types/order.types";

const STATUS_OPTIONS: OrderStatus[] = [
  "PENDING_PAYMENT", "PAID", "PACKAGING", "IN_COURIER", "IN_TRANSIT", "DELIVERED", "CANCELLED", "FAILED",
];

// Supplier fulfilment chain + the label shown for the "advance" button.
// Supplier fulfilment steps. Courier *assignment* is done by admins (Store Couriers);
// the supplier only advances the order's progress, so labels are status-semantic.
const SUPPLIER_NEXT: Partial<Record<OrderStatus, { next: OrderStatus; label: string }>> = {
  PAID: { next: "PACKAGING", label: "Start packaging" },
  PACKAGING: { next: "IN_COURIER", label: "Hand to courier" },
  IN_COURIER: { next: "IN_TRANSIT", label: "Mark on the way" },
  IN_TRANSIT: { next: "DELIVERED", label: "Mark delivered" },
};

const STATUS_COLORS: Partial<Record<OrderStatus, string>> = {
  PENDING_PAYMENT: "bg-gray-100 text-gray-600",
  PAID: "bg-blue-100 text-blue-700",
  PACKAGING: "bg-amber-100 text-amber-700",
  IN_COURIER: "bg-indigo-100 text-indigo-700",
  IN_TRANSIT: "bg-purple-100 text-purple-700",
  DELIVERED: "bg-green-100 text-green-700",
  CANCELLED: "bg-red-100 text-red-700",
  FAILED: "bg-red-100 text-red-700",
};

export default function SupplierOrdersPage() {
  const [orders, setOrders] = useState<OrderAdminResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<OrderStatus | "">("");
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    ordersService
      .getMine({ page, size: 20, status: status || undefined })
      .then((r) => {
        setOrders(r.data?.content ?? []);
        setTotalPages(r.data?.totalPages ?? 0);
      })
      .catch(() => setOrders([]))
      .finally(() => setLoading(false));
  }, [page, status]);

  useEffect(() => {
    load();
  }, [load]);

  async function advance(order: OrderAdminResponse) {
    const step = SUPPLIER_NEXT[order.status];
    if (!step) return;
    setBusyId(order.id);
    setMsg(null);
    try {
      await ordersService.supplierUpdateStatus(order.id, step.next);
      setMsg({ kind: "ok", text: `Order updated to ${step.next}.` });
      load();
    } catch (e) {
      setMsg({ kind: "err", text: e instanceof ApiRequestError ? e.message : "Failed to update status." });
    } finally {
      setBusyId(null);
    }
  }

  return (
    <>
      <PageMeta title="My Orders | Buyology Supplier" description="Orders containing your products" />
      <PageBreadcrumb pageTitle="My Orders" />

      <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
        <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
          You are responsible for fulfilling these orders. Advance each order through
          packaging → courier assigned → on the way → delivered.
        </p>

        <div className="mb-4 flex flex-wrap items-end gap-4">
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Status</label>
            <select
              value={status}
              onChange={(e) => { setPage(0); setStatus(e.target.value as OrderStatus | ""); }}
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
            >
              <option value="">All statuses</option>
              {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>

        {msg && (
          <div className={`mb-4 rounded-xl px-4 py-2.5 text-sm ${msg.kind === "ok" ? "bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-400" : "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400"}`}>
            {msg.text}
          </div>
        )}

        {loading ? (
          <p className="text-sm text-gray-500">Loading…</p>
        ) : orders.length === 0 ? (
          <div className="rounded-xl border-2 border-dashed border-gray-200 p-5 text-center dark:border-gray-700">
            <p className="text-gray-500 dark:text-gray-400">No orders found.</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-left text-xs uppercase text-gray-500 dark:border-gray-800">
                    <th className="pb-3 pr-4">Order</th>
                    <th className="pb-3 pr-4">Total</th>
                    <th className="pb-3 pr-4">Placed</th>
                    <th className="pb-3 pr-4">Status</th>
                    <th className="pb-3">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {orders.map((o) => {
                    const step = SUPPLIER_NEXT[o.status];
                    return (
                      <tr key={o.id}>
                        <td className="py-3 pr-4 font-mono text-xs text-gray-700 dark:text-gray-300">
                          {o.orderNumber ?? o.id.slice(0, 8)}
                        </td>
                        <td className="py-3 pr-4 text-gray-700 dark:text-gray-300">
                          {o.totalAmount?.toFixed(2)} {o.currency}
                        </td>
                        <td className="py-3 pr-4 text-xs text-gray-500">{new Date(o.createdAt).toLocaleDateString()}</td>
                        <td className="py-3 pr-4">
                          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[o.status] ?? "bg-gray-100 text-gray-600"}`}>
                            {o.status}
                          </span>
                        </td>
                        <td className="py-3">
                          {step ? (
                            <button
                              disabled={busyId === o.id}
                              onClick={() => advance(o)}
                              className="rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-700 disabled:opacity-50"
                            >
                              {step.label}
                            </button>
                          ) : (
                            <span className="text-xs text-gray-400">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="mt-4 flex items-center justify-end gap-2">
                <button onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0}
                  className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs disabled:opacity-40 dark:border-gray-600 dark:text-gray-200">
                  Prev
                </button>
                <span className="text-xs text-gray-500">Page {page + 1} of {totalPages}</span>
                <button onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}
                  className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs disabled:opacity-40 dark:border-gray-600 dark:text-gray-200">
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
