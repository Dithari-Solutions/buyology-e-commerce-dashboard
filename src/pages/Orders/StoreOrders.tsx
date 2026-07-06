import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router";
import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import Badge from "../../components/ui/badge/Badge";
import { ordersService, ApiRequestError } from "../../api";
import type { OrderAdminResponse, OrderStatus } from "../../types";
import { ORDER_STATUS_BUCKETS } from "../../types/order.types";

// The buckets shown in the store-orders segmented control, in display order. Waiting
// (unpaid) and Paid are split apart so the admin sees actionable paid orders at a glance.
const DISPLAY_BUCKETS = ["waiting", "paid", "active", "done"] as const;
type DisplayBucket = (typeof DISPLAY_BUCKETS)[number];

const BUCKET_LABELS: Record<DisplayBucket, string> = {
  waiting: "Awaiting payment",
  paid: "Paid",
  active: "Active",
  done: "Done",
};

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
    case "FAILED":
    case "REFUNDED":
    case "EXPIRED":
      return "error";
    case "PACKAGING":
    case "IN_COURIER":
    case "IN_TRANSIT":
    case "PICKED_UP":
    case "SHIPPED":
    case "PROCESSING":
    case "COURIER_ASSIGNED":
      return "info";
    case "PAID":
      return "success";
    case "PENDING":
    case "PENDING_PAYMENT":
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
  const [bucket, setBucket] = useState<DisplayBucket>("paid");

  const bucketStatuses = ORDER_STATUS_BUCKETS[bucket];
  const filtered = orders.filter((o) => bucketStatuses.includes(o.status));
  const counts = {
    waiting: orders.filter((o) => ORDER_STATUS_BUCKETS.waiting.includes(o.status)).length,
    paid: orders.filter((o) => ORDER_STATUS_BUCKETS.paid.includes(o.status)).length,
    active: orders.filter((o) => ORDER_STATUS_BUCKETS.active.includes(o.status)).length,
    done: orders.filter((o) => ORDER_STATUS_BUCKETS.done.includes(o.status)).length,
  };

  const fetchOrders = useCallback((signal?: AbortSignal) => {
    if (!storeId) return;
    setLoading(true);
    setError(null);
    ordersService
      .getAll({ storeId, size: 200 }, signal)
      .then((res) => setOrders(Array.isArray(res.data?.content) ? res.data.content : []))
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

      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90">
          Orders List
          {!loading && (
            <span className="ml-2 text-sm font-normal text-gray-400">({filtered.length})</span>
          )}
        </h2>

        <div className="inline-flex rounded-xl border border-gray-200 bg-white p-1 dark:border-gray-700 dark:bg-white/[0.03]">
          {DISPLAY_BUCKETS.map((b) => (
            <button
              key={b}
              type="button"
              onClick={() => setBucket(b)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                bucket === b
                  ? "bg-brand-500 text-white"
                  : "text-gray-600 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-white/[0.03]"
              }`}
            >
              {BUCKET_LABELS[b]}
              <span className="ml-1.5 opacity-70">({counts[b]})</span>
            </button>
          ))}
        </div>
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
                {!loading && filtered.map((order) => (
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
                      <div className="text-sm font-medium text-gray-800 dark:text-white/90">
                        {[order.customerFirstName ?? order.recipientFirstName, order.customerLastName ?? order.recipientLastName]
                          .filter(Boolean)
                          .join(" ") || "—"}
                      </div>
                      <div className="text-xs text-gray-400">{order.customerEmail || "No Email"}</div>
                      <div className="text-xs text-gray-400">
                        {order.customerPhone || order.recipientPhone || "No Phone"}
                      </div>
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-600 dark:text-gray-300">
                      {formatDate(order.createdAt)}
                    </td>
                    <td className="px-4 py-4 text-sm font-medium text-gray-800 dark:text-white/90">
                      {order.currency} {order.totalAmount.toFixed(2)}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex flex-col items-start gap-1">
                        <Badge size="sm" color={statusColor(order.status)}>
                          {order.status}
                        </Badge>
                        {order.deliveryMethod === "EXPRESS" && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-[10px] font-semibold text-green-700 dark:bg-green-500/10 dark:text-green-400">
                            <svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor"><path d="M13 2 4.5 13H11l-1 9 8.5-11H12l1-9z" /></svg>
                            Quick delivery
                          </span>
                        )}
                      </div>
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
          {!loading && filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-center text-gray-500">
              No {BUCKET_LABELS[bucket].toLowerCase()} orders for this store.
            </div>
          )}
        </div>
      )}
    </>
  );
}
