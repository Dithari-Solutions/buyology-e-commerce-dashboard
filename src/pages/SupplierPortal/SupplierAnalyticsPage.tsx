import { useEffect, useState } from "react";
import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import { suppliersService } from "../../api/services/suppliers.service";
import {
  downloadExport,
  revenueService,
  type RevenueExportFormat,
  type RevenuePeriod,
  type RevenueReportResponse,
} from "../../api/services/revenue.service";
import { fmtMoney, fmtPeriodLabel, RevenueFilterBar } from "../Revenue/revenueUi";

export default function SupplierAnalyticsPage() {
  const [summary, setSummary] = useState<{ totalOrders: number; totalRevenue: number } | null>(null);

  const [period, setPeriod] = useState<RevenuePeriod>("MONTHLY");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [report, setReport] = useState<RevenueReportResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState<RevenueExportFormat | null>(null);

  useEffect(() => {
    suppliersService
      .getAnalyticsSummary()
      .then((r) => setSummary(r.data ?? null))
      .catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    revenueService
      .getMyRevenue({ period, from: from || undefined, to: to || undefined })
      .then((r) => setReport(r.data ?? null))
      .catch(() => setReport(null))
      .finally(() => setLoading(false));
  }, [period, from, to]);

  async function handleExport(format: RevenueExportFormat) {
    try {
      setExporting(format);
      const res = await revenueService.exportMyRevenue({
        format,
        period,
        from: from || undefined,
        to: to || undefined,
      });
      downloadExport(res.data);
    } catch {
      /* ignore */
    } finally {
      setExporting(null);
    }
  }

  return (
    <>
      <PageMeta title="My Analytics | Buyology Supplier" description="Your sales analytics" />
      <PageBreadcrumb pageTitle="Analytics" />

      {/* Lifetime summary cards */}
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
            {summary ? fmtMoney(summary.totalRevenue) : "—"}
          </p>
        </div>
      </div>

      {/* Revenue breakdown with daily/weekly/monthly/yearly filter + export */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
        <h3 className="mb-4 text-base font-semibold text-gray-900 dark:text-white">Revenue</h3>
        <RevenueFilterBar
          period={period}
          onPeriodChange={setPeriod}
          from={from}
          to={to}
          onFromChange={setFrom}
          onToChange={setTo}
        >
          <button
            onClick={() => handleExport("XLSX")}
            disabled={exporting !== null}
            className="rounded-lg bg-brand-500 px-4 py-2 text-xs font-medium text-white disabled:opacity-50"
          >
            {exporting === "XLSX" ? "Exporting…" : "Export Excel"}
          </button>
          <button
            onClick={() => handleExport("CSV")}
            disabled={exporting !== null}
            className="rounded-lg border border-gray-300 px-4 py-2 text-xs font-medium text-gray-700 disabled:opacity-50 dark:border-gray-600 dark:text-gray-200"
          >
            {exporting === "CSV" ? "Exporting…" : "Export CSV"}
          </button>
          <button
            onClick={() => handleExport("PDF")}
            disabled={exporting !== null}
            className="rounded-lg border border-gray-300 px-4 py-2 text-xs font-medium text-gray-700 disabled:opacity-50 dark:border-gray-600 dark:text-gray-200"
          >
            {exporting === "PDF" ? "Exporting…" : "Export PDF"}
          </button>
        </RevenueFilterBar>

        {loading ? (
          <p className="text-sm text-gray-500">Loading…</p>
        ) : !report || report.buckets.length === 0 ? (
          <div className="rounded-xl border-2 border-dashed border-gray-200 p-8 text-center dark:border-gray-700">
            <p className="text-gray-500 dark:text-gray-400">No data for the selected period.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-800 text-left text-xs uppercase text-gray-500">
                  <th className="pb-3 pr-4">Period</th>
                  <th className="pb-3 pr-4">Orders</th>
                  <th className="pb-3 pr-4">Gross</th>
                  <th className="pb-3 pr-4">Refunds</th>
                  <th className="pb-3">Net</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {report.buckets.map((row) => (
                  <tr key={row.period}>
                    <td className="py-3 pr-4 text-gray-800 dark:text-gray-200 text-xs">
                      {fmtPeriodLabel(period, row.period)}
                    </td>
                    <td className="py-3 pr-4 text-gray-600 dark:text-gray-400">
                      {Number(row.orders).toLocaleString()}
                    </td>
                    <td className="py-3 pr-4 text-gray-600 dark:text-gray-400">{fmtMoney(row.revenue)}</td>
                    <td className="py-3 pr-4 text-red-500">
                      {Number(row.refunded) > 0 ? `-${fmtMoney(row.refunded)}` : fmtMoney(0)}
                    </td>
                    <td className="py-3 font-medium text-gray-800 dark:text-gray-200">{fmtMoney(row.net)}</td>
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
