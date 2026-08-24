import { apiClient } from "../client";
import type { ApiResponse } from "../types/api.types";
import type { SpringPage } from "./refunds.service";

const BASE = "/api/admin/giveaway";

/** One customer's giveaway entry (mirrors backend GiveawayEntryAdminResponse). */
export interface GiveawayEntry {
  id: string;
  userId: string;
  /** Normalised handle — lower-case, no '@'. This is the value uniqueness is enforced on. */
  instagramHandle: string;
  /** Exactly what the customer typed, kept for support. */
  instagramHandleRaw?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  createdAt: string;
}

export const giveawayService = {
  // GET /api/admin/giveaway/entries?page=&size=
  entries(
    params: { page?: number; size?: number },
    signal?: AbortSignal,
  ): Promise<ApiResponse<SpringPage<GiveawayEntry>>> {
    const search = new URLSearchParams();
    search.set("page", String(params.page ?? 0));
    search.set("size", String(params.size ?? 50));
    return apiClient.get<ApiResponse<SpringPage<GiveawayEntry>>>(`${BASE}/entries?${search}`, { signal });
  },
};
