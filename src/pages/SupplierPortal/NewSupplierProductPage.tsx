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
  const [createdProductId, setCreatedProductId] = useState<string | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [uploadStatus, setUploadStatus] = useState<"idle" | "uploading" | "ok" | "fail">("idle");
  const [uploadMsg, setUploadMsg] = useState<string>("");

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
      const res = await suppliersService.submitProduct({
        categoryId,
        storeId,
        sku,
        storePrice: parseFloat(storePrice),
      });
      // Backend returns the created product UUID in `data` of the ApiResponse.
      const newId = (res?.data as string | undefined) ?? null;
      setCreatedProductId(newId);
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

          {createdProductId && (
            <div className="mx-auto max-w-md rounded-2xl border border-blue-200 bg-blue-50 p-5 text-left mb-6">
              <h3 className="text-sm font-semibold text-blue-900 mb-2">Add product images</h3>
              <p className="text-xs text-blue-800 mb-3">
                <strong>Required:</strong> Upload PNG or WebP images with the background <strong>removed</strong>.
                Max 5 MB per image, max 8 images. Images without a transparent background will be rejected.
              </p>
              <input
                type="file"
                accept="image/png,image/webp"
                multiple
                onChange={(e) => {
                  const list = e.target.files ? Array.from(e.target.files).slice(0, 8) : [];
                  setFiles(list);
                  setUploadStatus("idle");
                  setUploadMsg("");
                }}
                className="block w-full text-xs text-gray-700 file:mr-3 file:rounded-md file:border-0 file:bg-blue-600 file:px-3 file:py-1.5 file:text-white hover:file:bg-blue-700"
              />
              {files.length > 0 && (
                <p className="mt-2 text-xs text-blue-800">{files.length} file(s) selected</p>
              )}
              <button
                disabled={files.length === 0 || uploadStatus === "uploading"}
                onClick={async () => {
                  setUploadStatus("uploading");
                  setUploadMsg("");
                  try {
                    const res = await suppliersService.uploadProductImages(createdProductId, files);
                    setUploadStatus("ok");
                    setUploadMsg(`${res.data?.uploaded ?? 0} image(s) uploaded.`);
                  } catch (err: unknown) {
                    setUploadStatus("fail");
                    const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
                    setUploadMsg(msg || "Upload failed.");
                  }
                }}
                className="mt-3 rounded-md bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {uploadStatus === "uploading" ? "Uploading…" : "Upload images"}
              </button>
              {uploadMsg && (
                <p className={`mt-2 text-xs ${uploadStatus === "ok" ? "text-green-700" : "text-red-700"}`}>
                  {uploadMsg}
                </p>
              )}
            </div>
          )}

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

      <div className="max-w-xl rounded-2xl border border-yellow-300 bg-yellow-50 p-4 mb-4">
        <div className="flex items-start gap-2">
          <svg className="mt-0.5 h-4 w-4 flex-shrink-0 text-yellow-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M5.07 19h13.86c1.54 0 2.5-1.67 1.73-3L13.73 4a2 2 0 00-3.46 0L3.34 16c-.77 1.33.19 3 1.73 3z" />
          </svg>
          <div className="text-xs text-yellow-900">
            <strong>Image requirement:</strong> All product images must be PNG or WebP with the background <strong>removed</strong> (transparent). Images with a flat background or non-transparent PNGs will be rejected by the upload validator. Max 5 MB per image, max 8 images. After submitting the product details below, you&apos;ll be prompted to upload images.
          </div>
        </div>
      </div>

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
