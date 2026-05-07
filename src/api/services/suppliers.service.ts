import { apiClient } from "../client";
import type { ApiResponse } from "../types/api.types";

export interface SupplierApplication {
  id: string;
  /** Set once approved — id of the linked Supplier entity. */
  supplierId?: string | null;
  fullName: string;
  businessName?: string;
  sellerType: string;
  country?: string;
  city?: string;
  email: string;
  phoneNumber?: string;
  preferredContact: string;
  productCategories?: string;
  mainBrands?: string;
  productCondition?: string;
  initialListingRange?: string;
  sellsElsewhere?: string;
  canProvideImages?: string;
  avgDispatchTime?: string;
  handlesReturns?: string;
  hasTradeLicense?: string;
  tradeLicenseUrl?: string;
  websiteOrSocialLink?: string;
  whyBuyology?: string;
  declarationAccepted: boolean;
  status: "PENDING" | "APPROVED" | "REJECTED";
  rejectionReason?: string;
  createdAt: string;
  /** Null when application not yet approved; true/false once a Supplier exists. */
  passwordSet?: boolean | null;
}

export interface SupplierProduct {
  id: string;
  sku: string;
  status: string;
  supplierStatus: "PENDING_REVIEW" | "APPROVED" | "REJECTED";
  supplierRejectionReason?: string;
  supplierId?: string;
  categoryId?: string;
}

export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}

function buildQuery(params: Record<string, string | number | undefined | null>): string {
  const qs = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null && v !== "")
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join("&");
  return qs ? `?${qs}` : "";
}

