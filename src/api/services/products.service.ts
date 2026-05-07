import { apiClient, getAccessToken } from "../client";
import { ApiRequestError } from "../types/api.types";
import type { ApiResponse } from "../types/api.types";
import type { Product, ProductStatus, ProductType, RefurbGrade, AvailabilityStatus } from "../../types/product.types";
import { env } from "../../config/env";

const BASE = "/api/admin/product";

export type ProductLanguage = "EN" | "AZ" | "AR";

export interface CreateProductSpecOption {
  localKey: string;
  // Library mode: send only globalOptionId (backend fills values)
  globalOptionId?: string;
  // Manual mode: fill all language fields
  valueAz?: string;
  valueEn?: string;
  valueAr?: string;
  unit?: string;
}

export interface CreateProductSpec {
  // Mode A: reference an existing global spec group
  globalSpecGroupId?: string;
  // Mode B: define inline (find-or-create by code)
  code?: string;
  nameAz?: string;
  nameEn?: string;
  nameAr?: string;
  options: CreateProductSpecOption[];
}

export interface CreateProductVariant {
  sku: string;
  specOptionLocalKeys: string[];
}

export interface CreateProductColor {
  localKey: string;
  valueAz: string;
  valueEn: string;
  valueAr: string;
  colorCode: string;
  mediaIndices: number[];
}

export interface CreateProductRequest {
  categoryId: string;
  brandId: string | null;
  productType: ProductType;
  status: ProductStatus;
  isRefurbished: boolean;
  refurbGrade: RefurbGrade | null;
  availabilityStatus: AvailabilityStatus;
  isSuperDeal: boolean;
  isLimitedStock: boolean;
  accessoryIds: string[];
  translations: {
    titleAz: string;
    titleEn: string;
    titleAr: string;
    descriptionAz: string;
    descriptionEn: string;
    descriptionAr: string;
  };
  specs: CreateProductSpec[];
  variants: CreateProductVariant[];
  colors: CreateProductColor[];
}

export const productsService = {
  /**
   * Fetch all products.
   * @param language - Content language (defaults to "EN")
   */
  getAll(
    language: ProductLanguage = "EN",
    signal?: AbortSignal
  ): Promise<ApiResponse<Product[]>> {
    return apiClient.get<ApiResponse<Product[]>>(
      `${BASE}?lang=${language}`,
      { signal }
    );
  },

  /**
   * Fetch a single product by ID.
   */
  getById(
    id: string,
    language: ProductLanguage = "EN",
    signal?: AbortSignal
  ): Promise<ApiResponse<Product>> {
    return apiClient.get<ApiResponse<Product>>(
      `${BASE}/${id}?lang=${language}`,
      { signal }
    );
  },

  /**
   * Fetch all trashed (soft-deleted) products.
   */
  getTrash(
    language: ProductLanguage = "EN",
    signal?: AbortSignal
  ): Promise<ApiResponse<Product[]>> {
    return apiClient.get<ApiResponse<Product[]>>(
      `${BASE}/trash?lang=${language}`,
      { signal }
    );
  },

  /**
   * Create a new product with optional media files.
   * Uses multipart/form-data: `request` (JSON blob) + `files` (images).
   */
  async create(
    data: CreateProductRequest,
    files: File[],
    signal?: AbortSignal
  ): Promise<ApiResponse<Product>> {
    const formData = new FormData();
    formData.append(
      "request",
      new Blob([JSON.stringify(data)], { type: "application/json" })
    );
    files.forEach((file) => formData.append("files", file));

    const token = getAccessToken();
    const headers: HeadersInit = token
      ? { Authorization: `Bearer ${token}` }
      : {};

    const response = await fetch(`${env.apiBaseUrl}${BASE}/create`, {
      method: "POST",
      headers,
      credentials: "include",
      body: formData,
      signal,
    });

    if (!response.ok) {
      let payload: { statusCode: number; message: string };
      try {
        payload = await response.json();
      } catch {
        payload = {
          statusCode: response.status,
          message: response.statusText || "Failed to create product.",
        };
      }
      throw new ApiRequestError(payload);
    }

    return response.json() as Promise<ApiResponse<Product>>;
  },

  /**
   * Supplier-portal counterpart to {@link create}. POSTs to
   * {@code /api/supplier/products/full} so the resulting product is auto-stamped
   * supplierId/PENDING_REVIEW/INACTIVE on the server. Uses the SAME
   * {@link CreateProductRequest} payload as admin (translations, specs,
   * variants, accessories) plus extra {@code storeId} + {@code storePrice}
   * parts identifying the store where the product is listed.
   */
  async createAsSupplier(
    data: CreateProductRequest,
    files: File[],
    storeId: string,
    storePrice: number,
    signal?: AbortSignal,
  ): Promise<ApiResponse<Product>> {
    const formData = new FormData();
    formData.append(
      "request",
      new Blob([JSON.stringify(data)], { type: "application/json" }),
    );
    files.forEach((file) => formData.append("files", file));
    formData.append("storeId", storeId);
    formData.append("storePrice", String(storePrice));

    const token = getAccessToken();
    const headers: HeadersInit = token
      ? { Authorization: `Bearer ${token}`, "X-Client-Type": "dashboard" }
      : { "X-Client-Type": "dashboard" };

    const response = await fetch(`${env.apiBaseUrl}/api/supplier/products/full`, {
      method: "POST",
      headers,
      credentials: "include",
      body: formData,
      signal,
    });

    if (!response.ok) {
      let payload: { statusCode: number; message: string };
      try {
        payload = await response.json();
      } catch {
        payload = {
          statusCode: response.status,
          message: response.statusText || "Failed to submit product.",
        };
      }
      throw new ApiRequestError(payload);
    }

    return response.json() as Promise<ApiResponse<Product>>;
  },
};
