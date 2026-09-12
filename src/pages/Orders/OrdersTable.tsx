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

/**
 * Which money state a row is in.
 *
 * Only an explicit CASH_ON_DELIVERY counts as cash — both fields are optional over the wire, and
 * reading an absent paymentMethod as "unpaid" would brand every order the field predates as money
 * owed. moneyCollected is the server's answer and the only one worth asking: a cash order is
 * delivered while it still owes the money and never passes through PAID, so neither the status
 * nor paidAt can be used to work it out here.
 */
function cashState(o: OrderAdminResponse): "none" | "due" | "collected" {
  if (o.paymentMethod !== "CASH_ON_DELIVERY") return "none";
  return o.moneyCollected ? "collected" : "due";
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
            const customer =
              [o.customerFirstName ?? o.recipientFirstName, o.customerLastName ?? o.recipientLastName]
                .filter(Boolean)
                .join(" ") || "—";
            const cash = cashState(o);
            // An order that died collects nothing, so its unpaid cash is not money owed and must
            // not sit in the list wearing an alert. Of the rest, handed over and still unpaid is
            // the money that is physically out there, and the only state allowed to shout.
            const cashChasing = cash === "due" && !["CANCELLED", "FAILED", "EXPIRED"].includes(o.status);
            const cashOutstanding = cashChasing && o.status === "DELIVERED";
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
                  <div className="flex flex-col items-start gap-1">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusClasses(o.status)}`}>
                      {o.status}
                    </span>
                    {cash !== "none" && (
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                          !cashChasing
                            ? "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"
                            : cashOutstanding
                              ? "bg-red-100 text-red-700 ring-1 ring-red-300 dark:bg-red-500/15 dark:text-red-400 dark:ring-red-500/40"
                              : "bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400"
                        }`}
                      >
                        <svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor"><path fillRule="evenodd" d="M1 5h22v14H1V5zm11 3.2a3.8 3.8 0 1 0 0 7.6 3.8 3.8 0 0 0 0-7.6z" /></svg>
                        {cash === "collected"
                          ? "Cash collected"
                          : cashOutstanding
                            ? "Cash not collected"
                            : "Cash on delivery"}
                      </span>
                    )}
                    {o.deliveryMethod === "EXPRESS" && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-[10px] font-semibold text-green-700 dark:bg-green-500/10 dark:text-green-400">
                        <svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor"><path d="M13 2 4.5 13H11l-1 9 8.5-11H12l1-9z" /></svg>
                        Quick delivery
                      </span>
                    )}
                  </div>
                </td>
                <td className="py-3 pr-4 text-gray-600 dark:text-gray-400">
                  <div className="flex flex-col">
                    <span>{customer}</span>
                    {o.customerEmail && (
                      <span className="text-xs text-gray-400 dark:text-gray-500">{o.customerEmail}</span>
                    )}
                    {(o.customerPhone || o.recipientPhone) && (
                      <span className="text-xs text-gray-400 dark:text-gray-500">{o.customerPhone || o.recipientPhone}</span>
                    )}
                  </div>
                </td>
                {/* Colour, not extra words: the pill already says what is owed, and tinting every
                    cash row rather than only the outstanding ones would alert on half the table. */}
                <td
                  className={`py-3 pr-4 ${
                    cashOutstanding ? "font-semibold text-red-600 dark:text-red-400" : "text-gray-800 dark:text-gray-200"
                  }`}
                >
                  {fmtMoney(o.totalAmount, o.currency)}
                </td>
                <td className="py-3 text-gray-600 dark:text-gray-400 text-xs">{fmtDate(o.createdAt)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
