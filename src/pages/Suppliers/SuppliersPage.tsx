import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import { suppliersService, type SupplierApplication } from "../../api/services/suppliers.service";

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-700",
  APPROVED: "bg-green-100 text-green-700",
  REJECTED: "bg-red-100 text-red-700",
};

const TABS = ["ALL", "PENDING", "APPROVED", "REJECTED"] as const;

export default function SuppliersPage() {
  const navigate = useNavigate();
  const [applications, setApplications] = useState<SupplierApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<(typeof TABS)[number]>("ALL");

  useEffect(() => {
    setLoading(true);
    const params = tab !== "ALL" ? { status: tab } : undefined;
    suppliersService
      .listApplications(params)
      .then((r) => setApplications(r.data?.content ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [tab]);

  const displayed = tab === "ALL" ? applications : applications.filter((a) => a.status === tab);

  return (
    <>
      <PageMeta title="Supplier Applications | Buyology" description="Review supplier applications" />
      <PageBreadcrumb pageTitle="Supplier Applications" />

      <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="mb-4 flex items-center gap-2">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`rounded-full px-4 py-1.5 text-xs font-medium transition-colors ${
                tab === t
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {loading ? (
          <p className="text-sm text-gray-500">Loading…</p>
        ) : displayed.length === 0 ? (
          <div className="rounded-xl border-2 border-dashed border-gray-200 p-8 text-center dark:border-gray-700">
            <p className="text-gray-500 dark:text-gray-400">No applications found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-800 text-left text-xs uppercase text-gray-500">
                  <th className="pb-3 pr-4">Name / Business</th>
                  <th className="pb-3 pr-4">Seller Type</th>
                  <th className="pb-3 pr-4">Email</th>
                  <th className="pb-3 pr-4">Submitted</th>
                  <th className="pb-3 pr-4">Status</th>
                  <th className="pb-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {displayed.map((app) => (
                  <tr key={app.id}>
                    <td className="py-3 pr-4 font-medium text-gray-800 dark:text-gray-200">
                      <div>{app.fullName}</div>
                      {app.businessName && (
                        <div className="text-xs text-gray-400">{app.businessName}</div>
                      )}
                    </td>
                    <td className="py-3 pr-4 text-gray-600 dark:text-gray-400 text-xs">
                      {app.sellerType.replace(/_/g, " ")}
                    </td>
                    <td className="py-3 pr-4 text-gray-600 dark:text-gray-400">{app.email}</td>
                    <td className="py-3 pr-4 text-gray-500 text-xs">
                      {new Date(app.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-3 pr-4">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[app.status]}`}>
                        {app.status}
                      </span>
                    </td>
                    <td className="py-3">
                      <button
                        onClick={() => navigate(`/suppliers/${app.id}`)}
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
