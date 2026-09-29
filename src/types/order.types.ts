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

/**
 * One question the customer was asked while cancelling, with the answer they gave.
 *
 * The client sends the question and the answer as displayable English text rather than codes, so
 * this page can render a questionnaire it knows nothing about: a tenth cancellation reason added
 * in the apps needs no dashboard deploy and no label table here. {@link code} rides along only to
 * keep the data groupable for analytics, and is null for free-text answers.
 *
 * Every field is optional, but not unbounded. The backend cleans and caps each value before storing
 * it (control and bidi characters stripped, whitespace collapsed, question 300 chars, answer 600,
 * key and code 60, at most 12 answers) and drops any answer left blank — so nothing here can be
 * absurdly long or invisible-character laden. What it does NOT promise is presence: two clients
 * write this, an older build may omit a field a newer one sends, and the answers array may contain
 * keys this dashboard has never heard of. Hence optional everywhere and a fallback on render.
 */
export interface CancellationFeedbackAnswer {
  key?: string;
  question?: string;
  answer?: string;
  code?: string | null;
}

/**
 * The structured answers a customer gave when cancelling their own order.
 *
 * A second store next to {@link OrderAdminResponse.cancellationReason} because that column is
 * overloaded: it is also where an admin types their own reason, and it is rendered back to the
 * customer in their order timeline, so it can only hold one readable sentence — never answers
 * that can be grouped or counted. Absent on admin cancellations and on every order placed before
 * the questionnaire shipped.
 */
export interface CancellationFeedback {
  /** Schema version of the stored payload; 1 today. Not gated on — see CancellationFeedbackAnswer. */
  version?: number;
  /** Which app the customer cancelled from. */
  source?: "WEB" | "MOBILE" | null;
  /** Stable client code for the chosen reason. Opaque to the backend and to this dashboard. */
  reasonCode?: string | null;
  /** Stamped by the server on receipt, never taken from the client's clock. */
  submittedAt?: string | null;
  answers?: CancellationFeedbackAnswer[];
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
  /** The customer's own questionnaire answers, when they cancelled it themselves. */
  cancellationFeedback?: CancellationFeedback | null;
  
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
  /**
   * How the order is settled: ONLINE (before fulfilment) or CASH_ON_DELIVERY (at handover).
   *
   * Not the same thing as {@link paymentMethodType}, which is the gateway instrument (CARD,
   * TABBY, …) of the transaction that settled it. A cash order has no such transaction at all.
   */
  paymentMethod?: "ONLINE" | "CASH_ON_DELIVERY" | null;

  /**
   * Whether this order's money is actually in hand.
   *
   * Server-computed, because no combination of status and paidAt answers it from the client: a
   * cash order reaches DELIVERED while still owing the money, and never passes through PAID.
   */
  moneyCollected?: boolean | null;

  /** When an admin recorded the cash as collected. Null while a cash order still owes it. */
  codCollectedAt?: string | null;

  /** How much cash was taken, in the order's currency. */
  codCollectedAmount?: number | null;

  /** Tax charged on top of goods + delivery, already included in totalAmount. */
  vatAmount?: number | null;

  /** The rate applied — 5 means 5%. Null when the order carries no VAT. */
  vatRatePercent?: number | null;

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
  /** When the job was marked ready for collection — the moment a courier was summoned. */
  quiqupReleasedAt?: string | null;
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
