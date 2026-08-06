import { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router";
import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import { isRepair, isSuperAdmin } from "../../auth/roles";
import { repairService } from "../../api/services/repair.service";
import type { RepairRequest } from "../../api/services/repair.service";
import { STATUS_COLORS, STATUS_LABELS } from "./repairUi";

export default function Repair() {
  const allowed = isSuperAdmin() || isRepair();
  const navigate = useNavigate();

  const [requests, setRequests] = useState<RepairRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!allowed) return;
    const ac = new AbortController();
    setLoading(true);
    repairService
      .list(undefined, ac.signal)
      .then((r) => setRequests(r.data ?? []))
      .catch(() => setRequests([]))
      .finally(() => setLoading(false));
    return () => ac.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allowed]);

  if (!allowed) return <Navigate to="/" replace />;

  const newCount = requests.filter((r) => r.adminUnread).length;

  return (
    <>
      <PageMeta title="Repairs | Buyology" description="Manage customer device-repair requests" />
      <PageBreadcrumb pageTitle="Requests" />

      <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white">
            Repair Requests
            {newCount > 0 && (
              <span className="ml-2 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                {newCount} new
              </span>
            )}
          </h2>
        </div>

        {loading ? (
          <p className="text-sm text-gray-500">Loading…</p>
        ) : requests.length === 0 ? (
          <div className="rounded-xl border-2 border-dashed border-gray-200 p-8 text-center dark:border-gray-700">
            <p className="text-gray-500 dark:text-gray-400">No repair requests yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-800 text-left text-xs uppercase text-gray-500">
                  <th className="pb-3 pr-4">Ref</th>
                  <th className="pb-3 pr-4">Device</th>
                  <th className="pb-3 pr-4">Customer</th>
                  <th className="pb-3 pr-4">Date</th>
                  <th className="pb-3 pr-4">Status</th>
                  <th className="pb-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {requests.map((req) => (
                  <tr
                    key={req.id}
                    onClick={() => navigate(`/repair/${req.id}`)}
                    className={`cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-white/[0.02] ${
                      req.adminUnread ? "bg-red-50/50 dark:bg-red-900/10" : ""
                    }`}
                  >
                    <td className="py-3 pr-4 font-mono text-xs text-gray-600 dark:text-gray-400">
                      <span className="inline-flex items-center gap-1.5">
                        {req.adminUnread && <span className="h-2 w-2 rounded-full bg-red-500" />}
                        {req.reference ?? req.id.slice(0, 8)}
                      </span>
                    </td>
                    <td className="py-3 pr-4 font-medium text-gray-800 dark:text-gray-200 break-words">
                      {req.productName}
                      <div className="text-xs text-gray-400">
                        {req.brand} · {req.model}
                      </div>
                    </td>
                    <td className="py-3 pr-4 text-gray-600 dark:text-gray-400">
                      <div>{req.contactEmail ?? "—"}</div>
                      {req.contactPhone && <div className="text-xs text-gray-400">{req.contactPhone}</div>}
                    </td>
                    <td className="py-3 pr-4 text-gray-500 text-xs">
                      {new Date(req.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-3 pr-4">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[req.status]}`}
                      >
                        {STATUS_LABELS[req.status]}
                      </span>
                      {/* Surfaced in the queue, not just the detail page — a changed delivery is
                          only actionable before someone dispatches a courier. */}
                      {req.inboundDeliveryChangedAt && (
                        <span
                          className="mt-1 block w-fit rounded-full bg-orange-100 px-2 py-0.5 text-[11px] font-medium text-orange-700"
                          title={`Delivery changed ${new Date(req.inboundDeliveryChangedAt).toLocaleString()}`}
                        >
                          {req.courierFeeRefundDue ? "Delivery changed · refund due" : "Delivery changed"}
                        </span>
                      )}
                    </td>
                    <td className="py-3">
                      <button
                        onClick={(e) => { e.stopPropagation(); navigate(`/repair/${req.id}`); }}
                        className="rounded-lg bg-gray-100 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                      >
                        View
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
