import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import { env } from "../../config/env";
import {
  quiqupService as q,
  type QuiqupConfig,
  type QuiqupVerify,
  type QuiqupResult,
  type QuiqupEvent,
  type Envelope,
} from "../../api/services/quiqup.service";

type Tab = "ondemand" | "ecommerce" | "raw" | "webhooks";

// ── tiny presentational helpers ──────────────────────────────────────────────
function Json({ value }: { value: unknown }) {
  const text = typeof value === "string" ? value : JSON.stringify(value, null, 2);
  return (
    <pre className="max-h-80 overflow-auto rounded-lg bg-gray-900 p-3 text-xs leading-relaxed text-gray-100 dark:bg-black/60">
      {text}
    </pre>
  );
}

function StatusPill({ result }: { result?: QuiqupResult | null }) {
  if (!result) return null;
  const good = result.ok;
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${
        good ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300"
             : "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300"
      }`}
    >
      HTTP {result.status} {good ? "OK" : "ERROR"}
    </span>
  );
}

const btn =
  "inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium transition disabled:opacity-50 disabled:cursor-not-allowed";
const btnPrimary = `${btn} bg-brand-500 text-white hover:bg-brand-600`;
const btnGhost = `${btn} border border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-white/[0.05]`;
const card = "rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]";
const textarea =
  "w-full rounded-lg border border-gray-300 bg-white p-3 font-mono text-xs text-gray-800 focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100";

/** Best-effort extraction of an order id from an unknown Quiqup response body. */
function extractId(body: unknown): string | null {
  if (!body || typeof body !== "object") return null;
  const b = body as Record<string, unknown>;
  const nested = (b.order ?? b.data ?? b.job) as Record<string, unknown> | undefined;
  const cand = [
    b.id, b.order_id, b.orderId, b.uuid, b.reference, b.tracking_number, b.trackingNumber,
    nested?.id, nested?.order_id, nested?.uuid,
  ];
  const hit = cand.find((v) => typeof v === "string" || typeof v === "number");
  return hit != null ? String(hit) : null;
}

// ── order flow (shared between on-demand & ecommerce) ────────────────────────
function OrderFlow({
  kind,
  sample,
  onCreate,
  onTrack,
  onCancel,
  onQuote,
  quoteSample,
}: {
  kind: string;
  sample: unknown;
  onCreate: (body: unknown) => Promise<Envelope<QuiqupResult>>;
  onTrack: (id: string) => Promise<Envelope<QuiqupResult>>;
  onCancel: (id: string) => Promise<Envelope<QuiqupResult>>;
  onQuote?: (body: unknown) => Promise<Envelope<QuiqupResult>>;
  quoteSample?: unknown;
}) {
  const [bodyText, setBodyText] = useState("");
  const [orderId, setOrderId] = useState("");
  const [result, setResult] = useState<QuiqupResult | null>(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    if (sample) setBodyText(JSON.stringify(sample, null, 2));
  }, [sample]);

  const run = async (label: string, fn: () => Promise<Envelope<QuiqupResult>>) => {
    setBusy(label); setErr("");
    try {
      const res = await fn();
      if (!res.ok || !res.data) { setErr(res.error ?? "Request failed"); setResult(null); return; }
      setResult(res.data);
      const id = extractId(res.data.body);
      if (id && label === "create") setOrderId(id);
    } finally { setBusy(null); }
  };

  const parseBody = (): unknown => {
    try { return JSON.parse(bodyText); }
    catch (e) { setErr(`Invalid JSON: ${e instanceof Error ? e.message : e}`); throw e; }
  };

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="font-semibold text-gray-800 dark:text-white">{kind} — request body</h4>
          <button className={btnGhost} onClick={() => sample && setBodyText(JSON.stringify(sample, null, 2))}>
            Reset to sample
          </button>
        </div>
        <textarea rows={18} className={textarea} value={bodyText} onChange={(e) => setBodyText(e.target.value)} />
        <div className="flex flex-wrap gap-2">
          <button
            className={btnPrimary}
            disabled={busy !== null}
            onClick={() => { try { const b = parseBody(); run("create", () => onCreate(b)); } catch {/* shown */} }}
          >
            {busy === "create" ? "Creating…" : "Create order"}
          </button>
          {onQuote && (
            <button
              className={btnGhost}
              disabled={busy !== null}
              onClick={() => run("quote", () => onQuote(quoteSample ?? {}))}
            >
              {busy === "quote" ? "Quoting…" : "Get quote"}
            </button>
          )}
        </div>

        <div className="mt-2 flex flex-wrap items-end gap-2">
          <label className="flex-1">
            <span className="mb-1 block text-xs text-gray-500 dark:text-gray-400">Order ID (auto-filled after create)</span>
            <input
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
              value={orderId}
              onChange={(e) => setOrderId(e.target.value)}
              placeholder="paste an id to track / cancel"
            />
          </label>
          <button className={btnGhost} disabled={!orderId || busy !== null} onClick={() => run("track", () => onTrack(orderId))}>
            {busy === "track" ? "…" : "Track"}
          </button>
          <button
            className={`${btn} border border-red-300 text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20`}
            disabled={!orderId || busy !== null}
            onClick={() => run("cancel", () => onCancel(orderId))}
          >
            {busy === "cancel" ? "…" : "Cancel"}
          </button>
        </div>
        {err && <p className="text-sm text-red-600 dark:text-red-400">{err}</p>}
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <h4 className="font-semibold text-gray-800 dark:text-white">Response</h4>
          <StatusPill result={result} />
        </div>
        {result ? <Json value={result.body} /> : (
          <p className="text-sm text-gray-500 dark:text-gray-400">Run an action to see the Quiqup staging response here.</p>
        )}
      </div>
    </div>
  );
}

export default function QuiqupTestingPage() {
  const [tab, setTab] = useState<Tab>("ondemand");
  const [config, setConfig] = useState<QuiqupConfig | null>(null);
  const [configErr, setConfigErr] = useState("");
  const [verify, setVerify] = useState<QuiqupVerify | null>(null);
  const [verifyErr, setVerifyErr] = useState("");
  const [verifyBusy, setVerifyBusy] = useState(false);
  const [samples, setSamples] = useState<{ onDemand: unknown; ecommerce: unknown; quote: unknown } | null>(null);

  // raw tester
  const [rawMethod, setRawMethod] = useState("GET");
  const [rawPath, setRawPath] = useState("");
  const [rawBody, setRawBody] = useState("");
  const [rawResult, setRawResult] = useState<QuiqupResult | null>(null);
  const [rawErr, setRawErr] = useState("");
  const [rawBusy, setRawBusy] = useState(false);

  const [events, setEvents] = useState<QuiqupEvent[]>([]);

  const load = useCallback(async () => {
    const [cfg, smp] = await Promise.all([q.getConfig(), q.getSamples()]);
    if (cfg.ok && cfg.data) { setConfig(cfg.data); setConfigErr(""); }
    else { setConfigErr(cfg.error ?? "Could not load Quiqup config"); }
    if (smp.ok && smp.data) setSamples(smp.data);
  }, []);

  useEffect(() => { load(); }, [load]);

  // poll webhook events while that tab is open
  const pollRef = useRef<number | null>(null);
  useEffect(() => {
    const poll = () => { if (tab === "webhooks") q.getEvents().then((r) => r.ok && setEvents(r.data ?? [])); };
    poll();
    if (tab === "webhooks") pollRef.current = window.setInterval(poll, 3000);
    return () => { if (pollRef.current) window.clearInterval(pollRef.current); };
  }, [tab]);

  const runVerify = async () => {
    setVerifyBusy(true); setVerifyErr("");
    const res = await q.verify();
    if (res.ok && res.data) setVerify(res.data);
    else { setVerify(null); setVerifyErr(res.error ?? "Verify failed"); }
    setVerifyBusy(false);
  };

  const runRaw = async () => {
    setRawBusy(true); setRawErr(""); setRawResult(null);
    let body: unknown;
    if (rawBody.trim()) {
      try { body = JSON.parse(rawBody); }
      catch (e) { setRawErr(`Invalid JSON body: ${e instanceof Error ? e.message : e}`); setRawBusy(false); return; }
    }
    const res = await q.raw(rawMethod, rawPath, body);
    if (res.ok && res.data) setRawResult(res.data);
    else setRawErr(res.error ?? "Request failed");
    setRawBusy(false);
  };

  const enabled = config?.enabled === true;
  const credsReady = config ? config.authMode === "apikey" ? config.hasApiKey : true : false;
  const credsLabel = config?.authMode === "apikey" ? `API key → ${config.apiKeyHeader}` : config?.authMode;
  const webhookUrl = useMemo(
    () => (config ? `${env.apiBaseUrl}${config.webhookPath}` : ""),
    [config]
  );

  const tabs: { id: Tab; label: string }[] = [
    { id: "ondemand", label: "On-demand delivery" },
    { id: "ecommerce", label: "Ecommerce order" },
    { id: "raw", label: "Raw request" },
    { id: "webhooks", label: `Webhooks${events.length ? ` (${events.length})` : ""}` },
  ];

  return (
    <>
      <PageMeta title="Quiqup Testing | Buyology" description="Isolated Quiqup staging delivery test module" />
      <PageBreadcrumb pageTitle="Quiqup Testing" />

      {/* Isolation banner */}
      <div className="mb-5 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-800/60 dark:bg-amber-900/20 dark:text-amber-200">
        <b>Staging test module.</b> Calls only the Quiqup <b>staging</b> API and is decoupled from the
        order lifecycle — it never touches production orders or the customer website. SUPERADMIN only.
      </div>

      {configErr && (
        <div className="mb-5 rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-700 dark:border-red-800/60 dark:bg-red-900/20 dark:text-red-300">
          {configErr}
        </div>
      )}

      {config && !enabled && (
        <div className="mb-5 rounded-xl border border-orange-300 bg-orange-50 p-4 text-sm text-orange-800 dark:border-orange-800/60 dark:bg-orange-900/20 dark:text-orange-200">
          <b>Module is disabled.</b> Set <code className="font-mono">QUIQUP_ENABLED=true</code> and{" "}
          <code className="font-mono">QUIQUP_API_KEY</code> in the backend environment and redeploy to run live calls.
          You can still review the configuration below.
        </div>
      )}

      {/* Connection + credentials + auth */}
      <div className={`${card} mb-5`}>
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Module</p>
            <p className="mt-1 text-sm">
              {config == null ? <span className="text-gray-400">loading…</span>
                : enabled ? <span className="text-green-600 dark:text-green-400">● enabled</span>
                : <span className="text-orange-600 dark:text-orange-400">● disabled (QUIQUP_ENABLED=false)</span>}
            </p>
            <p className="mt-1 break-all text-xs text-gray-500 dark:text-gray-400">{config?.baseUrl ?? ""}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Credentials</p>
            <p className="mt-1 text-sm">
              {config == null ? <span className="text-gray-400">—</span>
                : credsReady ? <span className="text-green-600 dark:text-green-400">● loaded ({credsLabel})</span>
                : <span className="text-red-600 dark:text-red-400">● missing — set QUIQUP_API_KEY</span>}
            </p>
            {config?.webhookSecretConfigured && (
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">webhook secret set</p>
            )}
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Auth check</p>
            {verify ? (
              <p className="mt-1 text-sm text-gray-800 dark:text-white">
                <span className="font-mono">{verify.tokenPreview ?? (verify.ok ? "ok" : "—")}</span>
                {verify.expiresAt && <span className="ml-2 text-gray-500 dark:text-gray-400">exp {new Date(verify.expiresAt).toLocaleTimeString()}</span>}
              </p>
            ) : <p className="mt-1 text-sm text-gray-400">not checked</p>}
            <div className="mt-2">
              <button className={btnPrimary} disabled={verifyBusy || !enabled} onClick={runVerify}>
                {verifyBusy ? "…" : config?.authMode === "apikey" ? "Check key" : "Get token"}
              </button>
            </div>
            {verifyErr && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{verifyErr}</p>}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className={card}>
        <div className="mb-5 flex flex-wrap gap-2 border-b border-gray-100 pb-3 dark:border-gray-800">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
                tab === t.id ? "bg-brand-500 text-white"
                  : "text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/[0.05]"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === "ondemand" && (
          <OrderFlow
            kind="On-demand (point-to-point)"
            sample={samples?.onDemand}
            quoteSample={samples?.quote}
            onCreate={(b) => q.ondemandCreate(b)}
            onTrack={(id) => q.ondemandGet(id)}
            onCancel={(id) => q.ondemandCancel(id)}
            onQuote={(b) => q.ondemandQuote(b)}
          />
        )}

        {tab === "ecommerce" && (
          <OrderFlow
            kind="Ecommerce (scheduled)"
            sample={samples?.ecommerce}
            onCreate={(b) => q.ecommerceCreate(b)}
            onTrack={(id) => q.ecommerceGet(id)}
            onCancel={(id) => q.ecommerceCancel(id)}
          />
        )}

        {tab === "raw" && (
          <div className="grid gap-5 lg:grid-cols-2">
            <div className="space-y-3">
              <h4 className="font-semibold text-gray-800 dark:text-white">Raw request to Quiqup staging</h4>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Sent by the backend with the current credentials. Use this to introspect the real contract while confirming endpoint paths.
              </p>
              <div className="flex gap-2">
                <select
                  className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
                  value={rawMethod} onChange={(e) => setRawMethod(e.target.value)}
                >
                  {["GET", "POST", "PATCH", "DELETE"].map((m) => <option key={m}>{m}</option>)}
                </select>
                <input
                  className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
                  placeholder="/partner/on_demand/orders"
                  value={rawPath} onChange={(e) => setRawPath(e.target.value)}
                />
              </div>
              <textarea
                rows={12} className={textarea} placeholder="JSON body (optional for GET/DELETE)"
                value={rawBody} onChange={(e) => setRawBody(e.target.value)}
              />
              <button className={btnPrimary} disabled={rawBusy || !rawPath || !enabled} onClick={runRaw}>
                {rawBusy ? "Sending…" : "Send"}
              </button>
              {rawErr && <p className="text-sm text-red-600 dark:text-red-400">{rawErr}</p>}
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <h4 className="font-semibold text-gray-800 dark:text-white">Response</h4>
                <StatusPill result={rawResult} />
              </div>
              {rawResult ? <Json value={rawResult.body} /> :
                <p className="text-sm text-gray-500 dark:text-gray-400">No response yet.</p>}
            </div>
          </div>
        )}

        {tab === "webhooks" && (
          <div className="space-y-4">
            <div className="rounded-lg bg-gray-50 p-3 text-sm dark:bg-white/[0.03]">
              <p className="text-gray-600 dark:text-gray-300">Configure Quiqup's staging webhook to POST to:</p>
              <p className="mt-1 break-all font-mono text-xs text-gray-800 dark:text-gray-100">{webhookUrl}</p>
              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                Events seen in staging: ready_for_collection · collected · at_depot · out_for_delivery · delivery_complete · delivery_failed
              </p>
            </div>
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500 dark:text-gray-400">Live — polling every 3s ({events.length} received)</p>
              <button className={btnGhost} onClick={() => q.clearEvents().then(() => setEvents([]))}>Clear</button>
            </div>
            {events.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">No webhooks received yet.</p>
            ) : (
              <div className="space-y-3">
                {events.map((w) => (
                  <div key={w.id} className="rounded-lg border border-gray-200 p-3 dark:border-gray-800">
                    <div className="mb-2 flex flex-wrap items-center gap-2 text-sm">
                      <span className="rounded bg-brand-100 px-2 py-0.5 font-semibold text-brand-700 dark:bg-brand-900/40 dark:text-brand-300">
                        {w.eventType ?? "event?"}
                      </span>
                      <span className="text-gray-400">{new Date(w.at).toLocaleTimeString()}</span>
                      {w.hmacValid != null && (
                        <span className={`rounded px-2 py-0.5 text-xs font-semibold ${
                          w.hmacValid ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300"
                                      : "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300"}`}>
                          hmac {w.hmacValid ? "valid" : "invalid"}
                        </span>
                      )}
                      {w.sourceIp && <span className="text-xs text-gray-400">{w.sourceIp}</span>}
                    </div>
                    <Json value={w.payload} />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
