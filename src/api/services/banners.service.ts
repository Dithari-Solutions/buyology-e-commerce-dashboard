import { apiClient, getAccessToken, getUserIdFromToken } from "../client";
import { ApiResponse, ApiRequestError } from "../types/api.types";
import { env } from "../../config/env";

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

async function multipart<T>(
  method: "POST" | "PUT",
  path: string,
  data: BannerRequest,
  background?: File | null
): Promise<ApiResponse<T>> {
  const formData = new FormData();
  formData.append(
    "request",
    new Blob([JSON.stringify(data)], { type: "application/json" })
  );
  if (background) {
    formData.append("background", background);
  }

  const token = getAccessToken();
  const userId = getUserIdFromToken();
  const headers: HeadersInit = {
    ...(userId ? { "X-User-Id": userId } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const response = await fetch(`${env.apiBaseUrl}${path}`, {
    method,
    headers,
    credentials: "include",
    body: formData,
  });

  if (!response.ok) {
    let payload: { statusCode: number; message: string };
    try {
      payload = await response.json();
    } catch {
      payload = {
        statusCode: response.status,
        message: response.statusText || "Banner request failed.",
      };
    }
    throw new ApiRequestError(payload);
  }

  return response.json() as Promise<ApiResponse<T>>;
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
    return multipart<BannerAdmin>("POST", `${BASE}/create`, data, background);
  },

  update(
    id: string,
    data: BannerRequest,
    background?: File | null
  ): Promise<ApiResponse<BannerAdmin>> {
    return multipart<BannerAdmin>("PUT", `${BASE}/${id}`, data, background);
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
