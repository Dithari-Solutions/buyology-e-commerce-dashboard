import { useEffect, useState } from "react";
import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import {
  b2bMembershipService,
  type MembershipApplication,
  type MembershipCard,
  type WalletTransaction,
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
  const [tab, setTab] = useState<TabKey>("applications");
  const [applications, setApplications] = useState<MembershipApplication[]>([]);
  const [memberships, setMemberships] = useState<MembershipCard[]>([]);
  const [loading, setLoading] = useState(true);

  // Detail drawer
  const [selectedApp, setSelectedApp] = useState<MembershipApplication | null>(null);
  const [selectedMember, setSelectedMember] = useState<MembershipCard | null>(null);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [txLoading, setTxLoading] = useState(false);

  // Action modal state
  const [actionType, setActionType] = useState<"APPROVE" | "REJECT" | "UNDER_REVIEW" | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [processing, setProcessing] = useState(false);
  const [actionError, setActionError] = useState("");

  // Wallet credit modal
  const [walletModal, setWalletModal] = useState<{ userId: string; mode: "credit" | "deduct" | "adjust" } | null>(null);
  const [walletAmount, setWalletAmount] = useState("");
  const [walletDesc, setWalletDesc] = useState("");
  const [walletProcessing, setWalletProcessing] = useState(false);
  const [walletError, setWalletError] = useState("");

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

  const openAppDetail = (app: MembershipApplication) => {
    setSelectedApp(app);
    setActionType(null);
    setRejectionReason("");
    setActionError("");
  };

  const openMemberDetail = async (member: MembershipCard) => {
    setSelectedMember(member);
    setTransactions([]);
    setTxLoading(true);
    try {
      const res = await b2bMembershipService.getTransactions(member.userId);
      setTransactions(res.data ?? []);
    } catch { }
    finally { setTxLoading(false); }
  };

  const handleAction = async () => {
    if (!selectedApp || !actionType) return;
    if (actionType === "REJECT" && !rejectionReason.trim()) {
      setActionError("Rejection reason is required.");
      return;
    }
    setProcessing(true);
    setActionError("");
    try {
      const updated = await b2bMembershipService.processAction(selectedApp.id, {
        action: actionType,
        rejectionReason: actionType === "REJECT" ? rejectionReason : undefined,
        performedBy: "Admin",
      });
      const u = updated.data as MembershipApplication;
      setApplications((prev) => prev.map((a) => (a.id === u.id ? u : a)));
      setSelectedApp(u);
      setActionType(null);
    } catch (e: unknown) {
      setActionError((e as Error).message ?? "Action failed");
    } finally {
      setProcessing(false);
    }
  };

  const handleWalletAction = async () => {
    if (!walletModal) return;
    const amount = parseFloat(walletAmount);
    if (isNaN(amount) || amount <= 0) {
      setWalletError("Enter a valid amount greater than 0.");
      return;
    }
    setWalletProcessing(true);
    setWalletError("");
    try {
      const req = { amount, description: walletDesc || undefined, performedBy: "Admin" };
      if (walletModal.mode === "credit") await b2bMembershipService.addCredit(walletModal.userId, req);
      else if (walletModal.mode === "deduct") await b2bMembershipService.deductCredit(walletModal.userId, req);
      else await b2bMembershipService.adjustBalance(walletModal.userId, req);

      // refresh memberships to show updated balance
      const mems = await b2bMembershipService.listMemberships();
      setMemberships(mems.data ?? []);
      if (selectedMember) {
        const freshMember = (mems.data ?? []).find((m) => m.userId === walletModal.userId);
        if (freshMember) {
          setSelectedMember(freshMember);
          const txRes = await b2bMembershipService.getTransactions(walletModal.userId);
          setTransactions(txRes.data ?? []);
        }
      }
      setWalletModal(null);
      setWalletAmount("");
      setWalletDesc("");
    } catch (e: unknown) {
      setWalletError((e as Error).message ?? "Failed");
    } finally {
      setWalletProcessing(false);
    }
  };

  const pendingCount = applications.filter((a) => a.status === "PENDING").length;

  return (
    <>
      <PageMeta title="B2B Membership | Buyology" description="Manage B2B memberships" />
      <PageBreadcrumb pageTitle="B2B Membership" />

      {/* Tabs */}
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
            onOpen={openAppDetail}
          />
        ) : (
          <MembershipsTable
            memberships={memberships}
            onOpen={openMemberDetail}
            onRefresh={async () => {
              const mems = await b2bMembershipService.listMemberships();
              setMemberships(mems.data ?? []);
            }}
          />
        )}
      </div>

      {/* Application Detail Drawer */}
      {selectedApp && (
        <Drawer onClose={() => setSelectedApp(null)} title="Application Detail">
          <dl className="space-y-3 text-sm mb-4">
            {([
              ["Company", selectedApp.companyName],
              ["Trade License", selectedApp.tradeLicenseNumber],
              ["Industry", selectedApp.industryType],
              ["Employees", selectedApp.numberOfEmployees],
              ["Location", `${selectedApp.city}, ${selectedApp.country}`],
              ["Website", selectedApp.website ?? "—"],
              ["Contact", selectedApp.contactFullName],
              ["Designation", selectedApp.contactDesignation],
              ["Email", selectedApp.contactEmail],
              ["Mobile", selectedApp.contactMobile],
              ["Business Needs", selectedApp.businessNeeds?.join(", ") ?? "—"],
            ] as [string, string | number][]).map(([k, v]) => (
              <div key={k} className="flex gap-3">
                <dt className="w-28 shrink-0 text-gray-500 dark:text-gray-400">{k}</dt>
                <dd className="text-gray-800 dark:text-gray-200 break-words">{v}</dd>
              </div>
            ))}
          </dl>

          <div className="mb-4">
            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${STATUS_COLORS[selectedApp.status]}`}>
              {selectedApp.status.replace("_", " ")}
            </span>
          </div>

          {selectedApp.rejectionReason && (
            <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-400">
              <strong>Rejection Reason:</strong> {selectedApp.rejectionReason}
            </div>
          )}

          {/* Actions */}
          {selectedApp.status !== "APPROVED" && selectedApp.status !== "REJECTED" && (
            <div className="space-y-3 border-t border-gray-100 dark:border-gray-800 pt-4">
              {!actionType ? (
                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={() => setActionType("APPROVE")}
                    className="flex-1 rounded-lg bg-green-500 py-2 text-sm font-medium text-white hover:bg-green-600"
                  >
                    ✅ Approve
                  </button>
                  <button
                    onClick={() => setActionType("REJECT")}
                    className="flex-1 rounded-lg bg-red-500 py-2 text-sm font-medium text-white hover:bg-red-600"
                  >
                    ❌ Reject
                  </button>
                  {selectedApp.status !== "UNDER_REVIEW" && (
                    <button
                      onClick={() => setActionType("UNDER_REVIEW")}
                      className="flex-1 rounded-lg bg-blue-500 py-2 text-sm font-medium text-white hover:bg-blue-600"
                    >
                      👀 Under Review
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {actionType === "APPROVE" && "Confirm approval — AED 5,000 credit will be added to wallet"}
                    {actionType === "REJECT" && "Provide rejection reason (required)"}
                    {actionType === "UNDER_REVIEW" && "Mark as Under Review"}
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
                    <button
                      onClick={handleAction}
                      disabled={processing}
                      className="flex-1 rounded-lg bg-brand-500 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50"
                    >
                      {processing ? "Processing..." : "Confirm"}
                    </button>
                    <button
                      onClick={() => { setActionType(null); setActionError(""); setRejectionReason(""); }}
                      className="rounded-lg bg-gray-100 px-4 py-2 text-sm text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </Drawer>
      )}

      {/* Member Detail Drawer */}
      {selectedMember && (
        <Drawer onClose={() => setSelectedMember(null)} title="Member Detail">
          {/* Card preview */}
          <div className="mb-5 rounded-2xl bg-gradient-to-br from-[#402F75] to-[#6B4EAD] p-5 text-white shadow-lg">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-xs uppercase tracking-widest opacity-70">Buyology</p>
                <p className="text-lg font-bold mt-1">{selectedMember.companyName}</p>
              </div>
              <span className="rounded-full bg-yellow-400 text-black text-xs font-bold px-3 py-1">
                {selectedMember.tier}
              </span>
            </div>
            <p className="text-sm opacity-90">{selectedMember.memberName}</p>
            <p className="text-xs opacity-60 mt-1">{selectedMember.membershipId}</p>
            <div className="mt-4 flex items-end justify-between">
              <div>
                <p className="text-xs opacity-60">Wallet Balance</p>
                <p className="text-xl font-bold">
                  {selectedMember.walletCurrency ?? "AED"} {(selectedMember.walletBalance ?? 0).toFixed(2)}
                </p>
              </div>
              <span className={`rounded-full text-xs font-semibold px-2 py-1 ${
                selectedMember.status === "ACTIVE" ? "bg-green-400 text-green-900" : "bg-red-400 text-red-900"
              }`}>
                {selectedMember.status}
              </span>
            </div>
          </div>

          {/* Wallet actions */}
          <div className="mb-4 flex gap-2">
            <button
              onClick={() => { setWalletModal({ userId: selectedMember.userId, mode: "credit" }); setWalletAmount(""); setWalletDesc(""); setWalletError(""); }}
              className="flex-1 rounded-lg bg-green-50 border border-green-200 py-2 text-xs font-medium text-green-700 hover:bg-green-100 dark:bg-green-900/20 dark:border-green-800 dark:text-green-400"
            >
              + Add Credit
            </button>
            <button
              onClick={() => { setWalletModal({ userId: selectedMember.userId, mode: "deduct" }); setWalletAmount(""); setWalletDesc(""); setWalletError(""); }}
              className="flex-1 rounded-lg bg-red-50 border border-red-200 py-2 text-xs font-medium text-red-700 hover:bg-red-100 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400"
            >
              - Deduct
            </button>
            <button
              onClick={() => { setWalletModal({ userId: selectedMember.userId, mode: "adjust" }); setWalletAmount(""); setWalletDesc(""); setWalletError(""); }}
              className="flex-1 rounded-lg bg-blue-50 border border-blue-200 py-2 text-xs font-medium text-blue-700 hover:bg-blue-100 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-400"
            >
              ± Adjust
            </button>
          </div>

          {/* Transactions */}
          <div>
            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Transaction History</h4>
            {txLoading ? (
              <p className="text-xs text-gray-400">Loading...</p>
            ) : transactions.length === 0 ? (
              <p className="text-xs text-gray-400">No transactions yet.</p>
            ) : (
              <ul className="space-y-2">
                {transactions.map((tx) => (
                  <li key={tx.id} className="flex items-center justify-between rounded-lg bg-gray-50 dark:bg-gray-800 px-3 py-2">
                    <div>
                      <span className={`text-xs font-bold ${
                        tx.type === "CREDIT" || tx.type === "REFUND" ? "text-green-600" : tx.type === "DEBIT" ? "text-red-600" : "text-blue-600"
                      }`}>{tx.type}</span>
                      <p className="text-xs text-gray-500">{tx.description ?? "—"}</p>
                      <p className="text-[10px] text-gray-400">{new Date(tx.createdAt).toLocaleString()}</p>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-semibold ${tx.type === "DEBIT" ? "text-red-600" : "text-green-600"}`}>
                        {tx.type === "DEBIT" ? "-" : "+"}{tx.amount.toFixed(2)}
                      </p>
                      <p className="text-[10px] text-gray-400">Bal: {tx.balanceAfter.toFixed(2)}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Drawer>
      )}

      {/* Wallet Action Modal */}
      {walletModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-gray-900 p-6 shadow-xl">
            <h3 className="text-base font-semibold text-gray-800 dark:text-white mb-4">
              {walletModal.mode === "credit" ? "Add Wallet Credit" : walletModal.mode === "deduct" ? "Deduct from Wallet" : "Adjust Balance"}
            </h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Amount (AED)</label>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={walletAmount}
                  onChange={(e) => setWalletAmount(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Description (optional)</label>
                <input
                  type="text"
                  value={walletDesc}
                  onChange={(e) => setWalletDesc(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                />
              </div>
              {walletError && <p className="text-xs text-red-500">{walletError}</p>}
              <div className="flex gap-2 pt-1">
                <button
                  onClick={handleWalletAction}
                  disabled={walletProcessing}
                  className="flex-1 rounded-lg bg-brand-500 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50"
                >
                  {walletProcessing ? "Processing..." : "Confirm"}
                </button>
                <button
                  onClick={() => setWalletModal(null)}
                  className="rounded-lg bg-gray-100 px-4 py-2 text-sm text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

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
                    Manage
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

function Drawer({ children, onClose, title }: { children: React.ReactNode; onClose: () => void; title: string }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/40 p-4">
      <div className="h-full w-full max-w-md rounded-2xl bg-white p-6 shadow-xl overflow-y-auto dark:bg-gray-900">
        <div className="mb-5 flex items-center justify-between">
          <h3 className="text-lg font-semibold dark:text-white">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xl">✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}
