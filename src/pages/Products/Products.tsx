import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import Badge from "../../components/ui/badge/Badge";
import { productsService, ApiRequestError } from "../../api";
import type { Product, ProductStatus } from "../../types";
import { env } from "../../config/env";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatPrice(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(value);
}

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(iso));
}

type BadgeColor = "success" | "error" | "warning" | "info" | "light";

function statusColor(status: ProductStatus): BadgeColor {
  return status === "ACTIVE" ? "success" : "error";
}

console.log(env.apiBaseUrl);


function productTypeColor(type: string): string {
  switch (type) {
    case "SIMPLE":
      return "bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400";
    case "VARIABLE":
      return "bg-purple-100 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400";
    case "BUNDLE":
      return "bg-orange-100 text-orange-700 dark:bg-orange-500/10 dark:text-orange-400";
    default:
      return "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300";
  }
}

// ---------------------------------------------------------------------------
// ProductRow
// ---------------------------------------------------------------------------

function ProductRow({
  product,
  onNavigate,
}: {
  product: Product;
  onNavigate: (id: string) => void;
}) {
  const hasDiscount =
    product.discountType !== null && product.discountValue !== null;
  const savings = product.basePrice - product.effectivePrice;
  const primaryMedia =
    product.media.find((m) => m.isPrimary) ?? product.media[0] ?? null;

  return (
    <tr
      onClick={() => onNavigate(product.id)}
      className="group cursor-pointer border-b border-gray-100 dark:border-gray-800 transition-colors hover:bg-brand-50/50 dark:hover:bg-white/[0.02]"
    >
      {/* Product info */}
      <td className="px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800 text-gray-400">
            {primaryMedia ? (
              <img
                src={`${env.apiBaseUrl}${primaryMedia.url}`}
                alt={product.title}
                className="h-10 w-10 object-cover"
              />
            ) : (
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
              >
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                <line x1="12" y1="22.08" x2="12" y2="12" />
              </svg>
            )}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-800 dark:text-white/90 group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors truncate max-w-[200px]">
              {product.title}
            </p>
            <p className="mt-0.5 font-mono text-xs text-gray-400 dark:text-gray-500">
              {product.sku}
            </p>
          </div>
        </div>
      </td>

      {/* Type */}
      <td className="px-4 py-4">
        <span
          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${productTypeColor(product.productType)}`}
        >
          {product.productType}
        </span>
      </td>

      {/* Pricing */}
      <td className="px-4 py-4">
        <p className="text-sm font-semibold text-gray-800 dark:text-white/90">
          {formatPrice(product.effectivePrice)}
        </p>
        {savings > 0 && (
          <p className="mt-0.5 text-xs text-gray-400 line-through">
            {formatPrice(product.basePrice)}
          </p>
        )}
      </td>

      {/* Discount */}
      <td className="px-4 py-4">
        {hasDiscount ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-orange-100 dark:bg-orange-500/10 px-2.5 py-0.5 text-xs font-semibold text-orange-600 dark:text-orange-400">
            {product.discountType === "PERCENTAGE"
              ? `${product.discountValue}% off`
              : formatPrice(product.discountValue!)}
          </span>
        ) : (
          <span className="text-xs text-gray-300 dark:text-gray-600">—</span>
        )}
      </td>

      {/* Variants */}
      <td className="px-4 py-4">
        <span
          className={`inline-flex items-center justify-center rounded-full w-7 h-7 text-xs font-bold ${
            product.variants.length > 0
              ? "bg-brand-100 text-brand-700 dark:bg-brand-500/10 dark:text-brand-400"
              : "bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-500"
          }`}
        >
          {product.variants.length}
        </span>
      </td>

      {/* Status */}
      <td className="px-4 py-4">
        <Badge size="sm" color={statusColor(product.status)}>
          {product.status}
        </Badge>
      </td>

      {/* Created */}
      <td className="px-4 py-4 text-xs text-gray-500 dark:text-gray-400">
        {formatDate(product.createdAt)}
      </td>

      {/* Chevron */}
      <td className="px-4 py-4">
        <span className="flex items-center justify-end text-gray-300 dark:text-gray-600 group-hover:text-brand-400 transition-colors">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M9 18l6-6-6-6" />
          </svg>
        </span>
      </td>
    </tr>
  );
}

// ---------------------------------------------------------------------------
// Loading skeleton rows
// ---------------------------------------------------------------------------

function SkeletonRow() {
  return (
    <tr className="border-b border-gray-100 dark:border-gray-800">
      <td className="px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 flex-shrink-0 rounded-xl bg-gray-200 dark:bg-gray-700 animate-pulse" />
          <div className="space-y-2">
            <div className="h-3.5 w-36 rounded-full bg-gray-200 dark:bg-gray-700 animate-pulse" />
            <div className="h-2.5 w-24 rounded-full bg-gray-100 dark:bg-gray-800 animate-pulse" />
          </div>
        </div>
      </td>
      {[1, 2, 3, 4, 5, 6, 7].map((i) => (
        <td key={i} className="px-4 py-4">
          <div className="h-3 w-16 rounded-full bg-gray-100 dark:bg-gray-800 animate-pulse" />
        </td>
      ))}
    </tr>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

type StatusFilter = ProductStatus | "ALL";

export default function Products() {
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);

    productsService
      .getAll("EN", controller.signal)
      .then((res) => setProducts(res.data))
      .catch((err: unknown) => {
        if (err instanceof Error && err.name === "AbortError") return;
        const message =
          err instanceof ApiRequestError
            ? err.message
            : "Failed to load products.";
        setError(message);
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, []);

  const filtered = products.filter((p) => {
    const term = search.toLowerCase();
    const matchesSearch =
      p.title.toLowerCase().includes(term) ||
      p.sku.toLowerCase().includes(term) ||
      p.description.toLowerCase().includes(term);
    const matchesStatus = statusFilter === "ALL" || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const activeCount = products.filter((p) => p.status === "ACTIVE").length;
  const inactiveCount = products.filter((p) => p.status === "INACTIVE").length;
  const totalVariants = products.reduce((acc, p) => acc + p.variants.length, 0);

  const stats = [
    {
      label: "Total Products",
      value: products.length,
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
          <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
          <line x1="12" y1="22.08" x2="12" y2="12" />
        </svg>
      ),
      color: "text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-500/10",
    },
    {
      label: "Active",
      value: activeCount,
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
          <polyline points="22 4 12 14.01 9 11.01" />
        </svg>
      ),
      color: "text-success-600 dark:text-success-400 bg-success-50 dark:bg-success-500/10",
    },
    {
      label: "Inactive",
      value: inactiveCount,
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <circle cx="12" cy="12" r="10" />
          <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
        </svg>
      ),
      color: "text-error-600 dark:text-error-400 bg-error-50 dark:bg-error-500/10",
    },
    {
      label: "Total Variants",
      value: totalVariants,
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <line x1="8" y1="6" x2="21" y2="6" />
          <line x1="8" y1="12" x2="21" y2="12" />
          <line x1="8" y1="18" x2="21" y2="18" />
          <line x1="3" y1="6" x2="3.01" y2="6" />
          <line x1="3" y1="12" x2="3.01" y2="12" />
          <line x1="3" y1="18" x2="3.01" y2="18" />
        </svg>
      ),
      color: "text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10",
    },
  ];

  const filterOptions: { label: string; value: StatusFilter }[] = [
    { label: "All", value: "ALL" },
    { label: "Active", value: "ACTIVE" },
    { label: "Inactive", value: "INACTIVE" },
  ];

  return (
    <>
      <PageMeta
        title="Products | Buyology Dashboard"
        description="Manage all products in the Buyology platform."
      />

      <PageBreadcrumb pageTitle="Products" />

      {/* Stats row */}
      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="flex items-center gap-3 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03] p-4"
          >
            <span className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl ${stat.color}`}>
              {stat.icon}
            </span>
            <div>
              <p className="text-2xl font-bold text-gray-800 dark:text-white/90 leading-none">
                {loading ? "—" : stat.value}
              </p>
              <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                {stat.label}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90">
          All Products
          {!loading && (
            <span className="ml-2 text-sm font-normal text-gray-400">
              ({filtered.length})
            </span>
          )}
        </h2>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          {/* Status filter tabs */}
          <div className="flex gap-1 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60 p-1">
            {filterOptions.map(({ label, value }) => {
              const isActive = statusFilter === value;
              const activeClass =
                value === "ALL"
                  ? "bg-white dark:bg-gray-700 text-gray-800 dark:text-white shadow-sm"
                  : value === "ACTIVE"
                  ? "bg-white dark:bg-gray-700 text-success-600 dark:text-success-400 shadow-sm"
                  : "bg-white dark:bg-gray-700 text-error-600 dark:text-error-400 shadow-sm";
              return (
                <button
                  key={value}
                  onClick={() => setStatusFilter(value)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                    isActive
                      ? activeClass
                      : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>

          {/* Search */}
          <div className="relative w-full sm:w-60">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </span>
            <input
              type="text"
              placeholder="Search by title or SKU…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 py-2.5 pl-9 pr-4 text-sm text-gray-800 dark:text-white placeholder-gray-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-400/20 transition-all"
            />
          </div>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-red-200 dark:border-red-800/40 bg-red-50 dark:bg-red-500/5 py-16 text-center">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mb-3 text-red-400">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <p className="text-sm font-medium text-red-600 dark:text-red-400">{error}</p>
          <p className="mt-1 text-xs text-red-400 dark:text-red-500">
            Check the API connection and try again.
          </p>
        </div>
      )}

      {/* Table */}
      {!error && (
        <div className="overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03]">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-white/[0.02]">
                  {["Product", "Type", "Price", "Discount", "Variants", "Status", "Created", ""].map(
                    (col) => (
                      <th
                        key={col}
                        className="px-4 py-3.5 first:pl-5 text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500"
                      >
                        {col}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody>
                {loading &&
                  Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} />)}

                {!loading &&
                  filtered.map((product) => (
                    <ProductRow
                      key={product.id}
                      product={product}
                      onNavigate={(id) => navigate(`/products/${id}`)}
                    />
                  ))}
              </tbody>
            </table>
          </div>

          {/* Empty state */}
          {!loading && filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" className="mb-4 text-gray-300 dark:text-gray-600">
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                <line x1="12" y1="22.08" x2="12" y2="12" />
              </svg>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                {search
                  ? "No products match your search."
                  : statusFilter !== "ALL"
                  ? `No ${statusFilter.toLowerCase()} products found.`
                  : "No products found."}
              </p>
              {(search || statusFilter !== "ALL") && (
                <button
                  onClick={() => { setSearch(""); setStatusFilter("ALL"); }}
                  className="mt-3 text-xs text-brand-500 hover:text-brand-600 dark:text-brand-400 transition-colors"
                >
                  Clear filters
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </>
  );
}
