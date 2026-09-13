import { apiClient } from "../client";
import type {
  CourierListResponse,
  CourierSummary,
  CourierDetail,
  CourierMapEntry,
  CreateCourierData,
  UpdateCourierData,
  UpdateCourierStatusRequest,
  CourierStatus,
  VehicleType,
} from "../../types/courier.types";

const BASE = "/api/admin/couriers";

// ---------------------------------------------------------------------------
// Normalization helpers
//
// The courier API uses `id` + `status` in list/detail responses, but the
// create endpoint returns `courierId` + `accountStatus`. Normalize everything
// to the internal shape so components always see `courierId` / `accountStatus`.
// ---------------------------------------------------------------------------

function normalizeSummary(raw: Record<string, unknown>): CourierSummary {
  return {
    ...((raw as unknown) as CourierSummary),
    courierId: (raw.courierId as string) ?? (raw.id as string) ?? "",
    accountStatus:
      (raw.accountStatus as CourierStatus) ?? (raw.status as CourierStatus),
    isAvailable: (raw.isAvailable as boolean) ?? false,
  };
}

function normalizeDetail(raw: Record<string, unknown>): CourierDetail {
  return {
    ...((raw as unknown) as CourierDetail),
    courierId: (raw.courierId as string) ?? (raw.id as string) ?? "",
    accountStatus:
      (raw.accountStatus as CourierStatus) ?? (raw.status as CourierStatus),
    isAvailable: (raw.isAvailable as boolean) ?? false,
  };
}

// ---------------------------------------------------------------------------
// Multipart helper
//
// Goes through apiClient, like every other call here. It used to use raw fetch,
// on the grounds that "the httpClient always injects Content-Type:
// application/json which breaks multipart boundaries" — that has not been true
// for a while: buildHeaders leaves Content-Type off for a FormData body, so the
// browser sets the multipart boundary itself.
//
// Staying on raw fetch had a real cost. apiClient is where the silent token
// refresh lives, so these uploads were the one kind of request that could NOT
// recover from an expired access token: it went out with a stale Bearer, came
// back 403, and surfaced as a failure the admin had to resolve by signing in
// again — after picking their files a second time. Uploads are also the requests
// most likely to be made at the end of a long form, which is exactly when the
// token is most likely to have aged out.
// ---------------------------------------------------------------------------

