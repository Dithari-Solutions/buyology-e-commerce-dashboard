import { apiClient } from "../client";
import type { ApiResponse } from "../types/api.types";
import type { Brand, CreateBrandRequest } from "../../types/brand.types";

const PUBLIC_BASE = "/api/brand";
const ADMIN_BASE = "/api/admin/brand";

export const brandsService = {
  /**
   * Fetch all active brands (public).
   */
  getAll(signal?: AbortSignal): Promise<ApiResponse<Brand[]>> {
    return apiClient.get<ApiResponse<Brand[]>>(PUBLIC_BASE, { signal });
  },

  /**
   * Create a new brand (admin). All three language name fields are required.
   */
  create(data: CreateBrandRequest, signal?: AbortSignal): Promise<ApiResponse<Brand>> {
    return apiClient.post<ApiResponse<Brand>>(ADMIN_BASE, data, { signal });
  },

  /**
   * Soft-deactivate a brand (admin). Sets status → INACTIVE.
   */
  deactivate(brandId: string, signal?: AbortSignal): Promise<ApiResponse<null>> {
    return apiClient.delete<ApiResponse<null>>(`${ADMIN_BASE}/${brandId}`, { signal });
  },
};
