import { useEffect, useState } from "react";
import { Link, Navigate, useParams } from "react-router";
import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import { isSupport, isSuperAdmin } from "../../auth/roles";
import { supportService } from "../../api/services/support.service";
import type { SupportTicket, SupportTicketStatus } from "../../api/services/support.service";
import { ApiRequestError } from "../../api/types/api.types";
import { CATEGORY_LABELS, STATUS_COLORS, STATUS_LABELS, STATUS_OPTIONS } from "./supportUi";

/**
 * One ticket: what the customer reported, their screenshots, the running conversation, and the
 * actions card — reply into the thread, or move the status (with a customer-visible note).
 * Every action emails the customer and lands in their storefront notification bell.
 */
export default function SupportDetail() {
  const allowed = isSuperAdmin() || isSupport();
  const { id } = useParams<{ id: string }>();

  const [ticket, setTicket] = useState<SupportTicket | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [newStatus, setNewStatus] = useState<SupportTicketStatus>("IN_PROGRESS");
  const [note, setNote] = useState("");
  const [reply, setReply] = useState("");
  const [busy, setBusy] = useState<"status" | "reply" | null>(null);
  const [actionMsg, setActionMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [lightbox, setLightbox] = useState<string | null>(null);

  useEffect(() => {
    if (!allowed || !id) return;
    const ac = new AbortController();
    setLoading(true);
    supportService
      .getById(id, ac.signal)
      .then((r) => setTicket(r.data))
      .catch((e) => {
        if ((e as DOMException)?.name !== "AbortError") {
          setError(e instanceof ApiRequestError ? e.message : "Could not load the ticket");
        }
      })
      .finally(() => setLoading(false));
    return () => ac.abort();
     
  }, [allowed, id]);

  if (!allowed) return <Navigate to="/" replace />;

  const run = async (
    kind: "status" | "reply",
    fn: () => Promise<{ data: SupportTicket }>,
    okMsg: string,
  ) => {
    setBusy(kind);
    setActionMsg(null);
    try {
      const r = await fn();
      setTicket(r.data);
      setActionMsg({ kind: "ok", text: okMsg });
    } catch (e) {
      setActionMsg({
        kind: "err",
        text: e instanceof ApiRequestError ? e.message : "Action failed",
      });
    } finally {
      setBusy(null);
    }
  };

  const messages = ticket?.messages ?? [];

  return (
    <>
      <PageMeta title="Support ticket | Buyology" description="Customer support ticket" />
      <PageBreadcrumb pageTitle="Ticket" />

      {loading ? (
        <p className="text-sm text-gray-500">Loading…</p>
      ) : error || !ticket ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center dark:border-gray-800 dark:bg-white/[0.03]">
          <p className="text-gray-500">{error ?? "Ticket not found."}</p>
          <Link to="/support" className="mt-3 inline-block text-sm text-brand-600 hover:underline">
            Back to tickets
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Left: the ticket */}
          <div className="space-y-6 lg:col-span-2">
            <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-mono text-xs text-gray-500">{ticket.reference ?? ticket.id.slice(0, 8)}</p>
                  <h2 className="mt-1 text-lg font-semibold text-gray-800 dark:text-white">{ticket.subject}</h2>
                </div>
                <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_COLORS[ticket.status]}`}>
                  {STATUS_LABELS[ticket.status]}
                </span>
              </div>
              <dl className="space-y-2 text-sm">
                {[
                  ["Category", ticket.category ? CATEGORY_LABELS[ticket.category] ?? ticket.category : "—"],
                  ["Customer", ticket.contactEmail ?? "—"],
                  ["Opened", new Date(ticket.createdAt).toLocaleString()],
                  ["Last update", new Date(ticket.updatedAt).toLocaleString()],
                ].map(([label, value]) => (
                  <div key={label} className="flex gap-3">
                    <dt className="w-36 shrink-0 text-gray-500">{label}</dt>
                    <dd className="text-gray-800 dark:text-gray-200">{value}</dd>
                  </div>
                ))}
                {ticket.pageUrl && (
                  <div className="flex gap-3">
                    <dt className="w-36 shrink-0 text-gray-500">Page</dt>
                    <dd className="min-w-0 break-all text-gray-800 dark:text-gray-200">
                      <a href={ticket.pageUrl} target="_blank" rel="noreferrer" className="text-brand-600 hover:underline">
                        {ticket.pageUrl}
                      </a>
                    </dd>
                  </div>
                )}
              </dl>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
              <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-500">What happened</h3>
              <p className="whitespace-pre-wrap text-sm text-gray-800 dark:text-gray-200">{ticket.description}</p>
              {(ticket.imageUrls?.length ?? 0) > 0 && (
                <div className="mt-4 grid grid-cols-4 gap-2">
                  {ticket.imageUrls!.map((src, i) => (
                    <button key={i} type="button" onClick={() => setLightbox(src)} className="block">
                      <img src={src} alt={`Screenshot ${i + 1}`} className="h-24 w-full rounded-lg border border-gray-200 object-cover dark:border-gray-700" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">Conversation</h3>
              {messages.length === 0 ? (
                <p className="text-sm text-gray-500">No replies yet.</p>
              ) : (
                <ul className="space-y-3">
                  {messages.map((m) => {
                    const team = m.author === "ADMIN";
                    return (
                      <li key={m.id} className={`flex ${team ? "justify-end" : "justify-start"}`}>
                        <div
                          className={`max-w-[80%] rounded-xl px-4 py-3 text-sm ${
                            team
                              ? "bg-brand-50 text-brand-900 dark:bg-brand-500/15 dark:text-brand-300"
                              : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200"
                          }`}
                        >
                          <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide opacity-70">
                            {team ? "Support team" : "Customer"}
                          </p>
                          <p className="whitespace-pre-wrap">{m.body}</p>
                          {m.createdAt && (
                            <p className="mt-1.5 text-[11px] opacity-60">{new Date(m.createdAt).toLocaleString()}</p>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>

          {/* Right: actions */}
          <div className="lg:col-span-1">
            <div className="sticky top-6 space-y-6">
              <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">Reply to customer</h3>
                <textarea
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  rows={4}
                  maxLength={4000}
                  placeholder="Write a reply — the customer gets it by email and in their notifications…"
                  className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
                />
                <button
                  disabled={busy !== null || !reply.trim()}
                  onClick={() =>
                    run("reply", () => supportService.reply(ticket.id, reply.trim()), "Reply sent — customer notified").then(
                      () => setReply(""),
                    )
                  }
                  className="mt-3 w-full rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-500 disabled:opacity-50"
                >
                  {busy === "reply" ? "Sending…" : "Send reply"}
                </button>
              </div>

              <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">Update status</h3>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value as SupportTicketStatus)}
                  className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
                >
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>
                      {STATUS_LABELS[s]}
                    </option>
                  ))}
                </select>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={3}
                  maxLength={2000}
                  placeholder="Optional note — shown to the customer and kept in the conversation"
                  className="mt-3 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
                />
                <button
                  disabled={busy !== null || newStatus === ticket.status}
                  onClick={() =>
                    run(
                      "status",
                      () => supportService.updateStatus(ticket.id, newStatus, note.trim() || undefined),
                      `Status set to ${STATUS_LABELS[newStatus]} — customer notified`,
                    ).then(() => setNote(""))
                  }
                  className="mt-3 w-full rounded-lg bg-gray-800 px-4 py-2.5 text-sm font-semibold text-white hover:bg-gray-700 disabled:opacity-50 dark:bg-gray-700 dark:hover:bg-gray-600"
                >
                  {busy === "status" ? "Updating…" : "Apply status"}
                </button>
                {ticket.status === "RESOLVED" || ticket.status === "CLOSED" ? (
                  <p className="mt-2 text-xs text-gray-500">
                    A customer reply reopens a resolved ticket automatically.
                  </p>
                ) : null}
              </div>

              {actionMsg && (
                <p
                  className={`rounded-lg px-4 py-3 text-sm ${
                    actionMsg.kind === "ok"
                      ? "bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400"
                      : "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400"
                  }`}
                >
                  {actionMsg.text}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {lightbox && (
        <button
          type="button"
          onClick={() => setLightbox(null)}
          className="fixed inset-0 z-[100000] flex cursor-zoom-out items-center justify-center bg-black/80 p-6"
          aria-label="Close screenshot"
        >
          <img src={lightbox} alt="Screenshot" className="max-h-full max-w-full rounded-lg" />
        </button>
      )}
    </>
  );
}
