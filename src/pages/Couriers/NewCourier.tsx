import { useState } from "react";
import { useNavigate } from "react-router";
import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import { couriersService, ApiRequestError } from "../../api";
import type { VehicleType, CreateCourierRequest } from "../../types";

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function FormField({
  label,
  required,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium text-gray-600 dark:text-gray-400">
        {label}
        {required && <span className="ml-0.5 text-red-500">*</span>}
      </label>
      {children}
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}

const inputClass =
  "w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-2.5 text-sm text-gray-800 dark:text-white placeholder-gray-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-400/20 transition-all";

const selectClass =
  "w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-2.5 text-sm text-gray-800 dark:text-white focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-400/20 transition-all";

// ---------------------------------------------------------------------------
// Form state type
// ---------------------------------------------------------------------------

interface FormState {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  initialPassword: string;
  vehicleType: VehicleType;
  vehicleMake: string;
  vehicleModel: string;
  vehicleYear: string;
  vehicleColor: string;
  licensePlate: string;
  drivingLicenseNumber: string;
  drivingLicenseExpiry: string;
}

interface FileState {
  profileImage: File | null;
  vehicleRegistration: File | null;
  drivingLicenceFront: File | null;
  drivingLicenceBack: File | null;
}

const VEHICLE_TYPES: VehicleType[] = ["BICYCLE", "FOOT", "SCOOTER", "CAR"];
const NEEDS_LICENSE: VehicleType[] = ["SCOOTER", "CAR"];

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function NewCourier() {
  const navigate = useNavigate();

  const [form, setForm] = useState<FormState>({
    firstName: "",
    lastName: "",
    phone: "",
    email: "",
    initialPassword: "",
    vehicleType: "SCOOTER",
    vehicleMake: "",
    vehicleModel: "",
    vehicleYear: "",
    vehicleColor: "",
    licensePlate: "",
    drivingLicenseNumber: "",
    drivingLicenseExpiry: "",
  });

  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [fileErrors, setFileErrors] = useState<Partial<Record<keyof FileState, string>>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [files, setFiles] = useState<FileState>({
    profileImage: null,
    vehicleRegistration: null,
    drivingLicenceFront: null,
    drivingLicenceBack: null,
  });

  const requiresLicense = NEEDS_LICENSE.includes(form.vehicleType);

  const set = (key: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm((prev) => ({ ...prev, [key]: e.target.value }));
    setFieldErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const setFile = (key: keyof FileState) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.currentTarget.files?.[0] || null;
    setFiles((prev) => ({ ...prev, [key]: file }));
    setFileErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const validateFiles = (): boolean => {
    const errs: Partial<Record<keyof FileState, string>> = {};
    const MAX_SIZE = 10 * 1024 * 1024; // 10 MB
    const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

    const validateFile = (file: File | null, name: string, required: boolean = false) => {
      if (!file && required) {
        return `${name} is required.`;
      }
      if (file) {
        if (!ALLOWED_TYPES.includes(file.type)) {
          return `${name} must be JPEG, PNG, or WebP.`;
        }
        if (file.size > MAX_SIZE) {
          return `${name} must be less than 10 MB.`;
        }
      }
      return null;
    };

    const profileErr = validateFile(files.profileImage, "Profile image");
    if (profileErr) errs.profileImage = profileErr;

    const regErr = validateFile(files.vehicleRegistration, "Vehicle registration");
    if (regErr) errs.vehicleRegistration = regErr;

    if (requiresLicense) {
      const frontErr = validateFile(files.drivingLicenceFront, "Driving licence front image", true);
      if (frontErr) errs.drivingLicenceFront = frontErr;

      const backErr = validateFile(files.drivingLicenceBack, "Driving licence back image", true);
      if (backErr) errs.drivingLicenceBack = backErr;
    }

    setFileErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const validate = (): boolean => {
    const errs: Partial<Record<keyof FormState, string>> = {};

    if (!form.firstName.trim()) errs.firstName = "First name is required.";
    if (!form.lastName.trim()) errs.lastName = "Last name is required.";
    if (!form.phone.trim()) errs.phone = "Phone is required.";
    if (form.initialPassword.length < 8) errs.initialPassword = "Password must be at least 8 characters.";
    if (form.initialPassword.length > 100) errs.initialPassword = "Password must be at most 100 characters.";
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      errs.email = "Enter a valid email address.";
    }
    if (requiresLicense) {
      if (!form.licensePlate.trim()) errs.licensePlate = "License plate is required for this vehicle type.";
      if (!form.drivingLicenseNumber.trim()) errs.drivingLicenseNumber = "Driving licence number is required.";
      if (!form.drivingLicenseExpiry) errs.drivingLicenseExpiry = "Driving licence expiry is required.";
    }
    if (form.vehicleYear && (isNaN(Number(form.vehicleYear)) || Number(form.vehicleYear) < 1900 || Number(form.vehicleYear) > 2100)) {
      errs.vehicleYear = "Enter a valid year between 1900 and 2100.";
    }

    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate() || !validateFiles()) return;

    const payload: CreateCourierRequest = {
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      phone: form.phone.trim(),
      initialPassword: form.initialPassword,
      vehicleType: form.vehicleType,
    };

    if (form.email) payload.email = form.email.trim();
    if (form.vehicleMake) payload.vehicleMake = form.vehicleMake.trim();
    if (form.vehicleModel) payload.vehicleModel = form.vehicleModel.trim();
    if (form.vehicleYear) payload.vehicleYear = Number(form.vehicleYear);
    if (form.vehicleColor) payload.vehicleColor = form.vehicleColor.trim();
    if (requiresLicense) {
      payload.licensePlate = form.licensePlate.trim();
      payload.drivingLicenseNumber = form.drivingLicenseNumber.trim();
      payload.drivingLicenseExpiry = form.drivingLicenseExpiry;
    }

    setLoading(true);
    setSubmitError(null);

    couriersService
      .create(payload, {
        profileImage: files.profileImage || undefined,
        vehicleRegistration: files.vehicleRegistration || undefined,
        drivingLicenceFront: files.drivingLicenceFront || undefined,
        drivingLicenceBack: files.drivingLicenceBack || undefined,
      })
      .then((data) => navigate(`/admin/couriers/${data.courierId}`))
      .catch((err: unknown) => {
        if (err instanceof ApiRequestError) {
          setSubmitError(err.message);
        } else {
          setSubmitError("Failed to create courier. Please try again.");
        }
      })
      .finally(() => setLoading(false));
  };

  return (
    <>
      <PageMeta title="New Courier | Buyology Dashboard" description="Create a new courier account." />
      <PageBreadcrumb pageTitle="New Courier" />

      <div className="max-w-2xl">
        <form onSubmit={handleSubmit} noValidate className="space-y-6">

          {/* Submit error */}
          {submitError && (
            <div className="rounded-2xl border border-red-200 dark:border-red-800/40 bg-red-50 dark:bg-red-500/5 px-5 py-3">
              <p className="text-sm text-red-600 dark:text-red-400">{submitError}</p>
            </div>
          )}

          {/* ── Personal Info ──────────────────────────────────────────── */}
          <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03] p-6">
            <h2 className="mb-5 text-base font-semibold text-gray-800 dark:text-white/90">Personal Information</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField label="First name" required error={fieldErrors.firstName}>
                <input
                  type="text"
                  placeholder="John"
                  maxLength={100}
                  value={form.firstName}
                  onChange={set("firstName")}
                  className={`${inputClass} ${fieldErrors.firstName ? "border-red-400 focus:ring-red-400/20" : ""}`}
                />
              </FormField>

              <FormField label="Last name" required error={fieldErrors.lastName}>
                <input
                  type="text"
                  placeholder="Smith"
                  maxLength={100}
                  value={form.lastName}
                  onChange={set("lastName")}
                  className={`${inputClass} ${fieldErrors.lastName ? "border-red-400 focus:ring-red-400/20" : ""}`}
                />
              </FormField>

              <FormField label="Phone" required error={fieldErrors.phone}>
                <input
                  type="tel"
                  placeholder="+994501234567"
                  maxLength={30}
                  value={form.phone}
                  onChange={set("phone")}
                  className={`${inputClass} ${fieldErrors.phone ? "border-red-400 focus:ring-red-400/20" : ""}`}
                />
              </FormField>

              <FormField label="Email" error={fieldErrors.email}>
                <input
                  type="email"
                  placeholder="john@example.com"
                  maxLength={150}
                  value={form.email}
                  onChange={set("email")}
                  className={`${inputClass} ${fieldErrors.email ? "border-red-400 focus:ring-red-400/20" : ""}`}
                />
              </FormField>

              <FormField label="Initial password" required error={fieldErrors.initialPassword}>
                <input
                  type="password"
                  placeholder="Min 8 characters"
                  minLength={8}
                  maxLength={100}
                  value={form.initialPassword}
                  onChange={set("initialPassword")}
                  className={`${inputClass} ${fieldErrors.initialPassword ? "border-red-400 focus:ring-red-400/20" : ""}`}
                />
              </FormField>
            </div>
          </div>

          {/* ── Vehicle Info ───────────────────────────────────────────── */}
          <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03] p-6">
            <h2 className="mb-5 text-base font-semibold text-gray-800 dark:text-white/90">Vehicle Information</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField label="Vehicle type" required>
                <select value={form.vehicleType} onChange={set("vehicleType")} className={selectClass}>
                  {VEHICLE_TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </FormField>

              <FormField label="Make" error={fieldErrors.vehicleMake}>
                <input
                  type="text"
                  placeholder="e.g. Honda"
                  maxLength={100}
                  value={form.vehicleMake}
                  onChange={set("vehicleMake")}
                  className={inputClass}
                />
              </FormField>

              <FormField label="Model" error={fieldErrors.vehicleModel}>
                <input
                  type="text"
                  placeholder="e.g. PCX 125"
                  maxLength={100}
                  value={form.vehicleModel}
                  onChange={set("vehicleModel")}
                  className={inputClass}
                />
              </FormField>

              <FormField label="Year" error={fieldErrors.vehicleYear}>
                <input
                  type="number"
                  placeholder="e.g. 2022"
                  min={1900}
                  max={2100}
                  value={form.vehicleYear}
                  onChange={set("vehicleYear")}
                  className={`${inputClass} ${fieldErrors.vehicleYear ? "border-red-400 focus:ring-red-400/20" : ""}`}
                />
              </FormField>

              <FormField label="Color" error={fieldErrors.vehicleColor}>
                <input
                  type="text"
                  placeholder="e.g. Black"
                  maxLength={50}
                  value={form.vehicleColor}
                  onChange={set("vehicleColor")}
                  className={inputClass}
                />
              </FormField>
            </div>
          </div>

          {/* ── Driving Licence (conditional) ──────────────────────────── */}
          {requiresLicense && (
            <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03] p-6">
              <h2 className="mb-1 text-base font-semibold text-gray-800 dark:text-white/90">Driving Licence</h2>
              <p className="mb-5 text-xs text-gray-400 dark:text-gray-500">
                Required for SCOOTER and CAR vehicle types.
              </p>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField label="License plate" required error={fieldErrors.licensePlate}>
                  <input
                    type="text"
                    placeholder="10 BB 456"
                    maxLength={50}
                    value={form.licensePlate}
                    onChange={set("licensePlate")}
                    className={`${inputClass} ${fieldErrors.licensePlate ? "border-red-400 focus:ring-red-400/20" : ""}`}
                  />
                </FormField>

                <FormField label="Licence number" required error={fieldErrors.drivingLicenseNumber}>
                  <input
                    type="text"
                    placeholder="DL-7654321"
                    maxLength={100}
                    value={form.drivingLicenseNumber}
                    onChange={set("drivingLicenseNumber")}
                    className={`${inputClass} ${fieldErrors.drivingLicenseNumber ? "border-red-400 focus:ring-red-400/20" : ""}`}
                  />
                </FormField>

                <FormField label="Licence expiry" required error={fieldErrors.drivingLicenseExpiry}>
                  <input
                    type="date"
                    value={form.drivingLicenseExpiry}
                    onChange={set("drivingLicenseExpiry")}
                    className={`${inputClass} ${fieldErrors.drivingLicenseExpiry ? "border-red-400 focus:ring-red-400/20" : ""}`}
                  />
                </FormField>
              </div>
            </div>
          )}

          {/* ── File Uploads ───────────────────────────────────────────── */}
          <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03] p-6">
            <h2 className="mb-5 text-base font-semibold text-gray-800 dark:text-white/90">File Uploads</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField label="Profile image" error={fileErrors.profileImage}>
                <input
                  type="file"
                  accept="image/jpeg, image/png, image/webp"
                  onChange={setFile("profileImage")}
                  className={inputClass}
                />
                <p className="mt-1 text-xs text-gray-400">JPEG, PNG, or WebP — max 10 MB</p>
              </FormField>

              <FormField label="Vehicle registration" error={fileErrors.vehicleRegistration}>
                <input
                  type="file"
                  accept="image/jpeg, image/png, image/webp"
                  onChange={setFile("vehicleRegistration")}
                  className={inputClass}
                />
                <p className="mt-1 text-xs text-gray-400">JPEG, PNG, or WebP — max 10 MB</p>
              </FormField>

              {requiresLicense && (
                <>
                  <FormField label="Driving licence front" required error={fileErrors.drivingLicenceFront}>
                    <input
                      type="file"
                      accept="image/jpeg, image/png, image/webp"
                      onChange={setFile("drivingLicenceFront")}
                      className={`${inputClass} ${fileErrors.drivingLicenceFront ? "border-red-400 focus:ring-red-400/20" : ""}`}
                    />
                    <p className="mt-1 text-xs text-gray-400">JPEG, PNG, or WebP — max 10 MB</p>
                  </FormField>

                  <FormField label="Driving licence back" required error={fileErrors.drivingLicenceBack}>
                    <input
                      type="file"
                      accept="image/jpeg, image/png, image/webp"
                      onChange={setFile("drivingLicenceBack")}
                      className={`${inputClass} ${fileErrors.drivingLicenceBack ? "border-red-400 focus:ring-red-400/20" : ""}`}
                    />
                    <p className="mt-1 text-xs text-gray-400">JPEG, PNG, or WebP — max 10 MB</p>
                  </FormField>
                </>
              )}
            </div>
          </div>

          {/* ── Actions ───────────────────────────────────────────────── */}
          <div className="flex items-center justify-end gap-3 pb-6">
            <button
              type="button"
              onClick={() => navigate("/admin/couriers")}
              disabled={loading}
              className="rounded-xl border border-gray-200 dark:border-gray-700 px-5 py-2.5 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-40"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="rounded-xl bg-brand-500 hover:bg-brand-600 px-6 py-2.5 text-sm font-semibold text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {loading ? "Creating…" : "Create Courier"}
            </button>
          </div>

        </form>
      </div>
    </>
  );
}
