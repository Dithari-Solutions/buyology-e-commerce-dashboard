import { useEffect, useState } from "react";
import { Navigate } from "react-router";
import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import { isSuperAdmin } from "../../auth/roles";
import { ordersService } from "../../api/services/orders.service";
import { suppliersService } from "../../api/services/suppliers.service";
import type { OrderAdminResponse } from "../../types/order.types";
import type { OrderStatus } from "../../types/order.types";
import OrdersTable from "./OrdersTable";

const STATUS_OPTIONS: OrderStatus[] = [
  "PENDING_PAYMENT",
  "PAID",
  "PACKAGING",
  "READY_FOR_PICKUP",
  "IN_COURIER",
  "IN_TRANSIT",
  "DELIVERED",
  "CANCELLED",
  "FAILED",
];

export default function AllOrdersPage() {
  const allowed = isSuperAdmin();

  const [orders, setOrders] = useState<OrderAdminResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<OrderStatus | "">("");
  const [supplierId, setSupplierId] = useState("");
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [suppliers, setSuppliers] = useState<{ id: string; name: string }[]>([]);

  // Supplier dropdown — approved applications carry the linked supplierId + business name.
  useEffect(() => {
    if (!allowed) return;
    suppliersService
      .listApplications({ status: "APPROVED", size: 200 })
      .then((r) => {
        const list = (r.data?.content ?? [])
          .filter((a) => a.supplierId)
          .map((a) => ({ id: a.supplierId as string, name: a.businessName || a.fullName }));
        setSuppliers(list);
      })
      .catch(() => setSuppliers([]));
  }, [allowed]);

  useEffect(() => {
    if (!allowed) return;
    setLoading(true);
    ordersService
      .getAll({ page, size: 20, status: status || undefined, supplierId: supplierId || undefined })
      .then((r) => {
        setOrders(r.data?.content ?? []);
        setTotalPages(r.data?.totalPages ?? 0);
      })
      .catch(() => setOrders([]))
      .finally(() => setLoading(false));
  }, [allowed, page, status, supplierId]);

  if (!allowed) return <Navigate to="/orders" replace />;

  return (
    <>
      <PageMeta title="All Orders | Buyology" description="Every order across the platform" />
      <PageBreadcrumb pageTitle="All Orders" />

      <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="mb-4 flex flex-wrap items-end gap-4">
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Status</label>
            <select
              value={status}
              onChange={(e) => {
                setPage(0);
                setStatus(e.target.value as OrderStatus | "");
              }}
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
            >
              <option value="">All statuses</option>
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Supplier</label>
            <select
              value={supplierId}
              onChange={(e) => {
                setPage(0);
                setSupplierId(e.target.value);
              }}
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
            >
              <option value="">All suppliers</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {loading ? (
          <p className="text-sm text-gray-500">Loading…</p>
        ) : orders.length === 0 ? (
          <div className="rounded-xl border-2 border-dashed border-gray-200 p-8 text-center dark:border-gray-700">
            <p className="text-gray-500 dark:text-gray-400">No orders found.</p>
          </div>
        ) : (
          <>
            <OrdersTable
              orders={orders}
              linkTo={(o) => (o.storeId ? `/orders/${o.storeId}/${o.id}` : null)}
            />
            {totalPages > 1 && (
              <div className="mt-4 flex items-center justify-end gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs disabled:opacity-40 dark:border-gray-600 dark:text-gray-200"
                >
                  Prev
                </button>
                <span className="text-xs text-gray-500">
                  Page {page + 1} of {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                  disabled={page >= totalPages - 1}
                  className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs disabled:opacity-40 dark:border-gray-600 dark:text-gray-200"
                >
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
