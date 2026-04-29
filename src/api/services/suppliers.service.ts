import { apiClient } from "../client";
import type { ApiResponse } from "../types/api.types";

export interface SupplierApplication {
  id: string;
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
};
