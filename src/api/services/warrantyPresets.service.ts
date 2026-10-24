import { apiClient } from "../client";
import type { ApiResponse } from "../types/api.types";

const BASE = "/api/admin/warranty-presets";

/** A named warranty length offered in the product form, e.g. "Laptop" for 12 months. */
export interface WarrantyPreset {
  id: string;
  name: string;
  durationMonths: number;
  /** Products currently following this preset. */
  productCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface WarrantyPresetRequest {
  name: string;
  durationMonths: number;
}

export const warrantyPresetsService = {
  getAll(signal?: AbortSignal): Promise<ApiResponse<WarrantyPreset[]>> {
    return apiClient.get<ApiResponse<WarrantyPreset[]>>(BASE, { signal });
  },
  create(data: WarrantyPresetRequest): Promise<ApiResponse<WarrantyPreset>> {
    return apiClient.post<ApiResponse<WarrantyPreset>>(BASE, data);
  },
  /** Products following the preset take the new length; issued warranty cards keep theirs. */
  update(id: string, data: WarrantyPresetRequest): Promise<ApiResponse<WarrantyPreset>> {
    return apiClient.put<ApiResponse<WarrantyPreset>>(`${BASE}/${id}`, data);
  },
  /** Resolves to how many products were switched to a custom duration. */
  remove(id: string): Promise<ApiResponse<number>> {
    return apiClient.delete<ApiResponse<number>>(`${BASE}/${id}`);
  },
};
