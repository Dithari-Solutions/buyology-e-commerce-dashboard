import { useCallback, useEffect, useState } from "react";
import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import {
  serviceHealthService,
  UNKNOWN,
  type ServiceHealth,
  type SignupCluster,
} from "../../api/services/serviceHealth.service";

/**
 * Service Health — is anything going wrong right now?
 *
 * Built after an SMS-pumping attack drained the Twilio balance to -$385 without anyone noticing.
 * Three failures combined: no view of send volume, a real error line buried under hundreds of
 * benign ones, and eight fraudulent signups that left a trace in the database nothing ever read.
 * Each panel below answers one of those, and the page is ordered so the loudest thing is first.
 *
 * Two rules it sticks to. Nothing is shown as healthy unless it is actually known to be — an
 * unavailable number renders as "unknown", never as zero, because a false all-clear is what let
 * the attack run for four days. And no panel claims more than its data supports; where a signal
 * is weaker than it looks, the caveat is printed next to the number rather than buried.
 */

const POLL_MS = 60_000;

export default function ServiceHealthPage() {
  const [data, setData] = useState<ServiceHealth | null>(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);

  const load = useCallback(async (signal?: AbortSignal) => {
    try {
      const res = await serviceHealthService.get(signal);
      if (res.data) {
        setData(res.data);
        setError(false);
        setUpdatedAt(new Date());
      }
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const ac = new AbortController();
    void load(ac.signal);
    const timer = setInterval(() => void load(), POLL_MS);
    return () => {
      ac.abort();
      clearInterval(timer);
    };
  }, [load]);

  return (
    <>
      <PageMeta title="Service Health | Buyology" description="Operational health across services" />
      <PageBreadcrumb pageTitle="Service Health" />

      <div className="mb-5 flex items-center justify-between">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {loading
            ? "Loading…"
            : error
              ? "Could not reach the health endpoint — the figures below may be stale."
              : updatedAt
                ? `Updated ${updatedAt.toLocaleTimeString()} · refreshes every minute`
                : ""}
        </p>
        <button
          onClick={() => void load()}
          className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300"
        >
          Refresh
        </button>
      </div>

      {data && (
        <div className="space-y-6">
          <SignupClusters clusters={data.signupClusters} />
          <Verification v={data.verification} />
          <div className="grid gap-6 lg:grid-cols-2">
            <Payments p={data.payments} />
            <Integrations i={data.integrations} />
          </div>
        </div>
      )}
    </>
  );
}

/* ── Signup clusters — first, because it is the alarm ──────────────────────── */

function SignupClusters({ clusters }: { clusters: SignupCluster[] }) {
  const quiet = clusters.length === 0;
  return (
    <Panel
      title="Signup clusters, last 24 hours"
      tone={quiet ? "ok" : "alert"}
      subtitle={
        quiet
          ? "No IP registered three or more accounts. This panel is empty on a normal day."
          : `${clusters.length} IP${clusters.length === 1 ? "" : "s"} registered three or more accounts.`
      }
    >
      {quiet ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">Nothing to show — that is the good state.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left text-[11px] uppercase tracking-wide text-gray-500 dark:border-gray-700 dark:text-gray-400">
                <th className="pb-2 pr-4">IP</th>
                <th className="pb-2 pr-4">Accounts</th>
                <th className="pb-2 pr-4">Window</th>
                <th className="pb-2 pr-4">Devices</th>
                <th className="pb-2">Email domains</th>
              </tr>
            </thead>
            <tbody>
              {clusters.map((c) => (
                <tr key={c.ip} className="border-b border-gray-100 dark:border-gray-800">
                  <td className="py-2.5 pr-4 font-mono text-xs text-gray-800 dark:text-gray-200">{c.ip}</td>
                  <td className="py-2.5 pr-4 font-semibold text-red-600 dark:text-red-400">{c.accounts}</td>
                  <td className="py-2.5 pr-4 text-gray-600 dark:text-gray-300">{spanOf(c)}</td>
                  <td className="py-2.5 pr-4 text-gray-600 dark:text-gray-300">{c.devices}</td>
                  <td className="py-2.5 text-gray-600 dark:text-gray-300">{c.domains ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Caveat>
        The IP comes from an unvalidated X-Forwarded-For header, so it can be spoofed, and signups
        through Google or Apple never set it — those are invisible here.
      </Caveat>
    </Panel>
  );
}

function spanOf(c: SignupCluster): string {
  const mins = Math.max(
    0,
    Math.round((new Date(c.last_seen).getTime() - new Date(c.first_seen).getTime()) / 60000),
  );
  return mins < 60 ? `${mins} min` : `${(mins / 60).toFixed(1)} h`;
}

/* ── Verification pressure ─────────────────────────────────────────────────── */

function Verification({ v }: { v: ServiceHealth["verification"] }) {
  const pct = v.dailyCap > 0 ? Math.min(100, (v.guardedAttemptsToday / v.dailyCap) * 100) : 0;
  const tone = pct >= 80 ? "alert" : pct >= 40 ? "warn" : "ok";
  const peak = Math.max(1, ...v.history.map((h) => h.attempts));

  return (
    <Panel
      title="Phone verification pressure"
      tone={tone}
      subtitle={`${v.guardedAttemptsToday} of ${v.dailyCap} daily attempts used`}
    >
      <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
        <div
          className={`h-full rounded-full ${tone === "alert" ? "bg-red-500" : tone === "warn" ? "bg-amber-500" : "bg-green-500"}`}
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="mt-5 flex items-end gap-1.5">
        {v.history.map((h) => (
          <div key={h.day} className="flex flex-1 flex-col items-center gap-1.5">
            <div
              className="w-full rounded-t bg-brand-500/70"
              style={{ height: `${Math.max(3, (h.attempts / peak) * 56)}px` }}
              title={`${h.day}: ${h.attempts}`}
            />
            <span className="text-[10px] text-gray-400">{h.day.slice(5)}</span>
          </div>
        ))}
      </div>

      <Caveat>{v.caveat}</Caveat>
    </Panel>
  );
}

/* ── Payments and integrations ─────────────────────────────────────────────── */

function Payments({ p }: { p: ServiceHealth["payments"] }) {
  const webhooksSilent = p.minutesSinceLastWebhook > 120;
  return (
    <Panel
      title="Payment plumbing"
      tone={p.stuckInSweep > 0 || webhooksSilent || p.hmacInvalid24h > 0 ? "warn" : "ok"}
    >
      <Rows
        rows={[
          ["Stuck in settlement sweep", p.stuckInSweep, p.stuckInSweep > 0],
          ["Oldest stuck payment", hours(p.oldestStuckHours), p.oldestStuckHours > 24],
          ["Webhooks in the last hour", p.webhooksLastHour, false],
          ["Since last webhook", minutes(p.minutesSinceLastWebhook), webhooksSilent],
          ["Invalid HMAC, 24h", p.hmacInvalid24h, p.hmacInvalid24h > 0],
          ["Unprocessed webhooks", p.unprocessedWebhooks, p.unprocessedWebhooks > 0],
        ]}
      />
      <Caveat>
        Orders stuck in the sweep are re-checked every ten minutes for fourteen days, and each retry
        writes an ERROR line. This count is that noise, made countable.
      </Caveat>
    </Panel>
  );
}

function Integrations({ i }: { i: ServiceHealth["integrations"] }) {
  const bad = i.erpFailed24h > 0 || i.quiqupFailed24h > 0 || i.erpUnsyncedOver30m > 0;
  return (
    <Panel title="Downstream integrations" tone={bad ? "warn" : "ok"}>
      <Rows
        rows={[
          ["ERPNext sync errors, 24h", i.erpFailed24h, i.erpFailed24h > 0],
          ["Paid but unsynced over 30 min", i.erpUnsyncedOver30m, i.erpUnsyncedOver30m > 0],
          ["Quiqup dispatch errors, 24h", i.quiqupFailed24h, i.quiqupFailed24h > 0],
          ["Oldest undispatched paid order", minutes(i.oldestUndispatchedMinutes), i.oldestUndispatchedMinutes > 120],
        ]}
      />
      <Caveat>
        Both of these record their failures in a column on the order and carry on. A paid order can
        sit unsynced indefinitely while every other screen reports it as fine.
      </Caveat>
    </Panel>
  );
}

/* ── Shared bits ───────────────────────────────────────────────────────────── */

type Tone = "ok" | "warn" | "alert";

function Panel({
  title,
  subtitle,
  tone,
  children,
}: {
  title: string;
  subtitle?: string;
  tone: Tone;
  children: React.ReactNode;
}) {
  const dot =
    tone === "alert" ? "bg-red-500" : tone === "warn" ? "bg-amber-500" : "bg-green-500";
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
      <div className="mb-4 flex items-start gap-2.5">
        <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${dot}`} />
        <div>
          <h3 className="font-medium text-gray-800 dark:text-white">{title}</h3>
          {subtitle && <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">{subtitle}</p>}
        </div>
      </div>
      {children}
    </div>
  );
}

function Rows({ rows }: { rows: [string, string | number, boolean][] }) {
  return (
    <dl className="divide-y divide-gray-100 dark:divide-gray-800">
      {rows.map(([label, value, bad]) => (
        <div key={label} className="flex items-center justify-between py-2.5">
          <dt className="text-sm text-gray-600 dark:text-gray-300">{label}</dt>
          <dd
            className={`text-sm font-semibold tabular-nums ${
              value === "unknown"
                ? "text-gray-400"
                : bad
                  ? "text-amber-600 dark:text-amber-400"
                  : "text-gray-800 dark:text-white"
            }`}
          >
            {value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function Caveat({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-4 border-t border-gray-100 pt-3 text-xs leading-relaxed text-gray-500 dark:border-gray-800 dark:text-gray-400">
      {children}
    </p>
  );
}

/** -1 means the backend could not compute it. Never render that as a healthy zero. */
function minutes(m: number): string {
  if (m === UNKNOWN) return "unknown";
  if (m < 60) return `${m} min`;
  if (m < 60 * 48) return `${(m / 60).toFixed(1)} h`;
  return `${Math.round(m / 1440)} d`;
}

function hours(h: number): string {
  if (h === UNKNOWN) return "unknown";
  if (h < 48) return `${h} h`;
  return `${Math.round(h / 24)} d`;
}
