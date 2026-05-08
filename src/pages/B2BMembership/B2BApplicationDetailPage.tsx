import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";
import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import {
  b2bMembershipService,
  type ApplicationStatus,
  type MembershipApplication,
} from "../../api/services/b2b-membership.service";

const STATUS_COLORS: Record<ApplicationStatus, string> = {
  PENDING: "bg-yellow-100 text-yellow-700",
  APPROVED: "bg-green-100 text-green-700",
  REJECTED: "bg-red-100 text-red-700",
  UNDER_REVIEW: "bg-blue-100 text-blue-700",
};

export default function B2BApplicationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [app, setApp] = useState<MembershipApplication | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [actionType, setActionType] = useState<"APPROVE" | "REJECT" | "UNDER_REVIEW" | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [processing, setProcessing] = useState(false);
  const [actionError, setActionError] = useState("");

  const refresh = async (signal?: AbortSignal) => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await b2bMembershipService.getApplication(id, signal);
      setApp(res.data ?? null);
    } catch (e: unknown) {
      setError((e as Error).message ?? "Failed to load application");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const ac = new AbortController();
    refresh(ac.signal);
    return () => ac.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleAction = async () => {
    if (!app || !actionType) return;
    if (actionType === "REJECT" && !rejectionReason.trim()) {
      setActionError("Rejection reason is required.");
      return;
    }
    setProcessing(true);
    setActionError("");
    try {
      const updated = await b2bMembershipService.processAction(app.id, {
        action: actionType,
        rejectionReason: actionType === "REJECT" ? rejectionReason : undefined,
        performedBy: "Admin",
      });
      setApp(updated.data as MembershipApplication);
      setActionType(null);
    } catch (e: unknown) {
      setActionError((e as Error).message ?? "Action failed");
    } finally {
      setProcessing(false);
    }
  };

  if (loading && !app) return <p className="p-6 text-sm text-gray-500">Loading…</p>;
  if (error || !app) return <p className="p-6 text-sm text-red-500">{error ?? "Not found"}</p>;

  return (
    <>
      <PageMeta title={`${app.companyName} | B2B Application`} description="B2B Application detail" />
      <PageBreadcrumb pageTitle="B2B Application Detail" />

      <div className="mb-4">
        <button onClick={() => navigate("/b2b-membership")} className="text-sm text-brand-500 hover:underline">
          ← Back to memberships
        </button>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-800 dark:text-white">{app.companyName}</h2>
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${STATUS_COLORS[app.status]}`}>
            {app.status.replace("_", " ")}
          </span>
        </div>

        <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
          {[
            ["Trade License", app.tradeLicenseNumber],
            ["Industry", app.industryType],
            ["Employees", String(app.numberOfEmployees)],
            ["Location", `${app.city}, ${app.country}`],
            ["Website", app.website ?? "—"],
            ["Contact", app.contactFullName],
            ["Designation", app.contactDesignation],
            ["Email", app.contactEmail],
            ["Mobile", app.contactMobile],
            ["Business Needs", app.businessNeeds?.join(", ") ?? "—"],
            ["Submitted", new Date(app.createdAt).toLocaleString()],
          ].map(([k, v]) => (
            <div key={k}>
              <dt className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">{k}</dt>
              <dd className="mt-1 text-sm text-gray-800 dark:text-gray-200 break-words">{v}</dd>
            </div>
          ))}
        </dl>

        {app.rejectionReason && (
          <div className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-400">
            <strong>Rejection Reason:</strong> {app.rejectionReason}
          </div>
        )}

        {app.status !== "APPROVED" && app.status !== "REJECTED" && (
          <div className="mt-6 border-t border-gray-100 pt-4 dark:border-gray-800">
            {!actionType ? (
              <div className="flex flex-wrap gap-2">
                <button onClick={() => setActionType("APPROVE")} className="rounded-lg bg-green-500 px-4 py-2 text-sm font-medium text-white hover:bg-green-600">
                  Approve
                </button>
                <button onClick={() => setActionType("REJECT")} className="rounded-lg bg-red-500 px-4 py-2 text-sm font-medium text-white hover:bg-red-600">
                  Reject
                </button>
                {app.status !== "UNDER_REVIEW" && (
                  <button onClick={() => setActionType("UNDER_REVIEW")} className="rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-600">
                    Mark under review
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {actionType === "APPROVE" && "Confirm approval — wallet credit will be added."}
                  {actionType === "REJECT" && "Provide rejection reason (required)."}
                  {actionType === "UNDER_REVIEW" && "Mark as Under Review."}
                </p>
                {actionType === "REJECT" && (
                  <textarea
                    rows={3}
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="Explain why the application is rejected..."
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                  />
                )}
                {actionError && <p className="text-xs text-red-500">{actionError}</p>}
                <div className="flex gap-2">
                  <button onClick={handleAction} disabled={processing} className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50">
                    {processing ? "Processing..." : "Confirm"}
                  </button>
                  <button onClick={() => { setActionType(null); setActionError(""); setRejectionReason(""); }} className="rounded-lg bg-gray-100 px-4 py-2 text-sm text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300">
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
