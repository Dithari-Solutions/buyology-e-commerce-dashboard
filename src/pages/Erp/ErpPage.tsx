import { useCallback, useEffect, useState } from "react";
import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import {
  erpService,
  type ErpConfig,
  type ErpProduct,
  type ErpOrderSync,
} from "../../api/services/erp.service";

type Tab = "products" | "orders";

const btn =
  "inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium transition disabled:opacity-50 disabled:cursor-not-allowed";
const btnPrimary = `${btn} bg-brand-500 text-white hover:bg-brand-600`;
const btnGhost = `${btn} border border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-white/[0.05]`;
const card = "rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]";

/** Strip HTML tags from an ERPNext description (Frappe stores rich text). */
function plainText(html: string | null): string {
  if (!html) return "";
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function ProductCard({ p }: { p: ErpProduct }) {
  return (
    <div className={`${card} flex flex-col gap-3`}>
      <div className="flex h-40 items-center justify-center overflow-hidden rounded-xl bg-gray-50 dark:bg-white/[0.02]">
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
        <span className="text-lg font-semibold text-gray-900 dark:text-white">
          {p.standardRate != null ? p.standardRate.toLocaleString() : "—"}
        </span>
        {p.stockUom ? (
          <span className="text-xs text-gray-400">per {p.stockUom}</span>
        ) : null}
      </div>
    </div>
  );
}

/** Orders tab — shows what was pushed to ERPNext for each recent order. */
function OrdersTab({ enabled }: { enabled: boolean }) {
  const [orders, setOrders] = useState<ErpOrderSync[]>([]);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState<string | null>(null);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setErr("");
    try {
      const res = await erpService.getOrders(20);
      if (!res.ok || !res.data) {
        setErr(res.error ?? "Failed to load orders");
        setOrders([]);
        return;
      }
      setOrders(res.data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const syncOne = async (orderId: string) => {
    setSyncing(orderId);
    setErr("");
    try {
      const res = await erpService.syncOrder(orderId);
      if (!res.ok) setErr(res.error ?? "Sync failed");
      await fetchOrders();
    } finally {
      setSyncing(null);
    }
  };

  return (
    <>
      <div className="mb-5 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white">
          Order sync {orders.length > 0 ? `(${orders.length})` : ""}
        </h3>
        <button className={btnPrimary} onClick={fetchOrders} disabled={loading}>
          {loading ? "Loading…" : "Refresh"}
        </button>
      </div>

      {err && (
        <div className="mb-5 rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-700 dark:border-red-800/60 dark:bg-red-900/20 dark:text-red-300">
          {err}
        </div>
      )}

      <div className={`${card} overflow-x-auto p-0`}>
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead className="border-b border-gray-200 text-xs uppercase tracking-wide text-gray-500 dark:border-gray-800 dark:text-gray-400">
            <tr>
              <th className="p-4">Order</th>
              <th className="p-4">Status</th>
              <th className="p-4">Total</th>
              <th className="p-4">Sales Order</th>
              <th className="p-4">Sales Invoice</th>
              <th className="p-4">ERP state</th>
              <th className="p-4"></th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.orderId} className="border-b border-gray-100 last:border-0 dark:border-gray-800">
                <td className="p-4 font-mono text-xs text-gray-600 dark:text-gray-300">
                  {o.orderId.slice(0, 8)}…
                </td>
                <td className="p-4 text-gray-700 dark:text-gray-200">{o.status ?? "—"}</td>
                <td className="p-4 text-gray-700 dark:text-gray-200">
                  {o.totalAmount != null ? `${o.totalAmount} ${o.currency ?? ""}` : "—"}
                </td>
                <td className="p-4">
                  {o.erpSalesOrder ? (
                    <a
                      className="text-brand-500 hover:underline"
                      href={o.salesOrderUrl ?? undefined}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {o.erpSalesOrder}
                    </a>
                  ) : (
                    <span className="text-gray-400">—</span>
                  )}
                </td>
                <td className="p-4">
                  {o.erpSalesInvoice ? (
                    <a
                      className="text-brand-500 hover:underline"
                      href={o.salesInvoiceUrl ?? undefined}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {o.erpSalesInvoice}
                    </a>
                  ) : (
                    <span className="text-gray-400">—</span>
                  )}
                </td>
                <td className="p-4">
                  {o.erpSyncedAt ? (
                    <span className="rounded-full bg-green-100 px-2 py-0.5 text-[11px] font-semibold text-green-700 dark:bg-green-900/40 dark:text-green-300">
                      synced
                    </span>
                  ) : o.erpSyncError ? (
                    <span
                      title={o.erpSyncError}
                      className="rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-semibold text-red-700 dark:bg-red-900/40 dark:text-red-300"
                    >
                      failed
                    </span>
                  ) : (
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-semibold text-gray-600 dark:bg-white/10 dark:text-gray-300">
                      not synced
                    </span>
                  )}
                </td>
                <td className="p-4 text-right">
                  <button
                    className={btnGhost}
                    disabled={!enabled || syncing === o.orderId}
                    onClick={() => syncOne(o.orderId)}
                  >
                    {syncing === o.orderId ? "Syncing…" : o.erpSalesInvoice ? "Re-check" : "Sync now"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {!loading && orders.length === 0 && (
          <p className="p-5 text-sm text-gray-500 dark:text-gray-400">No orders yet.</p>
        )}
      </div>

      {orders.some((o) => o.erpSyncError) && (
        <div className="mt-5 space-y-2">
          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-200">Sync errors</h4>
          {orders
            .filter((o) => o.erpSyncError)
            .map((o) => (
              <div
                key={o.orderId}
                className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700 dark:border-red-800/60 dark:bg-red-900/20 dark:text-red-300"
              >
                <span className="font-mono">{o.orderId.slice(0, 8)}…</span> — {o.erpSyncError}
              </div>
            ))}
        </div>
      )}
    </>
  );
}

export default function ErpPage() {
  const [tab, setTab] = useState<Tab>("products");
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
      <PageMeta title="ERP | Buyology" description="ERPNext products and order sync" />
      <PageBreadcrumb pageTitle="ERP" />

      <div className="mb-5 rounded-xl border border-blue-300 bg-blue-50 p-4 text-sm text-blue-800 dark:border-blue-800/60 dark:bg-blue-900/20 dark:text-blue-200">
        <b>ERPNext integration.</b> Products are fetched <b>live</b> from ERPNext for display only
        (nothing saved locally). Paid orders are pushed to ERPNext as a Sales Order + Sales Invoice
        in the background — a failed push never affects the order or the payment. SUPERADMIN only.
      </div>

      {configErr && (
        <div className="mb-5 rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-700 dark:border-red-800/60 dark:bg-red-900/20 dark:text-red-300">
          {configErr}
        </div>
      )}

      {config && !enabled && (
        <div className="mb-5 rounded-xl border border-orange-300 bg-orange-50 p-4 text-sm text-orange-800 dark:border-orange-800/60 dark:bg-orange-900/20 dark:text-orange-200">
          <b>Module is disabled.</b> Set <code className="font-mono">ERPNEXT_ENABLED=true</code> plus{" "}
          <code className="font-mono">ERPNEXT_BASE_URL</code>,{" "}
          <code className="font-mono">ERPNEXT_API_KEY</code> and{" "}
          <code className="font-mono">ERPNEXT_API_SECRET</code> in the backend environment and redeploy.
        </div>
      )}

      {/* Connection summary */}
      <div className={`${card} mb-5`}>
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
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Order sync</p>
            <p className="font-medium text-gray-800 dark:text-white">
              {config?.syncOrders ? "On" : "Off"}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Documents</p>
            <p className="font-medium text-gray-800 dark:text-white">
              {config?.submitDocuments ? "Submitted" : "Draft"}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Company</p>
            <p className="truncate font-medium text-gray-800 dark:text-white">
              {config?.company || "ERPNext default"}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Shipping account</p>
            <p className="truncate font-medium text-gray-800 dark:text-white">
              {config?.shippingAccountHead || "Not set (excluded)"}
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-5 flex gap-2 border-b border-gray-200 dark:border-gray-800">
        {(["products", "orders"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium capitalize transition ${
              tab === t
                ? "border-brand-500 text-brand-500"
                : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            }`}
          >
            {t === "products" ? "Products" : "Order sync"}
          </button>
        ))}
      </div>

      {tab === "orders" && <OrdersTab enabled={enabled} />}

      {tab === "products" && (
        <>
          <div className="mb-5 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white">
              Products from ERPNext {products.length > 0 ? `(${products.length})` : ""}
            </h3>
            <button className={btnPrimary} onClick={fetchProducts} disabled={!enabled || loading}>
              {loading ? "Loading…" : "Refresh"}
            </button>
          </div>

          {err && (
            <div className="mb-5 rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-700 dark:border-red-800/60 dark:bg-red-900/20 dark:text-red-300">
              {err}
            </div>
          )}

          {!loading && enabled && !err && products.length === 0 && (
            <div className={`${card} text-sm text-gray-500 dark:text-gray-400`}>
              No products returned from ERPNext.
            </div>
          )}

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {products.map((p) => (
              <ProductCard key={p.name} p={p} />
            ))}
          </div>
        </>
      )}
    </>
  );
}
