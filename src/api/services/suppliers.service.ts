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

export const suppliersService = {
  listApplications(params?: {
    page?: number;
    size?: number;
    status?: string;
  }): Promise<ApiResponse<PageResponse<SupplierApplication>>> {
    return apiClient.get("/api/admin/suppliers", { params });
  },

  getApplication(id: string): Promise<ApiResponse<SupplierApplication>> {
    return apiClient.get(`/api/admin/suppliers/${id}`);
  },

  approveApplication(id: string, storeIds: string[]): Promise<ApiResponse<unknown>> {
    return apiClient.post(`/api/admin/suppliers/${id}/approve`, { storeIds });
  },

  rejectApplication(id: string, reason: string): Promise<ApiResponse<unknown>> {
    return apiClient.post(`/api/admin/suppliers/${id}/reject`, { reason });
  },

  listSupplierProducts(params?: {
    page?: number;
    size?: number;
    supplierStatus?: string;
    supplierId?: string;
  }): Promise<ApiResponse<PageResponse<SupplierProduct>>> {
    return apiClient.get("/api/admin/supplier-products", { params });
  },

  approveProduct(productId: string): Promise<ApiResponse<unknown>> {
    return apiClient.post(`/api/admin/supplier-products/${productId}/approve`);
  },

  rejectProduct(productId: string, reason: string): Promise<ApiResponse<unknown>> {
    return apiClient.post(`/api/admin/supplier-products/${productId}/reject`, { reason });
  },

  getAssignedStores(): Promise<ApiResponse<unknown[]>> {
    return apiClient.get("/api/supplier/stores");
  },

  getMyProducts(params?: {
    page?: number;
    size?: number;
    supplierStatus?: string;
  }): Promise<ApiResponse<PageResponse<SupplierProduct>>> {
    return apiClient.get("/api/supplier/products", { params });
  },

  submitProduct(data: {
    categoryId: string;
    storeId: string;
    sku: string;
    storePrice: number;
    productJson?: string;
  }): Promise<ApiResponse<string>> {
    const params = new URLSearchParams();
    params.append("categoryId", data.categoryId);
    params.append("storeId", data.storeId);
    params.append("sku", data.sku);
    params.append("storePrice", String(data.storePrice));
    if (data.productJson) params.append("productJson", data.productJson);
    return apiClient.post(`/api/supplier/products?${params.toString()}`);
  },

  getAnalyticsSummary(): Promise<ApiResponse<{ totalOrders: number; totalRevenue: number }>> {
    return apiClient.get("/api/supplier/analytics/summary");
  },

  getAnalyticsStats(fromDate: string, toDate: string): Promise<ApiResponse<unknown>> {
    return apiClient.get("/api/supplier/analytics/stats", { params: { fromDate, toDate } });
  },
};
