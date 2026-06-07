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

export interface PresignUploadResponse {
  uploadUrl: string;
  key: string;
}

export interface CreateStoryMediaItem {
  key: string;
  contentType: string;
  orderIndex: number;
}

export interface CreateStoryDirectRequest extends CreateStoryRequest {
  thumbnailKey: string;
  media: CreateStoryMediaItem[];
}

/**
 * Uploads a file straight to storage using a presigned PUT URL. This bypasses
 * the API server and the CDN/edge body-size limit, so large videos work.
 * The Content-Type MUST match what the URL was signed with.
 */
export async function uploadToPresignedUrl(
  uploadUrl: string,
  file: File,
  contentType?: string,
  signal?: AbortSignal
): Promise<void> {
  // The Content-Type must match what the presigned URL was signed with, otherwise
  // S3 rejects the PUT with a signature mismatch. file.type can be empty, so the
  // caller passes the same resolved content type used to request the presign.
  const res = await fetch(uploadUrl, {
    method: "PUT",
    body: file,
    headers: { "Content-Type": contentType || file.type },
    signal,
  });
  if (!res.ok) {
    throw new Error(`Upload failed (${res.status})`);
  }
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

  presignUpload(
    filename: string,
    contentType: string,
    signal?: AbortSignal
  ): Promise<ApiResponse<PresignUploadResponse>> {
    return apiClient.post<ApiResponse<PresignUploadResponse>>(
      `${BASE}/presign-upload`,
      { filename, contentType },
      { signal }
    );
  },

  createDirect(
    data: CreateStoryDirectRequest,
    signal?: AbortSignal
  ): Promise<ApiResponse<Story>> {
    return apiClient.post<ApiResponse<Story>>(`${BASE}/create-direct`, data, {
      signal,
    });
  },

  /** Sets a story's display order (lower shown first). Used by drag-and-drop reordering. */
  updateDisplayOrder(storyId: string, order: number): Promise<ApiResponse<void>> {
    return apiClient.patch<ApiResponse<void>>(`${BASE}/${storyId}/display-order?order=${order}`);
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
