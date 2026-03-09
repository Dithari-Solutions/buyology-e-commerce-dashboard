import { apiClient, getAccessToken, getUserIdFromToken } from "../client";
import { ApiResponse, ApiRequestError } from "../types/api.types";
import { Story } from "../../types/story.types";
import { env } from "../../config/env";

const BASE = "/api/story";

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
  /**
   * Fetch all stories with their media.
   * @param language - Content language (defaults to "EN")
   */
  getAll(
    language: StoryLanguage = "EN",
    signal?: AbortSignal
  ): Promise<ApiResponse<Story[]>> {
    return apiClient.get<ApiResponse<Story[]>>(
      `${BASE}?language=${language}`,
      { signal }
    );
  },

  /**
   * Fetch a single story by ID.
   */
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

  /**
   * Create a new story with a thumbnail and optional media files.
   * First file is the thumbnail; remaining files are mediaFiles.
   */
  async create(
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

    const token = getAccessToken();
    const userId = getUserIdFromToken();
    const headers: HeadersInit = {
      ...(userId ? { "X-User-Id": userId } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };

    const response = await fetch(`${env.apiBaseUrl}${BASE}`, {
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
          message: response.statusText || "Failed to create story.",
        };
      }
      throw new ApiRequestError(payload);
    }

    return response.json() as Promise<ApiResponse<Story>>;
  },
};
