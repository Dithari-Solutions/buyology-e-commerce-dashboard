import { apiClient } from "../client";
import type { ApiResponse } from "../types/api.types";
import type {
  OrderAdminResponse,
  OrderListResponse,
  OrderStatus,
} from "../../types/order.types";

const BASE = "/api/admin/orders";

/** Why an order's payment did not complete, and where the customer stopped. */
export interface PaymentStallDiagnosis {
  code: string;
  stage: string;
  summary: string;
  detail: string | null;
  /** A starting point for the message box — never sent on its own. */
  suggestedMessage: string | null;
  /** True when the money is already in. Contacting this customer would be wrong. */
  customerHasPaid: boolean;
  contactRecommended: boolean;
  attemptCount: number;
  methodsTried: string[];
  lastAttemptAt: string | null;
}

/** One payment attempt. Together these are the struggled-then-repaid history. */
export interface PaymentAttempt {
  id: string;
  methodType: string | null;
  status: string | null;
  amount: number | null;
  currency: string | null;
  failureReason: string | null;
  failureCode: string | null;
  paymobTransactionId: number | null;
  /** Whether the customer ever got as far as a payment page. */
  reachedGateway: boolean;
  createdAt: string | null;
}

/** A message an admin sent the customer about this payment. */
export interface PaymentMessage {
  id: string;
  templateKey: string | null;
  subject: string;
  body: string;
  diagnosisCode: string | null;
  sentByName: string | null;
  emailSent: boolean;
  notificationSent: boolean;
  createdAt: string | null;
}

export interface PaymentMessageTemplate {
  key: string;
  label: string;
  subject: string;
  body: string;
}

export interface PaymentSupportView {
  diagnosis: PaymentStallDiagnosis;
  attempts: PaymentAttempt[];
  messages: PaymentMessage[];
  templates: PaymentMessageTemplate[];
  customerEmail: string | null;
  canContactCustomer: boolean;
  repayUrl: string;
}



/** One order sitting in the trash, and when it will be destroyed. */
export interface TrashedOrder {
  id: string;
  deletedAt: string | null;
  deletedBy: string | null;
  status: string | null;
  totalAmount: number | null;
  currency: string | null;
  createdAt: string | null;
  /** 30 days after deletion. Null only if the deletion timestamp is missing. */
  purgeAt: string | null;
}

export interface TrashPage {
  content: TrashedOrder[];
  totalElements: number;
  page: number;
  size: number;
}

/** What a payment re-check found at the gateway. */
export interface PaymentRecheckResult {
  /** True when the gateway confirmed payment and the order was settled. */
  settled: boolean;
  status: string | null;
  message: string;
}

