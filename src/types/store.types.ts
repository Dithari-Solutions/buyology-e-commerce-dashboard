export type StoreStatus = "ACTIVE" | "INACTIVE" | "SUSPENDED" | "PENDING_APPROVAL";

export type StoreAdminRole = "STORE_OWNER" | "STORE_MANAGER" | "STORE_STAFF";

export type DayOfWeek =
  | "MONDAY"
  | "TUESDAY"
  | "WEDNESDAY"
  | "THURSDAY"
  | "FRIDAY"
  | "SATURDAY"
  | "SUNDAY";

export interface Country {
  id: string;
  code: string;
  name: string;
  currency: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface StoreTranslation {
  id: string;
  language: string;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Store {
  id: string;
  countryId: string;
  countryName: string;
  name: string;
  slug: string;
  status: StoreStatus;
  bannerUrl: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  translations: StoreTranslation[];
  locations: StoreLocation[];
  createdAt: string;
  updatedAt: string;
}

export interface StoreLocation {
  id: string;
  storeId: string;
  branchName: string;
  address: string;
  city: string;
  state: string | null;
  country: string;
  postalCode: string | null;
  latitude: number;
  longitude: number;
  isPrimary: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface OperatingHours {
  id: string;
  locationId: string;
  dayOfWeek: DayOfWeek;
  openTime: string | null;
  closeTime: string | null;
  isClosed: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface StoreAdmin {
  id: string;
  storeId: string;
  storeName: string;
  userId: string;
  userFirstName: string;
  userLastName: string;
  storeRole: StoreAdminRole;
  isActive: boolean;
  assignedById: string | null;
  assignedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCountryRequest {
  code: string;
  name: string;
  currency: string;
  isActive?: boolean;
}

export interface UpdateCountryRequest {
  code?: string;
  name?: string;
  currency?: string;
  isActive?: boolean;
}

export interface CreateOperatingHoursItemRequest {
  dayOfWeek: DayOfWeek;
  openTime?: string;
  closeTime?: string;
  isClosed?: boolean;
}

export interface CreateLocationWithHoursRequest {
  branchName: string;
  address: string;
  city: string;
  state?: string;
  country: string;
  postalCode?: string;
  latitude: number;
  longitude: number;
  operatingHours: CreateOperatingHoursItemRequest[];
}

export interface CreateStoreRequest {
  countryId: string;
  name: string;
  slug: string;
  status?: StoreStatus;
  contactEmail?: string;
  contactPhone?: string;
  location: CreateLocationWithHoursRequest;
  translations?: CreateTranslationRequest[];
}

export interface CreateTranslationRequest {
  language: string;
  name: string;
  description?: string;
}

export interface UpdateStoreRequest {
  name?: string;
  slug?: string;
  status?: StoreStatus;
  contactEmail?: string;
  contactPhone?: string;
}

export interface CreateLocationRequest {
  branchName: string;
  address: string;
  city: string;
  state?: string;
  country: string;
  postalCode?: string;
  latitude: number;
  longitude: number;
  isPrimary?: boolean;
}

export interface UpdateLocationRequest {
  branchName?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  latitude?: number;
  longitude?: number;
  isPrimary?: boolean;
  isActive?: boolean;
}

export interface SetOperatingHoursRequest {
  dayOfWeek: DayOfWeek;
  openTime?: string;
  closeTime?: string;
  isClosed?: boolean;
}

export interface UpdateOperatingHoursRequest {
  openTime?: string;
  closeTime?: string;
  isClosed?: boolean;
}

export interface AssignAdminRequest {
  userId: string;
  storeRole: StoreAdminRole;
  assignedById?: string;
}

export interface UpdateAdminRequest {
  storeRole?: StoreAdminRole;
  isActive?: boolean;
}
