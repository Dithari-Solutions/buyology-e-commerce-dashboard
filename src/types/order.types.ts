export type OrderStatus =
  // New admin-managed flow
  | "PENDING_PAYMENT"
  | "PAID"
  | "PACKAGING"
  | "READY_FOR_PICKUP"
  | "IN_COURIER"
  | "IN_TRANSIT"
  | "DELIVERED"
  | "CANCELLED"
  | "FAILED"
  // Legacy values (kept for historical orders)
  | "PENDING"
  | "PROCESSING"
  | "COURIER_ASSIGNED"
  | "PICKED_UP"
  | "SHIPPED"
  | "REFUNDED"
  | "EXPIRED";

export const ORDER_STATUS_BUCKETS = {
  // Waiting = not yet paid; Paid = payment received, ready to pack. Split out so admins
  // can tell unpaid orders apart from paid-and-actionable ones at a glance.
  waiting: ["PENDING_PAYMENT", "PENDING"] as OrderStatus[],
  paid: ["PAID"] as OrderStatus[],
  // Legacy combined pre-fulfilment bucket (waiting + paid) — kept for ActivePendingOrders.
  pending: ["PENDING_PAYMENT", "PAID"] as OrderStatus[],
  active: ["PACKAGING", "READY_FOR_PICKUP", "IN_COURIER", "IN_TRANSIT",
           "PROCESSING", "COURIER_ASSIGNED", "PICKED_UP", "SHIPPED"] as OrderStatus[],
  done: ["DELIVERED", "CANCELLED", "FAILED", "REFUNDED", "EXPIRED"] as OrderStatus[],
};

export type OrderBucket = keyof typeof ORDER_STATUS_BUCKETS;

export interface TrackingEvent {
  status: OrderStatus;
  timestamp: string;
  message?: string;
  location?: string;
}

export interface OrderItem {
  id: string;
  productId: string;
  productName: string;
  productImage?: string;
  variantId?: string;
  variantName?: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface OrderAdminResponse {
  id: string;
  orderNumber?: string;
  status: OrderStatus;
  storeId: string;
  storeName?: string;
  userId: string;
  
  // Recipient info from API
  recipientFirstName?: string;
  recipientLastName?: string;
  recipientPhone?: string;
  // Customer account details (who placed the order), from API
  customerFirstName?: string;
  customerLastName?: string;
  customerEmail?: string;
  customerPhone?: string;
  
  // Express/Courier specific
  carrierName?: string;
  courierName?: string;
  courierPhone?: string;
  pickupProofImageUrl?: string;
  pickupProofTakenAt?: string;
  deliveryProofImageUrl?: string;
  deliveryProofSignatureUrl?: string;
  deliveredTo?: string;
  deliveryProofTakenAt?: string;
  cancellationReason?: string;
  
  trackingHistory?: TrackingEvent[];
  items?: OrderItem[];
  
  totalAmount: number;
  currency: string;
  /** B2B credit applied to this order, in {@link creditCurrency}. */
  creditApplied?: number | null;
  creditCurrency?: string | null;
  deliveryMethod?: string;
  city?: string;
  country?: string;
  countryCode?: string;
  shippingAddress?: string;
  // Exact delivery pin (for courier routing)
  deliveryLatitude?: number | null;
  deliveryLongitude?: number | null;
  // Store pickup (deliveryMethod === "PICKUP")
  pickupStoreId?: string | null;
  pickupStoreName?: string | null;
  pickupStoreAddress?: string | null;
  billingAddress?: string;
  paymentMethod?: string;
  
  paidAt?: string;
  shippedAt?: string;
  deliveredAt?: string;
  cancelledAt?: string;
  createdAt: string;
  updatedAt: string;

  // Money breakdown (the page previously showed only totalAmount)
  subtotal?: number | null;
  shippingFee?: number | null;
  discount?: number | null;
  couponCode?: string | null;

  // Full address snapshot
  addressLine1?: string | null;
  addressLine2?: string | null;
  state?: string | null;
  postalCode?: string | null;

  // Carrier / tracking
  trackingCode?: string | null;
  estimatedDeliveryTime?: string | null;

  // Payment identity (admin-only): the settling transaction's method + masked card tail
  paymentTransactionId?: string | null;
  paymentMethodType?: string | null;
  cardLast4?: string | null;
  cardBrand?: string | null;

  // Quiqup dispatch operations — "did this order reach the carrier, and why not?"
  quiqupOrderId?: string | null;
  quiqupStatus?: string | null;
  quiqupDispatchedAt?: string | null;
  quiqupDispatchError?: string | null;
  quiqupCancelStatus?: string | null;
  quiqupCancelConfirmedAt?: string | null;
  quiqupCancelError?: string | null;
  cancelRefundInitiatedAt?: string | null;
}

export interface OrderListResponse {
  content: OrderAdminResponse[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}
