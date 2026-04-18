import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router";
import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import Badge from "../../components/ui/badge/Badge";
import { ordersService, ApiRequestError } from "../../api";
import type { OrderAdminResponse, OrderStatus } from "../../types";

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

type BadgeColor = "success" | "error" | "warning" | "info" | "light";

function statusColor(status: OrderStatus): BadgeColor {
  switch (status) {
    case "DELIVERED":
      return "success";
    case "CANCELLED":
    case "REFUNDED":
    case "EXPIRED":
      return "error";
    case "PICKED_UP":
    case "SHIPPED":
    case "PROCESSING":
      return "info";
    case "PAID":
    case "PENDING":
      return "warning";
    default:
      return "light";
  }
}

function SkeletonRow() {
  return (
    <tr className="border-b border-gray-100 dark:border-gray-800">
      <td className="px-5 py-4">
        <div className="h-3.5 w-32 rounded-full bg-gray-200 dark:bg-gray-700 animate-pulse" />
      </td>
      {[1, 2, 3, 4, 5].map((i) => (
        <td key={i} className="px-4 py-4">
          <div className="h-3 w-20 rounded-full bg-gray-100 dark:bg-gray-800 animate-pulse" />
        </td>
      ))}
    </tr>
  );
}

export default function StoreOrders() {
  const { storeId } = useParams<{ storeId: string }>();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<OrderAdminResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOrders = useCallback((signal?: AbortSignal) => {
    if (!storeId) return;
    setLoading(true);
    setError(null);
    ordersService
      .getAll({ storeId }, signal)
      .then((res) => setOrders(res.content))
      .catch((err: unknown) => {
        if (err instanceof Error && err.name === "AbortError") return;
        setError(err instanceof ApiRequestError ? err.message : "Failed to load orders.");
      })
      .finally(() => setLoading(false));
  }, [storeId]);

  useEffect(() => {
    const controller = new AbortController();
    fetchOrders(controller.signal);
    return () => controller.abort();
  }, [fetchOrders]);

  return (
    <>
      <PageMeta
        title="Store Orders | Buyology Dashboard"
        description="View all orders for this store."
      />
      <PageBreadcrumb pageTitle="Store Orders" />

      <div className="mb-5 flex items-center justify-between">
        <button
          onClick={() => navigate("/orders")}
          className="flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
          Back to Stores
        </button>
      </div>

      <div className="mb-5">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90">
          Orders List
          {!loading && (
            <span className="ml-2 text-sm font-normal text-gray-400">({orders.length})</span>
          )}
        </h2>
      </div>

      {error && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-red-200 dark:border-red-800/40 bg-red-50 dark:bg-red-500/5 py-16 text-center">
          <p className="text-sm font-medium text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {!error && (
        <div className="overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03]">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-white/[0.02]">
                  <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">Order #</th>
                  <th className="px-4 py-3.5 text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">Customer</th>
                  <th className="px-4 py-3.5 text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">Date</th>
                  <th className="px-4 py-3.5 text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">Total</th>
                  <th className="px-4 py-3.5 text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">Status</th>
                  <th className="px-4 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading && Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)}
                {!loading && orders.map((order) => (
                  <tr
                    key={order.id}
                    onClick={() => navigate(`/orders/${storeId}/${order.id}`)}
                    className="border-b border-gray-100 dark:border-gray-800 transition-colors hover:bg-brand-50/50 dark:hover:bg-white/[0.02] cursor-pointer"
                  >
                    <td className="px-5 py-4">
                      <span className="text-sm font-medium text-gray-800 dark:text-white/90">
                        {order.orderNumber || order.id.substring(0, 8)}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="text-sm font-medium text-gray-800 dark:text-white/90">{order.customerName}</div>
                      <div className="text-xs text-gray-400">{order.customerEmail}</div>
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-600 dark:text-gray-300">
                      {formatDate(order.createdAt)}
                    </td>
                    <td className="px-4 py-4 text-sm font-medium text-gray-800 dark:text-white/90">
                      {order.currency} {order.totalAmount.toFixed(2)}
                    </td>
                    <td className="px-4 py-4">
                      <Badge size="sm" color={statusColor(order.status)}>
                        {order.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <button className="text-brand-500 hover:text-brand-600 text-sm font-medium">
                        Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!loading && orders.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-center text-gray-500">
              No orders found for this store.
            </div>
          )}
        </div>
      )}
    </>
  );
}
