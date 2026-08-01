import { useCallback, useEffect, useState } from "react";
import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import {
  erpService,
  type ErpConfig,
  type ErpProduct,
} from "../../api/services/erp.service";

const btn =
  "inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium transition disabled:opacity-50 disabled:cursor-not-allowed";
const btnPrimary = `${btn} bg-brand-600 text-white hover:bg-brand-700`;
const card = "rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900";

/** Strip HTML tags from an ERPNext description (Frappe stores rich text). */
function plainText(html: string | null): string {
  if (!html) return "";
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function ProductCard({ p }: { p: ErpProduct }) {
  return (
    <div className={`${card} flex flex-col gap-3`}>
      <div className="flex h-40 items-center justify-center overflow-hidden rounded-xl bg-gray-50 dark:bg-gray-900">
        {p.image ? (
          <img
            src={p.image}
            alt={p.itemName ?? p.name}
            className="h-full w-full object-contain"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = "none";
            }}
          />
        ) : (
          <span className="text-xs text-gray-400">No image</span>
        )}
      </div>

      <div className="space-y-1">
        <div className="flex items-start justify-between gap-2">
          <h4 className="font-semibold text-gray-800 dark:text-white">
            {p.itemName ?? p.name}
          </h4>
          {p.disabled ? (
            <span className="shrink-0 rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-semibold text-red-700 dark:bg-red-900/40 dark:text-red-300">
              disabled
            </span>
          ) : null}
        </div>
        <p className="font-mono text-xs text-gray-500 dark:text-gray-400">
          {p.itemCode ?? p.name}
        </p>
        {p.itemGroup ? (
          <p className="text-xs text-gray-500 dark:text-gray-400">{p.itemGroup}</p>
        ) : null}
        {p.description ? (
          <p className="line-clamp-2 text-sm text-gray-600 dark:text-gray-300">
            {plainText(p.description)}
          </p>
        ) : null}
      </div>

      <div className="mt-auto flex items-end justify-between">
        <span className="text-base font-semibold text-gray-900 dark:text-white">
          {p.standardRate != null ? p.standardRate.toLocaleString() : "—"}
        </span>
        {p.stockUom ? (
          <span className="text-xs text-gray-400">per {p.stockUom}</span>
        ) : null}
      </div>
    </div>
  );
}

export default function ErpPage() {
  const [config, setConfig] = useState<ErpConfig | null>(null);
  const [configErr, setConfigErr] = useState("");
  const [products, setProducts] = useState<ErpProduct[]>([]);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const enabled = config?.enabled ?? false;

  useEffect(() => {
    erpService.getConfig().then((res) => {
      if (!res.ok || !res.data) {
        setConfigErr(res.error ?? "Could not load ERP config");
        return;
      }
      setConfig(res.data);
    });
  }, []);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setErr("");
    try {
      const res = await erpService.getProducts(10);
      if (!res.ok || !res.data) {
        setErr(res.error ?? "Failed to fetch products from ERPNext");
        setProducts([]);
        return;
      }
      setProducts(res.data);
    } finally {
      setLoading(false);
    }
  }, []);

  // Auto-load once config confirms the module is enabled.
  useEffect(() => {
    if (enabled) fetchProducts();
  }, [enabled, fetchProducts]);

  return (
    <>
      <PageMeta title="ERP | Buyology" description="ERPNext product list (testing — no DB save)" />
      <PageBreadcrumb pageTitle="ERP" />

      <div className="mb-4 rounded-xl border border-blue-300 bg-blue-50 p-4 text-sm text-blue-800 dark:border-blue-800/60 dark:bg-blue-900/20 dark:text-blue-200">
        <b>ERPNext product test.</b> Products are fetched <b>live</b> from ERPNext and shown here
        only — nothing is saved to the Buyology database. SUPERADMIN only.
      </div>

      {configErr && (
        <div className="mb-4 rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-700 dark:border-red-800/60 dark:bg-red-900/20 dark:text-red-300">
          {configErr}
        </div>
      )}

      {config && !enabled && (
        <div className="mb-4 rounded-xl border border-orange-300 bg-orange-50 p-4 text-sm text-orange-800 dark:border-orange-800/60 dark:bg-orange-900/20 dark:text-orange-200">
          <b>Module is disabled.</b> Set <code className="font-mono">ERPNEXT_ENABLED=true</code> plus{" "}
          <code className="font-mono">ERPNEXT_BASE_URL</code>,{" "}
          <code className="font-mono">ERPNEXT_API_KEY</code> and{" "}
          <code className="font-mono">ERPNEXT_API_SECRET</code> in the backend environment and redeploy.
        </div>
      )}

      {/* Connection summary */}
      <div className={`${card} mb-4`}>
        <div className="grid gap-4 md:grid-cols-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Module</p>
            <p className="font-medium text-gray-800 dark:text-white">
              {enabled ? "Enabled" : "Disabled"}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Base URL</p>
            <p className="truncate font-medium text-gray-800 dark:text-white">
              {config?.baseUrl || "—"}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">API key</p>
            <p className="font-medium text-gray-800 dark:text-white">
              {config?.hasApiKey ? "Configured" : "Missing"}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">API secret</p>
            <p className="font-medium text-gray-800 dark:text-white">
              {config?.hasApiSecret ? "Configured" : "Missing"}
            </p>
          </div>
        </div>
      </div>

      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-base font-semibold text-gray-800 dark:text-white">
          Products from ERPNext {products.length > 0 ? `(${products.length})` : ""}
        </h3>
        <button className={btnPrimary} onClick={fetchProducts} disabled={!enabled || loading}>
          {loading ? "Loading…" : "Refresh"}
        </button>
      </div>

      {err && (
        <div className="mb-4 rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-700 dark:border-red-800/60 dark:bg-red-900/20 dark:text-red-300">
          {err}
        </div>
      )}

      {!loading && enabled && !err && products.length === 0 && (
        <div className={`${card} text-sm text-gray-500 dark:text-gray-400`}>
          No products returned from ERPNext.
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {products.map((p) => (
          <ProductCard key={p.name} p={p} />
        ))}
      </div>
    </>
  );
}
