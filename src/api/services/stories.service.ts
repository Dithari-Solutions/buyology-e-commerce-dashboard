import { apiClient } from "../client";
import { ApiResponse } from "../types/api.types";
import { Story } from "../../types/story.types";

const BASE = "/api/admin/story";

export type StoryLanguage = "EN" | "AZ" | "RU";
export type StoryStatus = "ACTIVE" | "INACTIVE";

export interface CreateStoryRequest {
  translation: {
    titleAz: string;
    titleEn: string;
    titleAr: string;
    descriptionAz?: string;
    descriptionEn?: string;
    descriptionAr?: string;
  };
  status: StoryStatus;
}

export const storiesService = {
  getAll(
    language: StoryLanguage = "EN",
    signal?: AbortSignal
  ): Promise<ApiResponse<Story[]>> {
    return apiClient.get<ApiResponse<Story[]>>(
      `${BASE}?language=${language}`,
      { signal }
    );
  },

  getById(
    id: string,
    language: StoryLanguage = "EN",
    signal?: AbortSignal
  ): Promise<ApiResponse<Story>> {
    return apiClient.get<ApiResponse<Story>>(
      `${BASE}/${id}?language=${language}`,
      { signal }
    );
  },

  create(
    data: CreateStoryRequest,
    thumbnail: File,
    mediaFiles: File[],
    signal?: AbortSignal
  ): Promise<ApiResponse<Story>> {
    const formData = new FormData();
    formData.append(
      "request",
      new Blob([JSON.stringify(data)], { type: "application/json" })
    );
    formData.append("thumbnail", thumbnail);
    mediaFiles.forEach((file) => formData.append("mediaFiles", file));

    return apiClient.post<ApiResponse<Story>>(`${BASE}/create`, formData, {
      signal,
    });
  },

  deleteStory(storyId: string): Promise<ApiResponse<void>> {
    return apiClient.delete<ApiResponse<void>>(`${BASE}/${storyId}`);
  },

  deleteMedia(storyId: string, mediaId: string): Promise<ApiResponse<void>> {
    return apiClient.delete<ApiResponse<void>>(
      `${BASE}/${storyId}/media/${mediaId}`
    );
  },
};
