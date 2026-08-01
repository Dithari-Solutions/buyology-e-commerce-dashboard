import { useEffect, useState } from "react";
import { Navigate } from "react-router";
import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import { isSuperAdmin } from "../../auth/roles";
import {
  downloadExport,
  revenueService,
  type RevenueExportRecord,
} from "../../api/services/revenue.service";

const TYPE_LABELS: Record<string, string> = {
  PLATFORM: "Buyology revenue",
  SUPPLIER_ALL: "All suppliers",
  SUPPLIER: "Single supplier",
};

function fmtDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
}

export default function RevenueExportsPage() {
  // Defence in depth — the route is admin-gated, but exports history is SUPERADMIN-only.
  const allowed = isSuperAdmin();
  const [exports, setExports] = useState<RevenueExportRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!allowed) return;
    setLoading(true);
    revenueService
      .listExports()
      .then((r) => setExports(r.data ?? []))
      .catch(() => setExports([]))
      .finally(() => setLoading(false));
  }, [allowed]);

  if (!allowed) return <Navigate to="/revenue" replace />;

  return (
    <>
      <PageMeta title="Revenue Exports | Buyology" description="Revenue export history" />
      <PageBreadcrumb pageTitle="Revenue Exports" />

      <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
        <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
          Every revenue export is archived in object storage. This log shows who exported what.
        </p>

        {loading ? (
          <p className="text-sm text-gray-500">Loading…</p>
        ) : exports.length === 0 ? (
          <div className="rounded-xl border-2 border-dashed border-gray-200 p-5 text-center dark:border-gray-700">
            <p className="text-gray-500 dark:text-gray-400">No exports yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-800 text-left text-xs uppercase text-gray-500">
                  <th className="pb-3 pr-4">File</th>
                  <th className="pb-3 pr-4">Type</th>
                  <th className="pb-3 pr-4">Format</th>
                  <th className="pb-3 pr-4">Period</th>
                  <th className="pb-3 pr-4">Range</th>
                  <th className="pb-3 pr-4">Exported by</th>
                  <th className="pb-3 pr-4">When</th>
                  <th className="pb-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {exports.map((e) => (
                  <tr key={e.id}>
                    <td className="py-3 pr-4 text-gray-800 dark:text-gray-200 text-xs max-w-[220px] truncate" title={e.fileName}>
                      {e.fileName}
                    </td>
                    <td className="py-3 pr-4 text-gray-600 dark:text-gray-400">
                      {TYPE_LABELS[e.exportType] ?? e.exportType}
                    </td>
                    <td className="py-3 pr-4 text-gray-600 dark:text-gray-400">{e.format}</td>
                    <td className="py-3 pr-4 text-gray-600 dark:text-gray-400">{e.period}</td>
                    <td className="py-3 pr-4 text-gray-600 dark:text-gray-400 text-xs">
                      {e.fromDate} → {e.toDate}
                    </td>
                    <td className="py-3 pr-4 text-gray-600 dark:text-gray-400 text-xs">
                      {e.exportedByEmail ?? "—"}
                      {e.exportedByRole ? (
                        <span className="ml-1 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] uppercase text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                          {e.exportedByRole}
                        </span>
                      ) : null}
                    </td>
                    <td className="py-3 pr-4 text-gray-600 dark:text-gray-400 text-xs">{fmtDate(e.createdAt)}</td>
                    <td className="py-3 text-right">
                      <button
                        onClick={() => downloadExport(e)}
                        disabled={!e.downloadUrl}
                        className="text-xs font-medium text-brand-500 hover:underline disabled:opacity-40"
                      >
                        Download
                      </button>
                    </td>
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
