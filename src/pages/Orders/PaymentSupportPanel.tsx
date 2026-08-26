import { useCallback, useEffect, useState } from "react";
import {
  ordersService,
  type PaymentAttempt,
  type PaymentSupportView,
} from "../../api/services/orders.service";

/** Bank decline codes are meaningless in a table without their status; this keeps them legible. */
function attemptTone(a: PaymentAttempt): string {
  if (a.status === "SUCCESS") return "text-green-700 dark:text-green-300";
  if (a.status === "FAILED") return "text-red-700 dark:text-red-300";
  return "text-yellow-700 dark:text-yellow-300";
}

function when(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-GB", {
    day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
  });
}

/**
 * Why this order's payment did not complete, and the one place an admin can do something about it.
 *
 * <p>Reading the reason first is the point of the layout. The panel opens with what actually
 * happened and where the customer stopped, because the four situations behind "Awaiting payment"
 * call for four different responses — and one of them, an instalment payment already approved and
 * merely awaiting settlement, calls for not contacting the customer at all. When the diagnosis says
 * the money is in, the composer is replaced by a note saying so rather than left available to a
 * misclick; the server refuses that send too, but nobody should have to rely on that.
 */
export function PaymentSupportPanel({ orderId }: { orderId: string }) {
  const [view, setView] = useState<PaymentSupportView | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [templateKey, setTemplateKey] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [sendMsg, setSendMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await ordersService.paymentSupport(orderId);
      setView(res.data);
    } catch {
      // An empty panel that looks like "nothing wrong here" would be worse than saying so.
      setLoadError("Couldn't load the payment details for this order.");
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => { void load(); }, [load]);

  const applyTemplate = (key: string) => {
    const tpl = view?.templates.find((t) => t.key === key);
    if (!tpl) return;
    setTemplateKey(key);
    setSubject(tpl.subject);
    setBody(tpl.body);
  };

  const send = async () => {
    if (!subject.trim() || !body.trim()) return;
    setSending(true);
    setSendMsg(null);
    try {
      await ordersService.sendPaymentMessage(orderId, {
        templateKey, subject: subject.trim(), body: body.trim(),
      });
      // Clearing only on success: a failed send must not lose what the admin typed.
      setSubject("");
      setBody("");
      setTemplateKey(null);
      setSendMsg({ ok: true, text: "Sent — the customer has it by email and in their notifications." });
      await load();
    } catch (e) {
      setSendMsg({
        ok: false,
        text: e instanceof Error && e.message ? e.message : "Couldn't send the message.",
      });
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
        <p className="text-sm text-gray-500">Loading payment details…</p>
      </div>
    );
  }
  if (loadError || !view) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
        <p className="text-sm text-red-700 dark:text-red-300">{loadError}</p>
        <button
          type="button"
          onClick={() => void load()}
          className="mt-2 rounded-lg bg-gray-800 px-3 py-2 text-xs font-medium text-white hover:bg-gray-700 dark:bg-gray-700"
        >
          Try again
        </button>
      </div>
    );
  }

  const d = view.diagnosis;
  const paid = d.customerHasPaid;

  // An order that paid first time and was never written to has no payment story to tell, and a
  // panel saying so on every healthy order is noise that trains admins to skip past it. The panel
  // survives on paid orders precisely when there IS a story — they struggled, then they paid.
  if (d.code === "PAID" && view.attempts.length <= 1 && view.messages.length === 0) return null;

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
      <h3 className="mb-4 font-semibold text-gray-800 dark:text-white/90">Payment problem</h3>

      {/* The reason, first and largest — it decides everything an admin does next. */}
      <div
        className={`rounded-xl p-4 ${
          paid
            ? "bg-green-50 dark:bg-green-500/10"
            : "bg-yellow-50 dark:bg-yellow-500/10"
        }`}
      >
        <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
          Stopped at: {d.stage}
        </p>
        <p
          className={`mt-1 text-sm font-medium ${
            paid ? "text-green-800 dark:text-green-200" : "text-yellow-900 dark:text-yellow-100"
          }`}
        >
          {d.summary}
        </p>
        {d.detail && (
          <p className="mt-2 text-xs text-gray-600 dark:text-gray-400">
            Gateway said: “{d.detail}”
          </p>
        )}
        <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
          {d.attemptCount} attempt{d.attemptCount === 1 ? "" : "s"}
          {d.methodsTried.length > 0 && <> · tried {d.methodsTried.join(", ")}</>}
          {d.lastAttemptAt && <> · last {when(d.lastAttemptAt)}</>}
        </p>
      </div>

      {/* Attempts — every try, with what the bank actually answered. */}
      {view.attempts.length > 0 && (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[520px] text-left text-xs">
            <thead className="text-gray-500 dark:text-gray-400">
              <tr>
                <th className="py-2 pe-3 font-medium">When</th>
                <th className="py-2 pe-3 font-medium">Method</th>
                <th className="py-2 pe-3 font-medium">Result</th>
                <th className="py-2 font-medium">What happened</th>
              </tr>
            </thead>
            <tbody className="text-gray-700 dark:text-gray-300">
              {view.attempts.map((a) => (
                <tr key={a.id} className="border-t border-gray-100 dark:border-gray-800">
                  <td className="py-2 pe-3 whitespace-nowrap">{when(a.createdAt)}</td>
                  <td className="py-2 pe-3">{a.methodType ?? "—"}</td>
                  <td className={`py-2 pe-3 font-medium ${attemptTone(a)}`}>{a.status ?? "—"}</td>
                  <td className="py-2">
                    {a.failureReason ?? (a.reachedGateway
                      ? "Reached the payment page"
                      : "Never reached the payment page")}
                    {a.failureCode && (
                      <span className="ms-1 text-gray-400">(code {a.failureCode})</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Contact. Absent by design when the customer has already paid. */}
      <div className="mt-5 border-t border-gray-100 pt-4 dark:border-gray-800">
        {paid ? (
          <p className="rounded-lg bg-green-50 px-3 py-2 text-xs text-green-800 dark:bg-green-500/10 dark:text-green-200">
            This customer has already paid, so there is nothing to chase. If the order still shows
            as awaiting payment, use <span className="font-medium">Re-check payment</span> instead.
          </p>
        ) : !view.canContactCustomer ? (
          <p className="rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-600 dark:bg-gray-800 dark:text-gray-300">
            {view.customerEmail
              ? "This order is no longer awaiting payment, so there is nothing to send."
              : "This order has no email address on it, so there is nobody to send to."}
          </p>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Message {view.customerEmail} — nothing is sent unless you send it.
              </p>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              {view.templates.map((tpl) => (
                <button
                  key={tpl.key}
                  type="button"
                  onClick={() => applyTemplate(tpl.key)}
                  className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                    templateKey === tpl.key
                      ? "border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-300"
                      : "border-gray-200 text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                  }`}
                >
                  {tpl.label}
                </button>
              ))}
              {d.suggestedMessage && (
                <button
                  type="button"
                  onClick={() => {
                    setTemplateKey(null);
                    setSubject(`About your order`);
                    setBody(d.suggestedMessage ?? "");
                  }}
                  className="rounded-full border border-dashed border-gray-300 px-3 py-1 text-xs text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
                >
                  Use what we detected
                </button>
              )}
            </div>

            <input
              value={subject}
              onChange={(e) => { setSubject(e.target.value); setTemplateKey(null); }}
              placeholder="Subject"
              maxLength={200}
              className="mt-3 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
            />
            <textarea
              value={body}
              onChange={(e) => { setBody(e.target.value); setTemplateKey(null); }}
              placeholder="Write the message the customer will read…"
              rows={6}
              maxLength={5000}
              className="mt-2 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
            />
            <p className="mt-1 text-[11px] text-gray-400">
              A “Complete your payment” button linking to their order is added automatically.
            </p>
            <button
              type="button"
              onClick={() => void send()}
              disabled={sending || !subject.trim() || !body.trim()}
              className="mt-2 rounded-lg bg-brand-500 px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-brand-600 disabled:opacity-50"
            >
              {sending ? "Sending…" : "Send to customer"}
            </button>
          </>
        )}

        {sendMsg && (
          <p
            className={`mt-3 rounded-lg px-3 py-2 text-xs ${
              sendMsg.ok
                ? "bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-300"
                : "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300"
            }`}
          >
            {sendMsg.text}
          </p>
        )}
      </div>

      {/* What we already said — so a second admin doesn't repeat it. */}
      {view.messages.length > 0 && (
        <div className="mt-5 border-t border-gray-100 pt-4 dark:border-gray-800">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Contacted {view.messages.length} time{view.messages.length === 1 ? "" : "s"}
          </p>
          <ul className="space-y-3">
            {view.messages.map((m) => (
              <li key={m.id} className="rounded-lg bg-gray-50 p-3 dark:bg-gray-800/60">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="text-xs font-medium text-gray-800 dark:text-gray-100">{m.subject}</p>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400">
                    {m.sentByName ?? "Admin"} · {when(m.createdAt)}
                  </p>
                </div>
                <p className="mt-1 whitespace-pre-wrap text-xs text-gray-600 dark:text-gray-300">
                  {m.body}
                </p>
                <p className="mt-2 text-[11px] text-gray-400">
                  {m.emailSent ? "Emailed" : "Email failed"}
                  {m.notificationSent ? " · in their notifications" : ""}
                  {m.diagnosisCode ? ` · ${m.diagnosisCode}` : ""}
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
