import { Link } from "react-router";
import PageMeta from "../../components/common/PageMeta";
import MonthlySalesChart from "../../components/ecommerce/MonthlySalesChart";
import StatisticsChart from "../../components/ecommerce/StatisticsChart";
import MonthlyTarget from "../../components/ecommerce/MonthlyTarget";
import RecentOrders from "../../components/ecommerce/RecentOrders";
import ActivePendingOrders from "../../components/ecommerce/ActivePendingOrders";
import Badge from "../../components/ui/badge/Badge";
import {
  ArrowUpIcon,
  ArrowDownIcon,
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

const metrics = [
  {
    label: "Total Customers",
    value: "3,782",
    change: "+11.01%",
    trend: "up" as const,
    icon: GroupIcon,
    gradient: "from-violet-500 to-purple-600",
    bg: "bg-violet-50 dark:bg-violet-900/20",
    iconBg: "bg-violet-100 dark:bg-violet-800/40",
    iconColor: "text-violet-600 dark:text-violet-300",
  },
  {
    label: "Total Orders",
    value: "5,359",
    change: "-9.05%",
    trend: "down" as const,
    icon: BoxIconLine,
    gradient: "from-brand-500 to-cyan-500",
    bg: "bg-brand-50 dark:bg-brand-900/20",
    iconBg: "bg-brand-100 dark:bg-brand-800/40",
    iconColor: "text-brand-600 dark:text-brand-300",
  },
  {
    label: "Total Revenue",
    value: "$84,260",
    change: "+22.3%",
    trend: "up" as const,
    icon: DollarLineIcon,
    gradient: "from-emerald-500 to-teal-500",
    bg: "bg-emerald-50 dark:bg-emerald-900/20",
    iconBg: "bg-emerald-100 dark:bg-emerald-800/40",
    iconColor: "text-emerald-600 dark:text-emerald-300",
  },
  {
    label: "Active Products",
    value: "1,240",
    change: "+5.12%",
    trend: "up" as const,
    icon: ShootingStarIcon,
    gradient: "from-orange-500 to-amber-500",
    bg: "bg-orange-50 dark:bg-orange-900/20",
    iconBg: "bg-orange-100 dark:bg-orange-800/40",
    iconColor: "text-orange-600 dark:text-orange-300",
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
  change,
  trend,
  icon: Icon,
  bg,
  iconBg,
  iconColor,
}: (typeof metrics)[number]) {
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
        <Badge color={trend === "up" ? "success" : "error"}>
          {trend === "up" ? <ArrowUpIcon /> : <ArrowDownIcon />}
          {change}
        </Badge>
      </div>
      <div className="mt-5">
        <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
        <h3 className="mt-1 text-2xl font-bold text-gray-800 dark:text-white/90">
          {value}
        </h3>
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

export default function Home() {
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
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4 md:gap-5">
          {metrics.map((m) => (
            <MetricCard key={m.label} {...m} />
          ))}
        </div>

        {/* Pending & Active Orders */}
        <ActivePendingOrders />

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
