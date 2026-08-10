import { useMemo, useState } from "react";
import Chart from "react-apexcharts";
import { ApexOptions } from "apexcharts";
import type { VisitorMetricsResponse } from "../../api/services/analytics.service";

/**
 * Website traffic over time.
 *
 * Both series are counts of people on the same scale, so they share one y-axis (never a second
 * axis). Series colours are fixed per measure — #7c3aed for unique visitors, #0d9488 for visits —
 * and stay put regardless of which range is selected; both pass CVD separation and 3:1 contrast
 * against the light and dark card surfaces.
 *
 * The 7d/30d toggle slices the series the parent already fetched instead of re-requesting: the API
 * returns 30 days in one call and the window totals come with it.
 */

const UNIQUE_COLOR = "#7c3aed";
const VISITS_COLOR = "#0d9488";

type Range = 7 | 30;

const fmt = (n: number | undefined) => (n == null ? "—" : n.toLocaleString());

function StatBlock({ color, label, value }: { color: string; label: string; value: string }) {
  return (
    <div>
      <div className="flex items-center gap-2">
        {/* The dot carries series identity; the text stays in ink tokens. */}
        <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: color }} />
        <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
      </div>
      <p className="mt-1 text-xl font-bold text-gray-800 dark:text-white/90">{value}</p>
    </div>
  );
}

export default function VisitorsChart({
  metrics,
  loading,
}: {
  metrics: VisitorMetricsResponse | null;
  loading: boolean;
}) {
  const [range, setRange] = useState<Range>(30);

  const points = useMemo(() => {
    const daily = metrics?.daily ?? [];
    return range === 30 ? daily : daily.slice(-7);
  }, [metrics, range]);

  const totals = range === 7 ? metrics?.last7Days : metrics?.last30Days;

  const categories = useMemo(
    () =>
      points.map((p) =>
        new Date(`${p.date}T00:00:00Z`).toLocaleDateString(undefined, {
          day: "numeric",
          month: "short",
          timeZone: "UTC",
        })
      ),
    [points]
  );

  const series = useMemo(
    () => [
      { name: "Unique visitors", data: points.map((p) => p.uniqueVisitors) },
      { name: "Visits", data: points.map((p) => p.visits) },
    ],
    [points]
  );

  // Judged on all-time, not the selected range: "nothing recorded yet" must not appear
  // over a quiet week while the cards above show non-zero all-time totals.
  const hasTraffic = (metrics?.allTime.pageViews ?? 0) > 0;

  const options: ApexOptions = {
    colors: [UNIQUE_COLOR, VISITS_COLOR],
    chart: {
      fontFamily: "Plus Jakarta Sans, sans-serif",
      type: "area",
      height: 260,
      toolbar: { show: false },
      zoom: { enabled: false },
    },
    stroke: { curve: "smooth", width: 2 },
    dataLabels: { enabled: false },
    fill: {
      type: "gradient",
      gradient: { opacityFrom: 0.35, opacityTo: 0.02, stops: [0, 100] },
    },
    // Hidden until hovered — a marker on all 30 points buries the line it belongs to.
    markers: { size: 0, strokeWidth: 2, hover: { size: 5 } },
    legend: {
      show: true,
      position: "top",
      horizontalAlign: "left",
      fontFamily: "Plus Jakarta Sans",
      markers: { size: 6 },
      labels: { colors: "#667085" },
    },
    grid: {
      borderColor: "rgba(102, 112, 133, 0.15)",
      strokeDashArray: 3,
      xaxis: { lines: { show: false } },
      yaxis: { lines: { show: true } },
      padding: { left: 8, right: 8 },
    },
    xaxis: {
      categories,
      axisBorder: { show: false },
      axisTicks: { show: false },
      tooltip: { enabled: false },
      labels: {
        style: { colors: "#98A2B3", fontSize: "12px" },
        // 30 daily labels don't fit side by side; drop the ones that would collide
        // rather than rotating them into an unreadable diagonal.
        rotate: 0,
        hideOverlappingLabels: true,
      },
    },
    yaxis: {
      min: 0,
      forceNiceScale: true,
      labels: {
        style: { colors: "#98A2B3", fontSize: "12px" },
        formatter: (val: number) => (Number.isInteger(val) ? String(val) : val.toFixed(0)),
      },
    },
    tooltip: {
      shared: true,
      intersect: false,
      x: { show: true },
      y: { formatter: (val: number) => val.toLocaleString() },
    },
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white px-5 pt-5 pb-4 dark:border-gray-800 dark:bg-white/[0.03] sm:px-6 sm:pt-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
            Website Visitors
          </h3>
          <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
            Storefront traffic — unique browsers vs. total visits
          </p>
        </div>

        <div className="flex items-center gap-3">
          {metrics && metrics.activeNow > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300">
              <span className="relative flex size-2">
                <span className="absolute inline-flex size-2 animate-ping rounded-full bg-emerald-500 opacity-75" />
                <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
              </span>
              {metrics.activeNow} active now
            </span>
          )}
          <div className="flex items-center gap-0.5 rounded-lg bg-gray-100 p-0.5 dark:bg-gray-900">
            {([7, 30] as Range[]).map((option) => (
              <button
                key={option}
                onClick={() => setRange(option)}
                className={`rounded-md px-3 py-1.5 text-theme-sm font-medium transition hover:text-gray-900 dark:hover:text-white ${
                  range === option
                    ? "shadow-theme-xs bg-white text-gray-900 dark:bg-gray-800 dark:text-white"
                    : "text-gray-500 dark:text-gray-400"
                }`}
              >
                {option}d
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-3 gap-4 border-y border-gray-100 py-4 dark:border-gray-800">
        <StatBlock
          color={UNIQUE_COLOR}
          label={`Unique visitors (${range}d)`}
          value={loading ? "…" : fmt(totals?.uniqueVisitors)}
        />
        <StatBlock
          color={VISITS_COLOR}
          label={`Visits (${range}d)`}
          value={loading ? "…" : fmt(totals?.visits)}
        />
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400">Page views ({range}d)</p>
          <p className="mt-1 text-xl font-bold text-gray-800 dark:text-white/90">
            {loading ? "…" : fmt(totals?.pageViews)}
          </p>
        </div>
      </div>

      {loading ? (
        <div className="mt-4 h-[260px] animate-pulse rounded-xl bg-gray-100 dark:bg-white/[0.04]" />
      ) : (
        <div className="relative">
          <div className="max-w-full overflow-x-auto custom-scrollbar">
            <div className="min-w-[650px] xl:min-w-full">
              <Chart options={options} series={series} type="area" height={260} />
            </div>
          </div>
          {!hasTraffic && (
            <p className="pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 px-6 text-center text-sm text-gray-500 dark:text-gray-400">
              No visits recorded yet. The storefront reports traffic as soon as it is deployed with
              visitor tracking enabled.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
