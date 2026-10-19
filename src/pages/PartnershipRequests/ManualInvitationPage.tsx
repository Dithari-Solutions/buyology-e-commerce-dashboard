import { useEffect, useRef, useState } from "react";
import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import { canAccessRoles } from "../../auth/roles";
import { getUserIdFromToken } from "../../api/client";
import { ApiRequestError } from "../../api/types/api.types";
import { partnershipService, type InvitationTemplate, type InvitationBatch, type InvitationSubmission } from "../../api/services/partnership.service";

const panel = "min-w-0 rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] sm:p-6";
const button = "min-h-11 rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:text-white";
const active = (batch: InvitationBatch) => batch.recipients.some(r => r.status === "QUEUED" || r.status === "SENDING");
const emailPattern = /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?\.[a-z]{2,63}$/;
const labels = { QUEUED: "Queued", SENDING: "Sending", ACCEPTED: "Provider accepted", FAILED: "Not accepted", UNKNOWN: "Check with provider" };
const batchSummary = (batch: InvitationBatch) => `${batch.recipients.filter(r => r.status === "ACCEPTED").length} accepted / ${batch.recipients.length} recipients`;

export default function ManualInvitationPage() {
  const allowed = canAccessRoles(["CUSTOMER_SUPPORT", "ADMIN"]);
  const draftKey = `buyology-partnership-invitation:${getUserIdFromToken() ?? "signed-out"}`;
  const [template, setTemplate] = useState<InvitationTemplate | null>(null);
  const [history, setHistory] = useState<InvitationBatch[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [emails, setEmails] = useState("");
  const [locked, setLocked] = useState(false), [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true), [refresh, setRefresh] = useState(0);
  const [error, setError] = useState(""), [statusError, setStatusError] = useState("");
  const attempt = useRef<InvitationSubmission | null>(null);
  const inFlight = useRef(false);

  useEffect(() => {
    if (!allowed) return;
    const controller = new AbortController();
    setLoading(true); setError("");
    partnershipService.invitationTemplate(controller.signal).then(result => {
      if (!controller.signal.aborted) setTemplate(result.data);
    }).catch(() => { if (!controller.signal.aborted) setError("Unable to load the invitation template. Please try again."); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [allowed, refresh]);

  useEffect(() => {
    if (!allowed) return;
    try {
      const raw = sessionStorage.getItem(draftKey);
      if (raw) {
        const saved = JSON.parse(raw) as InvitationSubmission;
        if (/^[0-9a-f-]{36}$/i.test(saved.requestId) && typeof saved.emails === "string" && typeof saved.templateVersion === "string") {
          attempt.current = saved; setEmails(saved.emails); setLocked(true); setSelected(saved.requestId);
        }
      }
    } catch { /* Sending still works if browser storage is blocked. */ }
  }, [allowed, draftKey]);

  useEffect(() => {
    if (!allowed) return;
    const controller = new AbortController();
    const load = async () => {
      try {
        const result = await partnershipService.invitations(controller.signal);
        if (controller.signal.aborted) return;
        setHistory(result.data); setStatusError("");
        const pending = attempt.current;
        if (pending && result.data.some(batch => batch.id === pending.requestId)) {
          attempt.current = null;
          try { sessionStorage.removeItem(draftKey); } catch { /* optional recovery storage */ }
        }
      } catch { if (!controller.signal.aborted) setStatusError("Unable to refresh invitation status. Refresh to check existing invitations before sending again."); }
    };
    void load();
    const timer = setInterval(() => void load(), 5000);
    return () => { controller.abort(); clearInterval(timer); };
  }, [allowed, refresh, draftKey]);

  const batch = history.find(item => item.id === selected);
  const parts = emails.split(",").map(value => value.trim().toLowerCase());
  const recipients = [...new Set(parts.filter(Boolean))];
  const invalid = recipients.filter(value => value.length > 254 || !emailPattern.test(value) || value.includes(".."));
  const limit = template?.maxRecipients ?? 50;
  const validation = emails.trim() && parts.some(value => !value) ? "Remove empty entries between commas."
    : invalid.length ? `Check these email addresses: ${invalid.slice(0, 5).join(", ")}`
    : recipients.length > limit ? `Enter at most ${limit} unique email addresses.` : "";
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!template || validation || !recipients.length || inFlight.current || (locked && !attempt.current)) return;
    inFlight.current = true; setSending(true); setError("");
    const submission = attempt.current ?? { requestId: crypto.randomUUID(), emails: recipients.join(", "), templateVersion: template.version };
    attempt.current = submission; setLocked(true); setSelected(submission.requestId);
    try { sessionStorage.setItem(draftKey, JSON.stringify(submission)); } catch { /* Same-tab retries retain the reference in memory. */ }
    try {
      const result = await partnershipService.invite(submission);
      setHistory(previous => [result.data, ...previous.filter(item => item.id !== result.data.id)].slice(0, 20));
      attempt.current = null;
      try { sessionStorage.removeItem(draftKey); } catch { /* optional recovery storage */ }
    } catch (failure) {
      if (failure instanceof ApiRequestError && failure.statusCode === 409) {
        try {
          const existing = await partnershipService.invitation(submission.requestId);
          setHistory(previous => [existing.data, ...previous.filter(item => item.id !== existing.data.id)].slice(0, 20));
          attempt.current = null;
          try { sessionStorage.removeItem(draftKey); } catch { /* optional recovery storage */ }
          return;
        } catch (lookupFailure) {
          if (lookupFailure instanceof ApiRequestError && lookupFailure.statusCode === 404) {
            attempt.current = null; setLocked(false);
            try { sessionStorage.removeItem(draftKey); } catch { /* optional recovery storage */ }
          }
        }
      }
      const knownRejection = failure instanceof ApiRequestError && [400, 401, 403, 422, 429].includes(failure.statusCode);
      if (knownRejection) {
        attempt.current = null; setLocked(false);
        try { sessionStorage.removeItem(draftKey); } catch { /* optional recovery storage */ }
      }
      setError(failure instanceof Error ? failure.message : "Unable to confirm this submission. Retry with the same invitation reference.");
    } finally { inFlight.current = false; setSending(false); }
  };
  const startAnother = () => {
    if (sending || (batch && active(batch)) || attempt.current) return;
    setEmails(""); setLocked(false); setSelected(null); setError("");
  };

  if (!allowed) return <p className="p-6 text-gray-600 dark:text-gray-300">You do not have access to partnership invitations.</p>;
  return <>
    <PageMeta title="Manual Invitation | Buyology" description="Send a Buyology partnership invitation" />
    <PageBreadcrumb pageTitle="Manual Invitation" />
    <div className="space-y-6 text-gray-800 dark:text-gray-200">
      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <section className={panel}>
          <p className="text-xs font-semibold uppercase tracking-widest text-brand-600 dark:text-brand-300">Partnership requests</p>
          <h1 className="mt-2 text-2xl font-semibold">Manual Invitation</h1>
          <p className="mt-3 text-sm leading-relaxed text-gray-500 dark:text-gray-400">Invite interested businesses to complete the Buyology partnership application. Each recipient receives a separate email.</p>
          <form onSubmit={submit} className="mt-6 space-y-4">
            <label htmlFor="invitation-emails" className="block text-sm font-medium">Email addresses</label>
            <textarea id="invitation-emails" rows={7} value={emails} onChange={event => setEmails(event.target.value)} disabled={locked || sending}
              aria-describedby="invitation-email-help invitation-validation" aria-invalid={Boolean(validation)} maxLength={20000}
              autoCapitalize="none" autoCorrect="off" spellCheck={false} placeholder="partner@example.com, contact@example.com"
              className="w-full resize-y rounded-xl border border-gray-300 bg-transparent p-4 text-sm leading-relaxed outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100 disabled:bg-gray-50 dark:border-gray-700 dark:focus:ring-brand-900 dark:disabled:bg-gray-900" />
            <p id="invitation-email-help" className="text-xs leading-relaxed text-gray-500">Separate addresses with commas. Up to {limit} unique recipients per submission. Duplicate addresses are removed.</p>
            <p className="text-sm font-medium">{recipients.length} unique recipient{recipients.length === 1 ? "" : "s"}{parts.filter(Boolean).length > recipients.length ? ` · ${parts.filter(Boolean).length - recipients.length} duplicate(s) removed` : ""}</p>
            <p id="invitation-validation" className="break-words text-sm text-red-600 dark:text-red-400">{validation}</p>
            {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/20 dark:text-red-300">{error}</p>}
            <div className="flex flex-wrap gap-3">
              <button type="submit" disabled={loading || !template || !recipients.length || Boolean(validation) || sending || (locked && !attempt.current)} className={`${button} border-brand-600 bg-brand-600 text-white dark:text-white`}>{sending ? "Submitting…" : locked && attempt.current ? "Retry submission" : "Send invitations"}</button>
              {locked && !attempt.current && <button type="button" className={button} onClick={startAnother} disabled={sending || Boolean(batch && active(batch))}>New invitation</button>}
            </div>
            <p className="text-xs leading-relaxed text-gray-500">Invitations are queued after submission. “Provider accepted” confirms acceptance by the email service, not delivery to an inbox.</p>
          </form>
        </section>
        <section className={`${panel} overflow-hidden`}>
          <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg font-semibold">Email preview</h2><button type="button" className={button} onClick={() => setRefresh(value => value + 1)} disabled={loading}>Refresh</button></div>
          {loading && <p role="status" className="mt-4 text-sm text-gray-500">Loading email preview…</p>}
          {template && <><p className="my-4 text-sm"><span className="font-semibold">Subject: </span>{template.subject}</p><iframe title="Partnership invitation email preview" srcDoc={template.html.replace("<head>", '<head><base target="_blank">')} sandbox="allow-popups allow-popups-to-escape-sandbox" referrerPolicy="no-referrer" className="h-[1050px] w-full rounded-xl border border-gray-200 bg-white sm:h-[960px]" /></>}
        </section>
      </div>
      <section className={panel}>
        <h2 className="text-lg font-semibold">Invitation activity</h2>
        <p className="mt-2 text-sm text-gray-500">The 20 most recent submissions. Status refreshes automatically.</p>
        {statusError && <p role="alert" className="mt-3 text-sm text-red-600 dark:text-red-400">{statusError}</p>}
        {!history.length ? <p className="py-8 text-sm text-gray-500">No invitations to display.</p> : <div className="mt-5 grid items-start gap-5 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
          <div className="max-h-96 space-y-2 overflow-auto">{history.map(item => <button type="button" key={item.id} onClick={() => setSelected(item.id)} aria-pressed={selected === item.id} className={`w-full rounded-xl border p-4 text-left text-sm ${selected === item.id ? "border-brand-500 bg-brand-50 dark:bg-brand-900/20" : "border-gray-200 dark:border-gray-700"}`}><span className="block font-semibold">{new Date(item.createdAt).toLocaleString()}</span><span className="mt-1 block">{batchSummary(item)}{active(item) ? " · In progress" : ""}</span><span className="mt-2 block break-all font-mono text-[10px] text-gray-500">{item.id}</span></button>)}</div>
          {batch ? <div className="min-w-0"><h3 className="mb-3 font-medium">Recipient status</h3><div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="border-b border-gray-200 text-gray-500 dark:border-gray-700"><tr><th className="p-2 font-medium">Email</th><th className="p-2 font-medium">Status</th></tr></thead><tbody>{batch.recipients.map(recipient => <tr key={recipient.email} className="border-b border-gray-100 dark:border-gray-800"><td className="max-w-48 break-all p-2">{recipient.email}</td><td className={`p-2 ${recipient.status === "ACCEPTED" ? "text-green-700 dark:text-green-400" : recipient.status === "FAILED" || recipient.status === "UNKNOWN" ? "text-amber-700 dark:text-amber-400" : "text-gray-500"}`}>{labels[recipient.status]}</td></tr>)}</tbody></table></div>{batch.recipients.some(recipient => recipient.status === "UNKNOWN") && <p className="mt-3 text-xs leading-relaxed text-amber-700 dark:text-amber-400">Some outcomes could not be confirmed. Check the email provider before sending those addresses another invitation.</p>}</div> : <p className="text-sm text-gray-500">Select a submission to see recipient status.</p>}
        </div>}
      </section>
    </div>
  </>;
}
