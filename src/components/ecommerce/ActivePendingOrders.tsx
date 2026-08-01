import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import Badge from "../ui/badge/Badge";
import { ordersService } from "../../api";
import { ORDER_STATUS_BUCKETS, type OrderAdminResponse, type OrderStatus } from "../../types/order.types";

type BadgeColor = "success" | "error" | "warning" | "info" | "light";

function statusColor(status: OrderStatus): BadgeColor {
  if (ORDER_STATUS_BUCKETS.done.includes(status)) {
    return status === "DELIVERED" ? "success" : "error";
  }
  if (ORDER_STATUS_BUCKETS.active.includes(status)) return "info";
  return "warning";
}

const ACTIVE_OR_PENDING: OrderStatus[] = [
  ...ORDER_STATUS_BUCKETS.pending,
  ...ORDER_STATUS_BUCKETS.active,
];

export default function ActivePendingOrders() {
  const [orders, setOrders] = useState<OrderAdminResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    Promise.all(
      ACTIVE_OR_PENDING.map((status) =>
        ordersService
          .getAll({ status, size: 50 }, controller.signal)
          .then((res) => res.data?.content ?? [])
          .catch(() => [] as OrderAdminResponse[])
      )
    )
      .then((results) => {
        const flat = results.flat();
        const seen = new Set<string>();
        const deduped = flat.filter((o) => (seen.has(o.id) ? false : (seen.add(o.id), true)));
        deduped.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setOrders(deduped);
      })
      .catch((e: unknown) => {
        if (e instanceof Error && e.name === "AbortError") return;
        setError("Failed to load active orders.");
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, []);

  const top = useMemo(() => orders.slice(0, 8), [orders]);

  return (
    <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
      <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4 dark:border-gray-800">
        <div>
          <h3 className="font-semibold text-gray-800 dark:text-white/90">
            Pending & Active Orders
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {loading ? "Loading…" : `${orders.length} requiring attention`}
          </p>
        </div>
        <Link
          to="/orders/all?bucket=active"
          className="text-sm font-medium text-brand-500 hover:text-brand-600"
        >
          View all
        </Link>
      </div>

      {error && (
        <div className="px-6 py-8 text-center text-sm text-red-500">{error}</div>
      )}

      {!error && (
        <div className="divide-y divide-gray-100 dark:divide-gray-800">
          {loading && Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-6 py-4">
              <div className="h-3 w-32 rounded-full bg-gray-100 animate-pulse dark:bg-gray-800" />
              <div className="ml-auto h-3 w-16 rounded-full bg-gray-100 animate-pulse dark:bg-gray-800" />
            </div>
          ))}

          {!loading && top.length === 0 && (
            <div className="px-6 py-12 text-center text-sm text-gray-500">
              No pending or active orders right now.
            </div>
          )}

          {!loading && top.map((o) => (
            <Link
              key={o.id}
              to={`/orders/${o.storeId}/${o.id}`}
              className="flex items-center gap-4 px-6 py-3.5 transition-colors hover:bg-gray-50 dark:hover:bg-white/[0.02]"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-gray-800 dark:text-white/90">
                  #{o.orderNumber || o.id.substring(0, 8)} ·{" "}
                  {[o.customerFirstName ?? o.recipientFirstName, o.customerLastName ?? o.recipientLastName]
                    .filter(Boolean)
                    .join(" ")}
                </p>
                <p className="mt-0.5 text-xs text-gray-500">
                  {o.currency} {o.totalAmount.toFixed(2)} · {new Date(o.createdAt).toLocaleString()}
                </p>
              </div>
              <Badge size="sm" color={statusColor(o.status)}>
                {o.status.replace(/_/g, " ")}
              </Badge>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
