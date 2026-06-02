import { useEffect, useState } from "react";
import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import { ordersService } from "../../api/services/orders.service";
import type { OrderAdminResponse, OrderStatus } from "../../types/order.types";
import OrdersTable from "../Orders/OrdersTable";

const STATUS_OPTIONS: OrderStatus[] = [
  "PENDING_PAYMENT",
  "PAID",
  "PACKAGING",
  "IN_COURIER",
  "IN_TRANSIT",
  "DELIVERED",
  "CANCELLED",
  "FAILED",
];

export default function SupplierOrdersPage() {
  const [orders, setOrders] = useState<OrderAdminResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<OrderStatus | "">("");
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  useEffect(() => {
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

  return (
    <>
      <PageMeta title="My Orders | Buyology Supplier" description="Orders containing your products" />
      <PageBreadcrumb pageTitle="My Orders" />

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
        </div>

        {loading ? (
          <p className="text-sm text-gray-500">Loading…</p>
        ) : orders.length === 0 ? (
          <div className="rounded-xl border-2 border-dashed border-gray-200 p-8 text-center dark:border-gray-700">
            <p className="text-gray-500 dark:text-gray-400">No orders found.</p>
          </div>
        ) : (
          <>
            <OrdersTable orders={orders} />
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
