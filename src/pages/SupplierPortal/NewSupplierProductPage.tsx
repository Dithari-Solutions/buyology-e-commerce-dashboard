import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import { suppliersService } from "../../api/services/suppliers.service";
import { categoriesService } from "../../api/services/categories.service";
import type { Category } from "../../types/category.types";

interface AssignedStore {
  id: string;
  name?: string;
}

export default function NewSupplierProductPage() {
  const navigate = useNavigate();

  const [categories, setCategories] = useState<Category[]>([]);
  const [stores, setStores] = useState<AssignedStore[]>([]);
  const [categoryId, setCategoryId] = useState("");
  const [storeId, setStoreId] = useState("");
  const [sku, setSku] = useState("");
  const [storePrice, setStorePrice] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const ctrl = new AbortController();
    categoriesService.getAll("EN", ctrl.signal).then((r) => setCategories(r.data ?? [])).catch(() => {});
    suppliersService.getAssignedStores().then((r) => setStores((r.data ?? []) as AssignedStore[])).catch(() => {});
    return () => ctrl.abort();
  }, []);

  function validate() {
    const e: Record<string, string> = {};
    if (!categoryId) e.categoryId = "Category is required";
    if (!storeId) e.storeId = "Store is required";
    if (!sku.trim()) e.sku = "SKU is required";
    const price = parseFloat(storePrice);
    if (!storePrice || isNaN(price) || price <= 0) e.storePrice = "Valid price is required";
    return e;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});
    setLoading(true);
    try {
      await suppliersService.submitProduct({
        categoryId,
        storeId,
        sku,
        storePrice: parseFloat(storePrice),
      });
      setSuccess(true);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setErrors({ general: msg || "Failed to submit product. Please try again." });
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-7 h-7 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Product Submitted!</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
            Your product is under review. You'll be notified by email once it's approved.
          </p>
          <button
            onClick={() => navigate("/supplier/my-products")}
            className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            View My Products
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <PageMeta title="Submit New Product | Buyology Supplier" description="Submit a product for review" />
      <PageBreadcrumb pageTitle="Submit New Product" />

      <div className="max-w-xl rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Category *
            </label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select a category</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            {errors.categoryId && <p className="text-red-500 text-xs mt-1">{errors.categoryId}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Store *
            </label>
            <select
              value={storeId}
              onChange={(e) => setStoreId(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select an assigned store</option>
              {stores.map((s) => (
                <option key={s.id} value={s.id}>{s.name ?? s.id}</option>
              ))}
            </select>
            {errors.storeId && <p className="text-red-500 text-xs mt-1">{errors.storeId}</p>}
            {stores.length === 0 && (
              <p className="text-xs text-gray-400 mt-1">No stores assigned yet. Contact your account manager.</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              SKU *
            </label>
            <input
              value={sku}
              onChange={(e) => setSku(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g. APPLE-IP15-BLK-128"
            />
            {errors.sku && <p className="text-red-500 text-xs mt-1">{errors.sku}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Your Price *
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={storePrice}
              onChange={(e) => setStorePrice(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="0.00"
            />
            {errors.storePrice && <p className="text-red-500 text-xs mt-1">{errors.storePrice}</p>}
          </div>

          {errors.general && <p className="text-red-500 text-sm">{errors.general}</p>}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => navigate("/supplier/my-products")}
              className="flex-1 rounded-lg border border-gray-300 py-2 text-sm text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-400"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 rounded-lg bg-blue-600 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? "Submitting…" : "Submit for Review"}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
