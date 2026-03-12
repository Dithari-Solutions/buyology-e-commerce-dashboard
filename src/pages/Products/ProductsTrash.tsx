import { useEffect, useState } from "react";
import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import { productsService, ApiRequestError } from "../../api";
import type { Product } from "../../types";
import { env } from "../../config/env";

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

function daysUntilPermanentDelete(deletedAt: string): number {
  const deleted = new Date(deletedAt).getTime();
  const now = Date.now();
  const elapsed = Math.floor((now - deleted) / (1000 * 60 * 60 * 24));
  return Math.max(0, 30 - elapsed);
}

function DeletionCountdown({ deletedAt }: { deletedAt: string }) {
  const days = daysUntilPermanentDelete(deletedAt);
  const color =
    days <= 3
      ? "bg-error-50 text-error-600 dark:bg-error-500/10 dark:text-error-400"
      : days <= 7
      ? "bg-orange-100 text-orange-600 dark:bg-orange-500/10 dark:text-orange-400"
      : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400";

  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${color}`}>
      {days === 0 ? "Today" : `${days}d left`}
    </span>
  );
}

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

function TrashRow({ product }: { product: Product }) {
  const hasDiscount =
    product.discountType !== null && product.discountValue !== null;
  const savings = product.basePrice - product.effectivePrice;
  const primaryMedia =
    product.media.find((m) => m.isPrimary) ?? product.media[0] ?? null;

  return (
    <tr className="border-b border-gray-100 dark:border-gray-800">
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
            <p className="text-sm font-semibold text-gray-800 dark:text-white/90 truncate max-w-[200px]">
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

      {/* Deleted at */}
      <td className="px-4 py-4 text-xs text-error-500 dark:text-error-400">
        {product.deletedAt ? formatDate(product.deletedAt) : "—"}
      </td>

      {/* Days until permanent deletion */}
      <td className="px-4 py-4">
        {product.deletedAt ? (
          <DeletionCountdown deletedAt={product.deletedAt} />
        ) : (
          <span className="text-xs text-gray-300 dark:text-gray-600">—</span>
        )}
      </td>

      {/* Created */}
      <td className="px-4 py-4 text-xs text-gray-500 dark:text-gray-400">
        {formatDate(product.createdAt)}
      </td>
    </tr>
  );
}

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
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <td key={i} className="px-4 py-4">
          <div className="h-3 w-16 rounded-full bg-gray-100 dark:bg-gray-800 animate-pulse" />
        </td>
      ))}
    </tr>
  );
}

export default function ProductsTrash() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);

    productsService
      .getTrash("EN", controller.signal)
      .then((res) => {
        setProducts(res.data);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (err instanceof Error && err.name === "AbortError") return;
        const message =
          err instanceof ApiRequestError
            ? err.message
            : "Failed to load trash.";
        setError(message);
        setLoading(false);
      });

    return () => controller.abort();
  }, []);

  const filtered = products.filter((p) => {
    const term = search.toLowerCase();
    return (
      p.title.toLowerCase().includes(term) ||
      p.sku.toLowerCase().includes(term)
    );
  });

  return (
    <>
      <PageMeta
        title="Product Trash | Buyology Dashboard"
        description="View soft-deleted products in the Buyology platform."
      />

      <PageBreadcrumb pageTitle="Product Trash" />

      {/* Toolbar */}
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90">
          Deleted Products
          {!loading && (
            <span className="ml-2 text-sm font-normal text-gray-400">
              ({filtered.length})
            </span>
          )}
        </h2>

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
                  {["Product", "Type", "Price", "Discount", "Deleted At", "Permanent Deletion", "Created"].map(
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
                  Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)}

                {!loading &&
                  filtered.map((product) => (
                    <TrashRow key={product.id} product={product} />
                  ))}
              </tbody>
            </table>
          </div>

          {!loading && filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" className="mb-4 text-gray-300 dark:text-gray-600">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                <path d="M10 11v6" />
                <path d="M14 11v6" />
                <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
              </svg>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                {search ? "No deleted products match your search." : "Trash is empty."}
              </p>
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="mt-3 text-xs text-brand-500 hover:text-brand-600 dark:text-brand-400 transition-colors"
                >
                  Clear search
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </>
  );
}
