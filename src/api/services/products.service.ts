import { apiClient } from "../client";
import type { ApiResponse } from "../types/api.types";
import type { Product, ProductStatus, ProductType, RefurbGrade, AvailabilityStatus } from "../../types/product.types";

const BASE = "/api/admin/product";

export type ProductLanguage = "EN" | "AZ" | "AR";

export interface CreateProductSpecOption {
  localKey: string;
  // Library mode: send only globalOptionId (backend fills values)
  globalOptionId?: string;
  // Manual mode: fill all language fields
  valueAz?: string;
  valueEn?: string;
  valueAr?: string;
  unit?: string;
}

export interface CreateProductSpec {
  // Mode A: reference an existing global spec group
  globalSpecGroupId?: string;
  // Mode B: define inline (find-or-create by code)
  code?: string;
  nameAz?: string;
  nameEn?: string;
  nameAr?: string;
  options: CreateProductSpecOption[];
}

export interface CreateProductVariant {
  sku: string;
  specOptionLocalKeys: string[];
}

export interface CreateProductColor {
  localKey: string;
  valueAz: string;
  valueEn: string;
  valueAr: string;
  colorCode: string;
  mediaIndices: number[];
}

export interface CreateProductRequest {
  // Optional manual SKU. If omitted/blank, the backend auto-generates one
  // (DTAX-/DTDX- prefix). If provided it must be globally unique.
  sku?: string;
  categoryId: string;
  brandId: string | null;
  productType: ProductType;
  status: ProductStatus;
  isRefurbished: boolean;
  refurbGrade: RefurbGrade | null;
  availabilityStatus: AvailabilityStatus;
  isSuperDeal: boolean;
  isLimitedStock: boolean;
  accessoryIds: string[];
  translations: {
    titleAz: string;
    titleEn: string;
    titleAr: string;
    descriptionAz: string;
    descriptionEn: string;
    descriptionAr: string;
  };
  specs: CreateProductSpec[];
  variants: CreateProductVariant[];
  colors: CreateProductColor[];
}

export interface UpdateProductRequest {
  categoryId?: string;
  brandId?: string;
  productType?: ProductType;
  status?: "ACTIVE" | "INACTIVE";
  isRefurbished?: boolean;
  refurbGrade?: RefurbGrade | null;
  availabilityStatus?: AvailabilityStatus;
  isSuperDeal?: boolean;
  isLimitedStock?: boolean;
  sku?: string;
  accessoryIds?: string[];
  translations?: {
    titleAz?: string;
    titleEn?: string;
    titleAr?: string;
    descriptionAz?: string;
    descriptionEn?: string;
    descriptionAr?: string;
  };
  /** IDs of existing media to delete. */
  removeMediaIds?: string[];
  /** ID of an existing media item to mark as primary. */
  primaryMediaId?: string;
  /** Replacement specs. Present = fully replace; omit = leave untouched; [] = clear. Not allowed with variants. */
  specs?: CreateProductSpec[];
}