export const ordersService = {
  // GET /api/admin/orders
  getAll(
    params: {
      page?: number;
      size?: number;
      status?: OrderStatus;
      storeId?: string;
      supplierId?: string;
      search?: string;
      sort?: string;
    } = {},
    signal?: AbortSignal
  ): Promise<ApiResponse<OrderListResponse>> {
    const { page = 0, size = 20, status, storeId, supplierId, search, sort } = params;
    const query = new URLSearchParams({
      page: String(page),
      size: String(size),
    });
    if (status) query.set("status", status);
    if (storeId) query.set("storeId", storeId);
    if (supplierId) query.set("supplierId", supplierId);
    if (search) query.set("search", search);
    if (sort) query.set("sort", sort);

    return apiClient.get<ApiResponse<OrderListResponse>>(`${BASE}?${query}`, { signal });
  },

  // GET /api/supplier/orders — orders containing the current supplier's items
  getMine(
    params: { page?: number; size?: number; status?: OrderStatus } = {},
    signal?: AbortSignal
  ): Promise<ApiResponse<OrderListResponse>> {
    const { page = 0, size = 20, status } = params;
    const query = new URLSearchParams({ page: String(page), size: String(size) });
    if (status) query.set("status", status);
    return apiClient.get<ApiResponse<OrderListResponse>>(`/api/supplier/orders?${query}`, { signal });
  },

  // GET /api/admin/orders/{id}/with-proof
  getByIdWithProof(id: string, signal?: AbortSignal): Promise<ApiResponse<OrderAdminResponse>> {
    return apiClient.get<ApiResponse<OrderAdminResponse>>(`${BASE}/${id}/with-proof`, { signal });
  },

  // GET /api/admin/orders/{id}
  getById(id: string, signal?: AbortSignal): Promise<ApiResponse<OrderAdminResponse>> {
    return apiClient.get<ApiResponse<OrderAdminResponse>>(`${BASE}/${id}`, { signal });
  },

  // PATCH /api/admin/orders/{id}/status
  updateStatus(
    id: string,
    body: { status: OrderStatus; notes?: string; cancellationReason?: string }
  ): Promise<ApiResponse<OrderAdminResponse>> {
    return apiClient.patch<ApiResponse<OrderAdminResponse>>(`${BASE}/${id}/status`, body);
  },

  // PATCH /api/admin/orders/{id}/courier  — assign a store courier profile
  assignCourier(id: string, courierProfileId: string): Promise<ApiResponse<OrderAdminResponse>> {
    return apiClient.patch<ApiResponse<OrderAdminResponse>>(`${BASE}/${id}/courier`, { courierProfileId });
  },

  // PATCH /api/supplier/orders/{id}/status  — supplier advances their own order
  supplierUpdateStatus(
    id: string,
    status: OrderStatus,
    notes?: string
  ): Promise<ApiResponse<OrderAdminResponse>> {
    const query = new URLSearchParams({ status });
    if (notes) query.set("notes", notes);
    return apiClient.patch<ApiResponse<OrderAdminResponse>>(`/api/supplier/orders/${id}/status?${query}`);
  },

  /**
   * POST /api/admin/payments/orders/{id}/recheck
   *
   * Asks Paymob what the order's outstanding payment really did, and settles the order if it
   * was paid. For the case where the gateway took the money but the webhook never landed, so
   * a paid order sits in "Awaiting payment" and no automatic path can rescue it.
   */
  recheckPayment(
    id: string,
    providerTransactionId?: string,
  ): Promise<ApiResponse<PaymentRecheckResult>> {
    // Supplied only when no webhook ever reached us, so we have no id of our own to ask about.
    const query = providerTransactionId
      ? `?providerTransactionId=${encodeURIComponent(providerTransactionId)}`
      : "";
    return apiClient.post<ApiResponse<PaymentRecheckResult>>(
      `/api/admin/payments/orders/${id}/recheck${query}`,
    );
  },

  /**
   * GET /api/admin/orders/{id}/payment-support
   *
   * Why the payment did not complete, every attempt behind that, and anything we have already
   * said to the customer about it.
   */
  paymentSupport(id: string): Promise<ApiResponse<PaymentSupportView>> {
    return apiClient.get<ApiResponse<PaymentSupportView>>(`${BASE}/${id}/payment-support`);
  },

  /**
   * POST /api/admin/orders/{id}/payment-support/messages
   *
   * Emails the customer and drops the same message in their storefront notification bell.
   * Nothing is ever sent automatically — this fires only when an admin presses send.
   */
  sendPaymentMessage(
    id: string,
    body: { templateKey?: string | null; subject: string; body: string },
  ): Promise<ApiResponse<PaymentMessage>> {
    return apiClient.post<ApiResponse<PaymentMessage>>(
      `${BASE}/${id}/payment-support/messages`,
      body,
    );
  },

  /**
   * DELETE /api/admin/orders/{id} — move an order to the trash (superadmin).
   * Not a status change: it leaves every list, including the customer's own order history.
   * Recoverable for 30 days.
   */
  trash(id: string): Promise<ApiResponse<void>> {
    return apiClient.delete<ApiResponse<void>>(`${BASE}/${id}`);
  },

  // GET /api/admin/orders/trash
  listTrash(page = 0, size = 20): Promise<ApiResponse<TrashPage>> {
    return apiClient.get<ApiResponse<TrashPage>>(`${BASE}/trash?page=${page}&size=${size}`);
  },

  // POST /api/admin/orders/trash/{id}/restore
  restoreFromTrash(id: string): Promise<ApiResponse<void>> {
    return apiClient.post<ApiResponse<void>>(`${BASE}/trash/${id}/restore`);
  },

  // POST /api/admin/orders/{id}/proof/{type}  (multipart)
  uploadProof(
    id: string,
    type: "PICKUP" | "DROPOFF",
    file: File
  ): Promise<ApiResponse<OrderAdminResponse>> {
    const form = new FormData();
    form.append("file", file);
    return apiClient.post<ApiResponse<OrderAdminResponse>>(
      `${BASE}/${id}/proof/${type}`,
      form
    );
  },
};