function multipartFetch<T>(
  endpoint: string,
  method: "POST" | "PATCH",
  form: FormData,
  signal?: AbortSignal
): Promise<T> {
  return method === "POST"
    ? apiClient.post<T>(endpoint, form, { signal })
    : apiClient.patch<T>(endpoint, form, { signal });
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export const couriersService = {
  // ── 1. List couriers ──────────────────────────────────────────────────────

  getAll(
    params: {
      page?: number;
      size?: number;
      status?: CourierStatus;
      vehicleType?: VehicleType;
      isAvailable?: boolean;
      sort?: string;
      search?: string;
    } = {},
    signal?: AbortSignal
  ): Promise<CourierListResponse> {
    const {
      page = 0,
      size = 20,
      status,
      vehicleType,
      isAvailable,
      sort,
      search,
    } = params;
    const query = new URLSearchParams({
      page: String(page),
      size: String(size),
    });
    if (status) query.set("status", status);
    if (vehicleType) query.set("vehicleType", vehicleType);
    if (isAvailable !== undefined) query.set("isAvailable", String(isAvailable));
    if (sort) query.set("sort", sort);
    if (search) query.set("search", search);

    return apiClient
      .get<CourierListResponse>(`${BASE}?${query}`, { signal })
      .then((res) => ({
        ...res,
        content: res.content.map((c) =>
          normalizeSummary(c as unknown as Record<string, unknown>)
        ),
      }));
  },

  // ── 2. Get courier by ID ──────────────────────────────────────────────────

  getById(courierId: string, signal?: AbortSignal): Promise<CourierDetail> {
    return apiClient
      .get<Record<string, unknown>>(`${BASE}/${courierId}`, { signal })
      .then(normalizeDetail);
  },

  // ── 3. Create courier (multipart/form-data) ───────────────────────────────
  //
  // POST /api/admin/couriers
  // Parts: `data` (JSON string) + optional file parts.
  // drivingLicenceFront / drivingLicenceBack are required when vehicle type
  // is SCOOTER or CAR — enforced by the form UI before calling this method.

  async create(
    data: CreateCourierData,
    files?: {
      profileImage?: File;
      vehicleRegistration?: File;
      drivingLicenceFront?: File;
      drivingLicenceBack?: File;
    },
    signal?: AbortSignal
  ): Promise<CourierDetail> {
    const form = new FormData();
    form.append("data", JSON.stringify(data));
    if (files?.profileImage) form.append("profileImage", files.profileImage);
    if (files?.vehicleRegistration)
      form.append("vehicleRegistration", files.vehicleRegistration);
    if (files?.drivingLicenceFront)
      form.append("drivingLicenceFront", files.drivingLicenceFront);
    if (files?.drivingLicenceBack)
      form.append("drivingLicenceBack", files.drivingLicenceBack);

    const raw = await multipartFetch<Record<string, unknown>>(
      BASE,
      "POST",
      form,
      signal
    );
    return normalizeDetail(raw);
  },

  // ── 4. Update courier profile (multipart/form-data) ───────────────────────
  //
  // PATCH /api/admin/couriers/{id}
  // Parts: `data` (JSON string) + optional file parts.

  async updateProfile(
    courierId: string,
    data: UpdateCourierData,
    files?: {
      profileImage?: File;
      drivingLicenceImage?: File;
    },
    signal?: AbortSignal
  ): Promise<CourierDetail> {
    const form = new FormData();
    form.append("data", JSON.stringify(data));
    if (files?.profileImage) form.append("profileImage", files.profileImage);
    if (files?.drivingLicenceImage)
      form.append("drivingLicenceImage", files.drivingLicenceImage);

    const raw = await multipartFetch<Record<string, unknown>>(
      `${BASE}/${courierId}`,
      "PATCH",
      form,
      signal
    );
    return normalizeDetail(raw);
  },

  // ── 5. Update courier status ──────────────────────────────────────────────

  updateStatus(
    courierId: string,
    data: UpdateCourierStatusRequest
  ): Promise<{ courierId: string; accountStatus: CourierStatus; updatedAt: string }> {
    return apiClient
      .patch<Record<string, unknown>>(`${BASE}/${courierId}/status`, data)
      .then((res) => ({
        courierId:
          (res.courierId as string) ?? (res.id as string) ?? courierId,
        accountStatus:
          (res.accountStatus as CourierStatus) ??
          (res.status as CourierStatus),
        updatedAt: res.updatedAt as string,
      }));
  },

  // ── 6. Toggle courier availability ───────────────────────────────────────

  updateAvailability(
    courierId: string,
    available: boolean
  ): Promise<{ courierId: string; isAvailable: boolean; updatedAt: string }> {
    return apiClient
      .patch<Record<string, unknown>>(
        `${BASE}/${courierId}/availability`,
        { available }
      )
      .then((res) => ({
        courierId:
          (res.courierId as string) ?? (res.id as string) ?? courierId,
        isAvailable: res.isAvailable as boolean,
        updatedAt: res.updatedAt as string,
      }));
  },

  // ── 7. Delete courier (soft delete) ──────────────────────────────────────

  delete(courierId: string): Promise<void> {
    return apiClient.delete<void>(`${BASE}/${courierId}`);
  },

  // ── 8. Courier fleet map — all couriers with latest GPS ───────────────────

  getForMap(
    filters: { status?: CourierStatus; vehicleType?: VehicleType; isAvailable?: boolean } = {},
    signal?: AbortSignal
  ): Promise<CourierMapEntry[]> {
    const query = new URLSearchParams();
    if (filters.status) query.set("status", filters.status);
    if (filters.vehicleType) query.set("vehicleType", filters.vehicleType);
    if (filters.isAvailable !== undefined) query.set("isAvailable", String(filters.isAvailable));
    const qs = query.toString();
    return apiClient.get<CourierMapEntry[]>(`/api/admin/couriers/map${qs ? `?${qs}` : ""}`, { signal });
  },
};
