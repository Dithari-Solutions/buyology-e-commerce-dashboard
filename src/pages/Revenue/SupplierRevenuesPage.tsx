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
  type SupplierRevenueOverviewResponse,
} from "../../api/services/revenue.service";
import { fmtMoney, fmtPeriodLabel, OrdersBreakdownTable, RevenueFilterBar } from "./revenueUi";

export default function SupplierRevenuesPage() {
  const canExport = isSuperAdmin();
  const [period, setPeriod] = useState<RevenuePeriod>("MONTHLY");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [overview, setOverview] = useState<SupplierRevenueOverviewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState<RevenueExportFormat | null>(null);

  // Drill-in to a single supplier's bucketed report.
  const [selected, setSelected] = useState<{ id: string; name: string } | null>(null);
  const [detail, setDetail] = useState<RevenueReportResponse | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    revenueService
      .getSupplierRevenueOverview({ period, from: from || undefined, to: to || undefined })
      .then((r) => setOverview(r.data ?? null))
      .catch(() => setOverview(null))
      .finally(() => setLoading(false));
  }, [period, from, to]);

  useEffect(() => {
    if (!selected) {
      setDetail(null);
      return;
    }
    setDetailLoading(true);
    revenueService
      .getSupplierRevenue(selected.id, { period, from: from || undefined, to: to || undefined })
      .then((r) => setDetail(r.data ?? null))
      .catch(() => setDetail(null))
      .finally(() => setDetailLoading(false));
  }, [selected, period, from, to]);

  async function handleExport(format: RevenueExportFormat) {
    try {
      setExporting(format);
      const res = await revenueService.createExport({
        type: "SUPPLIER_ALL",
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
      <PageMeta title="Supplier Revenues | Buyology" description="Per-supplier revenue" />
      <PageBreadcrumb pageTitle="Supplier Revenues" />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
          <p className="text-xs uppercase text-gray-500 dark:text-gray-400 mb-1">Gross Supplier Revenue</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {overview ? fmtMoney(overview.totalRevenue) : "—"}
          </p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
          <p className="text-xs uppercase text-gray-500 dark:text-gray-400 mb-1">Refunds</p>
          <p className="text-2xl font-bold text-red-500">
            {overview ? `-${fmtMoney(overview.totalRefunded)}` : "—"}
          </p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
          <p className="text-xs uppercase text-gray-500 dark:text-gray-400 mb-1">Net Supplier Revenue</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {overview ? fmtMoney(overview.netRevenue) : "—"}
          </p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
          <p className="text-xs uppercase text-gray-500 dark:text-gray-400 mb-1">Total Orders</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {overview ? overview.totalOrders.toLocaleString() : "—"}
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
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
        ) : !overview || overview.suppliers.length === 0 ? (
          <div className="rounded-xl border-2 border-dashed border-gray-200 p-8 text-center dark:border-gray-700">
            <p className="text-gray-500 dark:text-gray-400">No supplier revenue for the selected period.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-800 text-left text-xs uppercase text-gray-500">
                  <th className="pb-3 pr-4">Supplier</th>
                  <th className="pb-3 pr-4">Orders</th>
                  <th className="pb-3 pr-4">Gross</th>
                  <th className="pb-3 pr-4">Refunds</th>
                  <th className="pb-3 pr-4">Net</th>
                  <th className="pb-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {overview.suppliers.map((row) => (
                  <tr key={row.supplierId}>
                    <td className="py-3 pr-4 font-medium text-gray-800 dark:text-gray-200">{row.businessName}</td>
                    <td className="py-3 pr-4 text-gray-600 dark:text-gray-400">
                      {Number(row.orders).toLocaleString()}
                    </td>
                    <td className="py-3 pr-4 text-gray-600 dark:text-gray-400">{fmtMoney(row.revenue)}</td>
                    <td className="py-3 pr-4 text-red-500">
                      {Number(row.refunded) > 0 ? `-${fmtMoney(row.refunded)}` : fmtMoney(0)}
                    </td>
                    <td className="py-3 pr-4 font-medium text-gray-800 dark:text-gray-200">{fmtMoney(row.net)}</td>
                    <td className="py-3 text-right">
                      <button
                        onClick={() => setSelected({ id: row.supplierId, name: row.businessName })}
                        className="text-xs font-medium text-brand-500 hover:underline"
                      >
                        View breakdown
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Drill-in: single supplier bucketed report */}
      {selected && (
        <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">
              {selected.name} — {period.toLowerCase()} breakdown
            </h3>
            <button
              onClick={() => setSelected(null)}
              className="text-xs font-medium text-gray-500 hover:underline"
            >
              Close
            </button>
          </div>
          {detailLoading ? (
            <p className="text-sm text-gray-500">Loading…</p>
          ) : !detail || (detail.buckets.length === 0 && detail.orders.length === 0) ? (
            <p className="text-sm text-gray-500">No data for the selected period.</p>
          ) : (
            <>
              <h4 className="mb-2 text-xs font-semibold uppercase text-gray-500">Summary by period</h4>
              <div className="overflow-x-auto mb-6">
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
                    {detail.buckets.map((row) => (
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
              <h4 className="mb-2 text-xs font-semibold uppercase text-gray-500">Orders ({detail.orders.length})</h4>
              <OrdersBreakdownTable orders={detail.orders} />
            </>
          )}
        </div>
      )}
    </>
  );
}
