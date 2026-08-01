import { useEffect, useMemo, useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router";
import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import { isProcurement, isSuperAdmin } from "../../auth/roles";
import { b2bQuotesService } from "../../api/services/b2b-quotes.service";
import type { B2bQuote, B2bQuoteStatus } from "../../api/services/b2b-quotes.service";

const STATUS_COLORS: Record<B2bQuoteStatus, string> = {
  DRAFT: "bg-gray-100 text-gray-700",
  SUBMITTED: "bg-brand-100 text-brand-700",
  QUOTED: "bg-blue-100 text-blue-700",
  ACCEPTED: "bg-green-100 text-green-700",
  REJECTED: "bg-red-100 text-red-700",
  EXPIRED: "bg-yellow-100 text-yellow-700",
  CANCELLED: "bg-gray-100 text-gray-600",
  ORDERED: "bg-emerald-100 text-emerald-700",
};

/** Convert a value from a datetime-local input into an ISO instant (UTC). */
function toIsoInstant(local: string): string {
  // datetime-local has no timezone; new Date() interprets it as local time.
  return new Date(local).toISOString();
}

export default function QuoteDetail() {
  const allowed = isSuperAdmin() || isProcurement();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [quote, setQuote] = useState<B2bQuote | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  // Per-line unit price inputs, keyed by item id.
  const [prices, setPrices] = useState<Record<string, string>>({});
  const [validUntil, setValidUntil] = useState("");
  const [procurementNote, setProcurementNote] = useState("");
  const [rejectReason, setRejectReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!allowed || !id) return;
    const ac = new AbortController();
    setLoading(true);
    b2bQuotesService
      .getById(id, ac.signal)
      .then((r) => {
        const q = r.data;
        setQuote(q);
        setProcurementNote(q?.procurementNote ?? "");
        // Seed price inputs with any already-quoted values.
        const seed: Record<string, string> = {};
        (q?.items ?? []).forEach((it) => {
          seed[it.id] = it.quotedUnitPrice != null ? String(it.quotedUnitPrice) : "";
        });
        setPrices(seed);
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
    return () => ac.abort();
  }, [allowed, id]);

  const editable = quote?.status === "SUBMITTED";

  const lineTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    let subtotal = 0;
    (quote?.items ?? []).forEach((it) => {
      const unit = parseFloat(prices[it.id] ?? "");
      const total = Number.isFinite(unit) ? unit * it.quantity : 0;
      totals[it.id] = total;
      subtotal += total;
    });
    return { totals, subtotal };
  }, [quote, prices]);

  if (!allowed) return <Navigate to="/" replace />;
  if (notFound) return <Navigate to="/procurement/quotes" replace />;

  const fmt = (n: number | null | undefined) =>
    n == null ? "—" : `${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${quote?.currency ?? ""}`;

  const handleSendQuote = async () => {
    if (!quote) return;
    setError(null);

    const items = quote.items.map((it) => ({
      itemId: it.id,
      unitPrice: parseFloat(prices[it.id] ?? ""),
    }));
    if (items.some((i) => !Number.isFinite(i.unitPrice) || i.unitPrice < 0)) {
      setError("Enter a valid unit price for every line.");
      return;
    }
    if (!validUntil) {
      setError("Pick a valid-until date/time.");
      return;
    }

    setSaving(true);
    try {
      const r = await b2bQuotesService.price(quote.id, {
        items,
        validUntil: toIsoInstant(validUntil),
        procurementNote: procurementNote.trim() || undefined,
      });
      setQuote(r.data);
    } catch {
      setError("Failed to send the quote. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleReject = async () => {
    if (!quote) return;
    setError(null);
    if (!rejectReason.trim()) {
      setError("Enter a rejection reason.");
      return;
    }
    setSaving(true);
    try {
      const r = await b2bQuotesService.reject(quote.id, rejectReason.trim());
      setQuote(r.data);
    } catch {
      setError("Failed to reject the quote. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <PageMeta title="Quote Detail | Buyology" description="Price a B2B RFQ quote" />
      <PageBreadcrumb pageTitle="Quote Detail" />

      <button
        onClick={() => navigate("/procurement/quotes")}
        className="mb-4 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
      >
        ← Back to quotes
      </button>

      {loading ? (
        <p className="text-sm text-gray-500">Loading…</p>
      ) : !quote ? (
        <p className="text-sm text-gray-500">Quote not found.</p>
      ) : (
        <div className="space-y-6">
          {/* Summary */}
          <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-mono text-xs text-gray-500">{quote.id}</p>
                <h2 className="text-lg font-semibold text-gray-800 dark:text-white">
                  {quote.countryCode} · {quote.currency}
                </h2>
              </div>
              <span
                className={`rounded-full px-3 py-1 text-xs font-medium ${STATUS_COLORS[quote.status]}`}
              >
                {quote.status}
              </span>
            </div>
            <dl className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
              {[
                ["Submitted", quote.submittedAt ? new Date(quote.submittedAt).toLocaleString() : "—"],
                ["Quoted", quote.quotedAt ? new Date(quote.quotedAt).toLocaleString() : "—"],
                ["Valid until", quote.validUntil ? new Date(quote.validUntil).toLocaleString() : "—"],
                ["Min qty / line", String(quote.minQtyPerLine)],
              ].map(([k, v]) => (
                <div key={k}>
                  <dt className="text-xs uppercase text-gray-400">{k}</dt>
                  <dd className="text-gray-800 dark:text-gray-200">{v}</dd>
                </div>
              ))}
            </dl>
            {quote.memberNote && (
              <div className="mt-4 rounded-lg bg-gray-50 p-3 text-sm dark:bg-gray-800/60">
                <p className="text-xs uppercase text-gray-400">Member note</p>
                <p className="text-gray-700 dark:text-gray-300">{quote.memberNote}</p>
              </div>
            )}
          </div>

          {error && (
            <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-300">
              {error}
            </div>
          )}

          {/* Line items */}
          <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
            <h3 className="mb-4 text-base font-semibold text-gray-800 dark:text-white">Line items</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-gray-800 text-left text-xs uppercase text-gray-500">
                    <th className="pb-3 pr-4">Product</th>
                    <th className="pb-3 pr-4">SKU</th>
                    <th className="pb-3 pr-4">Qty</th>
                    <th className="pb-3 pr-4">Unit Price</th>
                    <th className="pb-3">Line Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {quote.items.map((it) => (
                    <tr key={it.id}>
                      <td className="py-3 pr-4 font-medium text-gray-800 dark:text-gray-200">
                        {it.productTitle ?? it.productId}
                        {it.belowMinimum && (
                          <span className="ml-2 rounded-full bg-yellow-100 px-2 py-0.5 text-[10px] font-medium text-yellow-700">
                            below min
                          </span>
                        )}
                      </td>
                      <td className="py-3 pr-4 text-gray-500 text-xs">{it.sku ?? "—"}</td>
                      <td className="py-3 pr-4 text-gray-600 dark:text-gray-400">{it.quantity}</td>
                      <td className="py-3 pr-4">
                        {editable ? (
                          <input
                            type="number"
                            min={0}
                            step="0.01"
                            value={prices[it.id] ?? ""}
                            onChange={(e) =>
                              setPrices((p) => ({ ...p, [it.id]: e.target.value }))
                            }
                            placeholder="0.00"
                            className="w-28 rounded-lg border border-gray-300 px-2 py-1 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                          />
                        ) : (
                          <span className="text-gray-700 dark:text-gray-300">
                            {fmt(it.quotedUnitPrice)}
                          </span>
                        )}
                      </td>
                      <td className="py-3 text-gray-800 dark:text-gray-200">
                        {editable
                          ? fmt(lineTotals.totals[it.id])
                          : fmt(it.quotedLineTotal)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-gray-200 dark:border-gray-700">
                    <td colSpan={4} className="pt-3 text-right text-sm font-medium text-gray-500">
                      Subtotal
                    </td>
                    <td className="pt-3 text-sm font-semibold text-gray-900 dark:text-white">
                      {editable ? fmt(lineTotals.subtotal) : fmt(quote.quotedSubtotal)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Actions (only when SUBMITTED) */}
          {editable ? (
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Send quote */}
              <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
                <h3 className="mb-4 text-base font-semibold text-gray-800 dark:text-white">
                  Send Quote
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Valid until
                    </label>
                    <input
                      type="datetime-local"
                      value={validUntil}
                      onChange={(e) => setValidUntil(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Procurement note (optional)
                    </label>
                    <textarea
                      rows={3}
                      value={procurementNote}
                      onChange={(e) => setProcurementNote(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                    />
                  </div>
                  <button
                    onClick={handleSendQuote}
                    disabled={saving}
                    className="w-full rounded-lg bg-brand-500 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50"
                  >
                    {saving ? "Sending…" : "Send Quote"}
                  </button>
                </div>
              </div>

              {/* Reject */}
              <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
                <h3 className="mb-4 text-base font-semibold text-gray-800 dark:text-white">Reject</h3>
                <div className="space-y-4">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Reason
                    </label>
                    <textarea
                      rows={3}
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      placeholder="Why is this quote being rejected?"
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                    />
                  </div>
                  <button
                    onClick={handleReject}
                    disabled={saving}
                    className="w-full rounded-lg border border-red-300 bg-red-50 py-2 text-sm font-medium text-red-700 hover:bg-red-100 disabled:opacity-50 dark:border-red-700 dark:bg-red-900/30 dark:text-red-300"
                  >
                    {saving ? "Rejecting…" : "Reject Quote"}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-gray-200 bg-white p-6 text-sm text-gray-500 dark:border-gray-800 dark:bg-white/[0.03]">
              This quote is <span className="font-medium">{quote.status}</span> and can no longer be
              priced or rejected.
              {quote.procurementNote && (
                <div className="mt-3 rounded-lg bg-gray-50 p-3 dark:bg-gray-800/60">
                  <p className="text-xs uppercase text-gray-400">Procurement note</p>
                  <p className="text-gray-700 dark:text-gray-300">{quote.procurementNote}</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </>
  );
}
