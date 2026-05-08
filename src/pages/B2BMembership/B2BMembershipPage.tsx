import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import {
  b2bMembershipService,
  type MembershipApplication,
  type MembershipCard,
  type ApplicationStatus,
} from "../../api/services/b2b-membership.service";

const STATUS_COLORS: Record<ApplicationStatus, string> = {
  PENDING: "bg-yellow-100 text-yellow-700",
  APPROVED: "bg-green-100 text-green-700",
  REJECTED: "bg-red-100 text-red-700",
  UNDER_REVIEW: "bg-blue-100 text-blue-700",
};

type TabKey = "applications" | "memberships";

export default function B2BMembershipPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<TabKey>("applications");
  const [applications, setApplications] = useState<MembershipApplication[]>([]);
  const [memberships, setMemberships] = useState<MembershipCard[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const ac = new AbortController();
    setLoading(true);
    Promise.all([
      b2bMembershipService.listApplications(ac.signal),
      b2bMembershipService.listMemberships(ac.signal),
    ])
      .then(([apps, mems]) => {
        setApplications(apps.data ?? []);
        setMemberships(mems.data ?? []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
    return () => ac.abort();
  }, []);

  const refreshMemberships = async () => {
    const mems = await b2bMembershipService.listMemberships();
    setMemberships(mems.data ?? []);
  };

  const pendingCount = applications.filter((a) => a.status === "PENDING").length;

  return (
    <>
      <PageMeta title="B2B Membership | Buyology" description="Manage B2B memberships" />
      <PageBreadcrumb pageTitle="B2B Membership" />

      <div className="mb-4 flex gap-2">
        {(["applications", "memberships"] as TabKey[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-lg px-5 py-2 text-sm font-medium transition-colors ${
              tab === t
                ? "bg-brand-500 text-white"
                : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700"
            }`}
          >
            {t === "applications" ? "Applications" : "Active Members"}
            {t === "applications" && pendingCount > 0 && (
              <span className="ml-2 rounded-full bg-yellow-400 text-white text-xs px-1.5 py-0.5">{pendingCount}</span>
            )}
          </button>
        ))}
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
        {loading ? (
          <p className="text-sm text-gray-500">Loading...</p>
        ) : tab === "applications" ? (
          <ApplicationsTable
            applications={applications}
            onOpen={(a) => navigate(`/b2b-applications/${a.id}`)}
          />
        ) : (
          <MembershipsTable
            memberships={memberships}
            onOpen={(m) => navigate(`/b2b-members/${m.id}`)}
            onRefresh={refreshMemberships}
          />
        )}
      </div>
    </>
  );
}

function ApplicationsTable({
  applications,
  onOpen,
}: {
  applications: MembershipApplication[];
  onOpen: (a: MembershipApplication) => void;
}) {
  if (applications.length === 0) {
    return (
      <div className="rounded-xl border-2 border-dashed border-gray-200 p-8 text-center dark:border-gray-700">
        <p className="text-gray-500 dark:text-gray-400">No applications yet.</p>
      </div>
    );
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100 dark:border-gray-800 text-left text-xs uppercase text-gray-500">
            <th className="pb-3 pr-4">Company</th>
            <th className="pb-3 pr-4">Contact</th>
            <th className="pb-3 pr-4">Email</th>
            <th className="pb-3 pr-4">Date</th>
            <th className="pb-3 pr-4">Status</th>
            <th className="pb-3">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
          {applications.map((app) => (
            <tr key={app.id}>
              <td className="py-3 pr-4 font-medium text-gray-800 dark:text-gray-200">{app.companyName}</td>
              <td className="py-3 pr-4 text-gray-600 dark:text-gray-400">{app.contactFullName}</td>
              <td className="py-3 pr-4 text-gray-500 text-xs">{app.contactEmail}</td>
              <td className="py-3 pr-4 text-gray-400 text-xs">{new Date(app.createdAt).toLocaleDateString()}</td>
              <td className="py-3 pr-4">
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[app.status]}`}>
                  {app.status.replace("_", " ")}
                </span>
              </td>
              <td className="py-3">
                <button
                  onClick={() => onOpen(app)}
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
  );
}

function MembershipsTable({
  memberships,
  onOpen,
  onRefresh,
}: {
  memberships: MembershipCard[];
  onOpen: (m: MembershipCard) => void;
  onRefresh?: () => void;
}) {
  const runLifecycle = async (
    id: string,
    op: "freeze" | "unfreeze" | "trash" | "restore",
  ) => {
    if (op === "trash" && !confirm("Move membership to trash? It will be purged after 30 days.")) return;
    try {
      if (op === "freeze") await b2bMembershipService.freezeMembership(id);
      else if (op === "unfreeze") await b2bMembershipService.unfreezeMembership(id);
      else if (op === "trash") await b2bMembershipService.trashMembership(id);
      else if (op === "restore") await b2bMembershipService.restoreMembership(id);
      onRefresh?.();
    } catch (e: unknown) {
      alert((e as Error).message ?? "Action failed");
    }
  };
  if (memberships.length === 0) {
    return (
      <div className="rounded-xl border-2 border-dashed border-gray-200 p-8 text-center dark:border-gray-700">
        <p className="text-gray-500 dark:text-gray-400">No active members yet.</p>
      </div>
    );
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100 dark:border-gray-800 text-left text-xs uppercase text-gray-500">
            <th className="pb-3 pr-4">Membership ID</th>
            <th className="pb-3 pr-4">Company</th>
            <th className="pb-3 pr-4">Member</th>
            <th className="pb-3 pr-4">Tier</th>
            <th className="pb-3 pr-4">Wallet Balance</th>
            <th className="pb-3 pr-4">Status</th>
            <th className="pb-3">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
          {memberships.map((m) => (
            <tr key={m.id}>
              <td className="py-3 pr-4 font-mono text-xs text-gray-600 dark:text-gray-400">{m.membershipId}</td>
              <td className="py-3 pr-4 font-medium text-gray-800 dark:text-gray-200">{m.companyName}</td>
              <td className="py-3 pr-4 text-gray-600 dark:text-gray-400">{m.memberName}</td>
              <td className="py-3 pr-4">
                <span className="rounded-full bg-yellow-100 text-yellow-800 text-xs font-bold px-2 py-0.5">{m.tier}</span>
              </td>
              <td className="py-3 pr-4 font-medium text-gray-800 dark:text-gray-200">
                {m.walletCurrency ?? "AED"} {(m.walletBalance ?? 0).toFixed(2)}
              </td>
              <td className="py-3 pr-4">
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                  m.status === "ACTIVE"
                    ? "bg-green-100 text-green-700"
                    : m.status === "SUSPENDED"
                    ? "bg-yellow-100 text-yellow-700"
                    : m.status === "TRASHED"
                    ? "bg-gray-200 text-gray-700"
                    : "bg-red-100 text-red-700"
                }`}>
                  {m.status}
                </span>
              </td>
              <td className="py-3">
                <div className="flex flex-wrap gap-1">
                  <button
                    onClick={() => onOpen(m)}
                    className="rounded-lg bg-gray-100 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                  >
                    View
                  </button>
                  {m.status === "ACTIVE" && (
                    <button
                      onClick={() => runLifecycle(m.id, "freeze")}
                      className="rounded-lg bg-yellow-100 px-3 py-1.5 text-xs text-yellow-700 hover:bg-yellow-200"
                    >
                      Freeze
                    </button>
                  )}
                  {m.status === "SUSPENDED" && (
                    <button
                      onClick={() => runLifecycle(m.id, "unfreeze")}
                      className="rounded-lg bg-blue-100 px-3 py-1.5 text-xs text-blue-700 hover:bg-blue-200"
                    >
                      Unfreeze
                    </button>
                  )}
                  {m.status !== "TRASHED" && (
                    <button
                      onClick={() => runLifecycle(m.id, "trash")}
                      className="rounded-lg bg-red-100 px-3 py-1.5 text-xs text-red-700 hover:bg-red-200"
                    >
                      Trash
                    </button>
                  )}
                  {m.status === "TRASHED" && (
                    <button
                      onClick={() => runLifecycle(m.id, "restore")}
                      className="rounded-lg bg-green-100 px-3 py-1.5 text-xs text-green-700 hover:bg-green-200"
                    >
                      Restore
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
