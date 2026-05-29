import { apiClient } from "../client";
import type { ApiResponse } from "../types/api.types";

const BASE = "/api/admin/specs";

export type SpecLanguage = "AZ" | "EN" | "AR";

export interface SpecGroupTranslation {
  language: SpecLanguage;
  name: string;
}

export interface SpecOptionTranslation {
  language: SpecLanguage;
  value: string;
}

export interface GlobalSpecOption {
  id: string;
  unit: string | null;
  displayOrder: number;
  translations: SpecOptionTranslation[];
}

export interface GlobalSpecGroup {
  id: string;
  code: string;
  translations: SpecGroupTranslation[];
  options: GlobalSpecOption[];
}

export function getGroupName(group: GlobalSpecGroup, lang: SpecLanguage = "EN"): string {
  return group.translations.find((t) => t.language === lang)?.name ?? "";
}

export function getOptionValue(option: GlobalSpecOption, lang: SpecLanguage = "EN"): string {
  return option.translations.find((t) => t.language === lang)?.value ?? "";
}

export interface CreateGlobalSpecOptionInput {
  valueAz: string;
  valueEn: string;
  valueAr: string;
  unit?: string;
  displayOrder?: number;
}

export interface CreateGlobalSpecGroupRequest {
  code: string;
  nameAz: string;
  nameEn: string;
  nameAr: string;
  options?: CreateGlobalSpecOptionInput[];
}

export const SPEC_CODES = [
  "ram",
  "storage",
  "processor",
  "screen_size",
  "touchable_screen",
  "operating_system",
  "keyboard_language",
] as const;

export type SpecCode = (typeof SPEC_CODES)[number];

export const specsService = {
  /**
   * Fetch all global spec groups with their options (admin).
   */
  getAll(signal?: AbortSignal): Promise<ApiResponse<GlobalSpecGroup[]>> {
    return apiClient.get<ApiResponse<GlobalSpecGroup[]>>(BASE, { signal });
  },

  /**
   * Create a new global spec group (admin).
   */
  create(
    data: CreateGlobalSpecGroupRequest,
    signal?: AbortSignal
  ): Promise<ApiResponse<GlobalSpecGroup>> {
    return apiClient.post<ApiResponse<GlobalSpecGroup>>(BASE, data, { signal });
  },

  /**
   * Add an option to an existing spec group (admin).
   */
  addOption(
    groupId: string,
    data: CreateGlobalSpecOptionInput,
    signal?: AbortSignal
  ): Promise<ApiResponse<GlobalSpecOption>> {
    return apiClient.post<ApiResponse<GlobalSpecOption>>(
      `${BASE}/${groupId}/options`,
      data,
      { signal }
    );
  },

  /**
   * Delete a global spec option (admin).
   * Does NOT remove it from products where it was already copied.
   */
  deleteOption(
    optionId: string,
    signal?: AbortSignal
  ): Promise<ApiResponse<null>> {
    return apiClient.delete<ApiResponse<null>>(
      `${BASE}/options/${optionId}`,
      { signal }
    );
  },

  /**
   * Reorder a spec group's options (admin). The position of each id in
   * `optionIds` becomes its display order.
   */
  reorderOptions(
    groupId: string,
    optionIds: string[],
    signal?: AbortSignal
  ): Promise<ApiResponse<GlobalSpecOption[]>> {
    return apiClient.put<ApiResponse<GlobalSpecOption[]>>(
      `${BASE}/${groupId}/options/reorder`,
      { optionIds },
      { signal }
    );
  },
};
