import { apiClient } from "../client";
import type { ApiResponse } from "../types/api.types";

export interface CustomerCartItem {
  id: string; cart_id: string; product_id: string; title: string; sku: string;
  variant_sku: string | null; image_url: string | null; quantity: number; selected: boolean;
  unit_price: number; total_price: number; currency: string | null; country_code: string | null;
  created_at: string;
}
export interface CartMessage {
  id: string; subject: string; body: string; email_status: string;
  notification_status: string; created_at: string;
}
export interface CustomerCart {
  user_id: string; first_name: string | null; last_name: string | null;
  email: string | null; phone_number: string | null; status: string;
  last_added_at: string | null; item_count: number; items: CustomerCartItem[];
  messages?: CartMessage[];
}
export interface CustomerCartPage { content: CustomerCart[]; totalElements: number; totalPages: number; page: number }
const BASE = "/api/admin/cart-activity";
export const cartActivityService = {
  list(page: number, search: string, withItems: boolean, signal?: AbortSignal) {
    const qs = new URLSearchParams({ page: String(page), size: "24", search, withItems: String(withItems) });
    return apiClient.get<ApiResponse<CustomerCartPage>>(`${BASE}?${qs}`, { signal });
  },
  detail(id: string, signal?: AbortSignal) {
    return apiClient.get<ApiResponse<CustomerCart>>(`${BASE}/${id}`, { signal });
  },
  send(id: string, requestId: string, subject: string, body: string) {
    return apiClient.post<ApiResponse<CartMessage>>(`${BASE}/${id}/messages`, { requestId, subject, body });
  },
};
