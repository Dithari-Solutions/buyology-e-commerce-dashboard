import type { RevenueOrderRow, RevenuePeriod } from "../../api/services/revenue.service";

export const PERIODS: RevenuePeriod[] = ["DAILY", "WEEKLY", "MONTHLY", "YEARLY"];

const PERIOD_LABELS: Record<RevenuePeriod, string> = {
  DAILY: "Daily",
  WEEKLY: "Weekly",
  MONTHLY: "Monthly",
  YEARLY: "Yearly",
};

export function fmtMoney(n: number): string {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(n ?? 0));
}

/** Render a bucket's period key into a label appropriate for the granularity. */
export function fmtPeriodLabel(period: RevenuePeriod, raw: string): string {
  if (!raw) return "—";
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return raw;
  switch (period) {
    case "DAILY":
      return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
    case "WEEKLY":
      return `Week of ${d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
    case "MONTHLY":
      return d.toLocaleDateString("en-US", { year: "numeric", month: "short" });
    case "YEARLY":
      return d.toLocaleDateString("en-US", { year: "numeric" });
    default:
      return raw;
  }
}

interface FilterBarProps {
  period: RevenuePeriod;
  onPeriodChange: (p: RevenuePeriod) => void;
  from: string;
  to: string;
  onFromChange: (v: string) => void;
  onToChange: (v: string) => void;
  children?: React.ReactNode;
}

/** Daily/Weekly/Monthly/Yearly pills + optional date range, with a trailing slot for actions. */
export function RevenueFilterBar({
  period,
  onPeriodChange,
  from,
  to,
  onFromChange,
  onToChange,
  children,
}: FilterBarProps) {
  return (
    <div className="mb-4 flex flex-wrap items-end gap-4">
      <div className="flex flex-wrap items-center gap-2">
        {PERIODS.map((p) => (
          <button
            key={p}
            onClick={() => onPeriodChange(p)}
            className={`rounded-full px-4 py-1.5 text-xs font-medium transition-colors ${
              period === p
                ? "bg-brand-500 text-white"
                : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300"
            }`}
          >
            {PERIOD_LABELS[p]}
          </button>
        ))}
      </div>
      <div>
        <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">From</label>
        <input
          type="date"
          value={from}
          onChange={(e) => onFromChange(e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
        />
      </div>
      <div>
        <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">To</label>
        <input
          type="date"
          value={to}
          onChange={(e) => onToChange(e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
        />
      </div>
      {children && <div className="ml-auto flex items-end gap-2">{children}</div>}
    </div>
  );
}

function fmtDateTime(iso: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
}

/** Per-order revenue breakdown — one row per order (not aggregated by period). */
export function OrdersBreakdownTable({ orders }: { orders: RevenueOrderRow[] }) {
  if (!orders || orders.length === 0) {
    return (
      <div className="rounded-xl border-2 border-dashed border-gray-200 p-6 text-center dark:border-gray-700">
        <p className="text-sm text-gray-500 dark:text-gray-400">No orders for the selected period.</p>
      </div>
    );
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100 dark:border-gray-800 text-left text-xs uppercase text-gray-500">
            <th className="pb-3 pr-4">Order</th>
            <th className="pb-3 pr-4">Date</th>
            <th className="pb-3 pr-4">Gross</th>
            <th className="pb-3 pr-4">Refunds</th>
            <th className="pb-3">Net</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
          {orders.map((o) => (
            <tr key={o.orderId}>
              <td className="py-3 pr-4 font-mono text-xs text-gray-800 dark:text-gray-200">#{o.orderId.slice(0, 8)}</td>
              <td className="py-3 pr-4 text-gray-600 dark:text-gray-400 text-xs">{fmtDateTime(o.createdAt)}</td>
              <td className="py-3 pr-4 text-gray-600 dark:text-gray-400">{fmtMoney(o.gross)}</td>
              <td className="py-3 pr-4 text-red-500">
                {Number(o.refunded) > 0 ? `-${fmtMoney(o.refunded)}` : fmtMoney(0)}
              </td>
              <td className="py-3 font-medium text-gray-800 dark:text-gray-200">{fmtMoney(o.net)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
