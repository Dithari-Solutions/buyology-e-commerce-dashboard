import { useEffect, useState } from "react";
import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import { ApiRequestError } from "../../api/types/api.types";
import {
  supplierPayoutsService,
  type PayoutEligibility,
  type PayoutRequestDetail,
  type PayoutRequestStatus,
  type SupplierPayoutAccount,
  type SupplierPayoutAccountPayload,
} from "../../api/services/payouts.service";
import type { SpringPage } from "../../api/services/refunds.service";

const STATUS_COLORS: Record<PayoutRequestStatus, string> = {
  PENDING: "bg-yellow-100 text-yellow-700",
  PAID: "bg-green-100 text-green-700",
  REJECTED: "bg-red-100 text-red-700",
};

export default function SupplierPayoutsPage() {
  const [eligibility, setEligibility] = useState<PayoutEligibility | null>(null);
  const [account, setAccount] = useState<SupplierPayoutAccount | null>(null);
  const [history, setHistory] = useState<SpringPage<PayoutRequestDetail> | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  // Account form state
  const [form, setForm] = useState<SupplierPayoutAccountPayload>({ legalName: "" });
  const [savingAccount, setSavingAccount] = useState(false);
  const [editMode, setEditMode] = useState(false);

  const reload = async (signal?: AbortSignal) => {
    setLoading(true);
    try {
      const [eligR, histR, accR] = await Promise.allSettled([
        supplierPayoutsService.eligibility(signal),
        supplierPayoutsService.history({ page: 0, size: 20 }, signal),
        supplierPayoutsService.getAccount(signal),
      ]);
      if (eligR.status === "fulfilled") setEligibility(eligR.value.data);
      if (histR.status === "fulfilled") setHistory(histR.value.data);
      if (accR.status === "fulfilled" && accR.value.data) {
        const a = accR.value.data;
        setAccount(a);
        setForm({
          legalName: a.legalName,
          bankName: a.bankName,
          accountHolderName: a.accountHolderName,
          iban: a.iban,
          swiftCode: a.swiftCode,
          walletProvider: a.walletProvider,
          walletNumber: a.walletNumber,
        });
      } else {
        // No account on file yet — open the form for first-time setup
        setAccount(null);
        setEditMode(true);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const ac = new AbortController();
    reload(ac.signal);
    return () => ac.abort();
  }, []);

  const submit = async () => {
    setMsg(null);
    setSubmitting(true);
    try {
      await supplierPayoutsService.submit();
      setMsg({ kind: "ok", text: "Payout request submitted — we'll process it shortly." });
      await reload();
    } catch (e) {
      setMsg({
        kind: "err",
        text: e instanceof ApiRequestError ? e.message : "Failed to submit payout request",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const saveAccount = async () => {
    setMsg(null);
    if (!form.legalName.trim()) {
      setMsg({ kind: "err", text: "Legal name is required" });
      return;
    }
    if (!form.iban?.trim() && !form.walletNumber?.trim()) {
      setMsg({ kind: "err", text: "Provide either an IBAN or a wallet number" });
      return;
    }
    setSavingAccount(true);
    try {
      const r = await supplierPayoutsService.upsertAccount(form);
      setAccount(r.data);
      setEditMode(false);
      setMsg({ kind: "ok", text: "Payout details saved" });
      await reload();
    } catch (e) {
      setMsg({
        kind: "err",
        text: e instanceof ApiRequestError ? e.message : "Failed to save payout details",
      });
    } finally {
      setSavingAccount(false);
    }
  };

  return (
    <>
      <PageMeta title="Payouts | Buyology" description="Request your supplier payouts" />
      <PageBreadcrumb pageTitle="Payouts" />

      <div className="space-y-6">
        {/* Eligibility banner */}
        <EligibilityBanner
          eligibility={eligibility}
          loading={loading}
          submitting={submitting}
          onSubmit={submit}
        />

        {msg && (
          <p
            className={`text-sm ${msg.kind === "ok" ? "text-green-600" : "text-red-600"}`}
          >
            {msg.text}
          </p>
        )}

        {/* Account form */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-base font-semibold text-gray-800 dark:text-white">
              Payout details
            </h3>
            {account && !editMode && (
              <button
                onClick={() => setEditMode(true)}
                className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs dark:border-gray-600 dark:text-gray-300"
              >
                Edit
              </button>
            )}
          </div>

          {!account && !editMode ? (
            <p className="text-sm text-gray-500">Loading…</p>
          ) : editMode ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Field label="Legal name (required)" value={form.legalName} onChange={(v) => setForm((f) => ({ ...f, legalName: v }))} />
              <Field label="Bank name" value={form.bankName ?? ""} onChange={(v) => setForm((f) => ({ ...f, bankName: v }))} />
              <Field label="Account holder name" value={form.accountHolderName ?? ""} onChange={(v) => setForm((f) => ({ ...f, accountHolderName: v }))} />
              <Field label="IBAN" value={form.iban ?? ""} onChange={(v) => setForm((f) => ({ ...f, iban: v }))} mono />
              <Field label="SWIFT / BIC" value={form.swiftCode ?? ""} onChange={(v) => setForm((f) => ({ ...f, swiftCode: v }))} mono />
              <Field label="Wallet provider (optional)" value={form.walletProvider ?? ""} onChange={(v) => setForm((f) => ({ ...f, walletProvider: v }))} />
              <Field label="Wallet number (optional)" value={form.walletNumber ?? ""} onChange={(v) => setForm((f) => ({ ...f, walletNumber: v }))} mono />

              <div className="md:col-span-2 flex gap-2">
                <button
                  onClick={saveAccount}
                  disabled={savingAccount}
                  className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50"
                >
                  {savingAccount ? "Saving…" : "Save"}
                </button>
                {account && (
                  <button
                    onClick={() => setEditMode(false)}
                    disabled={savingAccount}
                    className="rounded-lg border border-gray-300 px-4 py-2 text-sm dark:border-gray-600 dark:text-gray-300"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>
          ) : (
            <dl className="space-y-2 text-sm">
              {[
                ["Legal name", account!.legalName],
                ["Bank name", account!.bankName],
                ["Account holder", account!.accountHolderName],
                ["IBAN", account!.iban],
                ["SWIFT / BIC", account!.swiftCode],
                ["Wallet provider", account!.walletProvider],
                ["Wallet number", account!.walletNumber],
              ]
                .filter(([, v]) => v != null && v !== "")
                .map(([k, v]) => (
                  <div key={k as string} className="flex gap-3">
                    <dt className="w-36 shrink-0 text-gray-500 dark:text-gray-400">{k}</dt>
                    <dd className="break-words font-mono text-xs text-gray-800 dark:text-gray-200">
                      {v}
                    </dd>
                  </div>
                ))}
            </dl>
          )}
        </div>

        {/* History */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
          <h3 className="mb-4 text-base font-semibold text-gray-800 dark:text-white">
            Payout history
          </h3>
          {!history || history.content.length === 0 ? (
            <p className="text-sm text-gray-500">No payout requests yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-left text-xs uppercase text-gray-500 dark:border-gray-800">
                    <th className="pb-3 pr-4">Date</th>
                    <th className="pb-3 pr-4">Amount</th>
                    <th className="pb-3 pr-4">Items</th>
                    <th className="pb-3 pr-4">Status</th>
                    <th className="pb-3">Note</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {history.content.map((r) => (
                    <tr key={r.id}>
                      <td className="py-3 pr-4 text-xs text-gray-500">
                        {new Date(r.createdAt).toLocaleString()}
                      </td>
                      <td className="py-3 pr-4 font-medium text-gray-800 dark:text-gray-200">
                        AED {Number(r.amountAed).toFixed(2)}
                      </td>
                      <td className="py-3 pr-4 text-gray-700 dark:text-gray-300">
                        {r.orderItemIds.length}
                      </td>
                      <td className="py-3 pr-4">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[r.status]}`}
                        >
                          {r.status}
                        </span>
                      </td>
                      <td className="py-3 text-xs text-gray-600 dark:text-gray-400">
                        {r.adminNote ?? "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function EligibilityBanner({
  eligibility,
  loading,
  submitting,
  onSubmit,
}: {
  eligibility: PayoutEligibility | null;
  loading: boolean;
  submitting: boolean;
  onSubmit: () => void;
}) {
  if (loading || !eligibility) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-6 text-sm text-gray-500 dark:border-gray-800 dark:bg-white/[0.03]">
        Checking payout eligibility…
      </div>
    );
  }
  const tone = eligibility.eligible
    ? "border-green-300 bg-green-50 dark:bg-green-900/20"
    : "border-gray-200 bg-gray-50 dark:bg-gray-800/40";

  return (
    <div className={`rounded-2xl border p-6 ${tone}`}>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-gray-800 dark:text-gray-100">
            {eligibility.reason}
          </p>
          {eligibility.owedAmountAed > 0 && (
            <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">
              Currently owed: <strong>AED {Number(eligibility.owedAmountAed).toFixed(2)}</strong>
            </p>
          )}
        </div>
        {eligibility.eligible && (
          <button
            onClick={onSubmit}
            disabled={submitting}
            className="rounded-lg bg-green-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50"
          >
            {submitting ? "Submitting…" : "Request payout"}
          </button>
        )}
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  mono = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  mono?: boolean;
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
        {label}
      </label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white ${
          mono ? "font-mono" : ""
        }`}
      />
    </div>
  );
}
