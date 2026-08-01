import { useRef, useState } from "react";
import { ApiRequestError } from "../../api";
import {
  b2bMembershipService,
  type ConvertUserToB2bRequest,
  type MembershipApplication,
} from "../../api/services/b2b-membership.service";

// ---------------------------------------------------------------------------
// Option lists — kept in lockstep with the public B2B sign-up form
// (buyology-web) and the backend allowlists.
// ---------------------------------------------------------------------------

const INDUSTRIES = [
  "Information Technology",
  "Telecommunications",
  "Electronics Retail",
  "Healthcare",
  "Education",
  "Finance & Banking",
  "Logistics & Supply Chain",
  "Manufacturing",
  "Government",
  "Other",
];

// Company-size buckets. Values are sent verbatim as numberOfEmployees and MUST
// match the backend allowlist (AdminConvertToB2bRequest @Pattern).
const COMPANY_SIZE_OPTIONS = [
  "1-10",
  "11-50",
  "51-200",
  "201-500",
  "501-1000",
  "1001-5000",
  "5001-10000",
  "10001+",
];

const BUSINESS_NEEDS_OPTIONS = [
  "Buying devices",
  "Repairs",
  "IT asset disposal",
  "Bulk procurement",
  "Managed IT services",
  "Other",
];

// Trade-license upload rules — mirror the backend FileValidationUtils.validateDocument
// allowlist. The server additionally verifies magic bytes.
const ALLOWED_LICENSE_EXT = ["pdf", "jpg", "jpeg", "png", "webp"];
const ALLOWED_LICENSE_MIME = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
const MAX_LICENSE_BYTES = 10 * 1024 * 1024; // 10 MB

function validateLicenseFile(file: File): string {
  const ext = file.name.includes(".") ? file.name.split(".").pop()!.toLowerCase() : "";
  if (!ALLOWED_LICENSE_EXT.includes(ext) || !ALLOWED_LICENSE_MIME.includes(file.type)) {
    return "Unsupported file type. Upload a PDF or image (PDF, JPG, PNG, or WebP).";
  }
  if (file.size > MAX_LICENSE_BYTES) {
    return "The file is too large. Maximum size is 10 MB.";
  }
  return "";
}

// ---------------------------------------------------------------------------
// Styles (match the dashboard's form conventions — see Admins/NewAdmin.tsx)
// ---------------------------------------------------------------------------

const inputClass =
  "w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-2.5 text-sm text-gray-800 dark:text-white placeholder-gray-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-400/20 transition-all disabled:opacity-60 disabled:cursor-not-allowed";

const selectClass = inputClass;

