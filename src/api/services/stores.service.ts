import { apiClient, getAccessToken } from "../client";
import { ApiRequestError } from "../types/api.types";
import type { ApiResponse } from "../types/api.types";
import { env } from "../../config/env";
import type {
  Country,
  Store,
  StoreTranslation,
  StoreLocation,
  OperatingHours,
  StoreAdmin,
  CreateCountryRequest,
  UpdateCountryRequest,
  CreateStoreRequest,
  UpdateStoreRequest,
  CreateTranslationRequest,
  CreateLocationRequest,
  UpdateLocationRequest,
  SetOperatingHoursRequest,
  UpdateOperatingHoursRequest,
  AssignAdminRequest,
  UpdateAdminRequest,
} from "../../types/store.types";

const BASE = "/api/stores";
const COUNTRIES = "/api/countries";

export const storesService = {
  // ── Countries ──────────────────────────────────────────────────────────────
  // POST /api/countries

  createCountry(data: CreateCountryRequest, signal?: AbortSignal): Promise<ApiResponse<Country>> {
    return apiClient.post<ApiResponse<Country>>(COUNTRIES, data, { signal });
  },

  // GET /api/countries
  getAllCountries(signal?: AbortSignal): Promise<ApiResponse<Country[]>> {
    return apiClient.get<ApiResponse<Country[]>>(COUNTRIES, { signal });
  },

  // GET /api/countries/active
  getActiveCountries(signal?: AbortSignal): Promise<ApiResponse<Country[]>> {
    return apiClient.get<ApiResponse<Country[]>>(`${COUNTRIES}/active`, { signal });
  },

  // GET /api/countries/{id}
  getCountryById(id: string, signal?: AbortSignal): Promise<ApiResponse<Country>> {
    return apiClient.get<ApiResponse<Country>>(`${COUNTRIES}/${id}`, { signal });
  },

  // PATCH /api/countries/{id}
  updateCountry(id: string, data: UpdateCountryRequest, signal?: AbortSignal): Promise<ApiResponse<Country>> {
    return apiClient.patch<ApiResponse<Country>>(`${COUNTRIES}/${id}`, data, { signal });
  },

  // DELETE /api/countries/{id}  — soft deactivation
  deactivateCountry(id: string, signal?: AbortSignal): Promise<ApiResponse<null>> {
    return apiClient.delete<ApiResponse<null>>(`${COUNTRIES}/${id}`, { signal });
  },

  // ── Stores ─────────────────────────────────────────────────────────────────
  // POST /api/stores

  // multipart/form-data: `request` (JSON blob) + optional `banner` (file)
  async create(data: CreateStoreRequest, banner?: File, signal?: AbortSignal): Promise<ApiResponse<Store>> {
    const formData = new FormData();
    formData.append("request", new Blob([JSON.stringify(data)], { type: "application/json" }));
    if (banner) formData.append("banner", banner);

    const token = getAccessToken();
    const response = await fetch(`${env.apiBaseUrl}${BASE}`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      credentials: "include",
      body: formData,
      signal,
    });

    if (!response.ok) {
      let payload: { statusCode: number; message: string };
      try { payload = await response.json(); }
      catch { payload = { statusCode: response.status, message: response.statusText || "Failed to create store." }; }
      throw new ApiRequestError(payload);
    }
    return response.json() as Promise<ApiResponse<Store>>;
  },

  // GET /api/stores
  getAll(signal?: AbortSignal): Promise<ApiResponse<Store[]>> {
    return apiClient.get<ApiResponse<Store[]>>(BASE, { signal });
  },

  // GET /api/stores/{id}
  getById(id: string, signal?: AbortSignal): Promise<ApiResponse<Store>> {
    return apiClient.get<ApiResponse<Store>>(`${BASE}/${id}`, { signal });
  },

  // GET /api/stores/slug/{slug}
  getBySlug(slug: string, signal?: AbortSignal): Promise<ApiResponse<Store>> {
    return apiClient.get<ApiResponse<Store>>(`${BASE}/slug/${slug}`, { signal });
  },

  // PATCH /api/stores/{id}  — multipart/form-data: `request` (JSON blob) + optional `banner` (file)
  async update(id: string, data: UpdateStoreRequest, banner?: File, signal?: AbortSignal): Promise<ApiResponse<Store>> {
    const formData = new FormData();
    formData.append("request", new Blob([JSON.stringify(data)], { type: "application/json" }));
    if (banner) formData.append("banner", banner);

    const token = getAccessToken();
    const response = await fetch(`${env.apiBaseUrl}${BASE}/${id}`, {
      method: "PATCH",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      credentials: "include",
      body: formData,
      signal,
    });

    if (!response.ok) {
      let payload: { statusCode: number; message: string };
      try { payload = await response.json(); }
      catch { payload = { statusCode: response.status, message: response.statusText || "Failed to update store." }; }
      throw new ApiRequestError(payload);
    }
    return response.json() as Promise<ApiResponse<Store>>;
  },

  // DELETE /api/stores/{id}  — soft-delete
  delete(id: string, signal?: AbortSignal): Promise<ApiResponse<null>> {
    return apiClient.delete<ApiResponse<null>>(`${BASE}/${id}`, { signal });
  },

  // ── Store Translations ─────────────────────────────────────────────────────
  // POST /api/stores/{storeId}/translations

  addTranslation(
    storeId: string,
    data: CreateTranslationRequest,
    signal?: AbortSignal
  ): Promise<ApiResponse<StoreTranslation>> {
    return apiClient.post<ApiResponse<StoreTranslation>>(
      `${BASE}/${storeId}/translations`,
      data,
      { signal }
    );
  },

  // PATCH /api/stores/{storeId}/translations/{language}
  updateTranslation(
    storeId: string,
    language: string,
    data: CreateTranslationRequest,
    signal?: AbortSignal
  ): Promise<ApiResponse<StoreTranslation>> {
    return apiClient.patch<ApiResponse<StoreTranslation>>(
      `${BASE}/${storeId}/translations/${language}`,
      data,
      { signal }
    );
  },

  // DELETE /api/stores/{storeId}/translations/{language}
  deleteTranslation(
    storeId: string,
    language: string,
    signal?: AbortSignal
  ): Promise<ApiResponse<null>> {
    return apiClient.delete<ApiResponse<null>>(
      `${BASE}/${storeId}/translations/${language}`,
      { signal }
    );
  },

  // ── Store Locations (Branches) ─────────────────────────────────────────────
  // POST /api/stores/{storeId}/locations

  addLocation(
    storeId: string,
    data: CreateLocationRequest,
    signal?: AbortSignal
  ): Promise<ApiResponse<StoreLocation>> {
    return apiClient.post<ApiResponse<StoreLocation>>(
      `${BASE}/${storeId}/locations`,
      data,
      { signal }
    );
  },

  // GET /api/stores/{storeId}/locations
  getLocations(storeId: string, signal?: AbortSignal): Promise<ApiResponse<StoreLocation[]>> {
    return apiClient.get<ApiResponse<StoreLocation[]>>(
      `${BASE}/${storeId}/locations`,
      { signal }
    );
  },

  // GET /api/stores/locations/{locationId}
  getLocationById(locationId: string, signal?: AbortSignal): Promise<ApiResponse<StoreLocation>> {
    return apiClient.get<ApiResponse<StoreLocation>>(
      `${BASE}/locations/${locationId}`,
      { signal }
    );
  },

  // PATCH /api/stores/locations/{locationId}
  updateLocation(
    locationId: string,
    data: UpdateLocationRequest,
    signal?: AbortSignal
  ): Promise<ApiResponse<StoreLocation>> {
    return apiClient.patch<ApiResponse<StoreLocation>>(
      `${BASE}/locations/${locationId}`,
      data,
      { signal }
    );
  },

  // DELETE /api/stores/locations/{locationId}  — sets isActive to false
  deactivateLocation(locationId: string, signal?: AbortSignal): Promise<ApiResponse<null>> {
    return apiClient.delete<ApiResponse<null>>(
      `${BASE}/locations/${locationId}`,
      { signal }
    );
  },

  // ── Operating Hours ────────────────────────────────────────────────────────
  // POST /api/stores/locations/{locationId}/hours  — one entry per day of week

  setHours(
    locationId: string,
    data: SetOperatingHoursRequest,
    signal?: AbortSignal
  ): Promise<ApiResponse<OperatingHours>> {
    return apiClient.post<ApiResponse<OperatingHours>>(
      `${BASE}/locations/${locationId}/hours`,
      data,
      { signal }
    );
  },

  // GET /api/stores/locations/{locationId}/hours  — up to 7 entries
  getHours(locationId: string, signal?: AbortSignal): Promise<ApiResponse<OperatingHours[]>> {
    return apiClient.get<ApiResponse<OperatingHours[]>>(
      `${BASE}/locations/${locationId}/hours`,
      { signal }
    );
  },

  // GET /api/stores/hours/{hoursId}
  getHoursById(hoursId: string, signal?: AbortSignal): Promise<ApiResponse<OperatingHours>> {
    return apiClient.get<ApiResponse<OperatingHours>>(
      `${BASE}/hours/${hoursId}`,
      { signal }
    );
  },

  // PATCH /api/stores/hours/{hoursId}
  updateHours(
    hoursId: string,
    data: UpdateOperatingHoursRequest,
    signal?: AbortSignal
  ): Promise<ApiResponse<OperatingHours>> {
    return apiClient.patch<ApiResponse<OperatingHours>>(
      `${BASE}/hours/${hoursId}`,
      data,
      { signal }
    );
  },

  // DELETE /api/stores/hours/{hoursId}  — removes entry entirely
  deleteHours(hoursId: string, signal?: AbortSignal): Promise<ApiResponse<null>> {
    return apiClient.delete<ApiResponse<null>>(
      `${BASE}/hours/${hoursId}`,
      { signal }
    );
  },

  // ── Store Admins ───────────────────────────────────────────────────────────
  // POST /api/stores/{storeId}/admins

  assignAdmin(
    storeId: string,
    data: AssignAdminRequest,
    signal?: AbortSignal
  ): Promise<ApiResponse<StoreAdmin>> {
    return apiClient.post<ApiResponse<StoreAdmin>>(
      `${BASE}/${storeId}/admins`,
      data,
      { signal }
    );
  },

  // GET /api/stores/{storeId}/admins  — includes inactive
  getAdmins(storeId: string, signal?: AbortSignal): Promise<ApiResponse<StoreAdmin[]>> {
    return apiClient.get<ApiResponse<StoreAdmin[]>>(
      `${BASE}/${storeId}/admins`,
      { signal }
    );
  },

  // GET /api/stores/{storeId}/admins/active
  getActiveAdmins(storeId: string, signal?: AbortSignal): Promise<ApiResponse<StoreAdmin[]>> {
    return apiClient.get<ApiResponse<StoreAdmin[]>>(
      `${BASE}/${storeId}/admins/active`,
      { signal }
    );
  },

  // GET /api/stores/admins/{adminId}  — adminId is the assignment record id, not userId
  getAdminById(adminId: string, signal?: AbortSignal): Promise<ApiResponse<StoreAdmin>> {
    return apiClient.get<ApiResponse<StoreAdmin>>(
      `${BASE}/admins/${adminId}`,
      { signal }
    );
  },

  // PATCH /api/stores/admins/{adminId}
  updateAdmin(
    adminId: string,
    data: UpdateAdminRequest,
    signal?: AbortSignal
  ): Promise<ApiResponse<StoreAdmin>> {
    return apiClient.patch<ApiResponse<StoreAdmin>>(
      `${BASE}/admins/${adminId}`,
      data,
      { signal }
    );
  },

  // DELETE /api/stores/admins/{adminId}  — sets isActive to false, does not delete record
  removeAdmin(adminId: string, signal?: AbortSignal): Promise<ApiResponse<null>> {
    return apiClient.delete<ApiResponse<null>>(
      `${BASE}/admins/${adminId}`,
      { signal }
    );
  },
};
