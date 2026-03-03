export type ProductStatus = "ACTIVE" | "INACTIVE";

export type ProductType = "SIMPLE" | "VARIABLE" | "BUNDLE";

export type DiscountType = "PERCENTAGE" | "FIXED";

export type RefurbGrade = "A" | "B" | "C" | "D";

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
  isRefurbished: boolean;
  refurbGrade: RefurbGrade | null;
  accessoryIds: string[];
  media: ProductMedia[];
  variants: ProductVariant[];
  createdAt: string;
  updatedAt: string;
}
