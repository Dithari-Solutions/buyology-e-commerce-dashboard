import { apiClient } from "../client";
import type { ApiResponse } from "../types/api.types";
import type { Product } from "../../types/product.types";

const BASE = "/api/product";

export type ProductLanguage = "EN" | "AZ" | "AR";

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
};
