import { useEffect, useState } from "react";
import { Link } from "react-router";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "../ui/table";
import Badge from "../ui/badge/Badge";
import { ordersService } from "../../api/services/orders.service";
import { productsService } from "../../api/services/products.service";
import { categoriesService } from "../../api/services/categories.service";
import type { OrderStatus } from "../../types/order.types";

type BadgeColor = "success" | "warning" | "error" | "info" | "light";

function statusColor(status: OrderStatus): BadgeColor {
  switch (status) {
    case "DELIVERED":
    case "PAID":
      return "success";
    case "CANCELLED":
    case "FAILED":
    case "REFUNDED":
    case "EXPIRED":
      return "error";
    case "PACKAGING":
    case "READY_FOR_PICKUP":
    case "IN_COURIER":
    case "IN_TRANSIT":
    case "PROCESSING":
    case "COURIER_ASSIGNED":
    case "PICKED_UP":
    case "SHIPPED":
      return "info";
    case "PENDING_PAYMENT":
    case "PENDING":
      return "warning";
    default:
      return "light";
  }
}

interface Row {
  orderId: string;
  storeId?: string;
  image: string | null;
  title: string;
  category: string;
  price: string;
  country: string;
  status: OrderStatus;
}

const HEADER_CLASS = "";

export default function RecentOrders() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const ctrl = new AbortController();
    (async () => {
      try {
        const [ordersRes, catsRes] = await Promise.all([
          ordersService.getAll({ page: 0, size: 5 }, ctrl.signal),
          categoriesService.getAll("EN", ctrl.signal).catch(() => null),
        ]);
        const orders = ordersRes.data?.content ?? [];
        const catMap = new Map<string, string>();
        (catsRes?.data ?? []).forEach((c) => catMap.set(c.id, c.name));

        // Order items don't carry product image/title/category, so enrich the first item
        // of each recent order from the product service (best-effort).
        const built = await Promise.all(
          orders.map(async (o): Promise<Row> => {
            const item = o.items?.[0];
            let image: string | null = null;
            let title = item?.productName || `Order #${o.id.slice(0, 8)}`;
            let category = "—";
            if (item?.productId) {
              try {
                const p = (await productsService.getById(item.productId, "EN", ctrl.signal)).data;
                if (p) {
                  title = p.title || title;
                  const primary = p.media?.find((m) => m.isPrimary) ?? p.media?.[0];
                  image = primary?.thumbnailUrl || primary?.url || null;
                  category = catMap.get(p.categoryId) ?? "—";
                }
              } catch {
                /* keep fallbacks */
              }
            }
            const amount = item?.totalPrice ?? o.totalAmount ?? 0;
            return {
              orderId: o.id,
              storeId: o.storeId,
              image,
              title,
              category,
              price: `${o.currency} ${amount.toFixed(2)}`,
              country: o.country || o.countryCode || "—",
              status: o.status,
            };
          })
        );
        if (!ctrl.signal.aborted) setRows(built);
      } catch {
        /* leave empty on failure */
      } finally {
        if (!ctrl.signal.aborted) setLoading(false);
      }
    })();
    return () => ctrl.abort();
  }, []);

  return (
    <div className="ui-card overflow-hidden">
      <div className="ui-card-head">
        <h3 className="ui-section-title">Recent Orders</h3>
        <Link
          to="/orders"
          className="inline-flex h-7 items-center rounded-lg border border-gray-300 bg-white px-2.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-white/5"
        >
          See all
        </Link>
      </div>
      <div className="max-w-full overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableCell isHeader className={HEADER_CLASS}>Product</TableCell>
              <TableCell isHeader className={HEADER_CLASS}>Category</TableCell>
              <TableCell isHeader className={HEADER_CLASS}>Price</TableCell>
              <TableCell isHeader className={HEADER_CLASS}>Country</TableCell>
              <TableCell isHeader className={HEADER_CLASS}>Status</TableCell>
            </TableRow>
          </TableHeader>

          <TableBody>
            {loading &&
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={`sk-${i}`}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="size-8 animate-pulse rounded-md bg-gray-100 dark:bg-white/5" />
                      <div className="h-3.5 w-28 rounded-full bg-gray-100 dark:bg-white/5 animate-pulse" />
                    </div>
                  </TableCell>
                  {[1, 2, 3, 4].map((c) => (
                    <TableCell key={c}>
                      <div className="h-3 w-16 rounded-full bg-gray-100 dark:bg-white/5 animate-pulse" />
                    </TableCell>
                  ))}
                </TableRow>
              ))}

            {!loading && rows.length === 0 && (
              <TableRow>
                <TableCell className="py-5 text-center text-gray-500 dark:text-gray-400">
                  No recent orders
                </TableCell>
              </TableRow>
            )}

            {!loading &&
              rows.map((r) => (
                <TableRow key={r.orderId}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="size-8 shrink-0 overflow-hidden rounded-md bg-gray-100 dark:bg-white/5">
                        {r.image && (
                          <img src={r.image} className="size-8 object-cover" alt={r.title} />
                        )}
                      </div>
                      <Link
                        to={r.storeId ? `/orders/${r.storeId}/${r.orderId}` : "/orders"}
                        className="font-medium text-gray-800 text-theme-sm hover:text-brand-500 dark:text-white/90 line-clamp-1"
                      >
                        {r.title}
                      </Link>
                    </div>
                  </TableCell>
                  <TableCell className="text-gray-500 dark:text-gray-400">
                    {r.category}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-gray-500 dark:text-gray-400">
                    {r.price}
                  </TableCell>
                  <TableCell className="text-gray-500 dark:text-gray-400">
                    {r.country}
                  </TableCell>
                  <TableCell className="text-gray-500 dark:text-gray-400">
                    <Badge size="sm" color={statusColor(r.status)}>
                      {r.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
