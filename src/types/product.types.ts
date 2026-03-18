export type ProductStatus = "ACTIVE" | "INACTIVE" | "DELETED";

export type ProductType = "SIMPLE" | "DIY" | "ACCESSORY";

export type DiscountType = "PERCENTAGE" | "FIXED";

export type RefurbGrade = "A" | "B" | "C";

export type AvailabilityStatus = "IN_STOCK" | "OUT_OF_STOCK" | "PRE_ORDER";

export interface ProductSpecOption {
  id: string;
  value: string;
  unit?: string;
  additionalPrice: number;
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
  price: number;
  stock: number;
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
  basePrice: number;
  effectivePrice: number;
  discountType: DiscountType | null;
  discountValue: number | null;
  categoryId: string;
  brandId: string | null;
  brandName: string | null;
  isRefurbished: boolean;
  refurbGrade: RefurbGrade | null;
  availabilityStatus: AvailabilityStatus;
  isSuperDeal: boolean;
  isLimitedStock: boolean;
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
