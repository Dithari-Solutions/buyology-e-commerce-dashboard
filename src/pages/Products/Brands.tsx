import { useEffect, useRef, useState } from "react";
import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import Badge from "../../components/ui/badge/Badge";
import { brandsService, ApiRequestError } from "../../api";
import type { Brand, CreateBrandRequest } from "../../types";

// ─────────────────────────────────────────────────────────────────────────────
// Input / Field helpers
// ─────────────────────────────────────────────────────────────────────────────

function Field({
  label,
  value,
  onChange,
  placeholder,
  error,
  dir,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  error?: string;
  dir?: "rtl" | "ltr";
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
        {label} <span className="text-red-500">*</span>
      </label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        dir={dir}
        className={`h-9 w-full rounded-lg border bg-transparent px-4 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:outline-none focus:ring-3 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 ${
          error
            ? "border-red-400 focus:border-red-400 focus:ring-red-400/20"
            : "border-gray-300 focus:border-[#FBBB14] focus:ring-[#FBBB14]/30 dark:border-gray-700"
        }`}
      />
      {error && (
        <p className="mt-1 text-xs text-red-500 dark:text-red-400">{error}</p>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Confirm deactivate modal
// ─────────────────────────────────────────────────────────────────────────────

function DeactivateModal({
  brand,
  onConfirm,
  onCancel,
  loading,
}: {
  brand: Brand;
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-xl bg-white dark:bg-gray-900 p-4 shadow-theme-lg">
        <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-orange-100 dark:bg-orange-500/10">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-orange-500">
            <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        </div>
        <h3 className="text-base font-semibold text-gray-800 dark:text-white">
          Deactivate Brand
        </h3>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          Are you sure you want to deactivate <strong>{brand.translations.find((t) => t.language === "EN")?.name ?? brand.id}</strong>? It will be soft-deactivated (status → INACTIVE). Products linked to this brand will retain the reference.
        </p>
        <div className="mt-4 flex justify-end gap-3">
          <button
            onClick={onCancel}
            disabled={loading}
            className="rounded-lg border border-gray-300 dark:border-gray-700 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600 disabled:opacity-50 transition-colors"
          >
            {loading && (
              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
              </svg>
            )}
            Deactivate
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Skeleton row
// ─────────────────────────────────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <tr className="border-b border-gray-100 dark:border-gray-800">
      {[120, 100, 100, 60, 80].map((w, i) => (
        <td key={i} className="px-4 py-2.5">
          <div
            className="h-3 rounded-full bg-gray-100 dark:bg-gray-800 animate-pulse"
            style={{ width: w }}
          />
        </td>
      ))}
    </tr>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────

type FormErrors = Partial<{ nameAz: string; nameEn: string; nameAr: string }>;

export default function Brands() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Create form
  const [showForm, setShowForm] = useState(false);
  const [nameAz, setNameAz] = useState("");
  const [nameEn, setNameEn] = useState("");
  const [nameAr, setNameAr] = useState("");
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [submitted, setSubmitted] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Deactivate
  const [deactivating, setDeactivating] = useState<Brand | null>(null);
  const [deactivateLoading, setDeactivateLoading] = useState(false);

  const abortRef = useRef<AbortController | null>(null);

  function fetchBrands() {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setLoading(true);
    setError(null);

    brandsService
      .getAll(ctrl.signal)
      .then((res) => setBrands(res.data))
      .catch((err: unknown) => {
        if (err instanceof Error && err.name === "AbortError") return;
        setError(
          err instanceof ApiRequestError ? err.message : "Failed to load brands."
        );
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    fetchBrands();
    return () => abortRef.current?.abort();
  }, []);

  function validate(): FormErrors {
    const e: FormErrors = {};
    if (!nameAz.trim()) e.nameAz = "Required";
    if (!nameEn.trim()) e.nameEn = "Required";
    if (!nameAr.trim()) e.nameAr = "Required";
    return e;
  }

  function resetForm() {
    setNameAz("");
    setNameEn("");
    setNameAr("");
    setFormErrors({});
    setSubmitted(false);
    setCreateError(null);
    setShowForm(false);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSubmitted(true);
    setCreateError(null);
    const errs = validate();
    setFormErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setCreating(true);
    try {
      const data: CreateBrandRequest = {
        nameAz: nameAz.trim(),
        nameEn: nameEn.trim(),
        nameAr: nameAr.trim(),
      };
      await brandsService.create(data);
      resetForm();
      fetchBrands();
    } catch (err) {
      setCreateError(
        err instanceof ApiRequestError
          ? err.message
          : "Failed to create brand."
      );
    } finally {
      setCreating(false);
    }
  }

  async function handleDeactivate() {
    if (!deactivating) return;
    setDeactivateLoading(true);
    try {
      await brandsService.deactivate(deactivating.id);
      setDeactivating(null);
      fetchBrands();
    } catch (err) {
      setError(
        err instanceof ApiRequestError
          ? err.message
          : "Failed to deactivate brand."
      );
      setDeactivating(null);
    } finally {
      setDeactivateLoading(false);
    }
  }

  const activeCount = brands.filter((b) => b.status === "ACTIVE").length;
  const inactiveCount = brands.filter((b) => b.status === "INACTIVE").length;

  return (
    <>
      <PageMeta
        title="Brands | Buyology Dashboard"
        description="Manage product brands in the Buyology platform."
      />
      <PageBreadcrumb pageTitle="Brands" />

      {deactivating && (
        <DeactivateModal
          brand={deactivating}
          onConfirm={handleDeactivate}
          onCancel={() => setDeactivating(null)}
          loading={deactivateLoading}
        />
      )}

      {/* Stats */}
      <div className="mb-4 grid grid-cols-3 gap-4">
        {[
          { label: "Total Brands", value: brands.length, color: "text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-500/10" },
          { label: "Active", value: activeCount, color: "text-success-600 dark:text-success-400 bg-success-50 dark:bg-success-500/10" },
          { label: "Inactive", value: inactiveCount, color: "text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800" },
        ].map((s) => (
          <div
            key={s.label}
            className="flex items-center gap-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4"
          >
            <div>
              <p className={`text-xl font-bold leading-none ${s.color.split(" ")[0]} ${s.color.split(" ")[1]}`}>
                {loading ? "—" : s.value}
              </p>
              <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-base font-semibold text-gray-800 dark:text-white/90">
          All Brands
          {!loading && (
            <span className="ml-2 text-sm font-normal text-gray-400">({brands.length})</span>
          )}
        </h2>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="inline-flex items-center gap-2 rounded-lg bg-[#402F75] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#332560] transition-colors"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Add Brand
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <div className="mb-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 overflow-hidden">
          <div className="border-b border-gray-100 dark:border-gray-700 bg-[#402F75]/5 dark:bg-[#402F75]/20 px-4 py-2.5">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-[#402F75] dark:text-[#FBBB14]">
              New Brand
            </h3>
          </div>
          <form onSubmit={handleCreate} noValidate className="p-4">
            {createError && (
              <div className="mb-4 flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 dark:border-red-800/40 dark:bg-red-500/5 px-4 py-2.5">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0 text-red-500">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <p className="text-sm text-red-600 dark:text-red-400">{createError}</p>
              </div>
            )}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Field
                label="Name AZ"
                value={nameAz}
                onChange={setNameAz}
                placeholder="Apple"
                error={submitted ? formErrors.nameAz : undefined}
              />
              <Field
                label="Name EN"
                value={nameEn}
                onChange={setNameEn}
                placeholder="Apple"
                error={submitted ? formErrors.nameEn : undefined}
              />
              <Field
                label="Name AR"
                value={nameAr}
                onChange={setNameAr}
                placeholder="Apple"
                dir="rtl"
                error={submitted ? formErrors.nameAr : undefined}
              />
            </div>
            <div className="mt-4 flex justify-end gap-3">
              <button
                type="button"
                onClick={resetForm}
                disabled={creating}
                className="rounded-lg border border-gray-300 dark:border-gray-700 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={creating}
                className="inline-flex items-center gap-2 rounded-lg bg-[#402F75] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#332560] disabled:opacity-50 transition-colors"
              >
                {creating ? (
                  <>
                    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                    </svg>
                    Creating…
                  </>
                ) : (
                  "Create Brand"
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-red-200 dark:border-red-800/40 bg-red-50 dark:bg-red-500/5 py-14 text-center">
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mb-3 text-red-400">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <p className="text-sm font-medium text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Table */}
      {!error && (
        <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900">
                  {["Name EN", "Name AZ", "Name AR", "Status", "Actions"].map((col) => (
                    <th
                      key={col}
                      className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500"
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading && Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)}

                {!loading &&
                  brands.map((brand) => (
                    <tr
                      key={brand.id}
                      className="border-b border-gray-100 dark:border-gray-800 last:border-0"
                    >
                      <td className="px-4 py-2.5 text-sm font-semibold text-gray-800 dark:text-white/90">
                        {brand.translations.find((t) => t.language === "EN")?.name ?? "—"}
                      </td>
                      <td className="px-4 py-2.5 text-sm text-gray-600 dark:text-gray-300">
                        {brand.translations.find((t) => t.language === "AZ")?.name ?? "—"}
                      </td>
                      <td className="px-4 py-2.5 text-sm text-gray-600 dark:text-gray-300" dir="rtl">
                        {brand.translations.find((t) => t.language === "AR")?.name ?? "—"}
                      </td>
                      <td className="px-4 py-2.5">
                        <Badge size="sm" color={brand.status === "ACTIVE" ? "success" : "light"}>
                          {brand.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-2.5">
                        {brand.status === "ACTIVE" && (
                          <button
                            onClick={() => setDeactivating(brand)}
                            className="rounded-lg border border-orange-200 dark:border-orange-700/40 bg-orange-50 dark:bg-orange-500/10 px-3 py-1.5 text-xs font-medium text-orange-600 dark:text-orange-400 hover:bg-orange-100 dark:hover:bg-orange-500/20 transition-colors"
                          >
                            Deactivate
                          </button>
                        )}
                        {brand.status === "INACTIVE" && (
                          <span className="text-xs text-gray-400 dark:text-gray-500">Inactive</span>
                        )}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>

          {!loading && brands.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" className="mb-4 text-gray-300 dark:text-gray-600">
                <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
                <path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16" />
              </svg>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                No brands found. Add your first brand above.
              </p>
            </div>
          )}
        </div>
      )}

    </>
  );
}
