export type VehicleType = "BICYCLE" | "FOOT" | "SCOOTER" | "CAR";
export type CourierStatus = "ACTIVE" | "OFFLINE" | "SUSPENDED";

// ── Create ────────────────────────────────────────────────────────────────────

export interface CreateCourierData {
  firstName: string;
  lastName: string;
  phone: string;
  email?: string;
  initialPassword: string;
  vehicleType: VehicleType;
  vehicleMake?: string;
  vehicleModel?: string;
  vehicleYear?: number;
  vehicleColor?: string;
  licensePlate?: string;          // required for SCOOTER / CAR
  drivingLicenseNumber?: string;  // required for SCOOTER / CAR
  drivingLicenseExpiry?: string;  // "YYYY-MM-DD" — required for SCOOTER / CAR
}

// Backward-compat alias (used in service & pages)
export type CreateCourierRequest = CreateCourierData;

// ── Update profile ────────────────────────────────────────────────────────────

export interface UpdateCourierData {
  firstName?: string;
  lastName?: string;
  email?: string;
  vehicleType?: VehicleType;
}

// ── Status / availability ─────────────────────────────────────────────────────

export interface UpdateCourierStatusRequest {
  status: CourierStatus;
}

export interface UpdateAvailabilityRequest {
  available: boolean;
}

// ── Responses ─────────────────────────────────────────────────────────────────

export interface CourierSummary {
  courierId: string;
  firstName: string;
  lastName: string;
  phone: string;
  accountStatus: CourierStatus;
  isAvailable: boolean;
  vehicleType: VehicleType;
}

export interface CourierDetail extends CourierSummary {
  email?: string;
  rating?: number | null;
  profileImageUrl?: string;
  /** Single driving-licence image URL returned by the API. */
  drivingLicenceImageUrl?: string;
  // Extended vehicle fields (may be present in the actual API response)
  vehicleMake?: string;
  vehicleModel?: string;
  vehicleYear?: number;
  vehicleColor?: string;
  licensePlate?: string;
  vehicleRegistrationUrl?: string;
  drivingLicenseNumber?: string;
  drivingLicenseExpiry?: string;
  requiresDrivingLicense?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CourierListResponse {
  content: CourierSummary[];
  size: number;
  /** 0-based current page number (API field: `number`). */
  number: number;
  totalElements: number;
  totalPages: number;
}
