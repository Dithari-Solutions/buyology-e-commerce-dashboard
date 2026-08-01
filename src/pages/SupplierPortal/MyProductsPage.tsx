import { useEffect, useState } from "react";
import { Link } from "react-router";
import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import { suppliersService, type SupplierProduct } from "../../api/services/suppliers.service";

const STATUS_COLORS: Record<string, string> = {
  PENDING_REVIEW: "bg-yellow-100 text-yellow-700",
  APPROVED: "bg-green-100 text-green-700",
  REJECTED: "bg-red-100 text-red-700",
};

const TABS = ["ALL", "PENDING_REVIEW", "APPROVED", "REJECTED"] as const;

export default function MyProductsPage() {
  const [products, setProducts] = useState<SupplierProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<(typeof TABS)[number]>("ALL");

  useEffect(() => {
    setLoading(true);
    suppliersService
      .getMyProducts(tab !== "ALL" ? { supplierStatus: tab } : undefined)
      .then((r) => setProducts(r.data?.content ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [tab]);

  return (
    <>
      <PageMeta title="My Products | Buyology Supplier" description="Your submitted products" />
      <PageBreadcrumb pageTitle="My Products" />

      <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2 flex-wrap">
            {TABS.map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`rounded-full px-4 py-1.5 text-xs font-medium transition-colors ${
                  tab === t
                    ? "bg-brand-600 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400"
                }`}
              >
                {t.replace(/_/g, " ")}
              </button>
            ))}
          </div>
          <Link
            to="/supplier/new-product"
            className="rounded-lg bg-brand-600 px-4 py-2 text-xs font-medium text-white hover:bg-brand-700"
          >
            + Add Product
          </Link>
        </div>

        {loading ? (
          <p className="text-sm text-gray-500">Loading…</p>
        ) : products.length === 0 ? (
          <div className="rounded-xl border-2 border-dashed border-gray-200 p-5 text-center dark:border-gray-700">
            <p className="text-gray-500 dark:text-gray-400 mb-3">No products yet.</p>
            <Link
              to="/supplier/new-product"
              className="inline-block rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
            >
              Submit your first product
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-800 text-left text-xs uppercase text-gray-500">
                  <th className="pb-3 pr-4">SKU</th>
                  <th className="pb-3 pr-4">Status</th>
                  <th className="pb-3 pr-4">Review Status</th>
                  <th className="pb-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {products.map((p) => (
                  <tr key={p.id}>
                    <td className="py-3 pr-4 font-mono text-gray-800 dark:text-gray-200 text-xs">
                      <Link to={`/supplier/products/${p.id}`} className="hover:text-brand-600 hover:underline">
                        {p.sku}
                      </Link>
                    </td>
                    <td className="py-3 pr-4 text-gray-600 dark:text-gray-400 text-xs">{p.status}</td>
                    <td className="py-3 pr-4">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          STATUS_COLORS[p.supplierStatus] ?? "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {p.supplierStatus?.replace(/_/g, " ")}
                      </span>
                      {p.supplierStatus === "REJECTED" && p.supplierRejectionReason && (
                        <p className="text-xs text-red-500 mt-0.5">{p.supplierRejectionReason}</p>
                      )}
                    </td>
                    <td className="py-3">
                      <Link
                        to={`/supplier/products/${p.id}`}
                        className="inline-block rounded-lg bg-gray-100 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
