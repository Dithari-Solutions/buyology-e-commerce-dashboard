import { useEffect, useState } from "react";
import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import { suppliersService } from "../../api/services/suppliers.service";

interface MonthRow {
  month: string;
  orders: number;
  revenue: number;
}

interface StatsResponse {
  from: string;
  to: string;
  monthly: MonthRow[];
}

function fmt(n: number) {
  return new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
}

export default function SupplierAnalyticsPage() {
  const [summary, setSummary] = useState<{ totalOrders: number; totalRevenue: number } | null>(null);
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const now = new Date();
  const defaultFrom = new Date(now.getFullYear(), now.getMonth() - 5, 1).toISOString().slice(0, 10);
  const defaultTo = now.toISOString().slice(0, 10);

  const [fromDate, setFromDate] = useState(defaultFrom);
  const [toDate, setToDate] = useState(defaultTo);

  useEffect(() => {
    suppliersService.getAnalyticsSummary().then((r) => setSummary(r.data ?? null)).catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    suppliersService
      .getAnalyticsStats(fromDate, toDate)
      .then((r) => setStats(r.data as StatsResponse))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [fromDate, toDate]);

  return (
    <>
      <PageMeta title="My Analytics | Buyology Supplier" description="Your sales analytics" />
      <PageBreadcrumb pageTitle="Analytics" />

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
          <p className="text-xs uppercase text-gray-500 dark:text-gray-400 mb-1">Total Orders</p>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">
            {summary ? summary.totalOrders.toLocaleString() : "—"}
          </p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
          <p className="text-xs uppercase text-gray-500 dark:text-gray-400 mb-1">Total Revenue</p>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">
            {summary ? fmt(summary.totalRevenue) : "—"}
          </p>
        </div>
      </div>

      {/* Monthly breakdown */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="mb-4 flex flex-wrap items-end gap-4">
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">From</label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">To</label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
            />
          </div>
        </div>

        {loading ? (
          <p className="text-sm text-gray-500">Loading…</p>
        ) : !stats || stats.monthly.length === 0 ? (
          <div className="rounded-xl border-2 border-dashed border-gray-200 p-8 text-center dark:border-gray-700">
            <p className="text-gray-500 dark:text-gray-400">No data for the selected period.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-800 text-left text-xs uppercase text-gray-500">
                  <th className="pb-3 pr-4">Month</th>
                  <th className="pb-3 pr-4">Orders</th>
                  <th className="pb-3">Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {stats.monthly.map((row) => (
                  <tr key={row.month}>
                    <td className="py-3 pr-4 text-gray-800 dark:text-gray-200 text-xs">
                      {row.month ? new Date(row.month).toLocaleDateString("en-US", { year: "numeric", month: "short" }) : "—"}
                    </td>
                    <td className="py-3 pr-4 text-gray-600 dark:text-gray-400">{Number(row.orders).toLocaleString()}</td>
                    <td className="py-3 text-gray-600 dark:text-gray-400">{fmt(Number(row.revenue))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
