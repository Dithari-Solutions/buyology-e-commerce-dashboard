import { useEffect, useState } from "react";
import { Link } from "react-router";
import PageMeta from "../../components/common/PageMeta";
import { usersService } from "../../api/services/users.service";
import { ordersService } from "../../api/services/orders.service";
import { revenueService } from "../../api/services/revenue.service";
import { productsService } from "../../api/services/products.service";
import { analyticsService } from "../../api/services/analytics.service";
import type { VisitorMetricsResponse } from "../../api/services/analytics.service";
import VisitorsChart from "../../components/ecommerce/VisitorsChart";
import MonthlySalesChart from "../../components/ecommerce/MonthlySalesChart";
import StatisticsChart from "../../components/ecommerce/StatisticsChart";
import MonthlyTarget from "../../components/ecommerce/MonthlyTarget";
import RecentOrders from "../../components/ecommerce/RecentOrders";
import ActivePendingOrders from "../../components/ecommerce/ActivePendingOrders";
import {
  GroupIcon,
  BoxIconLine,
  DollarLineIcon,
  ShootingStarIcon,
  PlusIcon,
  ArrowRightIcon,
  ListIcon,
  UserCircleIcon,
  EyeIcon,
  ArrowUpIcon,
  ArrowDownIcon,
} from "../../icons";
import InventoryIcon from "@mui/icons-material/Inventory";
import CategoryIcon from "@mui/icons-material/Category";
import BrandingWatermarkIcon from "@mui/icons-material/BrandingWatermark";
import AutoStoriesIcon from "@mui/icons-material/AutoStories";
import AddBoxIcon from "@mui/icons-material/AddBox";
import PostAddIcon from "@mui/icons-material/PostAdd";
import TuneIcon from "@mui/icons-material/Tune";
import DeleteSweepIcon from "@mui/icons-material/DeleteSweep";

type MetricKey =
  | "customers"
  | "orders"
  | "revenue"
  | "products"
  | "uniqueVisitors"
  | "visits";

const METRIC_CARDS: {
  key: MetricKey;
  label: string;
  icon: typeof GroupIcon;
  bg: string;
  iconBg: string;
  iconColor: string;
}[] = [
  {
    key: "customers",
    label: "Total Customers",
    icon: GroupIcon,
    bg: "bg-violet-50 dark:bg-violet-900/20",
    iconBg: "bg-violet-100 dark:bg-violet-800/40",
    iconColor: "text-violet-600 dark:text-violet-300",
  },
  {
    key: "orders",
    label: "Total Orders",
    icon: BoxIconLine,
    bg: "bg-brand-50 dark:bg-brand-900/20",
    iconBg: "bg-brand-100 dark:bg-brand-800/40",
    iconColor: "text-brand-600 dark:text-brand-300",
  },
  {
    key: "revenue",
    label: "Total Revenue",
    icon: DollarLineIcon,
    bg: "bg-emerald-50 dark:bg-emerald-900/20",
    iconBg: "bg-emerald-100 dark:bg-emerald-800/40",
    iconColor: "text-emerald-600 dark:text-emerald-300",
  },
  {
    key: "products",
    label: "Active Products",
    icon: ShootingStarIcon,
    bg: "bg-orange-50 dark:bg-orange-900/20",
    iconBg: "bg-orange-100 dark:bg-orange-800/40",
    iconColor: "text-orange-600 dark:text-orange-300",
  },
  // Website traffic. "Unique visitors" counts browsers, "total visits" counts
  // browsing sessions — the same shopper returning next week adds a visit but not
  // a unique visitor.
  {
    key: "uniqueVisitors",
    label: "Unique Visitors",
    icon: UserCircleIcon,
    bg: "bg-teal-50 dark:bg-teal-900/20",
    iconBg: "bg-teal-100 dark:bg-teal-800/40",
    iconColor: "text-teal-600 dark:text-teal-300",
  },
  {
    key: "visits",
    label: "Total Visits",
    icon: EyeIcon,
    bg: "bg-sky-50 dark:bg-sky-900/20",
    iconBg: "bg-sky-100 dark:bg-sky-800/40",
    // eye.svg leaves its <path> with no fill and sets fill="none" on the root, so a
    // text-* colour alone paints nothing — fill-current is what makes it visible.
    iconColor: "fill-current text-sky-600 dark:text-sky-300",
  },
];

