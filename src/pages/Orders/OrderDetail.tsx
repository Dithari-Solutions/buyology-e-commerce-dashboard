import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router";
import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import Badge from "../../components/ui/badge/Badge";
import { ordersService, ApiRequestError } from "../../api";
import type { OrderAdminResponse, OrderStatus } from "../../types";

function formatDate(iso: string): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

type BadgeColor = "success" | "error" | "warning" | "info" | "light";

function statusColor(status: OrderStatus): BadgeColor {
  switch (status) {
    case "DELIVERED":
      return "success";
    case "CANCELLED":
    case "REFUNDED":
    case "EXPIRED":
      return "error";
    case "PICKED_UP":
    case "SHIPPED":
    case "PROCESSING":
      return "info";
    case "PAID":
    case "PENDING":
      return "warning";
    default:
      return "light";
  }
}

export default function OrderDetail() {
  const { storeId, orderId } = useParams<{ storeId: string; orderId: string }>();
  const navigate = useNavigate();
  const [order, setOrder] = useState<OrderAdminResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOrder = useCallback((signal?: AbortSignal) => {
    if (!orderId) return;
    setLoading(true);
    setError(null);
    ordersService
      .getByIdWithProof(orderId, signal)
      .then((res) => setOrder(res.data))
      .catch((err: unknown) => {
        if (err instanceof Error && err.name === "AbortError") return;
        setError(err instanceof ApiRequestError ? err.message : "Failed to load order details.");
      })
      .finally(() => setLoading(false));
  }, [orderId]);

  useEffect(() => {
    const controller = new AbortController();
    fetchOrder(controller.signal);
    return () => controller.abort();
  }, [fetchOrder]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <p className="text-red-500 mb-4">{error || "Order not found."}</p>
        <button
          onClick={() => navigate(`/orders/${storeId}`)}
          className="text-brand-500 hover:underline"
        >
          Back to Orders
        </button>
      </div>
    );
  }

  return (
    <>
      <PageMeta
        title={`Order #${order.orderNumber || order.id.substring(0, 8)} | Buyology Dashboard`}
        description="View order details and chain of custody."
      />
      <PageBreadcrumb pageTitle="Order Details" />

      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(`/orders/${storeId}`)}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-gray-500 shadow-sm transition-colors hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-800 dark:text-white/90">
              Order #{order.orderNumber || order.id.substring(0, 8)}
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">Placed on {formatDate(order.createdAt)}</p>
          </div>
        </div>
        <Badge size="md" color={statusColor(order.status)}>
          {order.status}
        </Badge>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Order Items */}
          <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03] overflow-hidden">
            <div className="border-b border-gray-100 px-6 py-4 dark:border-gray-800">
              <h3 className="font-semibold text-gray-800 dark:text-white/90">Order Items</h3>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {order.items?.map((item) => (
                  <div key={item.id} className="flex items-center gap-4 border-b border-gray-50 pb-4 last:border-0 last:pb-0 dark:border-gray-800">
                    <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-800">
                      {item.productImage ? (
                        <img src={item.productImage} alt={item.productName} className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-gray-400">
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7" />
                            <circle cx="9" cy="9" r="2" />
                            <path d="M3 13l3-3a2 2 0 0 1 2.8 0L14 15" />
                            <path d="M12 13l2-2a2 2 0 0 1 2.8 0L21 16" />
                          </svg>
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-800 dark:text-white/90 truncate">{item.productName}</p>
                      {item.variantName && (
                        <p className="text-xs text-gray-500 dark:text-gray-400">{item.variantName}</p>
                      )}
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {order.currency} {item.unitPrice.toFixed(2)} x {item.quantity}
                      </p>
                    </div>
                    <p className="font-semibold text-gray-800 dark:text-white/90">
                      {order.currency} {item.totalPrice.toFixed(2)}
                    </p>
                  </div>
                ))}
              </div>

              <div className="mt-6 border-t border-gray-100 pt-4 dark:border-gray-800 space-y-2">
                <div className="flex justify-between text-sm text-gray-500 dark:text-gray-400">
                  <span>Subtotal</span>
                  <span>{order.currency} {order.totalAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-base font-bold text-gray-800 dark:text-white/90 pt-2">
                  <span>Total</span>
                  <span>{order.currency} {order.totalAmount.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Chain of Custody / Proofs */}
          <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03] overflow-hidden">
            <div className="border-b border-gray-100 px-6 py-4 dark:border-gray-800">
              <h3 className="font-semibold text-gray-800 dark:text-white/90">Chain of Custody</h3>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                {/* Pickup Proof */}
                <div className="rounded-xl border border-gray-100 bg-gray-50 p-4 dark:border-gray-800 dark:bg-white/[0.02]">
                  <h4 className="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-300">Package Collected from Store</h4>
                  {order.pickupProofImageUrl ? (
                    <div className="space-y-3">
                      <div className="aspect-video overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
                        <img src={order.pickupProofImageUrl} alt="Pickup Proof" className="h-full w-full object-cover" />
                      </div>
                      <p className="text-xs text-gray-500">Collected at: {formatDate(order.pickupProofTakenAt || "")}</p>
                    </div>
                  ) : (
                    <div className="flex h-32 flex-col items-center justify-center rounded-lg border border-dashed border-gray-300 dark:border-gray-700">
                      <p className="text-xs text-gray-400">No pickup proof available</p>
                    </div>
                  )}
                </div>

                {/* Delivery Proof */}
                <div className="rounded-xl border border-gray-100 bg-gray-50 p-4 dark:border-gray-800 dark:bg-white/[0.02]">
                  <h4 className="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-300">Drop-off Proof</h4>
                  {order.deliveryProofImageUrl ? (
                    <div className="space-y-3">
                      <div className="aspect-video overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
                        <img src={order.deliveryProofImageUrl} alt="Delivery Proof" className="h-full w-full object-cover" />
                      </div>
                      {order.deliveredTo && (
                        <p className="text-xs font-medium text-gray-700 dark:text-gray-300">Received by: {order.deliveredTo}</p>
                      )}
                      <p className="text-xs text-gray-500">Delivered at: {formatDate(order.deliveryProofTakenAt || "")}</p>
                      {order.deliveryProofSignatureUrl && (
                        <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                          <p className="text-[10px] text-gray-400 uppercase mb-1">Signature</p>
                          <img src={order.deliveryProofSignatureUrl} alt="Signature" className="h-12 object-contain" />
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex h-32 flex-col items-center justify-center rounded-lg border border-dashed border-gray-300 dark:border-gray-700">
                      <p className="text-xs text-gray-400">No delivery proof available</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar Info */}
        <div className="space-y-6">
          {/* Status & Courier */}
          <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
            <h3 className="mb-4 font-semibold text-gray-800 dark:text-white/90">Fulfillment Info</h3>
            <div className="space-y-4">
              <div>
                <p className="text-xs text-gray-400 uppercase mb-1">Store ID</p>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{order.storeId}</p>
              </div>
              {order.courierName && (
                <div>
                  <p className="text-xs text-gray-400 uppercase mb-1">Courier</p>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{order.courierName}</p>
                  {order.courierPhone && (
                    <p className="text-xs text-gray-500">{order.courierPhone}</p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Customer Info */}
          <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
            <h3 className="mb-4 font-semibold text-gray-800 dark:text-white/90">Customer Details</h3>
            <div className="space-y-4">
              <div>
                <p className="text-xs text-gray-400 uppercase mb-1">Name</p>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{order.customerName}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 uppercase mb-1">Email</p>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{order.customerEmail}</p>
              </div>
              {order.shippingAddress && (
                <div>
                  <p className="text-xs text-gray-400 uppercase mb-1">Shipping Address</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{order.shippingAddress}</p>
                </div>
              )}
            </div>
          </div>

          {/* Tracking History */}
          <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
            <h3 className="mb-4 font-semibold text-gray-800 dark:text-white/90">Tracking History</h3>
            <div className="relative space-y-6 before:absolute before:left-[11px] before:top-2 before:h-[calc(100%-16px)] before:w-0.5 before:bg-gray-100 dark:before:bg-gray-800">
              {order.trackingHistory?.map((event, idx) => (
                <div key={idx} className="relative pl-8">
                  <div className={`absolute left-0 top-1.5 h-6 w-6 rounded-full border-4 border-white dark:border-gray-900 bg-gray-200 dark:bg-gray-700 ${idx === 0 ? "bg-brand-500" : ""}`} />
                  <p className="text-sm font-semibold text-gray-800 dark:text-white/90">{event.status}</p>
                  <p className="text-xs text-gray-500">{formatDate(event.timestamp)}</p>
                  {event.message && (
                    <p className="mt-1 text-xs text-gray-400">{event.message}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
