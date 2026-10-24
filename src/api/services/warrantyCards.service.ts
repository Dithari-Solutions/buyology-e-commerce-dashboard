import { apiClient } from "../client";
import type { ApiResponse } from "../types/api.types";
import type { OrderItemWarranty } from "../../types/order.types";

const BASE = "/api/admin/warranty-cards";

export const warrantyCardsService = {
  /** Withdraws a card, e.g. after the unit was returned. The reason is kept for staff only. */
  void(serial: string, reason: string): Promise<ApiResponse<OrderItemWarranty>> {
    return apiClient.post<ApiResponse<OrderItemWarranty>>(
      `${BASE}/${encodeURIComponent(serial)}/void`,
      { reason },
    );
  },
  restore(serial: string): Promise<ApiResponse<OrderItemWarranty>> {
    return apiClient.post<ApiResponse<OrderItemWarranty>>(`${BASE}/${encodeURIComponent(serial)}/restore`, {});
  },
};
