import { useEffect, useState } from "react";
import { Navigate } from "react-router";
import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import { isProcurement, isSuperAdmin } from "../../auth/roles";
import { b2bProductRequestsService } from "../../api/services/b2b-product-requests.service";
import type {
  B2bProductRequest,
  B2bProductRequestStatus,
} from "../../api/services/b2b-product-requests.service";

const STATUS_OPTIONS: B2bProductRequestStatus[] = [
  "UNDER_REVIEW",
  "IN_PROGRESS",
  "COMPLETED",
  "REJECTED",
];

const STATUS_COLORS: Record<B2bProductRequestStatus, string> = {
  NEW: "bg-brand-100 text-brand-700",
  UNDER_REVIEW: "bg-blue-100 text-blue-700",
  IN_PROGRESS: "bg-yellow-100 text-yellow-700",
  COMPLETED: "bg-green-100 text-green-700",
  REJECTED: "bg-red-100 text-red-700",
};

export default function Requests() {
  const allowed = isSuperAdmin() || isProcurement();

  const [requests, setRequests] = useState<B2bProductRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const [selected, setSelected] = useState<B2bProductRequest | null>(null);
  const [newStatus, setNewStatus] = useState<B2bProductRequestStatus>("UNDER_REVIEW");
  const [note, setNote] = useState("");
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);

  const [message, setMessage] = useState("");
  const [sendingUpdate, setSendingUpdate] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [updateSent, setUpdateSent] = useState(false);

  const loadRequests = () => {
    const ac = new AbortController();
    setLoading(true);
    b2bProductRequestsService
      .list(undefined, ac.signal)
      .then((r) => setRequests(r.data ?? []))
      .catch(() => setRequests([]))
      .finally(() => setLoading(false));
    return ac;
  };

  useEffect(() => {
    if (!allowed) return;
    const ac = loadRequests();
    return () => ac.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allowed]);

  if (!allowed) return <Navigate to="/" replace />;

  const newCount = requests.filter((r) => r.status === "NEW").length;

  const openDetail = (req: B2bProductRequest) => {
    setSelected(req);
    setNewStatus(req.status === "NEW" ? "UNDER_REVIEW" : req.status);
    setNote(req.procurementNote ?? "");
    setMessage("");
    setStatusError(null);
    setUpdateError(null);
    setUpdateSent(false);
  };

  const closeDetail = () => {
    setSelected(null);
  };

  const handleUpdateStatus = async () => {
    if (!selected) return;
    setStatusError(null);
    setUpdatingStatus(true);
    try {
      const r = await b2bProductRequestsService.updateStatus(
        selected.id,
        newStatus,
        note.trim() || undefined
      );
      setSelected(r.data);
      loadRequests();
    } catch {
      setStatusError("Failed to update the request status. Please try again.");
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleSendUpdate = async () => {
    if (!selected) return;
    setUpdateError(null);
    setUpdateSent(false);
    if (!message.trim()) {
      setUpdateError("Enter a message to send to the member.");
      return;
    }
    setSendingUpdate(true);
    try {
      const r = await b2bProductRequestsService.sendUpdate(selected.id, message.trim());
      setSelected(r.data);
      setMessage("");
      setUpdateSent(true);
      loadRequests();
    } catch {
      setUpdateError("Failed to send the update. Please try again.");
    } finally {
      setSendingUpdate(false);
    }
  };

  return (
    <>
      <PageMeta
        title="B2B Product Requests | Buyology"
        description="Manage B2B product-sourcing requests"
      />
      <PageBreadcrumb pageTitle="Requests" />

      <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-800 dark:text-white">
            B2B Product Requests
            {newCount > 0 && (
              <span className="ml-2 rounded-full bg-brand-100 px-2 py-0.5 text-xs font-medium text-brand-700">
                {newCount} new
              </span>
            )}
          </h2>
        </div>

        {loading ? (
          <p className="text-sm text-gray-500">Loading…</p>
        ) : requests.length === 0 ? (
          <div className="rounded-xl border-2 border-dashed border-gray-200 p-5 text-center dark:border-gray-700">
            <p className="text-gray-500 dark:text-gray-400">No product requests yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-800 text-left text-xs uppercase text-gray-500">
                  <th className="pb-3 pr-4">Image</th>
                  <th className="pb-3 pr-4">Product</th>
                  <th className="pb-3 pr-4">Qty</th>
                  <th className="pb-3 pr-4">Member</th>
                  <th className="pb-3 pr-4">Date</th>
                  <th className="pb-3 pr-4">Status</th>
                  <th className="pb-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {requests.map((req) => (
                  <tr key={req.id}>
                    <td className="py-3 pr-4">
                      {req.imageUrl ? (
                        <img
                          src={req.imageUrl}
                          alt={req.productName}
                          className="h-10 w-10 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100 text-xs text-gray-400 dark:bg-gray-800">
                          —
                        </div>
                      )}
                    </td>
                    <td className="py-3 pr-4 font-medium text-gray-800 dark:text-gray-200 break-words">
                      {req.productName}
                    </td>
                    <td className="py-3 pr-4 text-gray-600 dark:text-gray-400">
                      {req.quantity.toLocaleString()}
                    </td>
                    <td className="py-3 pr-4 text-gray-600 dark:text-gray-400">
                      <div>{req.memberName ?? "—"}</div>
                      {req.contactEmail && (
                        <div className="text-xs text-gray-400">{req.contactEmail}</div>
                      )}
                    </td>
                    <td className="py-3 pr-4 text-gray-500 text-xs">
                      {new Date(req.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-3 pr-4">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[req.status]}`}
                      >
                        {req.status}
                      </span>
                    </td>
                    <td className="py-3">
                      <button
                        onClick={() => openDetail(req)}
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

      {/* Detail drawer */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/40 p-4">
          <div className="h-full w-full max-w-md rounded-xl bg-white p-4 shadow-theme-lg overflow-y-auto dark:bg-gray-900">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-semibold dark:text-white">Request Detail</h3>
              <button
                onClick={closeDetail}
                className="text-gray-400 hover:text-gray-600"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            {selected.imageUrl && (
              <div className="mb-4">
                <img
                  src={selected.imageUrl}
                  alt={selected.productName}
                  className="max-h-56 w-full rounded-xl object-contain bg-gray-50 dark:bg-gray-800"
                />
              </div>
            )}

            <dl className="space-y-3 text-sm mb-4">
              {[
                ["Product", selected.productName],
                ["Quantity", selected.quantity.toLocaleString()],
                ["Member", selected.memberName ?? "—"],
                ["Email", selected.contactEmail ?? "—"],
                ["Status", selected.status],
                ["Message", selected.message ?? "—"],
                ["Procurement note", selected.procurementNote ?? "—"],
                ["Submitted", selected.submittedAt ? new Date(selected.submittedAt).toLocaleString() : "—"],
                ["Created", new Date(selected.createdAt).toLocaleString()],
                ["Updated", new Date(selected.updatedAt).toLocaleString()],
              ].map(([k, v]) => (
                <div key={k as string} className="flex gap-3">
                  <dt className="w-32 shrink-0 text-gray-500 dark:text-gray-400">{k}</dt>
                  <dd className="text-gray-800 dark:text-gray-200 break-words">{v}</dd>
                </div>
              ))}
            </dl>

            {/* Update status */}
            <div className="space-y-3 border-t border-gray-100 dark:border-gray-800 pt-4">
              <h4 className="text-sm font-semibold text-gray-800 dark:text-white">Update status</h4>
              {statusError && (
                <div className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700 dark:bg-red-900/30 dark:text-red-300">
                  {statusError}
                </div>
              )}
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Status
                </label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value as B2bProductRequestStatus)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                >
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Note (optional)
                </label>
                <textarea
                  rows={3}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Internal / member-facing note for this status change"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                />
              </div>
              <button
                onClick={handleUpdateStatus}
                disabled={updatingStatus}
                className="w-full rounded-lg bg-brand-600 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
              >
                {updatingStatus ? "Saving…" : "Update status"}
              </button>
            </div>

            {/* Send update message to member */}
            <div className="mt-4 space-y-3 border-t border-gray-100 dark:border-gray-800 pt-4">
              <h4 className="text-sm font-semibold text-gray-800 dark:text-white">
                Message to member
              </h4>
              {updateError && (
                <div className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700 dark:bg-red-900/30 dark:text-red-300">
                  {updateError}
                </div>
              )}
              {updateSent && (
                <div className="rounded-lg bg-green-50 px-3 py-2 text-xs text-green-700 dark:bg-green-900/30 dark:text-green-300">
                  Update sent to the member.
                </div>
              )}
              <div>
                <textarea
                  rows={3}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Write a custom update to email the member…"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                />
              </div>
              <button
                onClick={handleSendUpdate}
                disabled={sendingUpdate}
                className="w-full rounded-lg border border-brand-300 bg-brand-50 py-2 text-sm font-medium text-brand-700 hover:bg-brand-100 disabled:opacity-50 dark:border-brand-700 dark:bg-brand-900/30 dark:text-brand-300"
              >
                {sendingUpdate ? "Sending…" : "Send update"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
