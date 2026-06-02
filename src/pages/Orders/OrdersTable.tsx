import { Link } from "react-router";
import type { OrderAdminResponse } from "../../types/order.types";

function fmtMoney(n: number | undefined, currency?: string): string {
  const v = new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(
    Number(n ?? 0)
  );
  return currency ? `${v} ${currency}` : v;
}

function fmtDate(iso?: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString("en-US", { dateStyle: "medium" });
}

function statusClasses(status: string): string {
  if (["DELIVERED"].includes(status)) return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
  if (["CANCELLED", "FAILED"].includes(status)) return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
  if (["PENDING_PAYMENT"].includes(status)) return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400";
  return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
}

interface Props {
  orders: OrderAdminResponse[];
  /** When provided, the order id cell links here; return null to render plain text. */
  linkTo?: (order: OrderAdminResponse) => string | null;
}

export default function OrdersTable({ orders, linkTo }: Props) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100 dark:border-gray-800 text-left text-xs uppercase text-gray-500">
            <th className="pb-3 pr-4">Order</th>
            <th className="pb-3 pr-4">Status</th>
            <th className="pb-3 pr-4">Customer</th>
            <th className="pb-3 pr-4">Total</th>
            <th className="pb-3">Date</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
          {orders.map((o) => {
            const href = linkTo ? linkTo(o) : null;
            const shortId = o.id.slice(0, 8);
            const customer = [o.recipientFirstName, o.recipientLastName].filter(Boolean).join(" ") || "—";
            return (
              <tr key={o.id}>
                <td className="py-3 pr-4 font-mono text-xs text-gray-800 dark:text-gray-200">
                  {href ? (
                    <Link to={href} className="text-brand-500 hover:underline">
                      #{shortId}
                    </Link>
                  ) : (
                    <span>#{shortId}</span>
                  )}
                </td>
                <td className="py-3 pr-4">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusClasses(o.status)}`}>
                    {o.status}
                  </span>
                </td>
                <td className="py-3 pr-4 text-gray-600 dark:text-gray-400">{customer}</td>
                <td className="py-3 pr-4 text-gray-800 dark:text-gray-200">{fmtMoney(o.totalAmount, o.currency)}</td>
                <td className="py-3 text-gray-600 dark:text-gray-400 text-xs">{fmtDate(o.createdAt)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
