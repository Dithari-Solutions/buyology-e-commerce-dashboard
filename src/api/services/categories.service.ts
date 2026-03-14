import { apiClient } from "../client";
import type { ApiResponse } from "../types/api.types";
import type {
  Category,
  CategoryDetail,
  CategoryLanguage,
  CreateCategoryRequest,
  UpdateCategoryRequest,
} from "../../types/category.types";

const BASE = "/api/category";

export const categoriesService = {
  getAll(
    language: CategoryLanguage = "EN",
    signal?: AbortSignal
  ): Promise<ApiResponse<Category[]>> {
    return apiClient.get<ApiResponse<Category[]>>(
      `${BASE}?lang=${language}`,
      { signal }
    );
  },

  getById(
    id: string,
    signal?: AbortSignal
  ): Promise<ApiResponse<CategoryDetail>> {
    return apiClient.get<ApiResponse<CategoryDetail>>(
      `${BASE}/${id}`,
      { signal }
    );
  },

  create(
    data: CreateCategoryRequest,
    signal?: AbortSignal
  ): Promise<ApiResponse<CategoryDetail>> {
    return apiClient.post<ApiResponse<CategoryDetail>>(BASE, data, { signal });
  },

  update(
    id: string,
    data: UpdateCategoryRequest,
    signal?: AbortSignal
  ): Promise<ApiResponse<CategoryDetail>> {
    return apiClient.patch<ApiResponse<CategoryDetail>>(
      `${BASE}/${id}`,
      data,
      { signal }
    );
  },

  delete(
    id: string,
    signal?: AbortSignal
  ): Promise<ApiResponse<null>> {
    return apiClient.delete<ApiResponse<null>>(`${BASE}/${id}`, { signal });
  },
};
