export type ProductStatus = "ACTIVE" | "INACTIVE" | "DELETED";

// ── Store Product Assignment Types ──────────────────────────────────────────

export type DiscountType = "FIXED" | "PERCENTAGE";

/**
 * Where a discount sits relative to its window, as the API reports it (`discountStatus`).
 * NONE is a row with no discount at all, not a lapsed one — a lapsed sale is ENDED and still
 * carries its type and value until somebody clears them.
 */
export type DiscountStatus = "NONE" | "SCHEDULED" | "LIVE" | "ENDED";

export interface StoreVariantResponse {
  id: string;
  variantId: string;
  variantSku: string;
  /**
   * The variant's own price column. NOT a price any customer is charged: a cart line is priced from
   * the PARENT listing's `storePrice` and discount whether or not it names a variant, so this figure
   * is store bookkeeping and nothing more. A short-lived version of the flash sale work added an
   * `effectivePrice` here — a per-variant sale price — and it is deliberately absent: there is one
   * price per listing, it is the parent's, and a second one is how a screen comes to advertise a
   * number the checkout does not charge.
   */
  storePrice: number;
  stock: number;
  isActive: boolean;
  updatedAt: string;
}

export interface StoreProductResponse {
  id: string;
  storeId: string;
  productId: string;
  productSku: string;
  /**
   * NULLABLE. The API fills this from the product's EN translation and leaves it out when there is
   * none, so a product translated into Arabic only arrives with no title at all. It was typed as a
   * plain `string` here, which is how `productTitle.toLowerCase()` came to compile — render it
   * through `productLabel()` in utils/storeProduct rather than reading it directly.
   */
  productTitle: string | null;
  storePrice: number;
  effectivePrice: number;
  discountType: DiscountType | null;
  discountValue: number | null;
  /**
   * The window the discount runs in. A null start means "already started" and a null end means
   * "never ends", so a discount with neither date is a permanent markdown that prices exactly as
   * it always has. Optional so a deployment still reads correctly if these arrive before the
   * flash-sale backend does: an undated discount reads as live, which is what it was.
   */
  discountStartsAt?: string | null;
  discountEndsAt?: string | null;
  /**
   * Whether the discount is being applied at this instant. Needed because outside the window
   * `effectivePrice` reverts to `storePrice` while discountType/discountValue stay set — without
   * this the table would badge a scheduled or lapsed sale as a live one.
   */
  discountActive?: boolean;
  /** The server's own NONE / SCHEDULED / LIVE / ENDED verdict on the window above. */
  discountStatus?: DiscountStatus;
  /** True when the discount is live AND has an end date: a flash sale, not a permanent markdown. */
  onFlashSale?: boolean;
  /** The countdown value for a live flash sale; null otherwise. */
  flashSaleEndsAt?: string | null;
  isActive: boolean;
  b2cEnabled: boolean;
  b2bEnabled: boolean;
  createdAt: string;
  updatedAt: string;
  variants: StoreVariantResponse[];
}

export interface AssignVariantInlineRequest {
  variantId: string;
  storePrice: number;
  stock: number;
  isActive?: boolean;
}

export interface AssignProductToStoreRequest {
  productId: string;
  storePrice: number;
  discountType?: DiscountType;
  discountValue?: number;
  /** Sale window, UTC instants. Omit both for a discount that starts now and never ends. */
  discountStartsAt?: string;
  discountEndsAt?: string;
  isActive?: boolean;
  /** Available in the consumer shop (B2C). Defaults to true. */
  b2cEnabled?: boolean;
  /** Available for B2B (bulk/quotes). Defaults to false. */
  b2bEnabled?: boolean;
  variants?: AssignVariantInlineRequest[];
}

export interface UpdateStoreProductRequest {
  storePrice?: number;
  discountType?: DiscountType | null;
  discountValue?: number | null;
  /**
   * Sale window, UTC instants. Every field of this PATCH treats null/absent as "leave unchanged",
   * these two included — so a null here does NOT clear a date. Use the two flags below, which are
   * the only way to take something away through this endpoint.
   */
  discountStartsAt?: string;
  discountEndsAt?: string;
  /** Remove the discount entirely: type, value AND the window. */
  clearDiscount?: boolean;
  /** Clear just the dates and keep the discount — turns a flash sale into a permanent markdown. */
  clearDiscountWindow?: boolean;
  isActive?: boolean;
  /** Available in the consumer shop (B2C). null = unchanged. */
  b2cEnabled?: boolean | null;
  /** Available for B2B (bulk/quotes). null = unchanged. */
  b2bEnabled?: boolean | null;
}

export interface AssignVariantToStoreRequest {
  variantId: string;
  storePrice: number;
  stock: number;
  isActive?: boolean;
}

export interface UpdateStoreVariantRequest {
  storePrice?: number;
  stock?: number;
  isActive?: boolean;
}

export type ProductType = "SIMPLE" | "DIY" | "ACCESSORY";

export type RefurbGrade = "A" | "B" | "C";

export type AvailabilityStatus = "IN_STOCK" | "OUT_OF_STOCK" | "PRE_ORDER";

export interface ProductSpecOption {
  id: string;
  value: string;
  unit?: string;
}

export interface ProductSpec {
  id: string;
  code: string;
  name: string;
  options: ProductSpecOption[];
}

export interface ProductVariant {
  id: string;
  sku: string;
  specOptionIds: string[];
}

export interface ProductMedia {
  id: string;
  mediaType: string;
  url: string;
  thumbnailUrl: string | null;
  isPrimary: boolean;
  orderIndex: number;
}

export interface Product {
  id: string;
  title: string;
  description: string;
  sku: string;
  status: ProductStatus;
  productType: ProductType;
  categoryId: string;
  brandId: string | null;
  brandName: string | null;
  isRefurbished: boolean;
  refurbGrade: RefurbGrade | null;
  availabilityStatus: AvailabilityStatus;
  isSuperDeal: boolean;
  isLimitedStock: boolean;
  stockQuantity?: number | null;
  /**
   * Units on hand, and a hard ceiling on orders. Absent/null = not tracked, so the
   * product sells without a limit — a missing value is NEVER zero.
   */
  availableQuantity?: number | null;
  accessoryIds: string[];
  colors: string[];
  slug: string;
  media: ProductMedia[];
  specs: ProductSpec[];
  variants: ProductVariant[];
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}
