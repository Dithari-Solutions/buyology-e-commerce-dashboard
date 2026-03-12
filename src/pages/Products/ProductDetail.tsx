import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router";
import PageMeta from "../../components/common/PageMeta";
import Badge from "../../components/ui/badge/Badge";
import { productsService, ApiRequestError } from "../../api";
import type { Product, ProductMedia, ProductStatus } from "../../types";
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
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

type BadgeColor = "success" | "error" | "warning" | "info" | "light";

function statusColor(status: ProductStatus): BadgeColor {
  return status === "ACTIVE" ? "success" : "error";
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

// ---------------------------------------------------------------------------
// Loading skeleton
// ---------------------------------------------------------------------------

function DetailSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header skeleton */}
      <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03] p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-3 flex-1">
            <div className="h-7 w-64 rounded-lg bg-gray-200 dark:bg-gray-700" />
            <div className="h-4 w-40 rounded-full bg-gray-100 dark:bg-gray-800" />
            <div className="h-4 w-full max-w-lg rounded bg-gray-100 dark:bg-gray-800" />
            <div className="h-4 w-3/4 max-w-md rounded bg-gray-100 dark:bg-gray-800" />
          </div>
          <div className="flex flex-col items-end gap-2 flex-shrink-0">
            <div className="h-6 w-20 rounded-full bg-gray-200 dark:bg-gray-700" />
            <div className="h-6 w-16 rounded-full bg-gray-100 dark:bg-gray-800" />
          </div>
        </div>
      </div>

      {/* Media skeleton */}
      <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03]">
        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800">
          <div className="h-3 w-12 rounded-full bg-gray-200 dark:bg-gray-700" />
        </div>
        <div className="h-56 bg-gray-100 dark:bg-gray-800/60" />
      </div>

      {/* Pricing skeleton */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03] p-5">
            <div className="h-3 w-20 rounded-full bg-gray-100 dark:bg-gray-800 mb-3" />
            <div className="h-8 w-28 rounded-lg bg-gray-200 dark:bg-gray-700" />
          </div>
        ))}
      </div>

      {/* Details skeleton */}
      <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03] p-6">
        <div className="h-4 w-24 rounded-full bg-gray-200 dark:bg-gray-700 mb-4" />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="space-y-2">
              <div className="h-3 w-16 rounded-full bg-gray-100 dark:bg-gray-800" />
              <div className="h-4 w-24 rounded bg-gray-200 dark:bg-gray-700" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function ProductDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMedia, setSelectedMedia] = useState<ProductMedia | null>(null);

  useEffect(() => {
    if (!id) return;

    const controller = new AbortController();
    setLoading(true);
    setError(null);

    productsService
      .getById(id, "EN", controller.signal)
      .then((res) => {
        setProduct(res.data);
        const primary =
          res.data.media.find((m) => m.isPrimary) ?? res.data.media[0] ?? null;
        setSelectedMedia(primary);
      })
      .catch((err: unknown) => {
        if (err instanceof Error && err.name === "AbortError") return;
        const message =
          err instanceof ApiRequestError
            ? err.message
            : "Failed to load product.";
        setError(message);
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [id]);

  const hasDiscount =
    product?.discountType !== null && product?.discountValue !== null;

  return (
    <>
      <PageMeta
        title={product ? `${product.title} | Products` : "Product Detail | Buyology Dashboard"}
        description="Product details page"
      />

      {/* Breadcrumb */}
      <div className="mb-6 flex items-center gap-2 text-sm">
        <Link
          to="/products"
          className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400 hover:text-brand-600 dark:hover:text-brand-400 transition-colors"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M15 18l-6-6 6-6" />
          </svg>
          Products
        </Link>
        <span className="text-gray-300 dark:text-gray-700">/</span>
        <span className="text-gray-800 dark:text-white/80 font-medium truncate max-w-[240px]">
          {loading ? "Loading…" : (product?.title ?? "Not found")}
        </span>
      </div>

      {/* Error state */}
      {error && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-red-200 dark:border-red-800/40 bg-red-50 dark:bg-red-500/5 py-20 text-center">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mb-3 text-red-400">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <p className="text-sm font-medium text-red-600 dark:text-red-400">{error}</p>
          <button
            onClick={() => navigate("/products")}
            className="mt-4 rounded-xl bg-red-100 dark:bg-red-500/10 px-4 py-2 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-500/20 transition-colors"
          >
            Back to Products
          </button>
        </div>
      )}

      {/* Skeleton */}
      {loading && <DetailSkeleton />}

      {/* Content */}
      {!loading && !error && product && (
        <div className="space-y-5">

          {/* ── Header card ── */}
          <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03] p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-white leading-tight">
                    {product.title}
                  </h1>
                </div>
                <p className="mb-3 font-mono text-sm text-gray-400 dark:text-gray-500 tracking-wide">
                  SKU: {product.sku}
                </p>
                {product.description && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed max-w-2xl">
                    {product.description}
                  </p>
                )}
              </div>

              {/* Badges */}
              <div className="flex flex-shrink-0 flex-row sm:flex-col items-start sm:items-end gap-2">
                <Badge size="sm" color={statusColor(product.status)}>
                  {product.status}
                </Badge>
                <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${productTypeColor(product.productType)}`}>
                  {product.productType}
                </span>
                {product.isRefurbished && (
                  <span className="inline-flex items-center rounded-full bg-amber-100 dark:bg-amber-500/10 px-2.5 py-1 text-xs font-semibold text-amber-700 dark:text-amber-400">
                    Refurbished {product.refurbGrade ? `· Grade ${product.refurbGrade}` : ""}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* ── Media gallery ── */}
          {product.media.length > 0 && (
            <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03] overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400">
                  Media
                </h2>
                <span className="text-xs text-gray-400 dark:text-gray-500">
                  {product.media.length} file{product.media.length !== 1 ? "s" : ""}
                </span>
              </div>

              {/* Main preview */}
              <div className="flex items-center justify-center bg-gray-50 dark:bg-gray-900/40 min-h-64 max-h-[480px] overflow-hidden">
                {selectedMedia?.mediaType === "VIDEO" ? (
                  <video
                    key={selectedMedia.id}
                    src={`${env.apiBaseUrl}${selectedMedia.url}`}
                    controls
                    className="max-h-[480px] max-w-full object-contain"
                  />
                ) : selectedMedia ? (
                  <img
                    key={selectedMedia.id}
                    src={`${env.apiBaseUrl}${selectedMedia.url}`}
                    alt={product.title}
                    className="max-h-[480px] max-w-full object-contain"
                  />
                ) : null}
              </div>

              {/* Thumbnail strip */}
              {product.media.length > 1 && (
                <div className="flex gap-2 overflow-x-auto p-4 border-t border-gray-100 dark:border-gray-800">
                  {product.media.map((m) => {
                    const isActive = selectedMedia?.id === m.id;
                    return (
                      <button
                        key={m.id}
                        onClick={() => setSelectedMedia(m)}
                        className={`relative flex-shrink-0 h-16 w-16 rounded-xl overflow-hidden border-2 transition-all ${
                          isActive
                            ? "border-brand-500 dark:border-brand-400 shadow-sm"
                            : "border-gray-200 dark:border-gray-700 hover:border-brand-300 dark:hover:border-brand-600"
                        }`}
                      >
                        {m.mediaType === "VIDEO" ? (
                          <div className="flex h-full w-full items-center justify-center bg-gray-100 dark:bg-gray-800 text-gray-400">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                              <polygon points="5 3 19 12 5 21 5 3" />
                            </svg>
                          </div>
                        ) : (
                          <img
                            src={`${env.apiBaseUrl}${m.thumbnailUrl ?? m.url}`}
                            alt={`Media ${m.orderIndex + 1}`}
                            className="h-full w-full object-cover"
                          />
                        )}
                        {m.isPrimary && (
                          <span className="absolute bottom-0.5 left-0.5 rounded-sm bg-brand-500 px-1 py-px text-[9px] font-bold leading-none text-white">
                            Primary
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── Pricing cards ── */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {/* Base price */}
            <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03] p-5">
              <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-gray-400">
                Base Price
              </p>
              <p className="text-3xl font-bold text-gray-800 dark:text-white/90">
                {formatPrice(product.basePrice)}
              </p>
            </div>

            {/* Effective price */}
            <div className="rounded-2xl border border-brand-200 dark:border-brand-800/50 bg-brand-50 dark:bg-brand-500/5 p-5">
              <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-brand-400">
                Effective Price
              </p>
              <p className="text-3xl font-bold text-brand-600 dark:text-brand-400">
                {formatPrice(product.effectivePrice)}
              </p>
              {product.basePrice > product.effectivePrice && (
                <p className="mt-1 text-xs text-brand-400 dark:text-brand-500">
                  Save {formatPrice(product.basePrice - product.effectivePrice)}
                </p>
              )}
            </div>

            {/* Discount */}
            <div className={`rounded-2xl border p-5 ${
              hasDiscount
                ? "border-orange-200 dark:border-orange-800/50 bg-orange-50 dark:bg-orange-500/5"
                : "border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03]"
            }`}>
              <p className={`mb-1 text-xs font-semibold uppercase tracking-wider ${hasDiscount ? "text-orange-400" : "text-gray-400"}`}>
                Discount
              </p>
              {hasDiscount ? (
                <>
                  <p className="text-3xl font-bold text-orange-600 dark:text-orange-400">
                    {product.discountType === "PERCENTAGE"
                      ? `${product.discountValue}%`
                      : formatPrice(product.discountValue!)}
                  </p>
                  <p className="mt-1 text-xs text-orange-400 dark:text-orange-500">
                    {product.discountType === "PERCENTAGE" ? "Percentage off" : "Fixed amount off"}
                  </p>
                </>
              ) : (
                <p className="text-2xl font-bold text-gray-300 dark:text-gray-600">No discount</p>
              )}
            </div>
          </div>

          {/* ── Product details ── */}
          <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03] p-6">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-400">
              Product Details
            </h2>
            <div className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4">
              <div>
                <p className="text-xs text-gray-400 dark:text-gray-500">Category ID</p>
                <p
                  className="mt-0.5 text-sm font-medium text-gray-700 dark:text-gray-200 font-mono truncate"
                  title={product.categoryId}
                >
                  {product.categoryId.slice(0, 8)}…
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-400 dark:text-gray-500">Refurbished</p>
                <p className="mt-0.5 text-sm font-medium text-gray-700 dark:text-gray-200">
                  {product.isRefurbished ? "Yes" : "No"}
                </p>
              </div>
              {product.isRefurbished && (
                <div>
                  <p className="text-xs text-gray-400 dark:text-gray-500">Refurb Grade</p>
                  <p className="mt-0.5 text-sm font-medium text-gray-700 dark:text-gray-200">
                    Grade {product.refurbGrade ?? "—"}
                  </p>
                </div>
              )}
              <div>
                <p className="text-xs text-gray-400 dark:text-gray-500">Accessories</p>
                <p className="mt-0.5 text-sm font-medium text-gray-700 dark:text-gray-200">
                  {product.accessoryIds.length > 0 ? `${product.accessoryIds.length} linked` : "None"}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-400 dark:text-gray-500">Product ID</p>
                <p className="mt-0.5 font-mono text-xs text-gray-500 dark:text-gray-400 break-all">
                  {product.id}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-400 dark:text-gray-500">Created</p>
                <p className="mt-0.5 text-sm font-medium text-gray-700 dark:text-gray-200">
                  {formatDate(product.createdAt)}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-400 dark:text-gray-500">Last Updated</p>
                <p className="mt-0.5 text-sm font-medium text-gray-700 dark:text-gray-200">
                  {formatDate(product.updatedAt)}
                </p>
              </div>
            </div>
          </div>

          {/* ── Specs ── */}
          {product.specs.length > 0 && (
            <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03] overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400">
                  Specifications
                </h2>
                <span className="inline-flex items-center justify-center rounded-full w-6 h-6 text-xs font-bold bg-brand-100 text-brand-700 dark:bg-brand-500/10 dark:text-brand-400">
                  {product.specs.length}
                </span>
              </div>
              <div className="divide-y divide-gray-100 dark:divide-gray-800">
                {product.specs.map((spec) => (
                  <div key={spec.id} className="px-6 py-4">
                    <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                      {spec.name}
                      <span className="ml-2 font-normal normal-case text-gray-400 dark:text-gray-500">
                        ({spec.code})
                      </span>
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {spec.options.map((opt) => (
                        <div
                          key={opt.id}
                          className="flex items-center gap-1.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-white/[0.03] px-3 py-1.5"
                        >
                          <span className="text-sm font-semibold text-gray-800 dark:text-white/90">
                            {opt.value}
                            {opt.unit && (
                              <span className="ml-0.5 text-xs font-normal text-gray-400 dark:text-gray-500">
                                {opt.unit}
                              </span>
                            )}
                          </span>
                          {opt.additionalPrice > 0 && (
                            <span className="text-xs text-orange-500 dark:text-orange-400 font-medium">
                              +{formatPrice(opt.additionalPrice)}
                            </span>
                          )}
                          {opt.additionalPrice === 0 && (
                            <span className="text-xs text-gray-400 dark:text-gray-500">
                              base
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Variants ── */}
          <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03] overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400">
                Variants
              </h2>
              <span className={`inline-flex items-center justify-center rounded-full w-6 h-6 text-xs font-bold ${
                product.variants.length > 0
                  ? "bg-brand-100 text-brand-700 dark:bg-brand-500/10 dark:text-brand-400"
                  : "bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-500"
              }`}>
                {product.variants.length}
              </span>
            </div>

            {product.variants.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-white/[0.02]">
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                        SKU
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                        Price
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                        Stock
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                        Spec Options
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                        Variant ID
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {product.variants.map((v) => (
                      <tr
                        key={v.id}
                        className="transition-colors hover:bg-gray-50 dark:hover:bg-white/[0.02]"
                      >
                        <td className="px-6 py-4 font-mono text-sm text-gray-700 dark:text-gray-300">
                          {v.sku}
                        </td>
                        <td className="px-6 py-4 text-right text-sm font-semibold text-gray-800 dark:text-white/90">
                          {formatPrice(v.price)}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                            v.stock > 10
                              ? "bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400"
                              : v.stock > 0
                              ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-500/10 dark:text-yellow-400"
                              : "bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400"
                          }`}>
                            <span className="inline-block w-1.5 h-1.5 rounded-full bg-current opacity-70" />
                            {v.stock} in stock
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right text-xs text-gray-400">
                          {v.specOptionIds.length > 0
                            ? `${v.specOptionIds.length} spec${v.specOptionIds.length !== 1 ? "s" : ""}`
                            : "—"}
                        </td>
                        <td className="px-6 py-4 text-right font-mono text-xs text-gray-400 dark:text-gray-500">
                          {v.id.slice(0, 8)}…
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-14 text-center">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" className="mb-3 text-gray-300 dark:text-gray-600">
                  <line x1="8" y1="6" x2="21" y2="6" />
                  <line x1="8" y1="12" x2="21" y2="12" />
                  <line x1="8" y1="18" x2="21" y2="18" />
                  <line x1="3" y1="6" x2="3.01" y2="6" />
                  <line x1="3" y1="12" x2="3.01" y2="12" />
                  <line x1="3" y1="18" x2="3.01" y2="18" />
                </svg>
                <p className="text-sm text-gray-400 dark:text-gray-500">
                  No variants for this product
                </p>
              </div>
            )}
          </div>

        </div>
      )}
    </>
  );
}
