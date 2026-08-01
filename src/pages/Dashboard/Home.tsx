import { useEffect, useState } from "react";
import { Link } from "react-router";
import PageMeta from "../../components/common/PageMeta";
import { usersService } from "../../api/services/users.service";
import { ordersService } from "../../api/services/orders.service";
import { revenueService } from "../../api/services/revenue.service";
import { productsService } from "../../api/services/products.service";
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
} from "../../icons";
import InventoryIcon from "@mui/icons-material/Inventory";
import CategoryIcon from "@mui/icons-material/Category";
import BrandingWatermarkIcon from "@mui/icons-material/BrandingWatermark";
import AutoStoriesIcon from "@mui/icons-material/AutoStories";
import AddBoxIcon from "@mui/icons-material/AddBox";
import PostAddIcon from "@mui/icons-material/PostAdd";
import TuneIcon from "@mui/icons-material/Tune";
import DeleteSweepIcon from "@mui/icons-material/DeleteSweep";

type MetricKey = "customers" | "orders" | "revenue" | "products";

const METRIC_CARDS: {
  key: MetricKey;
  label: string;
  icon: typeof GroupIcon;
  iconClass: string;
}[] = [
  {
    key: "customers",
    label: "Total Customers",
    icon: GroupIcon,
    iconClass: "bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-300",
  },
  {
    key: "orders",
    label: "Total Orders",
    icon: BoxIconLine,
    iconClass:
      "bg-blue-light-50 text-blue-light-600 dark:bg-blue-light-500/10 dark:text-blue-light-400",
  },
  {
    key: "revenue",
    label: "Total Revenue",
    icon: DollarLineIcon,
    iconClass:
      "bg-success-50 text-success-600 dark:bg-success-500/10 dark:text-success-400",
  },
  {
    key: "products",
    label: "Active Products",
    icon: ShootingStarIcon,
    iconClass:
      "bg-warning-50 text-warning-600 dark:bg-warning-500/10 dark:text-warning-400",
  },
];

const quickLinks = [
  { label: "Products", href: "/products", Icon: InventoryIcon },
  { label: "Add Product", href: "/new-product", Icon: AddBoxIcon },
  { label: "Categories", href: "/categories", Icon: CategoryIcon },
  { label: "Brands", href: "/brands", Icon: BrandingWatermarkIcon },
  { label: "Stories", href: "/stories", Icon: AutoStoriesIcon },
  { label: "Add Story", href: "/new-story", Icon: PostAddIcon },
  { label: "Specs", href: "/specs", Icon: TuneIcon },
  { label: "Trash", href: "/products/trash", Icon: DeleteSweepIcon },
];

/** Page masthead — greeting on the left, the two most-used actions on the right. */
function PageHead() {
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
      <div>
        <h1 className="ui-page-title">Overview</h1>
        <p className="ui-muted mt-0.5">
          {greeting} — here's what's happening with your store today.
        </p>
      </div>
      <div className="flex items-center gap-2">
        <Link
          to="/new-product"
          className="ui-btn-primary h-10"
        >
          <PlusIcon className="size-4" />
          New Product
        </Link>
        <Link
          to="/products"
          className="ui-btn-outline h-10"
        >
          View All
          <ArrowRightIcon className="size-4" />
        </Link>
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  icon: Icon,
  iconClass,
  loading,
}: {
  label: string;
  value: string;
  icon: typeof GroupIcon;
  iconClass: string;
  loading?: boolean;
}) {
  return (
    <div className="ui-card ui-card-interactive flex items-center gap-3 p-3.5">
      <div
        className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${iconClass}`}
      >
        <Icon className="size-[18px]" />
      </div>
      <div className="min-w-0">
        <p className="truncate text-[11px] font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
          {label}
        </p>
        {loading ? (
          <div className="mt-1.5 h-5 w-20 animate-pulse rounded bg-gray-200/70 dark:bg-white/10" />
        ) : (
          <p className="mt-0.5 truncate text-xl font-semibold tracking-tight text-gray-900 dark:text-white/90">
            {value}
          </p>
        )}
      </div>
    </div>
  );
}

function QuickLinks() {
  return (
    <div className="ui-card">
      <div className="ui-card-head">
        <h2 className="ui-section-title">Quick Links</h2>
        <ListIcon className="size-4 text-gray-400" />
      </div>
      <div className="grid grid-cols-2 gap-2 p-3 sm:grid-cols-4 lg:grid-cols-8">
        {quickLinks.map(({ label, href, Icon }) => (
          <Link
            key={href}
            to={href}
            className="group flex flex-col items-center gap-2 rounded-xl border border-transparent px-2 py-3 text-center transition-all hover:-translate-y-px hover:border-gray-200 hover:bg-gray-50 hover:shadow-theme-xs dark:hover:border-gray-800 dark:hover:bg-white/[0.03]"
          >
            <span className="flex size-9 items-center justify-center rounded-lg bg-gray-100 text-gray-500 transition-colors group-hover:bg-brand-50 group-hover:text-brand-600 dark:bg-white/5 dark:text-gray-400 dark:group-hover:bg-brand-500/10 dark:group-hover:text-brand-300">
              <Icon sx={{ fontSize: 18 }} />
            </span>
            <span className="truncate text-xs font-medium text-gray-700 dark:text-gray-300">
              {label}
            </span>
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

export default function Home() {
  const [stats, setStats] = useState<Stats>({});

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
    return () => ctrl.abort();
  }, []);

  const valueFor = (key: MetricKey): string => {
    if (key === "customers") return fmtCount(stats.customers);
    if (key === "orders") return fmtCount(stats.orders);
    if (key === "revenue") return fmtMoney(stats.revenue);
    return fmtCount(stats.products);
  };
  const loadingFor = (key: MetricKey): boolean => stats[key] == null;

  return (
    <>
      <PageMeta
        title="Dashboard | Buyology E-commerce"
        description="Buyology e-commerce admin dashboard overview"
      />

      <div className="flex flex-col gap-4">
        <PageHead />

        {/* Metrics */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {METRIC_CARDS.map(({ key, ...rest }) => (
            <MetricCard key={key} {...rest} value={valueFor(key)} loading={loadingFor(key)} />
          ))}
        </div>

        {/* Pending & Active Orders */}
        <ActivePendingOrders />

        {/* Quick Links */}
        <QuickLinks />

        {/* Charts row */}
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
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