const quickLinks = [
  {
    label: "Products",
    description: "Browse all products",
    href: "/products",
    Icon: InventoryIcon,
    gradient: "from-brand-500 to-indigo-600",
    ring: "ring-brand-200 dark:ring-brand-800",
  },
  {
    label: "Add Product",
    description: "Create a new product",
    href: "/new-product",
    Icon: AddBoxIcon,
    gradient: "from-emerald-500 to-teal-600",
    ring: "ring-emerald-200 dark:ring-emerald-800",
  },
  {
    label: "Categories",
    description: "Manage categories",
    href: "/categories",
    Icon: CategoryIcon,
    gradient: "from-violet-500 to-purple-600",
    ring: "ring-violet-200 dark:ring-violet-800",
  },
  {
    label: "Brands",
    description: "Manage brands",
    href: "/brands",
    Icon: BrandingWatermarkIcon,
    gradient: "from-pink-500 to-rose-600",
    ring: "ring-pink-200 dark:ring-pink-800",
  },
  {
    label: "Stories",
    description: "View all stories",
    href: "/stories",
    Icon: AutoStoriesIcon,
    gradient: "from-amber-500 to-orange-600",
    ring: "ring-amber-200 dark:ring-amber-800",
  },
  {
    label: "Add Story",
    description: "Publish a new story",
    href: "/new-story",
    Icon: PostAddIcon,
    gradient: "from-cyan-500 to-sky-600",
    ring: "ring-cyan-200 dark:ring-cyan-800",
  },
  {
    label: "Specs",
    description: "Product specifications",
    href: "/specs",
    Icon: TuneIcon,
    gradient: "from-slate-500 to-gray-600",
    ring: "ring-slate-200 dark:ring-slate-700",
  },
  {
    label: "Trash",
    description: "Deleted products",
    href: "/products/trash",
    Icon: DeleteSweepIcon,
    gradient: "from-red-500 to-rose-600",
    ring: "ring-red-200 dark:ring-red-800",
  },
];

