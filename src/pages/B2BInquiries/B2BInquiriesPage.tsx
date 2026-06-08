import { useEffect, useState } from "react";
import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import { b2bService, type B2bInquiry } from "../../api/services/b2b.service";

const STATUS_COLORS: Record<B2bInquiry["status"], string> = {
  NEW: "bg-brand-100 text-brand-700",
  REVIEWED: "bg-yellow-100 text-yellow-700",
  RESPONDED: "bg-green-100 text-green-700",
};

export default function B2BInquiriesPage() {
  const [inquiries, setInquiries] = useState<B2bInquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<B2bInquiry | null>(null);
  const [updating, setUpdating] = useState(false);
  const [notes, setNotes] = useState("");
  const [newStatus, setNewStatus] = useState<B2bInquiry["status"]>("REVIEWED");

  useEffect(() => {
    const ac = new AbortController();
    b2bService.listAll(ac.signal)
      .then((r) => setInquiries(r.data ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
    return () => ac.abort();
  }, []);

  const openDetail = (inq: B2bInquiry) => {
    setSelected(inq);
    setNewStatus(inq.status === "NEW" ? "REVIEWED" : inq.status);
    setNotes(inq.adminNotes ?? "");
  };

  const handleUpdate = async () => {
    if (!selected) return;
    setUpdating(true);
    try {
      const updated = await b2bService.updateStatus(selected.id, newStatus, notes);
      const u = updated.data as B2bInquiry;
      setInquiries((i) => i.map((x) => x.id === u.id ? u : x));
      setSelected(u);
    } catch {
      alert("Failed to update inquiry status. Please try again.");
    } finally { setUpdating(false); }
  };

  const newCount = inquiries.filter((i) => i.status === "NEW").length;

  return (
    <>
      <PageMeta title="B2B Inquiries | Buyology" description="Manage B2B inquiries" />
      <PageBreadcrumb pageTitle="B2B Inquiries" />

      <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white">
            B2B Inquiries
            {newCount > 0 && (
              <span className="ml-2 rounded-full bg-brand-100 px-2 py-0.5 text-xs font-medium text-brand-700">
                {newCount} new
              </span>
            )}
          </h2>
        </div>

        {loading ? <p className="text-sm text-gray-500">Loading...</p> :
          inquiries.length === 0 ? (
            <div className="rounded-xl border-2 border-dashed border-gray-200 p-8 text-center dark:border-gray-700">
              <p className="text-gray-500 dark:text-gray-400">No inquiries yet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-gray-800 text-left text-xs uppercase text-gray-500">
                    <th className="pb-3 pr-4">Company</th>
                    <th className="pb-3 pr-4">Contact</th>
                    <th className="pb-3 pr-4">Qty</th>
                    <th className="pb-3 pr-4">Date</th>
                    <th className="pb-3 pr-4">Status</th>
                    <th className="pb-3">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {inquiries.map((inq) => (
                    <tr key={inq.id}>
                      <td className="py-3 pr-4 font-medium text-gray-800 dark:text-gray-200">{inq.company}</td>
                      <td className="py-3 pr-4 text-gray-600 dark:text-gray-400">
                        <div>{inq.contactPerson}</div>
                        <div className="text-xs text-gray-400">{inq.email}</div>
                      </td>
                      <td className="py-3 pr-4 text-gray-600 dark:text-gray-400">{inq.quantity.toLocaleString()}</td>
                      <td className="py-3 pr-4 text-gray-500 text-xs">
                        {new Date(inq.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-3 pr-4">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[inq.status]}`}>
                          {inq.status}
                        </span>
                      </td>
                      <td className="py-3">
                        <button onClick={() => openDetail(inq)}
                          className="rounded-lg bg-gray-100 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700">
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        }
      </div>

      {/* Detail drawer */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/40 p-4">
          <div className="h-full w-full max-w-md rounded-2xl bg-white p-6 shadow-xl overflow-y-auto dark:bg-gray-900">
            <div className="mb-6 flex items-center justify-between">
              <h3 className="text-lg font-semibold dark:text-white">Inquiry Detail</h3>
              <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>

            <dl className="space-y-3 text-sm mb-6">
              {[
                ["Company", selected.company],
                ["Contact", selected.contactPerson],
                ["Email", selected.email],
                ["Phone", selected.phone ?? "—"],
                ["Quantity", selected.quantity.toLocaleString()],
                ["Message", selected.message ?? "—"],
              ].map(([k, v]) => (
                <div key={k as string} className="flex gap-3">
                  <dt className="w-24 shrink-0 text-gray-500 dark:text-gray-400">{k}</dt>
                  <dd className="text-gray-800 dark:text-gray-200 break-words">{v}</dd>
                </div>
              ))}
            </dl>

            <div className="space-y-3 border-t border-gray-100 dark:border-gray-800 pt-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Update Status</label>
                <select value={newStatus} onChange={(e) => setNewStatus(e.target.value as B2bInquiry["status"])}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white">
                  <option value="REVIEWED">Reviewed</option>
                  <option value="RESPONDED">Responded</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Admin Notes</label>
                <textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white" />
              </div>
              <button onClick={handleUpdate} disabled={updating}
                className="w-full rounded-lg bg-brand-500 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50">
                {updating ? "Saving..." : "Update Status"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