export interface PagedProducts {
  content: Product[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface ProductStats {
  total: number;
  active: number;
  inactive: number;
}

export const productsService = {
  /**
   * Fetch all products (unpaged). Prefer getPage() for large catalogs.
   */
  getAll(
    language: ProductLanguage = "EN",
    signal?: AbortSignal
  ): Promise<ApiResponse<Product[]>> {
    return apiClient.get<ApiResponse<Product[]>>(
      `${BASE}?lang=${language}`,
      { signal }
    );
  },

  /** Server-side paginated + searchable product list. */
  getPage(
    opts: { language?: ProductLanguage; search?: string; status?: string; page?: number; size?: number },
    signal?: AbortSignal
  ): Promise<ApiResponse<PagedProducts>> {
    const p = new URLSearchParams();
    p.set("lang", opts.language ?? "EN");
    if (opts.search?.trim()) p.set("search", opts.search.trim());
    if (opts.status && opts.status !== "ALL") p.set("status", opts.status);
    p.set("page", String(opts.page ?? 0));
    p.set("size", String(opts.size ?? 20));
    return apiClient.get<ApiResponse<PagedProducts>>(`${BASE}/page?${p.toString()}`, { signal });
  },

  /** Status counts for the dashboard stat cards. */
  getStats(signal?: AbortSignal): Promise<ApiResponse<ProductStats>> {
    return apiClient.get<ApiResponse<ProductStats>>(`${BASE}/stats`, { signal });
  },

  /**
   * Fetch a single product by ID.
   */
  getById(
    id: string,
    language: ProductLanguage = "EN",
    signal?: AbortSignal
  ): Promise<ApiResponse<Product>> {
    return apiClient.get<ApiResponse<Product>>(
      `${BASE}/${id}?lang=${language}`,
      { signal }
    );
  },

  /**
   * Activate / deactivate a product (admin). Status must be ACTIVE or INACTIVE.
   */
  setStatus(
    id: string,
    status: "ACTIVE" | "INACTIVE",
    signal?: AbortSignal
  ): Promise<ApiResponse<void>> {
    return apiClient.patch<ApiResponse<void>>(
      `${BASE}/${id}/status?status=${status}`,
      undefined,
      { signal }
    );
  },

  /**
   * Soft-delete a product — moves it to trash.
   */
  remove(id: string, signal?: AbortSignal): Promise<ApiResponse<void>> {
    return apiClient.delete<ApiResponse<void>>(`${BASE}/${id}`, { signal });
  },

  /**
   * Fetch all trashed (soft-deleted) products.
   */
  getTrash(
    language: ProductLanguage = "EN",
    signal?: AbortSignal
  ): Promise<ApiResponse<Product[]>> {
    return apiClient.get<ApiResponse<Product[]>>(
      `${BASE}/trash?lang=${language}`,
      { signal }
    );
  },

  /**
   * Restore a soft-deleted product from trash back to ACTIVE.
   */
  restore(
    id: string,
    language: ProductLanguage = "EN",
    signal?: AbortSignal
  ): Promise<ApiResponse<Product>> {
    return apiClient.put<ApiResponse<Product>>(
      `${BASE}/${id}/restore?lang=${language}`,
      undefined,
      { signal }
    );
  },

  /**
   * Partially update a product (all fields optional) and edit its media.
   * Uses multipart/form-data: `request` (JSON patch) + `files` (new media to
   * append). PATCH /api/admin/product/{id}.
   */
  async update(
    id: string,
    data: UpdateProductRequest,
    newFiles: File[],
    signal?: AbortSignal
  ): Promise<ApiResponse<Product>> {
    const formData = new FormData();
    formData.append(
      "request",
      new Blob([JSON.stringify(data)], { type: "application/json" })
    );
    newFiles.forEach((file) => formData.append("files", file));

    // Route through apiClient so multipart submits also get silent 401-refresh+retry
    // (so a long edit form isn't lost when the access token expires mid-edit).
    return apiClient.patch<ApiResponse<Product>>(`${BASE}/${id}`, formData, { signal });
  },

  /**
   * Create a new product with optional media files.
   * Uses multipart/form-data: `request` (JSON blob) + `files` (images).
   */
  async create(
    data: CreateProductRequest,
    files: File[],
    signal?: AbortSignal
  ): Promise<ApiResponse<Product>> {
    const formData = new FormData();
    formData.append(
      "request",
      new Blob([JSON.stringify(data)], { type: "application/json" })
    );
    files.forEach((file) => formData.append("files", file));

    return apiClient.post<ApiResponse<Product>>(`${BASE}/create`, formData, { signal });
  },

  /**
   * Supplier-portal counterpart to {@link create}. POSTs to
   * {@code /api/supplier/products/full} so the resulting product is auto-stamped
   * supplierId/PENDING_REVIEW/INACTIVE on the server. Uses the SAME
   * {@link CreateProductRequest} payload as admin (translations, specs,
   * variants, accessories) plus extra {@code storeId} + {@code storePrice}
   * parts identifying the store where the product is listed.
   */
  async createAsSupplier(
    data: CreateProductRequest,
    files: File[],
    storeId: string,
    storePrice: number,
    signal?: AbortSignal,
  ): Promise<ApiResponse<Product>> {
    const formData = new FormData();
    formData.append(
      "request",
      new Blob([JSON.stringify(data)], { type: "application/json" }),
    );
    files.forEach((file) => formData.append("files", file));
    formData.append("storeId", storeId);
    formData.append("storePrice", String(storePrice));

    return apiClient.post<ApiResponse<Product>>(`/api/supplier/products/full`, formData, { signal });
  },
};
