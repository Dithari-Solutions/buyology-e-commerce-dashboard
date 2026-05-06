import { useEffect, useState } from "react";
import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import {
  b2bMembershipService,
  type CreditUsage,
  type CreditUsageStatus,
} from "../../api/services/b2b-membership.service";

const STATUS_COLORS: Record<CreditUsageStatus, string> = {
  OUTSTANDING: "bg-yellow-100 text-yellow-700",
  PARTIAL: "bg-blue-100 text-blue-700",
  PAID: "bg-green-100 text-green-700",
  OVERDUE: "bg-red-100 text-red-700",
};

export default function CreditManagementPage() {
  const [usages, setUsages] = useState<CreditUsage[]>([]);
  const [filter, setFilter] = useState<CreditUsageStatus | "">("");
  const [loading, setLoading] = useState(true);

  const [paybackDays, setPaybackDays] = useState<number>(45);
  const [savedDays, setSavedDays] = useState<number>(45);
  const [savingConfig, setSavingConfig] = useState(false);
  const [configMsg, setConfigMsg] = useState("");

  const [editing, setEditing] = useState<CreditUsage | null>(null);
  const [extendDays, setExtendDays] = useState<string>("");
  const [newDueAt, setNewDueAt] = useState<string>("");
  const [savingDeadline, setSavingDeadline] = useState(false);

  const loadUsages = (status: CreditUsageStatus | "") => {
    setLoading(true);
    b2bMembershipService
      .listCreditUsages(status || undefined)
      .then((res) => setUsages(res.data ?? []))
      .catch(() => setUsages([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadUsages(filter);
    b2bMembershipService.getPaybackConfig().then((res) => {
      const d = res.data?.paybackDays ?? 45;
      setSavedDays(d);
      setPaybackDays(d);
    });
  }, [filter]);

  const saveConfig = async () => {
    setSavingConfig(true);
    setConfigMsg("");
    try {
      const res = await b2bMembershipService.updatePaybackConfig(paybackDays);
      const d = res.data?.paybackDays ?? paybackDays;
      setSavedDays(d);
      setConfigMsg(`Saved (now ${d} days)`);
    } catch (e: unknown) {
      setConfigMsg((e as Error).message ?? "Save failed");
    } finally {
      setSavingConfig(false);
    }
  };

  const saveDeadline = async () => {
    if (!editing) return;
    setSavingDeadline(true);
    try {
      const payload: { dueAt?: string; extendDays?: number } = {};
      if (newDueAt) payload.dueAt = new Date(newDueAt).toISOString();
      else if (extendDays) payload.extendDays = Number(extendDays);
      const res = await b2bMembershipService.updateUsageDeadline(editing.id, payload);
      const u = res.data as CreditUsage;
      setUsages((prev) => prev.map((x) => (x.id === u.id ? u : x)));
      setEditing(null);
      setExtendDays("");
      setNewDueAt("");
    } catch {
      // ignore
    } finally {
      setSavingDeadline(false);
    }
  };

  return (
    <>
      <PageMeta title="B2B Credit Management" description="Manage B2B credit usages and payback policy" />
      <PageBreadcrumb pageTitle="B2B Credit" />

      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="mb-4 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h3 className="text-base font-semibold text-gray-800 dark:text-white">Payback policy</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Days a member has to pay back used credit. Currently <strong>{savedDays}</strong> days.
            </p>
          </div>
          <div className="flex items-end gap-3">
            <label className="flex flex-col text-sm">
              <span className="text-gray-500 dark:text-gray-400">Days</span>
              <input
                type="number"
                min={1}
                max={365}
                className="rounded-md border border-gray-200 px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
                value={paybackDays}
                onChange={(e) => setPaybackDays(Number(e.target.value))}
              />
            </label>
            <button
              onClick={saveConfig}
              disabled={savingConfig || paybackDays === savedDays}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              {savingConfig ? "Saving…" : "Save"}
            </button>
            {configMsg && <span className="text-xs text-gray-500">{configMsg}</span>}
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="mb-4 flex items-center gap-3">
          <h3 className="text-base font-semibold text-gray-800 dark:text-white">Credit usages</h3>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as CreditUsageStatus | "")}
            className="ml-auto rounded-md border border-gray-200 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
          >
            <option value="">All statuses</option>
            <option value="OUTSTANDING">Outstanding</option>
            <option value="PARTIAL">Partial</option>
            <option value="OVERDUE">Overdue</option>
            <option value="PAID">Paid</option>
          </select>
        </div>

        {loading ? (
          <div className="py-10 text-center text-gray-500">Loading…</div>
        ) : usages.length === 0 ? (
          <div className="py-10 text-center text-gray-500">No usages</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500 dark:bg-gray-900">
                <tr>
                  <th className="px-3 py-2">Used</th>
                  <th className="px-3 py-2">User</th>
                  <th className="px-3 py-2">Amount</th>
                  <th className="px-3 py-2">Paid</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Due</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {usages.map((u) => (
                  <tr key={u.id} className="border-t border-gray-100 dark:border-gray-800">
                    <td className="px-3 py-2 text-gray-500">
                      {new Date(u.usedAt).toLocaleDateString()}
                    </td>
                    <td className="px-3 py-2 font-mono text-xs">{u.userId.slice(0, 8)}…</td>
                    <td className="px-3 py-2">
                      {u.amount.toLocaleString()} {u.currency}
                    </td>
                    <td className="px-3 py-2 text-gray-500">
                      {(u.paidAmount ?? 0).toLocaleString()} {u.currency}
                    </td>
                    <td className="px-3 py-2">
                      <span className={`rounded px-2 py-0.5 text-xs ${STATUS_COLORS[u.status]}`}>
                        {u.status}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-gray-500">
                      {new Date(u.dueAt).toLocaleDateString()}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {u.status !== "PAID" && (
                        <button
                          onClick={() => {
                            setEditing(u);
                            setExtendDays("");
                            setNewDueAt("");
                          }}
                          className="text-xs text-blue-600 hover:underline"
                        >
                          Change deadline
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="w-full max-w-md rounded-xl bg-white p-6 dark:bg-gray-800">
            <h3 className="text-lg font-semibold">Change deadline</h3>
            <p className="mt-1 text-sm text-gray-500">
              Current due: {new Date(editing.dueAt).toLocaleString()}
            </p>
            <div className="mt-4 space-y-3">
              <label className="flex flex-col text-sm">
                Extend by days
                <input
                  type="number"
                  className="mt-1 rounded-md border px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
                  value={extendDays}
                  onChange={(e) => {
                    setExtendDays(e.target.value);
                    setNewDueAt("");
                  }}
                />
              </label>
              <div className="text-center text-xs text-gray-400">— OR —</div>
              <label className="flex flex-col text-sm">
                Set exact due date
                <input
                  type="datetime-local"
                  className="mt-1 rounded-md border px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
                  value={newDueAt}
                  onChange={(e) => {
                    setNewDueAt(e.target.value);
                    setExtendDays("");
                  }}
                />
              </label>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => setEditing(null)}
                className="rounded-md px-4 py-2 text-sm text-gray-600"
              >
                Cancel
              </button>
              <button
                onClick={saveDeadline}
                disabled={savingDeadline || (!extendDays && !newDueAt)}
                className="rounded-md bg-blue-600 px-4 py-2 text-sm text-white disabled:opacity-50"
              >
                {savingDeadline ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
