import { useEffect, useState } from "react";
import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import { suppliersService } from "../../api/services/suppliers.service";

interface ReviewRow {
  id?: string;
  rating?: number;
  body?: string;
  createdAt?: string;
  productId?: string;
  product?: { id?: string };
  user?: { id?: string };
}

export default function SupplierReviewsPage() {
  const [summary, setSummary] = useState<{
    totalReviews: number;
    averageRating: number;
    productCount: number;
  } | null>(null);
  const [reviews, setReviews] = useState<ReviewRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      suppliersService.getReviewsSummary(),
      suppliersService.listMyReviews({ size: 50 }),
    ])
      .then(([s, r]) => {
        setSummary(s.data ?? null);
        const content = (r.data as { content?: ReviewRow[] } | undefined)?.content ?? [];
        setReviews(content);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <PageMeta title="My Reviews" description="Reviews on your products" />
      <PageBreadcrumb pageTitle="Reviews" />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
          <div className="text-xs uppercase tracking-wide text-gray-500">Total reviews</div>
          <div className="mt-2 text-3xl font-semibold">{summary?.totalReviews ?? 0}</div>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
          <div className="text-xs uppercase tracking-wide text-gray-500">Average rating</div>
          <div className="mt-2 text-3xl font-semibold">
            {summary?.averageRating != null ? Number(summary.averageRating).toFixed(2) : "—"}
            <span className="ml-1 text-base text-gray-500">/ 5</span>
          </div>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
          <div className="text-xs uppercase tracking-wide text-gray-500">Products with reviews</div>
          <div className="mt-2 text-3xl font-semibold">{summary?.productCount ?? 0}</div>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
        <h3 className="mb-4 text-base font-semibold">Recent reviews</h3>
        {loading ? (
          <div className="py-6 text-center text-gray-500">Loading…</div>
        ) : reviews.length === 0 ? (
          <div className="py-6 text-center text-gray-500">No reviews yet</div>
        ) : (
          <ul className="space-y-3">
            {reviews.map((r, i) => (
              <li
                key={r.id ?? i}
                className="rounded-md border border-gray-100 px-4 py-3 dark:border-gray-800"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">
                    {"★".repeat(r.rating ?? 0)}
                    {"☆".repeat(5 - (r.rating ?? 0))}
                  </span>
                  <span className="text-xs text-gray-500">
                    {r.createdAt ? new Date(r.createdAt).toLocaleDateString() : ""}
                  </span>
                </div>
                {r.body && <p className="mt-1 text-sm text-gray-700 dark:text-gray-300">{r.body}</p>}
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