export const suppliersService = {
  listApplications(params?: {
    page?: number;
    size?: number;
    status?: string;
  }): Promise<ApiResponse<PageResponse<SupplierApplication>>> {
    const qs = buildQuery({ page: params?.page, size: params?.size, status: params?.status });
    return apiClient.get<ApiResponse<PageResponse<SupplierApplication>>>(`/api/admin/suppliers${qs}`);
  },

  getApplication(id: string): Promise<ApiResponse<SupplierApplication>> {
    return apiClient.get<ApiResponse<SupplierApplication>>(`/api/admin/suppliers/${id}`);
  },

  approveApplication(id: string, storeIds: string[]): Promise<ApiResponse<unknown>> {
    return apiClient.post<ApiResponse<unknown>>(`/api/admin/suppliers/${id}/approve`, { storeIds });
  },

  rejectApplication(id: string, reason: string): Promise<ApiResponse<unknown>> {
    return apiClient.post<ApiResponse<unknown>>(`/api/admin/suppliers/${id}/reject`, { reason });
  },

  listSupplierProducts(params?: {
    page?: number;
    size?: number;
    supplierStatus?: string;
    supplierId?: string;
  }): Promise<ApiResponse<PageResponse<SupplierProduct>>> {
    const qs = buildQuery({
      page: params?.page,
      size: params?.size,
      supplierStatus: params?.supplierStatus,
      supplierId: params?.supplierId,
    });
    return apiClient.get<ApiResponse<PageResponse<SupplierProduct>>>(`/api/admin/supplier-products${qs}`);
  },

  approveProduct(productId: string): Promise<ApiResponse<unknown>> {
    return apiClient.post<ApiResponse<unknown>>(`/api/admin/supplier-products/${productId}/approve`);
  },

  rejectProduct(productId: string, reason: string): Promise<ApiResponse<unknown>> {
    return apiClient.post<ApiResponse<unknown>>(`/api/admin/supplier-products/${productId}/reject`, { reason });
  },

  getAssignedStores(): Promise<ApiResponse<unknown[]>> {
    return apiClient.get<ApiResponse<unknown[]>>("/api/supplier/stores");
  },

  getCurrentSupplier(): Promise<ApiResponse<{
    id: string;
    businessName: string;
    contactEmail: string;
    contactPhone?: string;
    status: string;
    frozenAt?: string | null;
    deletedAt?: string | null;
    createdAt: string;
  }>> {
    return apiClient.get("/api/supplier/me");
  },

  getMyProducts(params?: {
    page?: number;
    size?: number;
    supplierStatus?: string;
  }): Promise<ApiResponse<PageResponse<SupplierProduct>>> {
    const qs = buildQuery({
      page: params?.page,
      size: params?.size,
      supplierStatus: params?.supplierStatus,
    });
    return apiClient.get<ApiResponse<PageResponse<SupplierProduct>>>(`/api/supplier/products${qs}`);
  },

  submitProduct(data: {
    categoryId: string;
    storeId: string;
    sku: string;
    storePrice: number;
    productJson?: string;
  }): Promise<ApiResponse<string>> {
    const qs = buildQuery({
      categoryId: data.categoryId,
      storeId: data.storeId,
      sku: data.sku,
      storePrice: data.storePrice,
      productJson: data.productJson,
    });
    return apiClient.post<ApiResponse<string>>(`/api/supplier/products${qs}`);
  },

  getAnalyticsSummary(): Promise<ApiResponse<{ totalOrders: number; totalRevenue: number }>> {
    return apiClient.get<ApiResponse<{ totalOrders: number; totalRevenue: number }>>("/api/supplier/analytics/summary");
  },

  getAnalyticsStats(fromDate: string, toDate: string): Promise<ApiResponse<unknown>> {
    const qs = buildQuery({ fromDate, toDate });
    return apiClient.get<ApiResponse<unknown>>(`/api/supplier/analytics/stats${qs}`);
  },

  // ── Admin: supplier store assignments ─────────────────────────────────────
  listAssignedStores(supplierId: string): Promise<ApiResponse<Array<{ id: string; name: string }>>> {
    return apiClient.get<ApiResponse<Array<{ id: string; name: string }>>>(
      `/api/admin/suppliers/${supplierId}/stores`,
    );
  },
  assignStore(supplierId: string, storeId: string): Promise<ApiResponse<string>> {
    return apiClient.post<ApiResponse<string>>(
      `/api/admin/suppliers/${supplierId}/stores/${storeId}`,
    );
  },
  unassignStore(supplierId: string, storeId: string): Promise<ApiResponse<string>> {
    return apiClient.delete<ApiResponse<string>>(
      `/api/admin/suppliers/${supplierId}/stores/${storeId}`,
    );
  },

  // ── Admin: supplier lifecycle ─────────────────────────────────────────────
  freezeSupplier(id: string): Promise<ApiResponse<string>> {
    return apiClient.post<ApiResponse<string>>(`/api/admin/suppliers/${id}/freeze`);
  },
  unfreezeSupplier(id: string): Promise<ApiResponse<string>> {
    return apiClient.post<ApiResponse<string>>(`/api/admin/suppliers/${id}/unfreeze`);
  },
  trashSupplier(id: string): Promise<ApiResponse<string>> {
    return apiClient.delete<ApiResponse<string>>(`/api/admin/suppliers/${id}`);
  },
  restoreSupplier(id: string): Promise<ApiResponse<string>> {
    return apiClient.post<ApiResponse<string>>(`/api/admin/suppliers/${id}/restore`);
  },
  /** Re-send the set-password email to a supplier who hasn't completed setup. */
  resendSupplierSetup(supplierId: string): Promise<ApiResponse<string>> {
    return apiClient.post<ApiResponse<string>>(`/api/admin/suppliers/${supplierId}/resend-setup`);
  },

  // ── Supplier portal: self-service ─────────────────────────────────────────
  freezeMyAccount(): Promise<ApiResponse<string>> {
    return apiClient.post<ApiResponse<string>>(`/api/supplier/account/freeze`);
  },
  unfreezeMyAccount(): Promise<ApiResponse<string>> {
    return apiClient.post<ApiResponse<string>>(`/api/supplier/account/unfreeze`);
  },
  deleteMyAccount(): Promise<ApiResponse<string>> {
    return apiClient.delete<ApiResponse<string>>(`/api/supplier/account`);
  },

  // ── Supplier portal: product draft/trash ──────────────────────────────────
  publishProduct(id: string): Promise<ApiResponse<string>> {
    return apiClient.patch<ApiResponse<string>>(`/api/supplier/products/${id}/publish`);
  },
  draftProduct(id: string): Promise<ApiResponse<string>> {
    return apiClient.patch<ApiResponse<string>>(`/api/supplier/products/${id}/draft`);
  },
  softDeleteProduct(id: string): Promise<ApiResponse<void>> {
    return apiClient.delete<ApiResponse<void>>(`/api/supplier/products/${id}`);
  },
  listMyTrash(params?: { page?: number; size?: number }): Promise<ApiResponse<PageResponse<SupplierProduct>>> {
    const qs = buildQuery({ page: params?.page, size: params?.size });
    return apiClient.get<ApiResponse<PageResponse<SupplierProduct>>>(`/api/supplier/products/trash${qs}`);
  },
  restoreMyProduct(id: string): Promise<ApiResponse<string>> {
    return apiClient.post<ApiResponse<string>>(`/api/supplier/products/${id}/restore`);
  },

  // ── Supplier portal: product image upload (PNG/WebP, bg removed) ──────────
  uploadProductImages(productId: string, files: File[]): Promise<ApiResponse<{ uploaded: number; urls: string[] }>> {
    const form = new FormData();
    for (const f of files) form.append("files", f);
    return apiClient.post<ApiResponse<{ uploaded: number; urls: string[] }>>(
      `/api/supplier/products/${productId}/images`,
      form,
    );
  },

  // ── Supplier portal: reviews ──────────────────────────────────────────────
  listMyReviews(params?: {
    productId?: string;
    page?: number;
    size?: number;
  }): Promise<ApiResponse<PageResponse<unknown>>> {
    const qs = buildQuery({
      productId: params?.productId,
      page: params?.page,
      size: params?.size,
    });
    return apiClient.get<ApiResponse<PageResponse<unknown>>>(`/api/supplier/reviews${qs}`);
  },
  getReviewsSummary(): Promise<
    ApiResponse<{ totalReviews: number; averageRating: number; productCount: number }>
  > {
    return apiClient.get<
      ApiResponse<{ totalReviews: number; averageRating: number; productCount: number }>
    >(`/api/supplier/reviews/summary`);
  },
  getProductReviewsSummary(productId: string): Promise<ApiResponse<unknown>> {
    return apiClient.get<ApiResponse<unknown>>(
      `/api/supplier/products/${productId}/reviews/summary`,
    );
  },
};
