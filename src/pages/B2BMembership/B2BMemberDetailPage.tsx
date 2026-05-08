import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";
import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import {
  b2bMembershipService,
  type MembershipDetail,
  type WalletTransaction,
  type CreditUsage,
} from "../../api/services/b2b-membership.service";

type WalletMode = "credit" | "deduct" | "adjust";

export default function B2BMemberDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [member, setMember] = useState<MembershipDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Edit profile
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({ companyName: "", memberName: "", validUntil: "" });
  const [saving, setSaving] = useState(false);

  // Wallet modal
  const [walletModal, setWalletModal] = useState<WalletMode | null>(null);
  const [walletAmount, setWalletAmount] = useState("");
  const [walletDesc, setWalletDesc] = useState("");
  const [walletBusy, setWalletBusy] = useState(false);
  const [walletError, setWalletError] = useState("");

  const [resendBusy, setResendBusy] = useState(false);
  const [flash, setFlash] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  const refresh = async (signal?: AbortSignal) => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await b2bMembershipService.getMembershipDetail(id, signal);
      const m = res.data as MembershipDetail;
      setMember(m);
      setEditForm({
        companyName: m.companyName,
        memberName: m.memberName,
        validUntil: m.validUntil ? m.validUntil.slice(0, 10) : "",
      });
    } catch (e: unknown) {
      setError((e as Error).message ?? "Failed to load member");
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

  const saveProfile = async () => {
    if (!member) return;
    setSaving(true);
    try {
      await b2bMembershipService.updateMembership(member.id, {
        companyName: editForm.companyName.trim(),
        memberName: editForm.memberName.trim(),
        validUntil: editForm.validUntil ? new Date(editForm.validUntil).toISOString() : undefined,
      });
      setFlash({ kind: "ok", text: "Profile updated." });
      setEditing(false);
      await refresh();
    } catch (e: unknown) {
      setFlash({ kind: "err", text: (e as Error).message ?? "Update failed" });
    } finally {
      setSaving(false);
    }
  };

  const runLifecycle = async (op: "freeze" | "unfreeze" | "trash" | "restore") => {
    if (!member) return;
    if (op === "trash" && !confirm("Move to trash? Will be purged after 30 days.")) return;
    try {
      if (op === "freeze") await b2bMembershipService.freezeMembership(member.id);
      else if (op === "unfreeze") await b2bMembershipService.unfreezeMembership(member.id);
      else if (op === "trash") await b2bMembershipService.trashMembership(member.id);
      else await b2bMembershipService.restoreMembership(member.id);
      await refresh();
    } catch (e: unknown) {
      setFlash({ kind: "err", text: (e as Error).message ?? "Action failed" });
    }
  };

  const handleResendSetup = async () => {
    if (!member) return;
    setResendBusy(true);
    try {
      await b2bMembershipService.resendSetupEmail(member.id);
      setFlash({ kind: "ok", text: "Set-password email re-sent." });
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } }; message?: string };
      setFlash({ kind: "err", text: err?.response?.data?.message ?? err?.message ?? "Failed" });
    } finally {
      setResendBusy(false);
    }
  };

  const handleWalletAction = async () => {
    if (!member || !walletModal) return;
    const amount = parseFloat(walletAmount);
    if (isNaN(amount) || amount <= 0) {
      setWalletError("Enter a valid amount greater than 0.");
      return;
    }
    setWalletBusy(true);
    setWalletError("");
    try {
      const req = { amount, description: walletDesc || undefined, performedBy: "Admin" };
      if (walletModal === "credit") await b2bMembershipService.addCredit(member.userId, req);
      else if (walletModal === "deduct") await b2bMembershipService.deductCredit(member.userId, req);
      else await b2bMembershipService.adjustBalance(member.userId, req);
      setWalletModal(null);
      setWalletAmount("");
      setWalletDesc("");
      await refresh();
    } catch (e: unknown) {
      setWalletError((e as Error).message ?? "Failed");
    } finally {
      setWalletBusy(false);
    }
  };

  if (loading && !member) return <p className="p-6 text-sm text-gray-500">Loading…</p>;
  if (error || !member) return <p className="p-6 text-sm text-red-500">{error ?? "Not found"}</p>;

  return (
    <>
      <PageMeta title={`${member.companyName} | B2B Member`} description="B2B Member detail" />
      <PageBreadcrumb pageTitle="B2B Member Detail" />

      <div className="mb-4">
        <button
          onClick={() => navigate("/b2b-membership")}
          className="text-sm text-brand-500 hover:underline"
        >
          ← Back to memberships
        </button>
      </div>

      {flash && (
        <div className={`mb-4 rounded-lg px-4 py-2 text-sm ${
          flash.kind === "ok" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
        }`}>
          {flash.text}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Profile + lifecycle */}
        <div className="lg:col-span-2 space-y-6">
          <section className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-semibold text-gray-800 dark:text-white">Profile</h2>
              {!editing ? (
                <button
                  onClick={() => setEditing(true)}
                  className="rounded-lg bg-gray-100 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300"
                >
                  Edit
                </button>
              ) : (
                <div className="flex gap-2">
                  <button
                    onClick={saveProfile}
                    disabled={saving}
                    className="rounded-lg bg-brand-500 px-3 py-1.5 text-xs text-white hover:bg-brand-600 disabled:opacity-50"
                  >
                    {saving ? "Saving…" : "Save"}
                  </button>
                  <button
                    onClick={() => { setEditing(false); }}
                    className="rounded-lg bg-gray-100 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>

            <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
              <Row label="Membership ID" value={<span className="font-mono">{member.membershipId}</span>} />
              <Row label="Status" value={<StatusPill status={member.status} />} />
              <Row label="Tier" value={member.tier} />
              <Row
                label="Company"
                value={editing ? (
                  <input
                    value={editForm.companyName}
                    onChange={(e) => setEditForm({ ...editForm, companyName: e.target.value })}
                    className="w-full rounded border border-gray-300 px-2 py-1 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                  />
                ) : member.companyName}
              />
              <Row
                label="Member"
                value={editing ? (
                  <input
                    value={editForm.memberName}
                    onChange={(e) => setEditForm({ ...editForm, memberName: e.target.value })}
                    className="w-full rounded border border-gray-300 px-2 py-1 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                  />
                ) : member.memberName}
              />
              <Row label="Email" value={member.contactEmail ?? "—"} />
              <Row label="Phone" value={member.contactPhone ?? "—"} />
              <Row
                label="Valid until"
                value={editing ? (
                  <input
                    type="date"
                    value={editForm.validUntil}
                    onChange={(e) => setEditForm({ ...editForm, validUntil: e.target.value })}
                    className="w-full rounded border border-gray-300 px-2 py-1 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                  />
                ) : member.validUntil ? new Date(member.validUntil).toLocaleDateString() : "—"}
              />
              <Row label="Created" value={new Date(member.createdAt).toLocaleString()} />
              {member.frozenAt && <Row label="Frozen at" value={new Date(member.frozenAt).toLocaleString()} />}
              {member.deletedAt && <Row label="Trashed at" value={new Date(member.deletedAt).toLocaleString()} />}
            </dl>
          </section>

          {/* Lifecycle / setup */}
          <section className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
            <h2 className="mb-4 text-base font-semibold text-gray-800 dark:text-white">Lifecycle</h2>
            <div className="flex flex-wrap gap-2">
              {member.status === "ACTIVE" && (
                <button onClick={() => runLifecycle("freeze")} className="rounded-lg bg-yellow-100 px-3 py-1.5 text-xs text-yellow-700 hover:bg-yellow-200">
                  Freeze
                </button>
              )}
              {member.status === "SUSPENDED" && (
                <button onClick={() => runLifecycle("unfreeze")} className="rounded-lg bg-blue-100 px-3 py-1.5 text-xs text-blue-700 hover:bg-blue-200">
                  Unfreeze
                </button>
              )}
              {member.status !== "TRASHED" && (
                <button onClick={() => runLifecycle("trash")} className="rounded-lg bg-red-100 px-3 py-1.5 text-xs text-red-700 hover:bg-red-200">
                  Move to trash
                </button>
              )}
              {member.status === "TRASHED" && (
                <button onClick={() => runLifecycle("restore")} className="rounded-lg bg-green-100 px-3 py-1.5 text-xs text-green-700 hover:bg-green-200">
                  Restore
                </button>
              )}
              {member.passwordSet === false && (
                <button
                  onClick={handleResendSetup}
                  disabled={resendBusy}
                  className="rounded-lg bg-amber-100 px-3 py-1.5 text-xs text-amber-700 hover:bg-amber-200 disabled:opacity-60"
                >
                  {resendBusy ? "Sending…" : "Resend set-password email"}
                </button>
              )}
            </div>
            {member.deletedAt && (
              <p className="mt-3 text-xs text-gray-500">
                Will be permanently deleted 30 days after {new Date(member.deletedAt).toLocaleDateString()}.
              </p>
            )}
          </section>

          {/* Recent credit usage */}
          <section className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
            <h2 className="mb-4 text-base font-semibold text-gray-800 dark:text-white">Credit usage</h2>
            <CreditUsageList items={member.recentCreditUsages ?? []} />
          </section>
        </div>

        {/* Wallet sidebar */}
        <div className="space-y-6">
          <section className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
            <h2 className="mb-4 text-base font-semibold text-gray-800 dark:text-white">Wallet</h2>
            <p className="text-2xl font-bold text-gray-800 dark:text-white">
              {member.wallet?.currency ?? "—"} {(member.wallet?.balance ?? 0).toFixed(2)}
            </p>
            <p className="mt-1 text-xs text-gray-500">
              Credit limit: {member.wallet?.creditLimit ? member.wallet.creditLimit.toFixed(2) : "—"}
            </p>
            {member.wallet?.minOrderAmount != null && (
              <p className="mt-1 text-xs text-gray-500">
                Min order: {member.wallet.currency} {member.wallet.minOrderAmount.toFixed(2)}
              </p>
            )}
            <div className="mt-4 grid grid-cols-3 gap-2">
              <button onClick={() => { setWalletModal("credit"); setWalletAmount(""); setWalletDesc(""); setWalletError(""); }} className="rounded-lg bg-green-50 py-2 text-xs font-medium text-green-700 hover:bg-green-100">+ Add</button>
              <button onClick={() => { setWalletModal("deduct"); setWalletAmount(""); setWalletDesc(""); setWalletError(""); }} className="rounded-lg bg-red-50 py-2 text-xs font-medium text-red-700 hover:bg-red-100">− Deduct</button>
              <button onClick={() => { setWalletModal("adjust"); setWalletAmount(""); setWalletDesc(""); setWalletError(""); }} className="rounded-lg bg-blue-50 py-2 text-xs font-medium text-blue-700 hover:bg-blue-100">± Adjust</button>
            </div>
          </section>

          <section className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
            <h2 className="mb-4 text-base font-semibold text-gray-800 dark:text-white">Recent transactions</h2>
            <TransactionList items={member.recentTransactions ?? []} />
          </section>
        </div>
      </div>

      {/* Wallet modal */}
      {walletModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-900">
            <h3 className="mb-4 text-base font-semibold text-gray-800 dark:text-white">
              {walletModal === "credit" ? "Add Wallet Credit" : walletModal === "deduct" ? "Deduct from Wallet" : "Adjust Balance"}
            </h3>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-sm text-gray-600 dark:text-gray-400">
                  Amount ({member.wallet?.currency ?? "AED"})
                </label>
                <input type="number" min="0.01" step="0.01" value={walletAmount} onChange={(e) => setWalletAmount(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white" />
              </div>
              <div>
                <label className="mb-1 block text-sm text-gray-600 dark:text-gray-400">Description (optional)</label>
                <input type="text" value={walletDesc} onChange={(e) => setWalletDesc(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white" />
              </div>
              {walletError && <p className="text-xs text-red-500">{walletError}</p>}
              <div className="flex gap-2 pt-1">
                <button onClick={handleWalletAction} disabled={walletBusy} className="flex-1 rounded-lg bg-brand-500 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50">
                  {walletBusy ? "Processing..." : "Confirm"}
                </button>
                <button onClick={() => setWalletModal(null)} className="rounded-lg bg-gray-100 px-4 py-2 text-sm text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300">
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

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">{label}</dt>
      <dd className="mt-1 text-sm text-gray-800 dark:text-gray-200">{value}</dd>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const cls = status === "ACTIVE" ? "bg-green-100 text-green-700"
    : status === "SUSPENDED" ? "bg-yellow-100 text-yellow-700"
    : status === "TRASHED" ? "bg-gray-200 text-gray-700"
    : "bg-red-100 text-red-700";
  return <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}>{status}</span>;
}

function TransactionList({ items }: { items: WalletTransaction[] }) {
  if (items.length === 0) return <p className="text-xs text-gray-400">No transactions yet.</p>;
  return (
    <ul className="space-y-2">
      {items.map((tx) => (
        <li key={tx.id} className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2 dark:bg-gray-800">
          <div>
            <span className={`text-xs font-bold ${
              tx.type === "CREDIT" || tx.type === "REFUND" ? "text-green-600"
              : tx.type === "DEBIT" ? "text-red-600" : "text-blue-600"
            }`}>{tx.type}</span>
            <p className="text-xs text-gray-500">{tx.description ?? "—"}</p>
            <p className="text-[10px] text-gray-400">{new Date(tx.createdAt).toLocaleString()}</p>
          </div>
          <div className="text-right">
            <p className={`text-sm font-semibold ${tx.type === "DEBIT" ? "text-red-600" : "text-green-600"}`}>
              {tx.type === "DEBIT" ? "−" : "+"}{tx.amount.toFixed(2)}
            </p>
            <p className="text-[10px] text-gray-400">Bal: {tx.balanceAfter.toFixed(2)}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}

function CreditUsageList({ items }: { items: CreditUsage[] }) {
  if (items.length === 0) return <p className="text-xs text-gray-400">No credit used yet.</p>;
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-gray-100 text-left text-xs uppercase text-gray-500 dark:border-gray-800">
          <th className="pb-2 pr-3">Order</th>
          <th className="pb-2 pr-3">Amount</th>
          <th className="pb-2 pr-3">Status</th>
          <th className="pb-2">Due</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
        {items.map((u) => (
          <tr key={u.id}>
            <td className="py-2 pr-3 font-mono text-xs text-gray-500">{u.orderId.slice(0, 8)}…</td>
            <td className="py-2 pr-3">{u.currency} {u.amount.toFixed(2)}</td>
            <td className="py-2 pr-3">
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                u.status === "PAID" ? "bg-green-100 text-green-700"
                : u.status === "OUTSTANDING" ? "bg-yellow-100 text-yellow-700"
                : u.status === "PARTIAL" ? "bg-blue-100 text-blue-700"
                : "bg-red-100 text-red-700"
              }`}>
                {u.status}
              </span>
            </td>
            <td className="py-2 text-xs text-gray-500">{new Date(u.dueAt).toLocaleDateString()}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
