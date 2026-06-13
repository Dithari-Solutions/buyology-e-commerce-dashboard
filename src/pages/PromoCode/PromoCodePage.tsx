import { useEffect, useState } from "react";
import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import { promoService, type PromoCode, type CreatePromoCodeRequest, type PromoUsage, type IssuePersonalCodeRequest, type TokenRedemptionConfig } from "../../api/services/promo.service";

function formatDate(iso?: string) {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(new Date(iso));
}

export default function PromoCodePage() {
  const [codes, setCodes] = useState<PromoCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showSend, setShowSend] = useState<string | null>(null);
  const [form, setForm] = useState<CreatePromoCodeRequest>({
    code: "", discountType: "PERCENTAGE", discountValue: 10,
  });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [sendEmail, setSendEmail] = useState(true);
  const [sendPush, setSendPush] = useState(true);
  const [sending, setSending] = useState(false);
  const [showUsage, setShowUsage] = useState<PromoCode | null>(null);
  const [usages, setUsages] = useState<PromoUsage[]>([]);
  const [usageLoading, setUsageLoading] = useState(false);

  // Item 4 — issue a personal coupon to one user.
  const [showIssue, setShowIssue] = useState(false);
  const [issueForm, setIssueForm] = useState<IssuePersonalCodeRequest>({
    userId: "", discountType: "PERCENTAGE", discountValue: 10, sendEmail: true, sendPush: false,
  });
  const [issuing, setIssuing] = useState(false);

  // Item 3 — admin-configurable token redemption.
  const [showConfig, setShowConfig] = useState(false);
  const [config, setConfig] = useState<TokenRedemptionConfig | null>(null);
  const [configSaving, setConfigSaving] = useState(false);

  useEffect(() => {
    const ac = new AbortController();
    promoService.listAll(ac.signal)
      .then((r) => setCodes(r.data ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
    return () => ac.abort();
  }, []);

  const handleCreate = async () => {
    setSaving(true); setMsg("");
    try {
      const created = await promoService.create(form);
      setCodes((c) => [created.data as PromoCode, ...c]);
      setShowCreate(false);
      setForm({ code: "", discountType: "PERCENTAGE", discountValue: 10 });
    } catch {
      setMsg("Failed to create promo code");
    } finally { setSaving(false); }
  };

  const handleDeactivate = async (id: string) => {
    if (!confirm("Deactivate this promo code?")) return;
    await promoService.deactivate(id);
    setCodes((c) => c.map((p) => p.id === id ? { ...p, isActive: false } : p));
  };

  const openUsage = async (p: PromoCode) => {
    setShowUsage(p);
    setUsageLoading(true);
    setUsages([]);
    try {
      const r = await promoService.usages(p.id);
      setUsages(r.data ?? []);
    } catch {
      setUsages([]);
    } finally { setUsageLoading(false); }
  };

  const handleSend = async () => {
    if (!showSend) return;
    setSending(true);
    try {
      await promoService.sendToCustomers(showSend, { sendEmail, sendPush });
      setShowSend(null);
    } catch {
      setMsg("Failed to send promo code");
    } finally { setSending(false); }
  };

  const handleIssue = async () => {
    if (!issueForm.userId.trim()) { setMsg("User ID is required"); return; }
    setIssuing(true); setMsg("");
    try {
      const created = await promoService.issueToUser(issueForm);
      setCodes((c) => [created.data as PromoCode, ...c]);
      setShowIssue(false);
      setIssueForm({ userId: "", discountType: "PERCENTAGE", discountValue: 10, sendEmail: true, sendPush: false });
    } catch {
      setMsg("Failed to issue personal code");
    } finally { setIssuing(false); }
  };

  const openConfig = async () => {
    setShowConfig(true);
    try {
      const r = await promoService.getRedeemConfig();
      if (r.data) setConfig(r.data);
    } catch { /* keep null -> shows loading */ }
  };

  const handleSaveConfig = async () => {
    if (!config) return;
    setConfigSaving(true); setMsg("");
    try {
      const r = await promoService.updateRedeemConfig(config);
      if (r.data) setConfig(r.data);
      setShowConfig(false);
    } catch {
      setMsg("Failed to save token redemption config");
    } finally { setConfigSaving(false); }
  };

  return (
    <>
      <PageMeta title="Promo Codes | Buyology" description="Manage promotional codes" />
      <PageBreadcrumb pageTitle="Promo Codes" />

      <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white">Promo Codes ({codes.length})</h2>
          <div className="flex flex-wrap gap-2">
            <button onClick={openConfig}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800">
              Token Redemption
            </button>
            <button onClick={() => setShowIssue(true)}
              className="rounded-lg border border-brand-300 px-4 py-2 text-sm font-medium text-brand-600 hover:bg-brand-50 dark:border-brand-700 dark:text-brand-400">
              Issue to User
            </button>
            <button onClick={() => setShowCreate(true)}
              className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600">
              + Create Code
            </button>
          </div>
        </div>

        {loading ? <p className="text-sm text-gray-500">Loading...</p> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-800 text-left text-gray-500 text-xs uppercase">
                  <th className="pb-3 pr-4">Code</th>
                  <th className="pb-3 pr-4">Discount</th>
                  <th className="pb-3 pr-4">Used</th>
                  <th className="pb-3 pr-4">Expires</th>
                  <th className="pb-3 pr-4">Status</th>
                  <th className="pb-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {codes.map((p) => (
                  <tr key={p.id}>
                    <td className="py-3 pr-4 font-mono font-semibold text-gray-800 dark:text-gray-200">
                      {p.code}
                      {p.targetUserId && (
                        <span className="ml-2 rounded-full bg-purple-100 px-2 py-0.5 align-middle text-[10px] font-medium text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">
                          Personal
                        </span>
                      )}
                    </td>
                    <td className="py-3 pr-4 text-gray-600 dark:text-gray-400">
                      {p.discountType === "PERCENTAGE" ? `${p.discountValue}%` : `${p.discountValue} off`}
                    </td>
                    <td className="py-3 pr-4 text-gray-600 dark:text-gray-400">
                      {p.totalUsed > 0 ? (
                        <button onClick={() => openUsage(p)}
                          className="font-medium text-brand-600 hover:underline dark:text-brand-400">
                          {p.totalUsed}{p.maxUsesTotal ? `/${p.maxUsesTotal}` : ""}
                        </button>
                      ) : (
                        <span>{p.totalUsed}{p.maxUsesTotal ? `/${p.maxUsesTotal}` : ""}</span>
                      )}
                    </td>
                    <td className="py-3 pr-4 text-gray-600 dark:text-gray-400">{formatDate(p.expiresAt)}</td>
                    <td className="py-3 pr-4">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${p.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                        {p.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="py-3 flex gap-2">
                      <button onClick={() => setShowSend(p.id)}
                        className="rounded-lg bg-brand-50 px-2 py-1 text-xs text-brand-600 hover:bg-brand-100 dark:bg-brand-900/20 dark:text-brand-400">
                        Send
                      </button>
                      {p.isActive && (
                        <button onClick={() => handleDeactivate(p.id)}
                          className="rounded-lg bg-red-50 px-2 py-1 text-xs text-red-600 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400">
                          Deactivate
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

      {/* Create modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-900">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold dark:text-white">Create Promo Code</h3>
              <button onClick={() => setShowCreate(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <div className="space-y-3">
              {(
                [
                  { label: "Code", key: "code", type: "text", placeholder: "e.g. SUMMER20" },
                  { label: "Discount Value", key: "discountValue", type: "number", placeholder: "10" },
                  { label: "Min Order Amount", key: "minimumOrderAmount", type: "number", placeholder: "0 (optional)" },
                  { label: "Max Uses Total", key: "maxUsesTotal", type: "number", placeholder: "unlimited" },
                  { label: "Max Per Customer", key: "maxUsesPerCustomer", type: "number", placeholder: "unlimited" },
                  { label: "Description", key: "description", type: "text", placeholder: "" },
                ] as const
              ).map(({ label, key, type, placeholder }) => (
                <div key={key}>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">{label}</label>
                  <input type={type} placeholder={placeholder}
                    value={String(form[key] ?? "")}
                    onChange={(e) => setForm((f) => ({ ...f, [key]: type === "number" ? Number(e.target.value) || undefined : e.target.value }))}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white" />
                </div>
              ))}
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Discount Type</label>
                <select value={form.discountType} onChange={(e) => setForm((f) => ({ ...f, discountType: e.target.value as "PERCENTAGE" | "FIXED_AMOUNT" }))}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white">
                  <option value="PERCENTAGE">Percentage (%)</option>
                  <option value="FIXED_AMOUNT">Fixed Amount</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Expiry Date</label>
                <input type="datetime-local"
                  onChange={(e) => setForm((f) => ({ ...f, expiresAt: e.target.value ? new Date(e.target.value).toISOString() : undefined }))}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white" />
              </div>
            </div>
            {msg && <p className="mt-2 text-sm text-red-500">{msg}</p>}
            <div className="mt-4 flex gap-3">
              <button onClick={handleCreate} disabled={saving}
                className="flex-1 rounded-lg bg-brand-500 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50">
                {saving ? "Creating..." : "Create"}
              </button>
              <button onClick={() => setShowCreate(false)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm dark:border-gray-600 dark:text-gray-300">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Send modal */}
      {showSend && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-900">
            <h3 className="mb-4 text-lg font-semibold dark:text-white">Send Promo to Customers</h3>
            <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
              This will send the promo code to ALL customers. Choose channels:
            </p>
            <label className="mb-2 flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
              <input type="checkbox" checked={sendEmail} onChange={(e) => setSendEmail(e.target.checked)} />
              Email
            </label>
            <label className="mb-4 flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
              <input type="checkbox" checked={sendPush} onChange={(e) => setSendPush(e.target.checked)} />
              Push Notification
            </label>
            <div className="flex gap-3">
              <button onClick={handleSend} disabled={sending}
                className="flex-1 rounded-lg bg-brand-500 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50">
                {sending ? "Sending..." : "Send"}
              </button>
              <button onClick={() => setShowSend(null)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm dark:border-gray-600 dark:text-gray-300">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Usage / "who used it" modal */}
      {showUsage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-900">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold dark:text-white">
                Redemptions — <span className="font-mono">{showUsage.code}</span>
              </h3>
              <button onClick={() => setShowUsage(null)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            {usageLoading ? (
              <p className="text-sm text-gray-500">Loading...</p>
            ) : usages.length === 0 ? (
              <p className="text-sm text-gray-500">No redemptions yet.</p>
            ) : (
              <div className="max-h-[60vh] overflow-y-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 dark:border-gray-800 text-left text-gray-500 text-xs uppercase">
                      <th className="pb-2 pr-4">Customer</th>
                      <th className="pb-2 pr-4">Discount</th>
                      <th className="pb-2 pr-4">Order</th>
                      <th className="pb-2">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {usages.map((u, i) => (
                      <tr key={i}>
                        <td className="py-2 pr-4">
                          <div className="font-medium text-gray-800 dark:text-gray-200">{u.customerName ?? "—"}</div>
                          <div className="text-xs text-gray-500">{u.customerEmail ?? u.userId}</div>
                        </td>
                        <td className="py-2 pr-4 text-gray-600 dark:text-gray-400">{u.discountApplied}</td>
                        <td className="py-2 pr-4 font-mono text-xs text-gray-500">{u.orderId.slice(0, 8)}…</td>
                        <td className="py-2 text-gray-600 dark:text-gray-400">{formatDate(u.usedAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div className="mt-4 flex justify-end">
              <button onClick={() => setShowUsage(null)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm dark:border-gray-600 dark:text-gray-300">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Issue-to-user modal (item 4) */}
      {showIssue && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-900">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold dark:text-white">Issue Personal Coupon</h3>
              <button onClick={() => setShowIssue(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
              Mints a unique code usable by this customer only and emails it to them.
            </p>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Customer User ID</label>
                <input type="text" placeholder="paste the user's ID"
                  value={issueForm.userId}
                  onChange={(e) => setIssueForm((f) => ({ ...f, userId: e.target.value.trim() }))}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 font-mono text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Discount Type</label>
                  <select value={issueForm.discountType}
                    onChange={(e) => setIssueForm((f) => ({ ...f, discountType: e.target.value as "PERCENTAGE" | "FIXED_AMOUNT" }))}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white">
                    <option value="PERCENTAGE">Percentage (%)</option>
                    <option value="FIXED_AMOUNT">Fixed Amount</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Discount Value</label>
                  <input type="number" value={issueForm.discountValue}
                    onChange={(e) => setIssueForm((f) => ({ ...f, discountValue: Number(e.target.value) || 0 }))}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white" />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Min Order (optional)</label>
                  <input type="number" placeholder="0"
                    onChange={(e) => setIssueForm((f) => ({ ...f, minimumOrderAmount: Number(e.target.value) || undefined }))}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white" />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Valid for (days)</label>
                  <input type="number" placeholder="never expires"
                    onChange={(e) => setIssueForm((f) => ({ ...f, validityDays: Number(e.target.value) || undefined }))}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white" />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Description (optional)</label>
                <input type="text" placeholder="e.g. Loyalty reward"
                  onChange={(e) => setIssueForm((f) => ({ ...f, description: e.target.value || undefined }))}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white" />
              </div>
              <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                <input type="checkbox" checked={issueForm.sendEmail}
                  onChange={(e) => setIssueForm((f) => ({ ...f, sendEmail: e.target.checked }))} />
                Email the code to the customer
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                <input type="checkbox" checked={issueForm.sendPush}
                  onChange={(e) => setIssueForm((f) => ({ ...f, sendPush: e.target.checked }))} />
                Also send a push notification
              </label>
            </div>
            {msg && <p className="mt-2 text-sm text-red-500">{msg}</p>}
            <div className="mt-4 flex gap-3">
              <button onClick={handleIssue} disabled={issuing}
                className="flex-1 rounded-lg bg-brand-500 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50">
                {issuing ? "Issuing..." : "Issue & Notify"}
              </button>
              <button onClick={() => setShowIssue(false)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm dark:border-gray-600 dark:text-gray-300">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Token redemption config modal (item 3) */}
      {showConfig && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-900">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold dark:text-white">Token Redemption Settings</h3>
              <button onClick={() => setShowConfig(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            {!config ? (
              <p className="text-sm text-gray-500">Loading...</p>
            ) : (
              <>
                <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
                  Controls how customers convert game tokens into a discount coupon.
                </p>
                <div className="space-y-3">
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                    <input type="checkbox" checked={config.enabled}
                      onChange={(e) => setConfig({ ...config, enabled: e.target.checked })} />
                    Redemption enabled
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Token Cost</label>
                      <input type="number" value={config.tokenCost}
                        onChange={(e) => setConfig({ ...config, tokenCost: Number(e.target.value) || 0 })}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white" />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Discount Type</label>
                      <select value={config.discountType}
                        onChange={(e) => setConfig({ ...config, discountType: e.target.value as "PERCENTAGE" | "FIXED_AMOUNT" })}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white">
                        <option value="PERCENTAGE">Percentage (%)</option>
                        <option value="FIXED_AMOUNT">Fixed Amount</option>
                      </select>
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Discount Value</label>
                      <input type="number" value={config.discountValue}
                        onChange={(e) => setConfig({ ...config, discountValue: Number(e.target.value) || 0 })}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white" />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Coupon Validity (days)</label>
                      <input type="number" value={config.couponValidityDays}
                        onChange={(e) => setConfig({ ...config, couponValidityDays: Number(e.target.value) || 0 })}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white" />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Max Uses / Coupon</label>
                      <input type="number" value={config.maxUsesPerCoupon}
                        onChange={(e) => setConfig({ ...config, maxUsesPerCoupon: Number(e.target.value) || 1 })}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white" />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Max Redemptions / Customer</label>
                      <input type="number" placeholder="unlimited"
                        value={config.maxRedemptionsPerCustomer ?? ""}
                        onChange={(e) => setConfig({ ...config, maxRedemptionsPerCustomer: e.target.value === "" ? null : Number(e.target.value) })}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white" />
                    </div>
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Min Order Amount (optional)</label>
                    <input type="number" placeholder="0"
                      value={config.minimumOrderAmount ?? ""}
                      onChange={(e) => setConfig({ ...config, minimumOrderAmount: e.target.value === "" ? null : Number(e.target.value) })}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white" />
                  </div>
                </div>
                {msg && <p className="mt-2 text-sm text-red-500">{msg}</p>}
                <div className="mt-4 flex gap-3">
                  <button onClick={handleSaveConfig} disabled={configSaving}
                    className="flex-1 rounded-lg bg-brand-500 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50">
                    {configSaving ? "Saving..." : "Save Settings"}
                  </button>
                  <button onClick={() => setShowConfig(false)}
                    className="rounded-lg border border-gray-300 px-4 py-2 text-sm dark:border-gray-600 dark:text-gray-300">
                    Cancel
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