function WelcomeBanner() {
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 p-6 md:p-8">
      {/* Decorative circles */}
      <div className="pointer-events-none absolute -right-10 -top-10 h-48 w-48 rounded-full bg-white/10" />
      <div className="pointer-events-none absolute -bottom-8 -left-8 h-36 w-36 rounded-full bg-white/10" />
      <div className="pointer-events-none absolute right-24 top-6 h-20 w-20 rounded-full bg-white/5" />

      <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium text-white/70">{greeting} 👋</p>
          <h1 className="mt-1 text-2xl font-bold text-white md:text-3xl">
            Welcome back!
          </h1>
          <p className="mt-1 text-sm text-white/60">
            Here's what's happening with your store today.
          </p>
        </div>
        <div className="flex gap-3">
          <Link
            to="/new-product"
            className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-indigo-600 shadow-lg transition hover:bg-indigo-50"
          >
            <PlusIcon className="size-4" />
            New Product
          </Link>
          <Link
            to="/products"
            className="inline-flex items-center gap-2 rounded-xl border border-white/30 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/20"
          >
            View All
            <ArrowRightIcon className="size-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  icon: Icon,
  bg,
  iconBg,
  iconColor,
  loading,
  hint,
  trend,
}: {
  label: string;
  value: string;
  icon: typeof GroupIcon;
  bg: string;
  iconBg: string;
  iconColor: string;
  loading?: boolean;
  /** Secondary line under the headline number, e.g. "128 today". */
  hint?: string;
  /** Percentage change against the comparable previous window. */
  trend?: number | null;
}) {
  const trendUp = trend != null && trend >= 0;

  return (
    <div
      className={`group relative overflow-hidden rounded-2xl border border-gray-100 ${bg} p-5 transition-all hover:shadow-lg dark:border-white/5 md:p-6`}
    >
      <div className="flex items-start justify-between">
        <div
          className={`flex h-12 w-12 items-center justify-center rounded-xl ${iconBg}`}
        >
          <Icon className={`size-6 ${iconColor}`} />
        </div>
        {!loading && trend != null && (
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium ${
              trendUp
                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"
            }`}
            title="Last 7 days vs. the 7 days before"
          >
            {/* fill-current must be repeated: svgr spreads props after the icon's own
                className, so passing one here replaces the fill-current it ships with. */}
            {trendUp ? (
              <ArrowUpIcon className="size-3 fill-current" />
            ) : (
              <ArrowDownIcon className="size-3 fill-current" />
            )}
            {Math.abs(trend).toFixed(0)}%
          </span>
        )}
      </div>
      <div className="mt-5">
        <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
        {loading ? (
          <div className="mt-2 h-7 w-24 rounded-md bg-gray-200/70 dark:bg-white/10 animate-pulse" />
        ) : (
          <h3 className="mt-1 text-2xl font-bold text-gray-800 dark:text-white/90">
            {value}
          </h3>
        )}
        {!loading && hint && (
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{hint}</p>
        )}
      </div>
      {/* Subtle hover glow */}
      <div className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 ring-2 ring-inset ring-indigo-400/30 transition-opacity group-hover:opacity-100" />
    </div>
  );
}

function QuickLinks() {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6">
      <div className="mb-5 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90">
          Quick Links
        </h2>
        <ListIcon className="size-5 text-gray-400" />
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {quickLinks.map(({ label, description, href, Icon, gradient, ring }) => (
          <Link
            key={href}
            to={href}
            className={`group flex flex-col items-center gap-3 rounded-xl border bg-gray-50 p-4 text-center transition-all hover:-translate-y-0.5 hover:shadow-md dark:bg-white/[0.03] dark:border-white/5 ring-0 hover:ring-2 ${ring}`}
          >
            <div
              className={`flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${gradient} shadow-sm`}
            >
              <Icon sx={{ fontSize: 22, color: "white" }} />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-800 dark:text-white/90">
                {label}
              </p>
              <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                {description}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

type Stats = { customers?: number; orders?: number; revenue?: number; products?: number };

const fmtCount = (n?: number) => (n == null ? "—" : n.toLocaleString());
const fmtMoney = (n?: number) =>
  n == null ? "—" : `AED ${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

/** Percentage change between two windows; null when there is no baseline to compare against. */
const pctChange = (current: number, previous: number): number | null => {
  if (previous <= 0) return null;
  return ((current - previous) / previous) * 100;
};

export default function Home() {
  const [stats, setStats] = useState<Stats>({});
  /** Website traffic. Held whole because the chart needs the daily series too. */
  const [visitors, setVisitors] = useState<VisitorMetricsResponse | null>(null);
  /**
   * Set when the traffic endpoint refuses or fails — an admin whose role lacks
   * analytics:visitor:read gets a 403, and a card stuck on its loading skeleton forever reads as a
   * broken dashboard.
   */
  const [visitorsUnavailable, setVisitorsUnavailable] = useState(false);

  useEffect(() => {
    const ctrl = new AbortController();
    // Each metric loads independently — one failing endpoint shouldn't blank the others.
    usersService.getAll(0, 1, ctrl.signal)
      .then((r) => setStats((s) => ({ ...s, customers: r.data?.totalElements })))
      .catch(() => {});
    ordersService.getAll({ page: 0, size: 1 }, ctrl.signal)
      .then((r) => setStats((s) => ({ ...s, orders: r.data?.totalElements })))
      .catch(() => {});
    revenueService.getPlatformRevenue({})
      .then((r) => setStats((s) => ({ ...s, revenue: r.data?.totalRevenue })))
      .catch(() => {});
    productsService.getStats(ctrl.signal)
      .then((r) => setStats((s) => ({ ...s, products: r.data?.active })))
      .catch(() => {});
    // 30 days covers both the cards and the chart's 7d/30d toggle in a single call.
    analyticsService.getVisitorMetrics(30, ctrl.signal)
      .then((r) => (r.data ? setVisitors(r.data) : setVisitorsUnavailable(true)))
      .catch(() => {
        if (!ctrl.signal.aborted) setVisitorsUnavailable(true);
      });
    return () => ctrl.abort();
  }, []);

  const valueFor = (key: MetricKey): string => {
    if (key === "customers") return fmtCount(stats.customers);
    if (key === "orders") return fmtCount(stats.orders);
    if (key === "revenue") return fmtMoney(stats.revenue);
    if (key === "uniqueVisitors") return fmtCount(visitors?.allTime.uniqueVisitors);
    if (key === "visits") return fmtCount(visitors?.allTime.visits);
    return fmtCount(stats.products);
  };

  const loadingFor = (key: MetricKey): boolean => {
    if (key === "uniqueVisitors" || key === "visits") {
      return visitors == null && !visitorsUnavailable;
    }
    return stats[key] == null;
  };

  /** Today's figure, so the all-time headline has something current beside it. */
  const hintFor = (key: MetricKey): string | undefined => {
    if (!visitors) return undefined;
    if (key === "uniqueVisitors") return `${visitors.today.uniqueVisitors.toLocaleString()} today`;
    if (key === "visits") return `${visitors.today.visits.toLocaleString()} today`;
    return undefined;
  };

  const trendFor = (key: MetricKey): number | null => {
    if (!visitors) return null;
    if (key === "uniqueVisitors") {
      return pctChange(visitors.last7Days.uniqueVisitors, visitors.previous7Days.uniqueVisitors);
    }
    if (key === "visits") {
      return pctChange(visitors.last7Days.visits, visitors.previous7Days.visits);
    }
    return null;
  };

  return (
    <>
      <PageMeta
        title="Dashboard | Buyology E-commerce"
        description="Buyology e-commerce admin dashboard overview"
      />

      <div className="flex flex-col gap-5 md:gap-6">
        {/* Welcome Banner */}
        <WelcomeBanner />

        {/* Metrics */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 md:gap-5">
          {METRIC_CARDS.map(({ key, ...rest }) => (
            <MetricCard
              key={key}
              {...rest}
              value={valueFor(key)}
              loading={loadingFor(key)}
              hint={hintFor(key)}
              trend={trendFor(key)}
            />
          ))}
        </div>

        {/* Pending & Active Orders */}
        <ActivePendingOrders />

        {/* Website traffic — hidden entirely when the endpoint is unavailable to this admin */}
        {!visitorsUnavailable && (
          <VisitorsChart metrics={visitors} loading={visitors == null} />
        )}

        {/* Quick Links */}
        <QuickLinks />

        {/* Charts row */}
        <div className="grid grid-cols-1 gap-5 md:gap-6 xl:grid-cols-2">
          <MonthlySalesChart />
          <MonthlyTarget />
        </div>

        {/* Statistics */}
        <StatisticsChart />

        {/* Recent Orders */}
        <RecentOrders />
      </div>
    </>
  );
}
