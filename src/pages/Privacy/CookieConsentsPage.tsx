import { useEffect, useState } from "react";
import { Navigate } from "react-router";
import { isSuperAdmin } from "../../auth/roles";
import { cookieConsentService, type CookieDecisionPage, type CookiePolicy } from "../../api/services/cookie-consent.service";
import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";

const panel = "rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]";
const field = "min-h-11 rounded-xl border border-gray-300 bg-transparent px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white";
const button = "min-h-11 rounded-xl border border-gray-300 px-4 py-2 text-sm font-medium disabled:opacity-40 dark:border-gray-700 dark:text-white";
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function Choice({ allowed }: { allowed: boolean }) {
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${allowed ? "bg-green-50 text-green-800 dark:bg-green-900/30 dark:text-green-300" : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"}`}>{allowed ? "Allowed" : "Declined"}</span>;
}

export default function CookieConsentsPage() {
  const allowed = isSuperAdmin();
  const [records, setRecords] = useState<CookieDecisionPage | null>(null);
  const [policy, setPolicy] = useState<CookiePolicy | null>(null);
  const [tab, setTab] = useState("activity");
  const [page, setPage] = useState(0), [refresh, setRefresh] = useState(0);
  const [draft, setDraft] = useState(""), [search, setSearch] = useState("");
  const [analytics, setAnalytics] = useState(""), [marketing, setMarketing] = useState("");
  const [loading, setLoading] = useState(true), [error, setError] = useState("");

  useEffect(() => {
    if (!allowed) return;
    const controller = new AbortController();
    setLoading(true); setError(""); setRecords(null);
    Promise.all([cookieConsentService.list(page, search, analytics, marketing, controller.signal), cookieConsentService.policy(controller.signal)])
      .then(([result, details]) => { if (!controller.signal.aborted) { setRecords(result.data); setPolicy(details.data); } })
      .catch(err => { if (!controller.signal.aborted) setError(err instanceof Error ? err.message : "Could not load cookie information. Try again."); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [allowed, page, search, analytics, marketing, refresh]);

  if (!allowed) return <Navigate to="/" replace />;
  const filter = (setter: (value: string) => void, value: string) => { setter(value); setPage(0); };
  return <>
    <PageMeta title="Cookie consent | Buyology" description="Cookie purposes and anonymous website consent decisions" />
    <PageBreadcrumb pageTitle="Cookie consent" />
    <div className="space-y-5 text-gray-800 dark:text-white/90">
      <div className={panel}><div className="flex flex-wrap items-start justify-between gap-4"><div><h2 className="text-lg font-semibold">Website privacy preferences</h2><p className="mt-2 max-w-3xl text-sm text-gray-600 dark:text-gray-400">Review anonymous decisions and the storage used by the storefront. Records contain choices and references; cookie values and authentication tokens are never collected here.</p></div><button className={button} disabled={loading} onClick={() => setRefresh(n => n + 1)}>Refresh</button></div></div>
      <div className="grid gap-4 sm:grid-cols-3">
        <div className={panel}><p className="text-sm text-gray-500 dark:text-gray-400">Recorded decisions{search || analytics || marketing ? " (filtered)" : ""}</p><p className="mt-2 text-2xl font-semibold">{records ? records.totalElements.toLocaleString() : "—"}</p><p className="mt-2 text-xs text-gray-500">History includes changes and withdrawals.</p></div>
        <div className={panel}><p className="text-sm text-gray-500 dark:text-gray-400">Current policy</p><p className="mt-2 text-2xl font-semibold">{policy?.version ?? "—"}</p><p className="mt-2 text-xs text-gray-500">Choices remembered for {policy?.choiceLifetimeDays ?? "—"} days.</p></div>
        <div className={panel}><p className="text-sm text-gray-500 dark:text-gray-400">Consent record retention</p><p className="mt-2 text-2xl font-semibold">{policy?.auditRetentionDays ?? "—"} days</p><p className="mt-2 text-xs text-gray-500">Browser-declared preferences, not verified identities.</p></div>
      </div>
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Cookie information">
        <button role="tab" aria-selected={tab === "activity"} aria-controls="cookie-activity" className={`${button} ${tab === "activity" ? "bg-brand-500 text-white dark:text-white" : ""}`} onClick={() => setTab("activity")}>Consent activity</button>
        <button role="tab" aria-selected={tab === "inventory"} aria-controls="cookie-inventory" className={`${button} ${tab === "inventory" ? "bg-brand-500 text-white dark:text-white" : ""}`} onClick={() => setTab("inventory")}>Cookie inventory</button>
      </div>
      {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/20 dark:text-red-300">{error}</div>}
      {tab === "activity" && <section id="cookie-activity" role="tabpanel" className={panel}>
        <form className="mb-5 flex flex-wrap gap-3" onSubmit={e => { e.preventDefault(); const id = draft.trim(); if (id && !uuid.test(id)) { setError("Enter a complete consent ID, or leave the field empty."); return; } setSearch(id); setPage(0); setRefresh(n => n + 1); }}>
          <label className="flex min-w-0 flex-1 flex-col gap-1.5 text-xs font-medium">Consent reference<input className={`${field} w-full`} placeholder="Complete consent ID (optional)" value={draft} onChange={e => setDraft(e.target.value)} maxLength={36} /></label>
          <label className="flex flex-col gap-1.5 text-xs font-medium">Analytics<select className={field} value={analytics} onChange={e => filter(setAnalytics,e.target.value)}><option value="">All choices</option><option value="true">Allowed</option><option value="false">Declined</option></select></label>
          <label className="flex flex-col gap-1.5 text-xs font-medium">Marketing<select className={field} value={marketing} onChange={e => filter(setMarketing,e.target.value)}><option value="">All choices</option><option value="true">Allowed</option><option value="false">Declined</option></select></label>
          <button className={`${button} self-end`} type="submit">Search</button>
        </form>
        {loading ? <p role="status" className="py-10 text-center text-sm text-gray-500">Loading consent decisions…</p> : records && records.content.length === 0 ? <p className="py-10 text-center text-sm text-gray-500">No consent decisions match these filters. New visitor choices will appear after the storefront and backend are deployed.</p> : records && <div className="overflow-x-auto"><table className="w-full min-w-[920px] text-left text-sm"><thead className="border-b border-gray-200 text-xs uppercase text-gray-500 dark:border-gray-800"><tr>{["Recorded time", "Consent reference", "Analytics", "Marketing", "Policy", "Source / language", "Website"].map(title => <th className="px-3 py-3 font-medium" key={title}>{title}</th>)}</tr></thead><tbody className="divide-y divide-gray-100 dark:divide-gray-800">{records.content.map(row => <tr key={row.decisionId}><td className="px-3 py-4 whitespace-nowrap">{new Date(row.recordedAt).toLocaleString()}</td><td className="max-w-64 px-3 py-4"><p className="break-all font-mono text-xs">{row.consentId}</p><p className="mt-1 break-all text-[10px] text-gray-500">Decision: {row.decisionId}</p></td><td className="px-3 py-4"><Choice allowed={row.analytics} /></td><td className="px-3 py-4"><Choice allowed={row.marketing} /></td><td className="px-3 py-4 whitespace-nowrap">{row.policyVersion}</td><td className="px-3 py-4">{row.source.toLowerCase()} · {row.language.toUpperCase()}</td><td className="px-3 py-4">{row.sourceHost ?? "Not recorded"}</td></tr>)}</tbody></table></div>}
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3"><p className="text-xs text-gray-500">Necessary storage stays on. Most recent decisions appear first.</p><div className="flex items-center gap-3"><button className={button} disabled={loading || page === 0} onClick={() => setPage(p => p - 1)}>Previous</button><span className="text-sm">{page + 1} / {Math.max(1, records?.totalPages ?? 1)}</span><button className={button} disabled={loading || !records || page + 1 >= records.totalPages} onClick={() => setPage(p => p + 1)}>Next</button></div></div>
      </section>}
      {tab === "inventory" && <section id="cookie-inventory" role="tabpanel" className={panel}>
        <h2 className="font-semibold">Cookie and storage purposes</h2><p className="mt-2 text-sm text-gray-500">Inventory for the current storefront integration. Third-party tags added in GTM must be reviewed against these categories.</p>
        <div className="mt-5 grid gap-4 lg:grid-cols-2">{policy?.cookies.map(item => <article key={item.name} className="min-w-0 rounded-xl border border-gray-200 p-4 dark:border-gray-800"><div className="flex flex-wrap items-center justify-between gap-2"><span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs dark:bg-gray-800">{item.category}</span><span className="text-xs text-gray-500">{item.storage}</span></div><h3 className="mt-3 break-words font-mono text-xs font-semibold">{item.name}</h3><p className="mt-2 text-sm text-gray-600 dark:text-gray-400">{item.purpose}</p><dl className="mt-3 text-xs text-gray-500"><div><dt className="inline font-medium">Provider: </dt><dd className="inline">{item.provider}</dd></div><div className="mt-1"><dt className="inline font-medium">Duration: </dt><dd className="inline">{item.duration}</dd></div></dl></article>)}</div>
      </section>}
    </div>
  </>;
}
