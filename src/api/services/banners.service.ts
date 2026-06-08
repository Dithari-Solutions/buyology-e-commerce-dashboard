import { apiClient } from "../client";
import { ApiResponse } from "../types/api.types";

const BASE = "/api/admin/banner";

export type BannerStatus = "ACTIVE" | "INACTIVE";
export type BannerPlatform = "WEB" | "MOBILE";

export interface BannerTranslationFields {
  textAz?: string;
  textEn?: string;
  textAr?: string;
  buttonLabelAz?: string;
  buttonLabelEn?: string;
  buttonLabelAr?: string;
}

export interface BannerRequest {
  translation: BannerTranslationFields;
  buttonUrl?: string;
  sortOrder?: number;
  status?: BannerStatus;
  platform: BannerPlatform;
}

export interface BannerAdmin {
  id: string;
  backgroundImageUrl: string;
  buttonUrl?: string | null;
  sortOrder: number;
  status: BannerStatus;
  platform: BannerPlatform;
  createdAt: string;
  updatedAt: string;
  translation: BannerTranslationFields;
}

function buildFormData(data: BannerRequest, background?: File | null): FormData {
  const formData = new FormData();
  formData.append(
    "request",
    new Blob([JSON.stringify(data)], { type: "application/json" })
  );
  if (background) {
    formData.append("background", background);
  }
  return formData;
}

export const bannersService = {
  list(platform?: BannerPlatform, signal?: AbortSignal): Promise<ApiResponse<BannerAdmin[]>> {
    const qs = platform ? `?platform=${platform}` : "";
    return apiClient.get<ApiResponse<BannerAdmin[]>>(`${BASE}${qs}`, { signal });
  },

  getById(id: string, signal?: AbortSignal): Promise<ApiResponse<BannerAdmin>> {
    return apiClient.get<ApiResponse<BannerAdmin>>(`${BASE}/${id}`, { signal });
  },

  create(data: BannerRequest, background: File): Promise<ApiResponse<BannerAdmin>> {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 90_000);
    return apiClient
      .post<ApiResponse<BannerAdmin>>(`${BASE}/create`, buildFormData(data, background), {
        signal: ctrl.signal,
      })
      .finally(() => clearTimeout(t));
  },

  update(
    id: string,
    data: BannerRequest,
    background?: File | null
  ): Promise<ApiResponse<BannerAdmin>> {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 90_000);
    return apiClient
      .put<ApiResponse<BannerAdmin>>(`${BASE}/${id}`, buildFormData(data, background), {
        signal: ctrl.signal,
      })
      .finally(() => clearTimeout(t));
  },

  setStatus(id: string, status: BannerStatus): Promise<ApiResponse<void>> {
    return apiClient.patch<ApiResponse<void>>(
      `${BASE}/${id}/status?status=${status}`
    );
  },

  setSortOrder(id: string, sortOrder: number): Promise<ApiResponse<void>> {
    return apiClient.patch<ApiResponse<void>>(
      `${BASE}/${id}/sort-order?sortOrder=${sortOrder}`
    );
  },

  remove(id: string): Promise<ApiResponse<void>> {
    return apiClient.delete<ApiResponse<void>>(`${BASE}/${id}`);
  },
};
