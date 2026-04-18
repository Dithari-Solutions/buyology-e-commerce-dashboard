export type OrderStatus =
  | "PAID"
  | "PENDING"
  | "PENDING_PAYMENT"
  | "PROCESSING"
  | "PICKED_UP"
  | "DELIVERED"
  | "CANCELLED"
  | "REFUNDED"
  | "EXPIRED"
  | "SHIPPED";

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
  
  trackingHistory?: TrackingEvent[];
  items?: OrderItem[];
  
  totalAmount: number;
  currency: string;
  deliveryMethod?: string;
  city?: string;
  country?: string;
  countryCode?: string;
  shippingAddress?: string;
  billingAddress?: string;
  paymentMethod?: string;
  
  paidAt?: string;
  deliveredAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface OrderListResponse {
  content: OrderAdminResponse[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}
