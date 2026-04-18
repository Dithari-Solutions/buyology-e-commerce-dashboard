export type OrderStatus =
  | "PAID"
  | "PENDING"
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
  orderNumber: string;
  status: OrderStatus;
  storeId: string;
  storeName?: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  
  // Express/Courier specific
  courierName?: string;
  courierPhone?: string;
  pickupProofImageUrl?: string;
  pickupProofTakenAt?: string;
  deliveryProofImageUrl?: string;
  deliveryProofSignatureUrl?: string;
  deliveredTo?: string;
  deliveryProofTakenAt?: string;
  
  trackingHistory: TrackingEvent[];
  items: OrderItem[];
  
  totalAmount: number;
  currency: string;
  shippingAddress?: string;
  billingAddress?: string;
  paymentMethod?: string;
  
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
