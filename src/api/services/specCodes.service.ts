import { apiClient } from "../client";
import type { ApiResponse } from "../types/api.types";

const BASE = "/api/admin/spec-codes";

export interface SpecCodeItem {
  id: string;
  code: string;
  labelEn: string | null;
  labelAz: string | null;
  labelAr: string | null;
  filterable: boolean;
  displayOrder: number;
}

export interface SpecCodeRequest {
  code: string;
  labelEn?: string;
  labelAz?: string;
  labelAr?: string;
  filterable: boolean;
  displayOrder?: number;
}

export const specCodesService = {
  getAll(signal?: AbortSignal): Promise<ApiResponse<SpecCodeItem[]>> {
    return apiClient.get<ApiResponse<SpecCodeItem[]>>(BASE, { signal });
  },
  create(data: SpecCodeRequest): Promise<ApiResponse<SpecCodeItem>> {
    return apiClient.post<ApiResponse<SpecCodeItem>>(BASE, data);
  },
  update(id: string, data: SpecCodeRequest): Promise<ApiResponse<SpecCodeItem>> {
    return apiClient.put<ApiResponse<SpecCodeItem>>(`${BASE}/${id}`, data);
  },
  remove(id: string): Promise<ApiResponse<null>> {
    return apiClient.delete<ApiResponse<null>>(`${BASE}/${id}`);
  },
};
