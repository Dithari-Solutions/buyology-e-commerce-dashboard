export type VehicleType = "BICYCLE" | "FOOT" | "SCOOTER" | "CAR";
export type CourierStatus = "ACTIVE" | "SUSPENDED" | "INACTIVE" | "PENDING";

export interface CreateCourierRequest {
  firstName: string;
  lastName: string;
  phone: string;
  email?: string;
  profileImageUrl?: string;
  initialPassword: string;
  vehicleType: VehicleType;
  vehicleMake?: string;
  vehicleModel?: string;
  vehicleYear?: number;
  vehicleColor?: string;
  licensePlate?: string;
  vehicleRegistrationUrl?: string;
  drivingLicenseNumber?: string;
  drivingLicenseExpiry?: string; // "YYYY-MM-DD"
  drivingLicenseFrontUrl?: string;
  drivingLicenseBackUrl?: string;
}

export interface UpdateCourierStatusRequest {
  status: CourierStatus;
  reason?: string;
}

export interface CourierSummary {
  courierId: string;
  firstName: string;
  lastName: string;
  phone: string;
  accountStatus: CourierStatus;
  vehicleType: VehicleType;
}

export interface CourierDetail extends CourierSummary {
  email?: string;
  profileImageUrl?: string;
  vehicleMake?: string;
  vehicleModel?: string;
  vehicleYear?: number;
  vehicleColor?: string;
  licensePlate?: string;
  vehicleRegistrationUrl?: string;
  drivingLicenseNumber?: string;
  drivingLicenseExpiry?: string;
  drivingLicenseFrontUrl?: string;
  drivingLicenseBackUrl?: string;
  requiresDrivingLicense: boolean;
  createdAt: string;
}

export interface CourierListResponse {
  content: CourierSummary[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}
