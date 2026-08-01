import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";
import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import { couriersService, ApiRequestError } from "../../api";
import { validateFileUpload } from "../../utils/fileValidation";
import type { CourierDetail, VehicleType, UpdateCourierData } from "../../types";

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
  email: string;
  vehicleType: VehicleType;
}

interface FileState {
  profileImage: File | null;
  drivingLicenceImage: File | null;
}

const VEHICLE_TYPES: VehicleType[] = ["BICYCLE", "FOOT", "SCOOTER", "CAR"];

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function EditCourier() {
  const navigate = useNavigate();
  const { courierId } = useParams<{ courierId: string }>();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [courier, setCourier] = useState<CourierDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState<FormState>({
    firstName: "",
    lastName: "",
    email: "",
    vehicleType: "SCOOTER",
  });

  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [fileErrors, setFileErrors] = useState<Partial<Record<keyof FileState, string>>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [files, setFiles] = useState<FileState>({
    profileImage: null,
    drivingLicenceImage: null,
  });

  // ── Load courier data ──────────────────────────────────────────────────────

  useEffect(() => {
    if (!courierId) return;

    const controller = new AbortController();
    couriersService
      .getById(courierId, controller.signal)
      .then((data) => {
        setCourier(data);
        setForm({
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.email ?? "",
          vehicleType: data.vehicleType,
        });
      })
      .catch((err: unknown) => {
        if (err instanceof ApiRequestError) {
          setError(err.message);
        } else if ((err as Error)?.name !== "AbortError") {
          setError("Failed to load courier.");
        }
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [courierId]);

  // ── Handlers ───────────────────────────────────────────────────────────────

  const set = (key: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm((prev) => ({ ...prev, [key]: e.target.value }));
    setFieldErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const setFile = (key: keyof FileState) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.currentTarget.files?.[0] || null;
    setFiles((prev) => ({ ...prev, [key]: file }));
    setFileErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const validate = (): boolean => {
    const errs: Partial<Record<keyof FormState, string>> = {};

    if (!form.firstName.trim()) errs.firstName = "First name is required.";
    if (!form.lastName.trim()) errs.lastName = "Last name is required.";
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      errs.email = "Enter a valid email address.";
    }

    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const validateFiles = async (): Promise<boolean> => {
    const errs: Partial<Record<keyof FileState, string>> = {};

    const validateFile = async (file: File | null, name: string) => {
      if (file) {
        const result = await validateFileUpload(file, "GENERAL");
        if (!result.isValid) {
          return result.message || `${name} is invalid.`;
        }
      }
      return null;
    };

    const profileErr = await validateFile(files.profileImage, "Profile image");
    if (profileErr) errs.profileImage = profileErr;

    const licenceErr = await validateFile(files.drivingLicenceImage, "Driving licence image");
    if (licenceErr) errs.drivingLicenceImage = licenceErr;

    setFileErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const isFormValid = validate();
    const areFilesValid = await validateFiles();
    if (!isFormValid || !areFilesValid || !courierId) return;

    const payload: UpdateCourierData = {
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      vehicleType: form.vehicleType,
    };

    if (form.email) payload.email = form.email.trim();

    setSaving(true);
    setSubmitError(null);

    couriersService
      .updateProfile(courierId, payload, {
        profileImage: files.profileImage || undefined,
        drivingLicenceImage: files.drivingLicenceImage || undefined,
      })
      .then((data) => {
        setCourier(data);
        setSubmitError(null);
        // Show success message
        navigate(`/admin/couriers/${courierId}`);
      })
      .catch((err: unknown) => {
        if (err instanceof ApiRequestError) {
          setSubmitError(err.message);
        } else {
          setSubmitError("Failed to update courier. Please try again.");
        }
      })
      .finally(() => setSaving(false));
  };

  // ── Loading & Error states ─────────────────────────────────────────────────

  if (loading) {
    return (
      <>
        <PageMeta title="Loading… | Buyology Dashboard" description="" />
        <PageBreadcrumb pageTitle="Edit Courier" />
        <div className="flex justify-center py-16">
          <div className="animate-spin">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 2c0 0-6 2-6 10s6 10 6 10" opacity="0.5" />
            </svg>
          </div>
        </div>
      </>
    );
  }

  if (error || !courier) {
    return (
      <>
        <PageMeta title="Error | Buyology Dashboard" description="" />
        <PageBreadcrumb pageTitle="Edit Courier" />
        <div className="rounded-xl border border-red-200 dark:border-red-800/40 bg-red-50 dark:bg-red-500/5 px-4 py-2">
          <p className="text-sm text-red-600 dark:text-red-400">{error || "Courier not found."}</p>
        </div>
        <button
          onClick={() => navigate("/admin/couriers")}
          className="mt-4 rounded-xl border border-gray-200 dark:border-gray-700 px-4 py-2.5 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        >
          ← Back to Couriers
        </button>
      </>
    );
  }

  return (
    <>
      <PageMeta
        title={`Edit ${courier.firstName} ${courier.lastName} | Buyology Dashboard`}
        description="Update courier account details."
      />
      <PageBreadcrumb pageTitle={`Edit: ${courier.firstName} ${courier.lastName}`} />

      <div className="max-w-2xl">
        <form onSubmit={handleSubmit} noValidate className="space-y-4">

          {/* Submit error */}
          {submitError && (
            <div className="rounded-xl border border-red-200 dark:border-red-800/40 bg-red-50 dark:bg-red-500/5 px-4 py-2">
              <p className="text-sm text-red-600 dark:text-red-400">{submitError}</p>
            </div>
          )}

          {/* ── Personal Info ──────────────────────────────────────────── */}
          <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
            <h2 className="mb-4 text-base font-semibold text-gray-800 dark:text-white/90">Personal Information</h2>
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
            </div>
          </div>

          {/* ── Vehicle Info ───────────────────────────────────────────── */}
          <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
            <h2 className="mb-4 text-base font-semibold text-gray-800 dark:text-white/90">Vehicle Information</h2>
            <div className="grid grid-cols-1 gap-4">
              <FormField label="Vehicle type" required>
                <select value={form.vehicleType} onChange={set("vehicleType")} className={selectClass}>
                  {VEHICLE_TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </FormField>
            </div>
          </div>

          {/* ── File Uploads ───────────────────────────────────────────── */}
          <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
            <h2 className="mb-4 text-base font-semibold text-gray-800 dark:text-white/90">File Uploads</h2>
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

              <FormField label="Driving licence image" error={fileErrors.drivingLicenceImage}>
                <input
                  type="file"
                  accept="image/jpeg, image/png, image/webp"
                  onChange={setFile("drivingLicenceImage")}
                  className={inputClass}
                />
                <p className="mt-1 text-xs text-gray-400">JPEG, PNG, or WebP — max 10 MB</p>
              </FormField>
            </div>
          </div>

          {/* ── Actions ───────────────────────────────────────────────── */}
          <div className="flex items-center justify-end gap-3 pb-4">
            <button
              type="button"
              onClick={() => navigate(`/admin/couriers/${courierId}`)}
              disabled={saving}
              className="rounded-xl border border-gray-200 dark:border-gray-700 px-4 py-2.5 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-40"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-brand-600 hover:bg-brand-700 px-4 py-2.5 text-sm font-semibold text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {saving ? "Saving…" : "Save Changes"}
            </button>
          </div>

        </form>
      </div>
    </>
  );
}
