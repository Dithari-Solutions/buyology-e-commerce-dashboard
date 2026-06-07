import { apiClient } from "../client";
import type { ApiResponse } from "../types/api.types";

export interface CourierProfile {
  id: string;
  storeId: string;
  firstName: string;
  lastName?: string | null;
  phone: string;
  email?: string | null;
  vehicleType?: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCourierProfilePayload {
  storeId: string;
  firstName: string;
  lastName?: string;
  phone: string;
  email?: string;
  vehicleType?: string;
  active?: boolean;
}

export type UpdateCourierProfilePayload = Partial<Omit<CreateCourierProfilePayload, "storeId">>;

const BASE = "/api/admin/courier-profiles";

export const courierProfilesService = {
  listByStore(storeId: string, activeOnly = false, signal?: AbortSignal): Promise<ApiResponse<CourierProfile[]>> {
    const q = new URLSearchParams({ storeId, activeOnly: String(activeOnly) });
    return apiClient.get<ApiResponse<CourierProfile[]>>(`${BASE}?${q}`, { signal });
  },
  getById(id: string, signal?: AbortSignal): Promise<ApiResponse<CourierProfile>> {
    return apiClient.get<ApiResponse<CourierProfile>>(`${BASE}/${id}`, { signal });
  },
  create(payload: CreateCourierProfilePayload): Promise<ApiResponse<CourierProfile>> {
    return apiClient.post<ApiResponse<CourierProfile>>(BASE, payload);
  },
  update(id: string, payload: UpdateCourierProfilePayload): Promise<ApiResponse<CourierProfile>> {
    return apiClient.patch<ApiResponse<CourierProfile>>(`${BASE}/${id}`, payload);
  },
  remove(id: string): Promise<ApiResponse<void>> {
    return apiClient.delete<ApiResponse<void>>(`${BASE}/${id}`);
  },
};