function Field({
  label,
  required,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium text-gray-600 dark:text-gray-400">
        {label}
        {required && <span className="ml-0.5 text-red-500">*</span>}
      </label>
      {children}
      {hint && <p className="mt-1 text-[11px] text-gray-400 dark:text-gray-500">{hint}</p>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Modal
// ---------------------------------------------------------------------------

export interface ConvertToB2bUser {
  userId: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phoneNumber: string | null;
}

export default function ConvertToB2bModal({
  user,
  onClose,
  onSuccess,
}: {
  user: ConvertToB2bUser;
  onClose: () => void;
  onSuccess: (app: MembershipApplication) => void;
}) {
  const [form, setForm] = useState({
    companyName: "",
    tradeLicenseNumber: "",
    industryType: "",
    numberOfEmployees: "",
    country: "",
    city: "",
    website: "",
    contactFullName: [user.firstName, user.lastName].filter(Boolean).join(" "),
    contactDesignation: "",
    contactEmail: user.email ?? "",
    contactMobile: user.phoneNumber ?? "",
  });
  const [businessNeeds, setBusinessNeeds] = useState<string[]>([]);
  const [licenseFile, setLicenseFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const set = (k: keyof typeof form, v: string) => setForm((prev) => ({ ...prev, [k]: v }));

  const toggleNeed = (need: string) =>
    setBusinessNeeds((prev) =>
      prev.includes(need) ? prev.filter((n) => n !== need) : [...prev, need],
    );

  const onPickFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const fileErr = validateLicenseFile(file);
    if (fileErr) {
      setError(fileErr);
      setLicenseFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    setError("");
    setLicenseFile(file);
  };

  function validate(): string {
    if (!form.companyName.trim()) return "Company name is required.";
    if (!form.tradeLicenseNumber.trim()) return "Trade license number is required.";
    if (!licenseFile) return "Please upload the trade license document.";
    if (!form.industryType) return "Industry type is required.";
    if (!form.numberOfEmployees) return "Please select the company size.";
    if (!form.country.trim()) return "Country is required.";
    if (!form.city.trim()) return "City is required.";
    if (!form.contactFullName.trim()) return "Contact full name is required.";
    if (!form.contactDesignation.trim()) return "Contact designation is required.";
    if (!form.contactEmail.trim() || !/\S+@\S+\.\S+/.test(form.contactEmail))
      return "A valid contact email is required.";
    if (!form.contactMobile.trim()) return "Contact mobile number is required.";
    return "";
  }

  async function handleSubmit() {
    const err = validate();
    if (err) {
      setError(err);
      return;
    }
    if (!licenseFile) return;
    setError("");
    setSubmitting(true);
    try {
      const payload: ConvertUserToB2bRequest = {
        companyName: form.companyName.trim(),
        tradeLicenseNumber: form.tradeLicenseNumber.trim(),
        industryType: form.industryType,
        numberOfEmployees: form.numberOfEmployees,
        country: form.country.trim(),
        city: form.city.trim(),
        website: form.website.trim() || undefined,
        contactFullName: form.contactFullName.trim(),
        contactDesignation: form.contactDesignation.trim(),
        contactEmail: form.contactEmail.trim(),
        contactMobile: form.contactMobile.trim(),
        businessNeeds: businessNeeds.length ? businessNeeds : undefined,
      };
      const res = await b2bMembershipService.convertUser(user.userId, payload, licenseFile);
      onSuccess(res.data);
    } catch (e: unknown) {
      setError(
        e instanceof ApiRequestError ? e.message : "Failed to convert user. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 backdrop-blur-sm px-4 py-5"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !submitting) onClose();
      }}
    >
      <div className="w-full max-w-2xl rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-theme-lg">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-gray-100 dark:border-gray-800 px-4 py-2.5">
          <div>
            <h3 className="text-base font-semibold text-gray-800 dark:text-white/90">
              Convert to B2B Membership
            </h3>
            <p className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">
              Creates a pending B2B application for this user. It appears in the Applications
              queue and becomes an active membership once approved.
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={submitting}
            className="flex-shrink-0 rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50 transition-colors"
            aria-label="Close"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="px-4 py-3 space-y-4">
          {error && (
            <div className="rounded-xl border border-red-200 dark:border-red-800/40 bg-red-50 dark:bg-red-500/10 px-4 py-2.5 text-sm text-red-600 dark:text-red-400">
              {error}
            </div>
          )}

          {/* Company details */}
          <div className="space-y-4">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
              Company details
            </h4>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Company name" required>
                <input
                  value={form.companyName}
                  onChange={(e) => set("companyName", e.target.value)}
                  placeholder="Acme Technologies LLC"
                  maxLength={200}
                  className={inputClass}
                />
              </Field>
              <Field label="Trade license number" required>
                <input
                  value={form.tradeLicenseNumber}
                  onChange={(e) => set("tradeLicenseNumber", e.target.value)}
                  placeholder="TL-123456"
                  maxLength={100}
                  className={inputClass}
                />
              </Field>
            </div>

            <Field label="Trade license document" required hint="Required. PDF or image, max 10 MB.">
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp"
                onChange={onPickFile}
                className="hidden"
                id="b2b-convert-license-file"
              />
              <label
                htmlFor="b2b-convert-license-file"
                className={`flex items-center justify-between gap-3 w-full rounded-xl border px-4 py-2.5 text-sm cursor-pointer transition-all ${
                  licenseFile
                    ? "border-brand-400 bg-brand-50 dark:bg-brand-500/10"
                    : "border-dashed border-gray-300 dark:border-gray-600 hover:border-brand-400"
                }`}
              >
                <span
                  className={`truncate ${
                    licenseFile
                      ? "text-brand-600 dark:text-brand-400 font-medium"
                      : "text-gray-400 dark:text-gray-500"
                  }`}
                >
                  {licenseFile ? licenseFile.name : "Upload PDF or image (PDF, JPG, PNG, WebP)"}
                </span>
                <span className="shrink-0 text-xs font-semibold text-brand-500">
                  {licenseFile ? "Change" : "Browse"}
                </span>
              </label>
            </Field>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Industry type" required>
                <select
                  value={form.industryType}
                  onChange={(e) => set("industryType", e.target.value)}
                  className={selectClass}
                >
                  <option value="">Select industry</option>
                  {INDUSTRIES.map((i) => (
                    <option key={i} value={i}>
                      {i}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Company size" required>
                <select
                  value={form.numberOfEmployees}
                  onChange={(e) => set("numberOfEmployees", e.target.value)}
                  className={selectClass}
                >
                  <option value="">Select company size</option>
                  {COMPANY_SIZE_OPTIONS.map((size) => (
                    <option key={size} value={size}>
                      {size} employees
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Country" required>
                <input
                  value={form.country}
                  onChange={(e) => set("country", e.target.value)}
                  placeholder="UAE"
                  maxLength={100}
                  className={inputClass}
                />
              </Field>
              <Field label="City" required>
                <input
                  value={form.city}
                  onChange={(e) => set("city", e.target.value)}
                  placeholder="Dubai"
                  maxLength={100}
                  className={inputClass}
                />
              </Field>
            </div>

            <Field label="Website">
              <input
                value={form.website}
                onChange={(e) => set("website", e.target.value)}
                placeholder="https://acme.com"
                maxLength={300}
                className={inputClass}
              />
            </Field>
          </div>

          {/* Contact person */}
          <div className="space-y-4">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
              Contact person
            </h4>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Full name" required>
                <input
                  value={form.contactFullName}
                  onChange={(e) => set("contactFullName", e.target.value)}
                  placeholder="John Smith"
                  maxLength={200}
                  className={inputClass}
                />
              </Field>
              <Field label="Designation" required>
                <input
                  value={form.contactDesignation}
                  onChange={(e) => set("contactDesignation", e.target.value)}
                  placeholder="IT Manager"
                  maxLength={100}
                  className={inputClass}
                />
              </Field>
              <Field label="Email" required hint="Pre-filled from the user's account.">
                <input
                  type="email"
                  value={form.contactEmail}
                  onChange={(e) => set("contactEmail", e.target.value)}
                  placeholder="john@acme.com"
                  maxLength={255}
                  className={inputClass}
                />
              </Field>
              <Field label="Mobile number" required hint="Pre-filled from the user's profile.">
                <input
                  value={form.contactMobile}
                  onChange={(e) => set("contactMobile", e.target.value)}
                  placeholder="+971501234567"
                  maxLength={50}
                  className={inputClass}
                />
              </Field>
            </div>
          </div>

          {/* Business needs */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
              Business needs
            </h4>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {BUSINESS_NEEDS_OPTIONS.map((need) => {
                const checked = businessNeeds.includes(need);
                return (
                  <button
                    key={need}
                    type="button"
                    onClick={() => toggleNeed(need)}
                    className={`rounded-xl border px-3 py-2 text-xs text-left transition-all ${
                      checked
                        ? "border-brand-400 bg-brand-50 dark:bg-brand-500/10 text-brand-600 dark:text-brand-400 font-medium"
                        : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600"
                    }`}
                  >
                    {checked && <span className="mr-1">✓</span>}
                    {need}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-gray-100 dark:border-gray-800 px-4 py-2.5">
          <button
            onClick={onClose}
            disabled={submitting}
            className="rounded-xl border border-gray-200 dark:border-gray-700 px-4 py-2.5 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-40"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="rounded-xl bg-brand-600 hover:bg-brand-700 px-4 py-2.5 text-sm font-semibold text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {submitting ? "Creating…" : "Create B2B Application"}
          </button>
        </div>
      </div>
    </div>
  );
}
