import { apiClient } from "../client";
import type { ApiResponse } from "../types/api.types";

export type RevenuePeriod = "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY";
export type RevenueExportFormat = "CSV" | "XLSX";
export type RevenueExportType = "PLATFORM" | "SUPPLIER_ALL" | "SUPPLIER";

export interface RevenueBucketRow {
  period: string;
  orders: number;
  revenue: number;
  refunded: number;
  net: number;
}

export interface RevenueReportResponse {
  period: RevenuePeriod;
  from: string;
  to: string;
  scopeLabel: string;
  totalRevenue: number;
  totalRefunded: number;
  netRevenue: number;
  totalOrders: number;
  buckets: RevenueBucketRow[];
}

export interface SupplierRevenueRow {
  supplierId: string;
  businessName: string;
  orders: number;
  revenue: number;
  refunded: number;
  net: number;
}

export interface SupplierRevenueOverviewResponse {
  period: RevenuePeriod;
  from: string;
  to: string;
  totalRevenue: number;
  totalRefunded: number;
  netRevenue: number;
  totalOrders: number;
  suppliers: SupplierRevenueRow[];
}

export interface RevenueExportRecord {
  id: string;
  exportType: RevenueExportType;
  format: RevenueExportFormat;
  period: RevenuePeriod;
  fromDate: string;
  toDate: string;
  supplierId?: string | null;
  fileName: string;
  fileSize: number;
  exportedByUserId?: string | null;
  exportedByEmail?: string | null;
  exportedByRole?: string | null;
  createdAt: string;
  downloadUrl?: string | null;
}

export interface RevenueFilter {
  period?: RevenuePeriod;
  from?: string;
  to?: string;
}

function buildQuery(params: Record<string, string | number | undefined | null>): string {
  const qs = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null && v !== "")
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join("&");
  return qs ? `?${qs}` : "";
}

/** Open a presigned download URL so the browser saves the file. */
export function downloadExport(record: RevenueExportRecord | null | undefined): void {
  if (!record?.downloadUrl) return;
  const a = document.createElement("a");
  a.href = record.downloadUrl;
  a.target = "_blank";
  a.rel = "noopener";
  a.download = record.fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

export const revenueService = {
  // ── Admin: view ───────────────────────────────────────────────────────────
  getPlatformRevenue(filter: RevenueFilter = {}): Promise<ApiResponse<RevenueReportResponse>> {
    const qs = buildQuery({ period: filter.period, from: filter.from, to: filter.to });
    return apiClient.get<ApiResponse<RevenueReportResponse>>(`/api/admin/revenue/platform${qs}`);
  },

  getSupplierRevenueOverview(filter: RevenueFilter = {}): Promise<ApiResponse<SupplierRevenueOverviewResponse>> {
    const qs = buildQuery({ period: filter.period, from: filter.from, to: filter.to });
    return apiClient.get<ApiResponse<SupplierRevenueOverviewResponse>>(`/api/admin/revenue/suppliers${qs}`);
  },

  getSupplierRevenue(supplierId: string, filter: RevenueFilter = {}): Promise<ApiResponse<RevenueReportResponse>> {
    const qs = buildQuery({ period: filter.period, from: filter.from, to: filter.to });
    return apiClient.get<ApiResponse<RevenueReportResponse>>(`/api/admin/revenue/suppliers/${supplierId}${qs}`);
  },

  // ── Super admin: export + history ───────────────────────────────────────────
  createExport(params: {
    type: "PLATFORM" | "SUPPLIER_ALL";
    format: RevenueExportFormat;
    period?: RevenuePeriod;
    from?: string;
    to?: string;
  }): Promise<ApiResponse<RevenueExportRecord>> {
    const qs = buildQuery({
      type: params.type,
      format: params.format,
      period: params.period,
      from: params.from,
      to: params.to,
    });
    return apiClient.post<ApiResponse<RevenueExportRecord>>(`/api/admin/revenue/exports${qs}`);
  },

  listExports(): Promise<ApiResponse<RevenueExportRecord[]>> {
    return apiClient.get<ApiResponse<RevenueExportRecord[]>>(`/api/admin/revenue/exports`);
  },

  // ── Supplier portal: self-service ─────────────────────────────────────────
  getMyRevenue(filter: RevenueFilter = {}): Promise<ApiResponse<RevenueReportResponse>> {
    const qs = buildQuery({ period: filter.period, from: filter.from, to: filter.to });
    return apiClient.get<ApiResponse<RevenueReportResponse>>(`/api/supplier/analytics/revenue${qs}`);
  },

  exportMyRevenue(params: {
    format: RevenueExportFormat;
    period?: RevenuePeriod;
    from?: string;
    to?: string;
  }): Promise<ApiResponse<RevenueExportRecord>> {
    const qs = buildQuery({
      format: params.format,
      period: params.period,
      from: params.from,
      to: params.to,
    });
    return apiClient.post<ApiResponse<RevenueExportRecord>>(`/api/supplier/analytics/revenue/export${qs}`);
  },
};
