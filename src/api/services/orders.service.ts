import { apiClient } from "../client";
import type { ApiResponse } from "../types/api.types";
import type {
  OrderAdminResponse,
  OrderListResponse,
  OrderStatus,
} from "../../types/order.types";

const BASE = "/api/admin/orders";

export const ordersService = {
  // GET /api/admin/orders
  getAll(
    params: {
      page?: number;
      size?: number;
      status?: OrderStatus;
      storeId?: string;
      search?: string;
      sort?: string;
    } = {},
    signal?: AbortSignal
  ): Promise<OrderListResponse> {
    const { page = 0, size = 20, status, storeId, search, sort } = params;
    const query = new URLSearchParams({
      page: String(page),
      size: String(size),
    });
    if (status) query.set("status", status);
    if (storeId) query.set("storeId", storeId);
    if (search) query.set("search", search);
    if (sort) query.set("sort", sort);

    return apiClient.get<OrderListResponse>(`${BASE}?${query}`, { signal });
  },

  // GET /api/admin/orders/{id}/with-proof
  getByIdWithProof(id: string, signal?: AbortSignal): Promise<ApiResponse<OrderAdminResponse>> {
    return apiClient.get<ApiResponse<OrderAdminResponse>>(`${BASE}/${id}/with-proof`, { signal });
  },

  // GET /api/admin/orders/{id}
  getById(id: string, signal?: AbortSignal): Promise<ApiResponse<OrderAdminResponse>> {
    return apiClient.get<ApiResponse<OrderAdminResponse>>(`${BASE}/${id}`, { signal });
  },
};
