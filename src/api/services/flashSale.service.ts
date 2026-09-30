import { apiClient } from "../client";
import type { ApiResponse } from "../types/api.types";
import type {
  AssignFlashSaleRequest,
  FlashSaleItem,
  RemoveFromFlashSaleRequest,
} from "../../types/flashSale.types";

/**
 * Admin flash-sale API — reconciled against the shipped controller
 * (`store/controller/FlashSaleController.java`).
 *
 * Every endpoint returns the ordinary store-product row, because a flash sale is not a separate
 * entity: it is the four pricing columns the cart already reads, plus a window.
 */
const BASE = "/api/admin/flash-sale";

/**
 * The server's own ceiling (FlashSaleService.MAX_PAGE_SIZE). Asked for explicitly because the
 * default page is 50: a campaign of 300 listings would otherwise arrive as 50 rows with nothing on
 * screen saying the other 250 exist, and a sale that cannot be seen cannot be cleared.
 */
export const FLASH_SALE_PAGE_SIZE = 200;

/**
 * How many sales there are ALTOGETHER, which the list endpoint reports in its message as
 * "… (50 of 347)" and nowhere else — ApiResponse carries a statusCode, a message and the rows, and
 * has never had a pagination envelope to put a total in.
 *
 * Read from the message because the alternative — inferring truncation from a full page — is not the
 * same fact. It says "there may be more" where the server has said how many more there are, and it
 * is wrong in both directions: exactly FLASH_SALE_PAGE_SIZE sales warns about rows that do not
 * exist, and the admin with 347 of them is told only that some are missing, not that 147 are.
 *
 * Null when the message is not in that shape, which is the honest answer for a backend whose wording
 * has moved on: the caller falls back to the page-length guess rather than state a total it does not
 * have. Deliberately a loose match — only the two counts are load-bearing, not the sentence.
 */
export function readFlashSaleTotal(message: string | null | undefined): number | null {
  const match = /\((\d+)\s+of\s+(\d+)\)/.exec(message ?? "");
  if (!match) return null;
  const total = Number(match[2]);
  return Number.isFinite(total) ? total : null;
}

export const flashSaleService = {
  /**
   * GET /api/admin/flash-sale[?storeId=…]
   *
   * Live AND scheduled sales, soonest-ending first. ENDED sales are NOT returned — the server
   * filters on `discountEndsAt >= now`, because a lapsed sale is already charging the normal
   * price. A row that lapses while this page is open stays on screen and badges itself Ended.
   */
  list(storeId?: string, signal?: AbortSignal): Promise<ApiResponse<FlashSaleItem[]>> {
    const params = new URLSearchParams({ page: "0", size: String(FLASH_SALE_PAGE_SIZE) });
    if (storeId) params.set("storeId", storeId);
    return apiClient.get<ApiResponse<FlashSaleItem[]>>(`${BASE}?${params}`, { signal });
  },

  /**
   * POST /api/admin/flash-sale
   *
   * Puts a batch of store products on sale under one discount and one window. All-or-nothing:
   * the server validates the whole batch before writing a row, so a single bad item refuses the
   * campaign rather than leaving half of it live at prices nobody reviewed. That is also why the
   * page pre-checks the same rules — a refusal costs the admin the entire selection.
   */
  assign(data: AssignFlashSaleRequest, signal?: AbortSignal): Promise<ApiResponse<FlashSaleItem[]>> {
    return apiClient.post<ApiResponse<FlashSaleItem[]>>(BASE, data, { signal });
  },

  /**
   * DELETE /api/admin/flash-sale/{storeProductId}
   *
   * Takes one product off the sale: clears the discount *and* its window. It has to be this
   * endpoint — on the ordinary store-product PATCH a null discount means "leave it alone".
   */
  remove(storeProductId: string, signal?: AbortSignal): Promise<ApiResponse<FlashSaleItem>> {
    return apiClient.delete<ApiResponse<FlashSaleItem>>(`${BASE}/${storeProductId}`, { signal });
  },

  /** POST /api/admin/flash-sale/remove — the same thing for many ids at once. */
  removeMany(
    data: RemoveFromFlashSaleRequest,
    signal?: AbortSignal
  ): Promise<ApiResponse<FlashSaleItem[]>> {
    return apiClient.post<ApiResponse<FlashSaleItem[]>>(`${BASE}/remove`, data, { signal });
  },
};
