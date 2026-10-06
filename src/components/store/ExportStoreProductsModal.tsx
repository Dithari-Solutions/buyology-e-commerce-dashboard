import { useState } from "react";
import { Modal } from "../ui/modal";
import { storeProductsService, ApiRequestError } from "../../api";
import type { StoreProductExportFormat } from "../../api";

const labelCls = "block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1";

function Spinner() {
  return (
    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
    </svg>
  );
}


const EXPORT_FORMATS: {
  value: StoreProductExportFormat;
  label: string;
  extension: string;
  description: string;
}[] = [
  {
    value: "XLSX",
    label: "Excel",
    extension: "xlsx",
    description: "Spreadsheet with Products, Images and Variants sheets. Best for editing or importing.",
  },
  {
    value: "PDF",
    label: "PDF",
    extension: "pdf",
    description: "Printable catalogue, one card per product. Best for sharing or reading.",
  },
];

const EXPORT_FIELDS = [
  "Product name",
  "Description",
  "Price & sale price",
  "Product URL",
  "Image URLs (thumbnail marked)",
  "Availability & quantity",
  "Brand",
  "Category",
  "SKU",
  "Condition",
  "Status & channels",
  "Variants",
];

interface ExportStoreProductsModalProps {
  isOpen: boolean;
  onClose: () => void;
  storeId: string;
  productCount: number;
}

/**
 * Picks Excel or PDF and downloads every product in the store, via
 * GET /api/stores/{storeId}/products/export. Used by the store page's Products tab and by the
 * standalone store products page.
 */
export default function ExportStoreProductsModal({
  isOpen,
  onClose,
  storeId,
  productCount,
}: ExportStoreProductsModalProps) {
  const [format, setFormat] = useState<StoreProductExportFormat>("XLSX");
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleExport() {
    setExporting(true);
    setError(null);
    try {
      const blob = await storeProductsService.exportProducts(storeId, format);
      const extension = EXPORT_FORMATS.find((f) => f.value === format)!.extension;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `buyology-store-products-${new Date().toISOString().slice(0, 10)}.${extension}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
      onClose();
    } catch (err) {
      setError(err instanceof ApiRequestError && err.message ? err.message : "Could not export the products.");
    } finally {
      setExporting(false);
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-lg w-full">
      <div className="p-6 space-y-5">
        <div>
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Export Products</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Download all {productCount} product{productCount !== 1 ? "s" : ""} in this store.
          </p>
        </div>

        {/* Format */}
        <div>
          <span className={labelCls}>Format</span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" role="radiogroup" aria-label="Export format">
            {EXPORT_FORMATS.map((f) => {
              const selected = format === f.value;
              return (
                <button
                  key={f.value}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => setFormat(f.value)}
                  className={`rounded-xl border p-4 text-left transition-colors ${
                    selected
                      ? "border-brand-500 bg-brand-50 dark:bg-brand-500/10"
                      : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                  }`}
                >
                  <span className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-gray-800 dark:text-white">{f.label}</span>
                    <span className="font-mono text-xs text-gray-400">.{f.extension}</span>
                  </span>
                  <span className="mt-1 block text-xs text-gray-500 dark:text-gray-400">{f.description}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Included fields */}
        <div>
          <span className={labelCls}>Included fields</span>
          <div className="flex flex-wrap gap-1.5">
            {EXPORT_FIELDS.map((field) => (
              <span
                key={field}
                className="rounded-lg bg-gray-100 dark:bg-gray-800 px-2 py-1 text-xs text-gray-600 dark:text-gray-300"
              >
                {field}
              </span>
            ))}
          </div>
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleExport}
            disabled={exporting}
            className="flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-60 transition-colors"
          >
            {exporting && <Spinner />}
            {exporting ? "Exporting…" : "Export"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
