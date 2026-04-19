import { apiClient } from "../client";
import type { ApiResponse } from "../types/api.types";

export interface NewsArticle {
  id: string;
  title: string;
  summary?: string;
  content: string;
  status: "DRAFT" | "PUBLISHED";
  imageUrl?: string;
  publishedAt?: string;
  createdAt: string;
}

export interface CreateNewsArticleRequest {
  title: string;
  summary?: string;
  content: string;
}

export const newsletterService = {
  listArticles(signal?: AbortSignal): Promise<ApiResponse<NewsArticle[]>> {
    return apiClient.get("/api/admin/news", { signal });
  },
  createArticle(formData: FormData): Promise<ApiResponse<NewsArticle>> {
    return apiClient.post("/api/admin/news", formData);
  },
  publishArticle(id: string, sendToSubscribers: boolean): Promise<ApiResponse<void>> {
    return apiClient.put(`/api/admin/news/${id}/publish?sendToSubscribers=${sendToSubscribers}`, {});
  },
  getStats(signal?: AbortSignal): Promise<ApiResponse<{ subscriberCount: number }>> {
    return apiClient.get("/api/admin/newsletter/stats", { signal });
  },
};
