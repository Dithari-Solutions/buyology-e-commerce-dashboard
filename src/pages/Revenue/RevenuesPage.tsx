import { useEffect, useState } from "react";
import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import { isSuperAdmin } from "../../auth/roles";
import {
  downloadExport,
  revenueService,
  type RevenueExportFormat,
  type RevenuePeriod,
  type RevenueReportResponse,
} from "../../api/services/revenue.service";
import { fmtMoney, fmtPeriodLabel, OrdersBreakdownTable, RevenueFilterBar } from "./revenueUi";
import { storesService } from "../../api/services/stores.service";

export default function RevenuesPage() {
  const canExport = isSuperAdmin();
  const [period, setPeriod] = useState<RevenuePeriod>("MONTHLY");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [storeId, setStoreId] = useState("");
  const [stores, setStores] = useState<{ id: string; name: string }[]>([]);
  const [report, setReport] = useState<RevenueReportResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState<RevenueExportFormat | null>(null);

  useEffect(() => {
    storesService
      .getAll()
      .then((r) => setStores((r.data ?? []).map((s) => ({ id: s.id, name: s.name }))))
      .catch(() => setStores([]));
  }, []);

  useEffect(() => {
    setLoading(true);
    revenueService
      .getPlatformRevenue({
        period,
        from: from || undefined,
        to: to || undefined,
        storeId: storeId || undefined,
      })
      .then((r) => setReport(r.data ?? null))
      .catch(() => setReport(null))
      .finally(() => setLoading(false));
  }, [period, from, to, storeId]);

  async function handleExport(format: RevenueExportFormat) {
    try {
      setExporting(format);
      const res = await revenueService.createExport({
        type: "PLATFORM",
        format,
        period,
        from: from || undefined,
        to: to || undefined,
        storeId: storeId || undefined,
      });
      downloadExport(res.data);
    } catch {
      /* swallow — surfaced by global error handling */
    } finally {
      setExporting(null);
    }
  }

  return (
    <>
      <PageMeta title="Revenues | Buyology" description="Buyology platform revenue" />
      <PageBreadcrumb pageTitle="Revenues" />

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
          <p className="text-xs uppercase text-gray-500 dark:text-gray-400 mb-1">Gross Revenue</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {report ? fmtMoney(report.totalRevenue) : "—"}
          </p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
          <p className="text-xs uppercase text-gray-500 dark:text-gray-400 mb-1">Refunds</p>
          <p className="text-2xl font-bold text-red-500">
            {report ? `-${fmtMoney(report.totalRefunded)}` : "—"}
          </p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
          <p className="text-xs uppercase text-gray-500 dark:text-gray-400 mb-1">Net Revenue (Buyology)</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {report ? fmtMoney(report.netRevenue) : "—"}
          </p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
          <p className="text-xs uppercase text-gray-500 dark:text-gray-400 mb-1">Delivery Fees (AED)</p>
          <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            {report ? fmtMoney(report.totalDeliveryFeeRevenue) : "—"}
          </p>
          <p className="mt-1 text-[11px] text-gray-400">Courier return-pickup fees</p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
          <p className="text-xs uppercase text-gray-500 dark:text-gray-400 mb-1">Total Orders</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {report ? report.totalOrders.toLocaleString() : "—"}
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
        {/* Store filter */}
        <div className="mb-3">
          <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Store</label>
          <select
            value={storeId}
            onChange={(e) => setStoreId(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
          >
            <option value="">All stores</option>
            {stores.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
        <RevenueFilterBar
          period={period}
          onPeriodChange={setPeriod}
          from={from}
          to={to}
          onFromChange={setFrom}
          onToChange={setTo}
        >
          {canExport && (
            <>
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
            </>
          )}
        </RevenueFilterBar>

        {loading ? (
          <p className="text-sm text-gray-500">Loading…</p>
        ) : !report || (report.buckets.length === 0 && report.orders.length === 0) ? (
          <div className="rounded-xl border-2 border-dashed border-gray-200 p-8 text-center dark:border-gray-700">
            <p className="text-gray-500 dark:text-gray-400">No revenue for the selected period.</p>
          </div>
        ) : (
          <>
            <h4 className="mb-2 text-xs font-semibold uppercase text-gray-500">Summary by period</h4>
            <div className="overflow-x-auto mb-8">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-gray-800 text-left text-xs uppercase text-gray-500">
                    <th className="pb-3 pr-4">Period</th>
                    <th className="pb-3 pr-4">Orders</th>
                    <th className="pb-3 pr-4">Gross</th>
                    <th className="pb-3 pr-4">Refunds</th>
                    <th className="pb-3 pr-4">Net</th>
                    <th className="pb-3">Delivery Fees</th>
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
                      <td className="py-3 pr-4 font-medium text-gray-800 dark:text-gray-200">{fmtMoney(row.net)}</td>
                      <td className="py-3 text-emerald-600 dark:text-emerald-400">
                        {Number(row.deliveryFeeRevenue) > 0 ? fmtMoney(row.deliveryFeeRevenue) : fmtMoney(0)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <h4 className="mb-2 text-xs font-semibold uppercase text-gray-500">Orders ({report.orders.length})</h4>
            <OrdersBreakdownTable orders={report.orders} />
          </>
        )}
      </div>
    </>
  );
}
