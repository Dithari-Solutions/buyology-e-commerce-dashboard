import { useEffect, useRef, useState } from "react";
import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import { canAccessRoles } from "../../auth/roles";
import { partnershipService, type PartnershipRequest, type PartnershipPage } from "../../api/services/partnership.service";
import { partnerships, questions, steps } from "./qualification";
const partnershipNames = (values: string[]) => partnerships.filter(p => values.includes(p.value)).map(p => p.title).join(", ");
const statusClass = (status: string) => status === "NEW" ? "bg-brand-100 text-brand-700" : status === "REVIEWED" ? "bg-yellow-100 text-yellow-800" : "bg-green-100 text-green-800";
export default function PartnershipRequestsPage() {
 const allowed = canAccessRoles(["CUSTOMER_SUPPORT", "ADMIN"]);
 const [page, setPage] = useState(0);
 const [result, setResult] = useState<PartnershipPage | null>(null);
 const [loading, setLoading] = useState(true);
 const [error, setError] = useState("");
 const [selected, setSelected] = useState<PartnershipRequest | null>(null);
 const [status, setStatus] = useState<PartnershipRequest["status"]>("NEW");
 const [notes, setNotes] = useState("");
 const [saving, setSaving] = useState(false);
 const [detailError, setDetailError] = useState("");
 const [refresh, setRefresh] = useState(0);
 const dialog = useRef<HTMLDialogElement>(null);
 const viewButton = useRef<HTMLButtonElement | null>(null);
 useEffect(() => {
   if (!allowed) { setLoading(false); return; }
   const ac = new AbortController(); setLoading(true); setError("");
   partnershipService.list(page, ac.signal).then(r => { if (!ac.signal.aborted) setResult(r.data ?? null); })
    .catch(() => { if (!ac.signal.aborted) setError("Unable to load partnership requests. Please try again."); })
    .finally(() => { if (!ac.signal.aborted) setLoading(false); });
   return () => ac.abort();
 }, [page, refresh, allowed]);
 useEffect(() => { if (selected) dialog.current?.showModal(); }, [selected]);
 const open = (request: PartnershipRequest, button: HTMLButtonElement) => { viewButton.current=button; setSelected(request); setStatus(request.status); setNotes(request.adminNotes ?? ""); setDetailError(""); };
 const close = () => { if (saving) return; dialog.current?.close(); setSelected(null); viewButton.current?.focus(); };
 const save = async () => {
   if (!selected) return; setSaving(true); setDetailError("");
   try { const r=await partnershipService.update(selected.id, status, notes); if (!r.data) throw new Error(); const updated=r.data; setSelected(updated); setResult(previous => previous ? {...previous,content:previous.content.map(v => v.id===updated.id ? updated : v)} : previous); }
   catch { setDetailError("Unable to save this request. Please try again."); }
   finally { setSaving(false); }
 };
 if (!allowed) return <p className="p-6 text-gray-600 dark:text-gray-300">You do not have access to partnership requests.</p>;
 const labelClass="text-sm text-gray-500 dark:text-gray-400";
 return <><PageMeta title="Partnership requests | Buyology" description="Review Buyology stockist partner qualification forms" /><PageBreadcrumb pageTitle="Partnership requests" />
 <section className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
 <div className="mb-6 flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-xl font-semibold text-gray-800 dark:text-white">Partnership requests</h1><p className="mt-1 text-sm text-gray-500">{result?.totalElements ?? 0} submitted qualification forms</p></div><button className="rounded-lg border border-gray-300 px-4 py-2 text-sm dark:border-gray-700 dark:text-white" onClick={()=>setRefresh(v=>v+1)} disabled={loading}>Refresh</button></div>
 {loading ? <p role="status" className={labelClass}>Loading partnership requests…</p> : error ? <p role="alert" className="text-red-600">{error}</p> : !result?.content.length ? <p className="rounded-xl border border-dashed border-gray-200 p-10 text-center text-gray-500 dark:border-gray-700">No partnership requests yet.</p> : <><div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="border-b border-gray-200 text-gray-500 dark:border-gray-700"><tr>{["Company / location", "Contact", "Partnership interests", "Investment", "Submitted", "Status / email", "Action"].map(t=><th className="whitespace-nowrap pb-3 pr-5 font-medium" key={t}>{t}</th>)}</tr></thead><tbody className="divide-y divide-gray-100 dark:divide-gray-800">{result.content.map(r=><tr key={r.id}><td className="py-4 pr-5 text-gray-800 dark:text-gray-200"><strong>{r.application.company}</strong><p className="text-gray-500">{r.application.cityCountry}</p></td><td className="py-4 pr-5 text-gray-800 dark:text-gray-200">{r.application.name}<p className="text-gray-500">{r.application.email}</p></td><td className="min-w-48 py-4 pr-5 text-gray-700 dark:text-gray-300">{partnershipNames(r.application.partnerships)}</td><td className="min-w-40 py-4 pr-5 text-gray-700 dark:text-gray-300">{r.application.investment}</td><td className="whitespace-nowrap py-4 pr-5 text-gray-500">{new Date(r.createdAt).toLocaleDateString()}</td><td className="py-4 pr-5"><span className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusClass(r.status)}`}>{r.status}</span><p className={`mt-2 text-xs ${r.emailStatus==="FAILED" ? "text-red-600" : "text-gray-500"}`}>Email: {r.emailStatus === "SENT" ? "Provider accepted" : r.emailStatus.toLowerCase()}</p></td><td className="py-4"><button className="rounded-lg bg-brand-50 px-3 py-2 text-sm font-medium text-brand-700 dark:bg-gray-800 dark:text-gray-200" onClick={e=>open(r,e.currentTarget)}>View form</button></td></tr>)}</tbody></table></div><div className="mt-6 flex items-center justify-between gap-4 text-sm text-gray-600 dark:text-gray-300"><button className="rounded-lg border border-gray-300 px-4 py-2 disabled:opacity-40 dark:border-gray-700" disabled={page===0} onClick={()=>setPage(v=>v-1)}>Previous</button><span>Page {page+1} of {result.totalPages}</span><button className="rounded-lg border border-gray-300 px-4 py-2 disabled:opacity-40 dark:border-gray-700" disabled={page+1>=result.totalPages} onClick={()=>setPage(v=>v+1)}>Next</button></div></>}
 </section>
 {selected && <dialog ref={dialog} aria-labelledby="partnership-detail-title" className="fixed m-auto max-h-[90vh] w-[calc(100%_-_2rem)] max-w-3xl overflow-y-auto rounded-2xl border-0 bg-white p-6 shadow-2xl backdrop:bg-black/50 dark:bg-gray-900 dark:text-gray-200" onCancel={e=>{e.preventDefault();close();}}><div className="mb-5 flex items-start justify-between gap-4"><div><h2 id="partnership-detail-title" className="text-xl font-semibold">{selected.application.company}</h2><p className="mt-1 break-all text-xs text-gray-500">Request {selected.id}</p><p className="mt-1 text-sm text-gray-500">Submitted {new Date(selected.createdAt).toLocaleString()}</p></div><button autoFocus className="rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700" onClick={close} disabled={saving}>Close</button></div>
 <section className="mb-6 rounded-xl bg-brand-50 p-5 dark:bg-gray-800"><h3 className="font-semibold text-brand-700 dark:text-white">Preferred partnership</h3><p className="mt-2 text-sm">{partnershipNames(selected.application.partnerships)}</p></section>
 {steps.map((title,i)=><section key={title} className="mb-6"><h3 className="mb-3 border-b border-gray-200 pb-2 font-semibold dark:border-gray-700">{i+1}. {title}</h3><dl className="space-y-3 text-sm">{i===0 && ([ ["Name",selected.application.name],["Company",selected.application.company],["City / Country",selected.application.cityCountry],["Mobile / WhatsApp",selected.application.phone],["Email",selected.application.email],["Website / Social Media",selected.application.website || "Not provided"] ]).map(([label,value])=><div key={label}><dt className={labelClass}>{label}</dt><dd className="mt-1 break-words font-medium">{value}</dd></div>)}{i===2 && <div><dt className={labelClass}>Initial inventory investment</dt><dd className="mt-1 font-medium">{selected.application.investment}</dd></div>}{i===4 && <div><dt className={labelClass}>Partnership interests</dt><dd className="mt-1 font-medium">{partnershipNames(selected.application.partnerships)}</dd></div>}{questions.filter(q=>q[2]===i).map(q=><div key={q[0]}><dt className={labelClass}>{q[1]}</dt><dd className="mt-1 font-medium">{selected.application.answers[q[0]] ? "Yes" : "No"}</dd></div>)}{i===4 && <div><dt className={labelClass}>Why have you chosen Buyology as your preferred business partner?</dt><dd className="mt-1 whitespace-pre-wrap break-words font-medium">{selected.application.whyBuyology || "Not provided"}</dd></div>}</dl></section>)}
 <div className="border-t border-gray-200 pt-5 dark:border-gray-700"><p className="mb-4 text-sm text-gray-500">Confirmation email: {selected.emailStatus === "SENT" ? "accepted by provider" : selected.emailStatus.toLowerCase()} · {selected.emailAttempts} attempt(s)</p><label className="mb-4 block text-sm font-medium">Status<select className="mt-2 block w-full rounded-lg border border-gray-300 bg-white p-3 dark:border-gray-700 dark:bg-gray-800" value={status} onChange={e=>setStatus(e.target.value as PartnershipRequest["status"])} disabled={saving}>{["NEW","REVIEWED","RESPONDED"].map(s=><option key={s}>{s}</option>)}</select></label><label className="block text-sm font-medium">Internal notes<textarea className="mt-2 block w-full rounded-lg border border-gray-300 bg-white p-3 dark:border-gray-700 dark:bg-gray-800" rows={4} maxLength={5000} value={notes} onChange={e=>setNotes(e.target.value)} disabled={saving} /></label>{detailError && <p role="alert" className="mt-3 text-sm text-red-600">{detailError}</p>}<button className="mt-4 rounded-lg bg-brand-600 px-5 py-3 text-sm font-medium text-white disabled:opacity-50" onClick={save} disabled={saving}>{saving ? "Saving…" : "Save status & notes"}</button></div>
 </dialog>}
 </>;
}
