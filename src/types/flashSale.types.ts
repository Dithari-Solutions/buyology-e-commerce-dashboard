import type { DiscountType, StoreProductResponse } from "./product.types";

// ── Flash Sale ──────────────────────────────────────────────────────────────
// A flash sale is a store-product discount with an end date. There is no separate flash-sale
// entity: the same `discountType` / `discountValue` the storefront already prices from gains a
// window (`discountStartsAt` … `discountEndsAt`), so the sale expires as a property of the data
// instead of waiting for a job to remember to clear it.
//
// Because there is no separate entity there is no separate response DTO either: every flash-sale
// endpoint returns the ordinary store-product row (`StoreProductResponse`), which is why the id
// to remove a product from the sale is `item.id` — the store_products row — and not a field of
// its own.

/** The three states worth a badge. The API's `discountStatus` can also be NONE. */
export type FlashSaleStatus = "SCHEDULED" | "LIVE" | "ENDED";

/** A row on the sale: the store-product listing carrying the discount and its window. */
export type FlashSaleItem = StoreProductResponse;

/**
 * One listing in a batch. The discount and window are given once for the whole batch; an item
 * only needs to name itself, and overrides either when "everything 20% off, but the laptop at a
 * fixed 3,499" has to be one call rather than two.
 */
export interface FlashSaleItemRequest {
  storeProductId: string;
  discountType?: DiscountType;
  discountValue?: number;
  /** Overrides the batch end for this one item. UTC instant. */
  endsAt?: string;
}

/**
 * Put a batch on sale.
 *
 * The dates are sent as exact instants (`startsAt` / `endsAt`) rather than as the API's calendar
 * `startsOn` / `endsOn`: the dashboard has already resolved what the admin typed against the
 * shop's clock, and sending the instant keeps that resolution in one place instead of relying on
 * both ends agreeing about which day midnight belongs to.
 */
export interface AssignFlashSaleRequest {
  /** The store listings going on sale — plural, one call, one window. */
  items: FlashSaleItemRequest[];
  discountType: DiscountType;
  /** PERCENTAGE: percent off the store price. FIXED: the sale price itself. */
  discountValue: number;
  /** Optional. Omitted means the sale is live immediately. UTC instant. */
  startsAt?: string;
  /** Required — a flash sale without an end is just a markdown. UTC instant, inclusive. */
  endsAt: string;
}

/** Take a batch off the sale: clears the discount and its window on every id. */
export interface RemoveFromFlashSaleRequest {
  storeProductIds: string[];
}
