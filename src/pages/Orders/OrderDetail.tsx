import { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router";
import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import Badge from "../../components/ui/badge/Badge";
import { ordersService, ApiRequestError } from "../../api";
import { courierProfilesService, type CourierProfile } from "../../api/services/courierProfiles.service";
import type { OrderAdminResponse, OrderStatus } from "../../types";

// Status transitions allowed from each current status (must mirror backend validateTransition).
// Pickup orders branch to READY_FOR_PICKUP after packaging; delivery orders go to a courier.
function nextStatuses(order: OrderAdminResponse): OrderStatus[] {
  const isPickup = order.deliveryMethod === "PICKUP";
  switch (order.status) {
    case "PAID":             return ["PACKAGING", "CANCELLED"];
    case "PACKAGING":        return isPickup ? ["READY_FOR_PICKUP", "CANCELLED"] : ["IN_COURIER", "CANCELLED"];
    case "READY_FOR_PICKUP": return ["DELIVERED", "CANCELLED", "FAILED"];
    case "IN_COURIER":       return ["IN_TRANSIT", "CANCELLED", "FAILED"];
    case "IN_TRANSIT":       return ["DELIVERED", "FAILED", "CANCELLED"];
    default:                 return [];
  }
}

const STATUS_LABELS: Record<string, string> = {
  PENDING_PAYMENT: "Awaiting payment",
  PAID: "Paid",
  PACKAGING: "Packaging your order",
  READY_FOR_PICKUP: "Ready for pickup",
  IN_COURIER: "Handed to courier",
  IN_TRANSIT: "On the way",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
  FAILED: "Failed",
};

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
    case "FAILED":
    case "REFUNDED":
    case "EXPIRED":
      return "error";
    case "READY_FOR_PICKUP":
    case "PACKAGING":
    case "IN_COURIER":
    case "IN_TRANSIT":
    case "PICKED_UP":
    case "SHIPPED":
    case "PROCESSING":
    case "COURIER_ASSIGNED":
      return "info";
    case "PAID":
    case "PENDING":
    case "PENDING_PAYMENT":
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

  const [busy, setBusy] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [cancellationReason, setCancellationReason] = useState("");
  const pickupInputRef = useRef<HTMLInputElement>(null);
  const dropoffInputRef = useRef<HTMLInputElement>(null);

  // Courier assignment (per-store couriers)
  const [couriers, setCouriers] = useState<CourierProfile[]>([]);
  const [selectedCourierId, setSelectedCourierId] = useState("");

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

  // Load this order's store couriers for the assign-courier picker.
  useEffect(() => {
    if (!order?.storeId) return;
    const ctrl = new AbortController();
    courierProfilesService
      .listByStore(order.storeId, true, ctrl.signal)
      .then((r) => setCouriers(r.data ?? []))
      .catch(() => setCouriers([]));
    return () => ctrl.abort();
  }, [order?.storeId]);

  async function handleAssignCourier() {
    if (!orderId || !selectedCourierId) return;
    setBusy("assign-courier");
    setActionError(null);
    try {
      const res = await ordersService.assignCourier(orderId, selectedCourierId);
      setOrder(res.data);
      setSelectedCourierId("");
    } catch (err) {
      setActionError(err instanceof ApiRequestError ? err.message : "Failed to assign courier.");
    } finally {
      setBusy(null);
    }
  }

  const handleStatusChange = useCallback(async (next: OrderStatus) => {
    if (!orderId) return;
    if (next === "CANCELLED" && !cancellationReason.trim()) {
      setActionError("Please provide a cancellation reason.");
      return;
    }
    setBusy(`status:${next}`);
    setActionError(null);
    try {
      const res = await ordersService.updateStatus(orderId, {
        status: next,
        cancellationReason: next === "CANCELLED" ? cancellationReason.trim() : undefined,
      });
      setOrder(res.data);
      setCancellationReason("");
    } catch (err) {
      setActionError(err instanceof ApiRequestError ? err.message : "Failed to update status.");
    } finally {
      setBusy(null);
    }
  }, [orderId, cancellationReason]);

  const handleProofUpload = useCallback(async (type: "PICKUP" | "DROPOFF", file: File) => {
    if (!orderId) return;
    setBusy(`upload:${type}`);
    setActionError(null);
    try {
      const res = await ordersService.uploadProof(orderId, type, file);
      setOrder(res.data);
    } catch (err) {
      setActionError(err instanceof ApiRequestError ? err.message : "Failed to upload image.");
    } finally {
      setBusy(null);
    }
  }, [orderId]);

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
                  <div
                    key={item.id}
                    onClick={() => item.productId && navigate(`/products/${item.productId}`)}
                    role={item.productId ? "button" : undefined}
                    tabIndex={item.productId ? 0 : undefined}
                    onKeyDown={(e) => {
                      if (item.productId && (e.key === "Enter" || e.key === " ")) {
                        e.preventDefault();
                        navigate(`/products/${item.productId}`);
                      }
                    }}
                    className={`flex items-center gap-4 border-b border-gray-50 pb-4 last:border-0 last:pb-0 dark:border-gray-800 -mx-2 rounded-lg px-2 transition-colors ${
                      item.productId ? "cursor-pointer hover:bg-gray-50 dark:hover:bg-white/[0.03]" : ""
                    }`}
                  >
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
                {order.creditApplied != null && order.creditApplied > 0 && (
                  <div className="flex justify-between text-sm text-purple-700 dark:text-purple-400">
                    <span>B2B credit applied</span>
                    <span>− {order.creditCurrency ?? order.currency} {order.creditApplied.toFixed(2)}</span>
                  </div>
                )}
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
          {/* Status Management */}
          <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
            <h3 className="mb-4 font-semibold text-gray-800 dark:text-white/90">Update Status</h3>
            <p className="mb-3 text-xs text-gray-500">
              Current: <span className="font-medium">{STATUS_LABELS[order.status] ?? order.status}</span>
            </p>
            {nextStatuses(order).length === 0 && (
              <p className="text-xs text-gray-400">This order is in a final state. No further actions.</p>
            )}
            <div className="flex flex-wrap gap-2">
              {nextStatuses(order).map((next) => (
                <button
                  key={next}
                  type="button"
                  onClick={() => handleStatusChange(next)}
                  disabled={busy !== null}
                  className={`rounded-lg px-3 py-2 text-xs font-medium transition-colors disabled:opacity-50 ${
                    next === "CANCELLED" || next === "FAILED"
                      ? "bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-500/10 dark:text-red-300"
                      : "bg-brand-50 text-brand-600 hover:bg-brand-100 dark:bg-brand-500/10 dark:text-brand-300"
                  }`}
                >
                  {busy === `status:${next}` ? "Updating…" : STATUS_LABELS[next] ?? next}
                </button>
              ))}
            </div>
            {nextStatuses(order).includes("CANCELLED") && (
              <textarea
                value={cancellationReason}
                onChange={(e) => setCancellationReason(e.target.value)}
                placeholder="Cancellation reason (required when cancelling)"
                rows={2}
                className="mt-3 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
              />
            )}
            {order.cancellationReason && (
              <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700 dark:bg-red-500/10 dark:text-red-300">
                <span className="font-semibold">Cancellation reason:</span> {order.cancellationReason}
              </p>
            )}
            {actionError && (
              <p className="mt-3 text-xs text-red-500">{actionError}</p>
            )}
          </div>

          {/* Proof uploads */}
          <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
            <h3 className="mb-4 font-semibold text-gray-800 dark:text-white/90">Upload Proof Photos</h3>
            <div className="space-y-3">
              <input
                ref={pickupInputRef}
                type="file"
                accept="image/*"
                hidden
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleProofUpload("PICKUP", f);
                  e.target.value = "";
                }}
              />
              <button
                type="button"
                onClick={() => pickupInputRef.current?.click()}
                disabled={busy !== null}
                className="w-full rounded-lg border border-dashed border-gray-300 px-3 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/[0.03]"
              >
                {busy === "upload:PICKUP" ? "Uploading…" : order.pickupProofImageUrl ? "Replace pickup photo" : "Upload pickup photo"}
              </button>

              <input
                ref={dropoffInputRef}
                type="file"
                accept="image/*"
                hidden
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleProofUpload("DROPOFF", f);
                  e.target.value = "";
                }}
              />
              <button
                type="button"
                onClick={() => dropoffInputRef.current?.click()}
                disabled={busy !== null}
                className="w-full rounded-lg border border-dashed border-gray-300 px-3 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/[0.03]"
              >
                {busy === "upload:DROPOFF" ? "Uploading…" : order.deliveryProofImageUrl ? "Replace drop-off photo" : "Upload drop-off photo"}
              </button>
            </div>
          </div>

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

              {/* Assign a store courier — only while the order is in a fulfilment state */}
              {(["PAID", "PACKAGING", "IN_COURIER"] as OrderStatus[]).includes(order.status) && (
              <div>
                <p className="text-xs text-gray-400 uppercase mb-1">
                  {order.courierName ? "Reassign courier" : "Assign courier"}
                </p>
                {couriers.length === 0 ? (
                  <p className="text-xs text-gray-400">
                    No active couriers for this store. Add them in Store Couriers.
                  </p>
                ) : (
                  <div className="flex gap-2">
                    <select
                      value={selectedCourierId}
                      onChange={(e) => setSelectedCourierId(e.target.value)}
                      className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                    >
                      <option value="">Select courier…</option>
                      {couriers.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.firstName} {c.lastName ?? ""} · {c.phone}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={handleAssignCourier}
                      disabled={!selectedCourierId || busy === "assign-courier"}
                      className="rounded-lg bg-brand-600 px-3 py-2 text-xs font-medium text-white hover:bg-brand-700 disabled:opacity-50"
                    >
                      {busy === "assign-courier" ? "…" : "Assign"}
                    </button>
                  </div>
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
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {[order.customerFirstName ?? order.recipientFirstName, order.customerLastName ?? order.recipientLastName]
                    .filter(Boolean)
                    .join(" ") || "No Name Provided"}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-400 uppercase mb-1">Email</p>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{order.customerEmail || "No Email Provided"}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 uppercase mb-1">Phone</p>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {order.customerPhone || order.recipientPhone || "No Phone Provided"}
                </p>
              </div>
              {order.deliveryMethod === "PICKUP" ? (
                <div>
                  <p className="text-xs text-gray-400 uppercase mb-1">Pickup Store</p>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {order.pickupStoreName || "Store pickup"}
                  </p>
                  {order.pickupStoreAddress && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">{order.pickupStoreAddress}</p>
                  )}
                </div>
              ) : (
                (order.shippingAddress || order.city) && (
                  <div>
                    <p className="text-xs text-gray-400 uppercase mb-1">Shipping Address</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {order.shippingAddress || `${order.city || ""}, ${order.country || ""}`}
                    </p>
                    {order.deliveryLatitude != null && order.deliveryLongitude != null && (
                      <a
                        href={`https://www.google.com/maps?q=${order.deliveryLatitude},${order.deliveryLongitude}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-brand-500 hover:underline"
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" /><circle cx="12" cy="10" r="3" />
                        </svg>
                        {order.deliveryLatitude.toFixed(5)}, {order.deliveryLongitude.toFixed(5)} · Open in Maps
                      </a>
                    )}
                  </div>
                )
              )}
              {order.deliveryMethod && (
                <div>
                  <p className="text-xs text-gray-400 uppercase mb-1">Delivery Method</p>
                  <Badge size="sm" color={order.deliveryMethod === "EXPRESS" ? "success" : order.deliveryMethod === "PICKUP" ? "warning" : "info"}>
                    {order.deliveryMethod === "EXPRESS"
                      ? "Quick delivery"
                      : order.deliveryMethod === "REGULAR"
                        ? "Regular"
                        : order.deliveryMethod === "PICKUP"
                          ? "Store pickup"
                          : order.deliveryMethod}
                  </Badge>
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
