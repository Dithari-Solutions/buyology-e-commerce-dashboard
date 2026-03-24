import { apiClient } from "../client";
import type {
  CourierListResponse,
  CourierDetail,
  CreateCourierRequest,
  UpdateCourierStatusRequest,
  CourierStatus,
  VehicleType,
} from "../../types/courier.types";

const BASE = "/api/admin/couriers";

export const couriersService = {
  getAll(
    params: {
      page?: number;
      size?: number;
      status?: CourierStatus;
      vehicleType?: VehicleType;
      search?: string;
    } = {},
    signal?: AbortSignal
  ): Promise<CourierListResponse> {
    const { page = 0, size = 20, status, vehicleType, search } = params;
    const query = new URLSearchParams({ page: String(page), size: String(size) });
    if (status) query.set("status", status);
    if (vehicleType) query.set("vehicleType", vehicleType);
    if (search) query.set("search", search);
    return apiClient.get<CourierListResponse>(`${BASE}?${query}`, { signal });
  },

  getById(courierId: string, signal?: AbortSignal): Promise<CourierDetail> {
    return apiClient.get<CourierDetail>(`${BASE}/${courierId}`, { signal });
  },

  create(data: CreateCourierRequest): Promise<CourierDetail> {
    return apiClient.post<CourierDetail>(BASE, data);
  },

  updateStatus(
    courierId: string,
    data: UpdateCourierStatusRequest
  ): Promise<{ courierId: string; accountStatus: CourierStatus; updatedAt: string }> {
    return apiClient.patch(`${BASE}/${courierId}/status`, data);
  },

  delete(courierId: string): Promise<void> {
    return apiClient.delete<void>(`${BASE}/${courierId}`);
  },
};
