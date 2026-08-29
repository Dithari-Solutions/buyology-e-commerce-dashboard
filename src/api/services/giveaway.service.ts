import { apiClient } from "../client";
import type { ApiResponse } from "../types/api.types";
import type { SpringPage } from "./refunds.service";

const BASE = "/api/admin/giveaway";

/** Whether the draw is accepting entries. */
export interface GiveawayCampaign {
  id: string;
  campaign: string;
  open: boolean;
  closedAt: string | null;
  updatedBy: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

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
  /** Current open/closed state of the draw. */
  campaign(signal?: AbortSignal): Promise<ApiResponse<GiveawayCampaign>> {
    return apiClient.get<ApiResponse<GiveawayCampaign>>(`${BASE}/campaign`, { signal });
  },

  /**
   * PUT /api/admin/giveaway/campaign?open=
   *
   * Closing removes every entry surface from the storefront and the app and makes the entry
   * endpoint refuse. Entries are untouched — they are the draw.
   */
  setOpen(open: boolean): Promise<ApiResponse<GiveawayCampaign>> {
    return apiClient.put<ApiResponse<GiveawayCampaign>>(`${BASE}/campaign?open=${open}`);
  },

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
