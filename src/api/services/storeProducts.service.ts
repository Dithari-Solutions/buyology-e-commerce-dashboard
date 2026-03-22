import { apiClient } from "../client";
import type { ApiResponse } from "../types/api.types";
import type {
  StoreProductResponse,
  StoreVariantResponse,
  AssignProductToStoreRequest,
  UpdateStoreProductRequest,
  AssignVariantToStoreRequest,
  UpdateStoreVariantRequest,
} from "../../types/product.types";

const base = (storeId: string) => `/api/stores/${storeId}/products`;

export const storeProductsService = {
  // POST /api/stores/{storeId}/products
  assign(
    storeId: string,
    data: AssignProductToStoreRequest,
    signal?: AbortSignal
  ): Promise<ApiResponse<StoreProductResponse>> {
    return apiClient.post<ApiResponse<StoreProductResponse>>(
      base(storeId),
      data,
      { signal }
    );
  },

  // GET /api/stores/{storeId}/products
  list(
    storeId: string,
    signal?: AbortSignal
  ): Promise<ApiResponse<StoreProductResponse[]>> {
    return apiClient.get<ApiResponse<StoreProductResponse[]>>(
      base(storeId),
      { signal }
    );
  },

  // PATCH /api/stores/{storeId}/products/{storeProductId}
  update(
    storeId: string,
    storeProductId: string,
    data: UpdateStoreProductRequest,
    signal?: AbortSignal
  ): Promise<ApiResponse<StoreProductResponse>> {
    return apiClient.patch<ApiResponse<StoreProductResponse>>(
      `${base(storeId)}/${storeProductId}`,
      data,
      { signal }
    );
  },

  // DELETE /api/stores/{storeId}/products/{storeProductId}
  remove(
    storeId: string,
    storeProductId: string,
    signal?: AbortSignal
  ): Promise<ApiResponse<null>> {
    return apiClient.delete<ApiResponse<null>>(
      `${base(storeId)}/${storeProductId}`,
      { signal }
    );
  },

  // POST /api/stores/{storeId}/products/{storeProductId}/variants
  assignVariant(
    storeId: string,
    storeProductId: string,
    data: AssignVariantToStoreRequest,
    signal?: AbortSignal
  ): Promise<ApiResponse<StoreVariantResponse>> {
    return apiClient.post<ApiResponse<StoreVariantResponse>>(
      `${base(storeId)}/${storeProductId}/variants`,
      data,
      { signal }
    );
  },

  // PATCH /api/stores/{storeId}/products/{storeProductId}/variants/{storeVariantId}
  updateVariant(
    storeId: string,
    storeProductId: string,
    storeVariantId: string,
    data: UpdateStoreVariantRequest,
    signal?: AbortSignal
  ): Promise<ApiResponse<StoreVariantResponse>> {
    return apiClient.patch<ApiResponse<StoreVariantResponse>>(
      `${base(storeId)}/${storeProductId}/variants/${storeVariantId}`,
      data,
      { signal }
    );
  },

  // DELETE /api/stores/{storeId}/products/{storeProductId}/variants/{storeVariantId}
  removeVariant(
    storeId: string,
    storeProductId: string,
    storeVariantId: string,
    signal?: AbortSignal
  ): Promise<ApiResponse<null>> {
    return apiClient.delete<ApiResponse<null>>(
      `${base(storeId)}/${storeProductId}/variants/${storeVariantId}`,
      { signal }
    );
  },
};
