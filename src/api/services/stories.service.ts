import { apiClient } from "../client";
import { ApiResponse } from "../types/api.types";
import { Story } from "../../types/story.types";

const BASE = "/api/story";

export type StoryLanguage = "EN" | "AZ" | "RU";

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
};
