export type ProductStatus = "ACTIVE" | "INACTIVE" | "DELETED";

// ── Store Product Assignment Types ──────────────────────────────────────────

export type DiscountType = "FIXED" | "PERCENTAGE";

export interface StoreVariantResponse {
  id: string;
  variantId: string;
  variantSku: string;
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
  productTitle: string;
  storePrice: number;
  effectivePrice: number;
  discountType: DiscountType | null;
  discountValue: number | null;
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
