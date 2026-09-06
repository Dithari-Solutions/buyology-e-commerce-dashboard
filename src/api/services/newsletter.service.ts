import { apiClient } from "../client";
import type { ApiResponse } from "../types/api.types";

export interface NewsArticle {
  id: string;
  title: string;
  summary?: string;
  content: string;
  status: "DRAFT" | "PUBLISHED";
  imageUrl?: string;
  /** Gallery images, in the order they were uploaded. */
  galleryUrls?: string[];
  /** The public URL segment: buyology.online/news/{slug}. Fixed at creation, never follows the title. */
  slug?: string;
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
  /** PUT /api/admin/news/{id} — edit in place. The slug never changes; links already shared keep working. */
  updateArticle(id: string, formData: FormData): Promise<ApiResponse<NewsArticle>> {
    return apiClient.put(`/api/admin/news/${id}`, formData);
  },

  /** DELETE /api/admin/news/{id} — takes it off the site. An email already sent cannot be unsent. */
  deleteArticle(id: string): Promise<ApiResponse<void>> {
    return apiClient.delete(`/api/admin/news/${id}`);
  },

  publishArticle(id: string, sendToSubscribers: boolean): Promise<ApiResponse<void>> {
    return apiClient.put(`/api/admin/news/${id}/publish?sendToSubscribers=${sendToSubscribers}`, {});
  },
  getStats(signal?: AbortSignal): Promise<ApiResponse<{ subscriberCount: number }>> {
    return apiClient.get("/api/admin/newsletter/stats", { signal });
  },
};
