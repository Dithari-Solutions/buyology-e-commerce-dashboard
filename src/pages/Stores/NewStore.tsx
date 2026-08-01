import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import { storesService, ApiRequestError } from "../../api";
import { validateFileUpload } from "../../utils/fileValidation";
import type { Country, StoreStatus, DayOfWeek } from "../../types";
import LocationPickerMap from "../../components/store/LocationPickerMap";
import type { GeoResult } from "../../components/store/LocationPickerMap";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

type LangTab = "EN" | "AZ" | "AR";
const LANG_TABS: LangTab[] = ["EN", "AZ", "AR"];

const DAYS_OF_WEEK: DayOfWeek[] = [
  "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY",
];

const DAY_LABELS: Record<DayOfWeek, string> = {
  MONDAY: "Monday",
  TUESDAY: "Tuesday",
  WEDNESDAY: "Wednesday",
  THURSDAY: "Thursday",
  FRIDAY: "Friday",
  SATURDAY: "Saturday",
  SUNDAY: "Sunday",
};

// ---------------------------------------------------------------------------
// Form state
// ---------------------------------------------------------------------------

interface TranslationForm {
  name: string;
  description: string;
}

const emptyTranslation = (): TranslationForm => ({ name: "", description: "" });

interface LocationForm {
  branchName: string;
  address: string;
  city: string;
  state: string;
  country: string;
  postalCode: string;
  latitude: number | null;
  longitude: number | null;
}

interface HoursRow {
  dayOfWeek: DayOfWeek;
  isClosed: boolean;
  openTime: string;
  closeTime: string;
}

function defaultHours(): HoursRow[] {
  return DAYS_OF_WEEK.map((day) => ({
    dayOfWeek: day,
    isClosed: day === "SUNDAY",
    openTime: "09:00:00",
    closeTime: "18:00:00",
  }));
}

interface StoreFormState {
  countryId: string;
  name: string;
  slug: string;
  status: StoreStatus;
  contactEmail: string;
  contactPhone: string;
  location: LocationForm;
  hours: HoursRow[];
  translationEn: TranslationForm;
  translationAz: TranslationForm;
  translationAr: TranslationForm;
}

const emptyForm = (): StoreFormState => ({
  countryId: "",
  name: "",
  slug: "",
  status: "PENDING_APPROVAL",
  contactEmail: "",
  contactPhone: "",
  location: {
    branchName: "",
    address: "",
    city: "",
    state: "",
    country: "",
    postalCode: "",
    latitude: null,
    longitude: null,
  },
  hours: defaultHours(),
  translationEn: emptyTranslation(),
  translationAz: emptyTranslation(),
  translationAr: emptyTranslation(),
});

// ---------------------------------------------------------------------------
// Shared input styles
// ---------------------------------------------------------------------------

const inputCls =
  "w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-2.5 text-sm text-gray-800 dark:text-white placeholder-gray-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-400/20 transition-all";

const labelCls = "block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1";

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function NewStore() {
  const navigate = useNavigate();
  const [countries, setCountries] = useState<Country[]>([]);
  const [countriesLoading, setCountriesLoading] = useState(true);
  const [form, setForm] = useState<StoreFormState>(emptyForm());
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);
  const [langTab, setLangTab] = useState<LangTab>("EN");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleBannerChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    if (file) {
      const result = await validateFileUpload(file, "GENERAL");
      if (!result.isValid) {
        setError(result.message || "Invalid image file.");
        setBannerFile(null);
        setBannerPreview(null);
        return;
      }
    }
    setError(null);
    setBannerFile(file);
    setBannerPreview(file ? URL.createObjectURL(file) : null);
  }

  useEffect(() => {
    const controller = new AbortController();
    storesService
      .getActiveCountries(controller.signal)
      .then((res) => setCountries(res.data))
      .catch((err: unknown) => {
        if (err instanceof Error && err.name === "AbortError") return;
      })
      .finally(() => setCountriesLoading(false));
    return () => controller.abort();
  }, []);

  function setField<K extends keyof StoreFormState>(key: K, value: StoreFormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function setLocationField<K extends keyof LocationForm>(key: K, value: LocationForm[K]) {
    setForm((prev) => ({ ...prev, location: { ...prev.location, [key]: value } }));
  }

  function handleMapChange(geo: GeoResult) {
    setForm((prev) => ({
      ...prev,
      location: {
        ...prev.location,
        latitude: geo.latitude,
        longitude: geo.longitude,
        address: geo.address || prev.location.address,
        city: geo.city || prev.location.city,
        state: geo.state || prev.location.state,
        country: geo.country || prev.location.country,
        postalCode: geo.postalCode || prev.location.postalCode,
      },
    }));
  }

  function setHoursRow(day: DayOfWeek, patch: Partial<HoursRow>) {
    setForm((prev) => ({
      ...prev,
      hours: prev.hours.map((r) => (r.dayOfWeek === day ? { ...r, ...patch } : r)),
    }));
  }

  function setTranslationField(lang: LangTab, key: keyof TranslationForm, value: string) {
    const translationKey = `translation${lang.charAt(0) + lang.slice(1).toLowerCase()}` as
      | "translationEn"
      | "translationAz"
      | "translationAr";
    setForm((prev) => ({
      ...prev,
      [translationKey]: { ...prev[translationKey], [key]: value },
    }));
  }

  function handleNameChange(value: string) {
    setForm((prev) => ({ ...prev, name: value, slug: slugify(value) }));
  }

  const translationByLang: Record<LangTab, TranslationForm> = {
    EN: form.translationEn,
    AZ: form.translationAz,
    AR: form.translationAr,
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.countryId) { setError("Please select a country."); return; }
    if (!form.name.trim()) { setError("Store name is required."); return; }
    if (!form.slug.trim()) { setError("Slug is required."); return; }
    if (form.location.latitude === null || form.location.longitude === null) {
      setError("Please select the store location on the map.");
      return;
    }
    if (!form.location.branchName.trim()) { setError("Branch name is required."); return; }
    if (!form.location.address.trim()) { setError("Branch address is required."); return; }
    if (!form.location.city.trim()) { setError("Branch city is required."); return; }
    if (!form.location.country.trim()) { setError("Branch country code is required."); return; }

    setSaving(true);
    setError(null);

    const translations = (["EN", "AZ", "AR"] as LangTab[])
      .map((lang) => {
        const t = translationByLang[lang];
        if (!t.name.trim()) return null;
        return {
          language: lang.toLowerCase(),
          name: t.name,
          ...(t.description.trim() ? { description: t.description } : {}),
        };
      })
      .filter((t): t is NonNullable<typeof t> => t !== null);

    try {
      const res = await storesService.create(
        {
          countryId: form.countryId,
          name: form.name,
          slug: form.slug,
          status: form.status,
          ...(form.contactEmail.trim() ? { contactEmail: form.contactEmail } : {}),
          ...(form.contactPhone.trim() ? { contactPhone: form.contactPhone } : {}),
          location: {
            branchName: form.location.branchName,
            address: form.location.address,
            city: form.location.city,
            ...(form.location.state.trim() ? { state: form.location.state } : {}),
            country: form.location.country,
            ...(form.location.postalCode.trim() ? { postalCode: form.location.postalCode } : {}),
            latitude: form.location.latitude!,
            longitude: form.location.longitude!,
            operatingHours: form.hours.map((r) =>
              r.isClosed
                ? { dayOfWeek: r.dayOfWeek, isClosed: true }
                : {
                    dayOfWeek: r.dayOfWeek,
                    openTime: r.openTime,
                    closeTime: r.closeTime,
                    isClosed: false,
                  }
            ),
          },
          ...(translations.length > 0 ? { translations } : {}),
        },
        bannerFile ?? undefined
      );
      navigate(`/stores/${res.data.id}`);
    } catch (err: unknown) {
      setError(err instanceof ApiRequestError ? err.message : "Failed to create store.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <PageMeta title="New Store | Buyology Dashboard" description="Create a new store." />
      <PageBreadcrumb pageTitle="New Store" />

      <form onSubmit={handleSubmit} className="max-w-2xl space-y-4">
        {/* Basic Info */}
        <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
          <h2 className="mb-4 text-base font-semibold text-gray-800 dark:text-white/90">Basic Information</h2>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className={labelCls}>Country *</label>
              <select
                value={form.countryId}
                onChange={(e) => setField("countryId", e.target.value)}
                className={inputCls}
                disabled={countriesLoading}
              >
                <option value="">{countriesLoading ? "Loading countries…" : "Select a country"}</option>
                {countries.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.code}) — {c.currency}
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className={labelCls}>Store Name *</label>
              <input
                type="text"
                placeholder="e.g. Buyology Baku"
                value={form.name}
                onChange={(e) => handleNameChange(e.target.value)}
                className={inputCls}
              />
            </div>

            <div className="sm:col-span-2">
              <label className={labelCls}>Slug *</label>
              <input
                type="text"
                placeholder="buyology-baku"
                value={form.slug}
                onChange={(e) => setField("slug", e.target.value)}
                className={inputCls}
              />
              <p className="mt-1 text-xs text-gray-400">Unique URL identifier. Auto-generated from name.</p>
            </div>

            <div>
              <label className={labelCls}>Status</label>
              <select
                value={form.status}
                onChange={(e) => setField("status", e.target.value as StoreStatus)}
                className={inputCls}
              >
                <option value="PENDING_APPROVAL">Pending Approval</option>
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
                <option value="SUSPENDED">Suspended</option>
              </select>
            </div>
          </div>
        </div>

        {/* Contact */}
        <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
          <h2 className="mb-4 text-base font-semibold text-gray-800 dark:text-white/90">Contact</h2>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className={labelCls}>Contact Email</label>
              <input
                type="email"
                placeholder="store@example.com"
                value={form.contactEmail}
                onChange={(e) => setField("contactEmail", e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Contact Phone</label>
              <input
                type="text"
                placeholder="+994501234567"
                value={form.contactPhone}
                onChange={(e) => setField("contactPhone", e.target.value)}
                className={inputCls}
              />
            </div>
          </div>
        </div>

        {/* Media */}
        <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
          <h2 className="mb-4 text-base font-semibold text-gray-800 dark:text-white/90">Media</h2>

          <div>
            <label className={labelCls}>Banner Image</label>
            {bannerPreview && (
              <img
                src={bannerPreview}
                alt="Banner preview"
                className="mb-3 h-32 w-full rounded-xl object-cover border border-gray-200 dark:border-gray-700"
              />
            )}
            <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800/40 px-4 py-2.5 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="text-gray-400 flex-shrink-0">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <polyline points="21 15 16 10 5 21" />
              </svg>
              <div>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {bannerFile ? bannerFile.name : "Choose banner image"}
                </p>
                <p className="text-xs text-gray-400">PNG, JPG, WebP</p>
              </div>
              <input type="file" accept="image/*" className="hidden" onChange={handleBannerChange} />
            </label>
          </div>
        </div>

        {/* First Location */}
        <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
          <h2 className="mb-1 text-base font-semibold text-gray-800 dark:text-white/90">First Branch Location</h2>
          <p className="mb-4 text-xs text-gray-400">
            The first branch is created together with the store. More branches can be added later.
          </p>

          <div className="space-y-4">
            {/* Map */}
            <div>
              <label className={labelCls}>Pin Location * — click or drag the marker to set coordinates</label>
              <LocationPickerMap
                initialLat={form.location.latitude}
                initialLng={form.location.longitude}
                onChange={handleMapChange}
              />
            </div>

            {/* Branch name */}
            <div>
              <label className={labelCls}>Branch Name *</label>
              <input
                type="text"
                placeholder="e.g. Baku Main Branch"
                value={form.location.branchName}
                onChange={(e) => setLocationField("branchName", e.target.value)}
                className={inputCls}
              />
            </div>

            {/* Address */}
            <div>
              <label className={labelCls}>Street Address *</label>
              <input
                type="text"
                placeholder="28 May Street, Building 5"
                value={form.location.address}
                onChange={(e) => setLocationField("address", e.target.value)}
                className={inputCls}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>City *</label>
                <input
                  type="text"
                  placeholder="Baku"
                  value={form.location.city}
                  onChange={(e) => setLocationField("city", e.target.value)}
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>State / Province</label>
                <input
                  type="text"
                  placeholder="Optional"
                  value={form.location.state}
                  onChange={(e) => setLocationField("state", e.target.value)}
                  className={inputCls}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Country Code *</label>
                <input
                  type="text"
                  placeholder="AZ"
                  maxLength={3}
                  value={form.location.country}
                  onChange={(e) => setLocationField("country", e.target.value.toUpperCase())}
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Postal Code</label>
                <input
                  type="text"
                  placeholder="AZ1000"
                  value={form.location.postalCode}
                  onChange={(e) => setLocationField("postalCode", e.target.value)}
                  className={inputCls}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Operating Hours */}
        <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
          <h2 className="mb-1 text-base font-semibold text-gray-800 dark:text-white/90">Operating Hours</h2>
          <p className="mb-4 text-xs text-gray-400">Set the weekly schedule for the first branch.</p>

          <div className="space-y-2">
            {/* Header */}
            <div className="grid grid-cols-[120px_64px_1fr_1fr] gap-3 items-center px-1 pb-1 border-b border-gray-100 dark:border-gray-800">
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Day</span>
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400 text-center">Closed</span>
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Open</span>
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Close</span>
            </div>

            {form.hours.map((row) => (
              <div key={row.dayOfWeek} className="grid grid-cols-[120px_64px_1fr_1fr] gap-3 items-center">
                <span className="text-sm text-gray-700 dark:text-gray-300">{DAY_LABELS[row.dayOfWeek]}</span>

                {/* Closed toggle */}
                <div className="flex justify-center">
                  <button
                    type="button"
                    onClick={() => setHoursRow(row.dayOfWeek, { isClosed: !row.isClosed })}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                      row.isClosed ? "bg-red-400" : "bg-gray-200 dark:bg-gray-700"
                    }`}
                  >
                    <span
                      className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
                        row.isClosed ? "translate-x-4" : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>

                {/* Open time */}
                <input
                  type="time"
                  step="1"
                  value={row.openTime.slice(0, 5)}
                  disabled={row.isClosed}
                  onChange={(e) =>
                    setHoursRow(row.dayOfWeek, { openTime: `${e.target.value.slice(0, 5)}:00` })
                  }
                  className={`${inputCls} ${row.isClosed ? "opacity-40 cursor-not-allowed" : ""}`}
                />

                {/* Close time */}
                <input
                  type="time"
                  step="1"
                  value={row.closeTime.slice(0, 5)}
                  disabled={row.isClosed}
                  onChange={(e) =>
                    setHoursRow(row.dayOfWeek, { closeTime: `${e.target.value.slice(0, 5)}:00` })
                  }
                  className={`${inputCls} ${row.isClosed ? "opacity-40 cursor-not-allowed" : ""}`}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Translations */}
        <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
          <h2 className="mb-4 text-base font-semibold text-gray-800 dark:text-white/90">Translations</h2>

          <div className="mb-4 flex gap-1 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60 p-1">
            {LANG_TABS.map((lang) => (
              <button
                key={lang}
                type="button"
                onClick={() => setLangTab(lang)}
                className={`flex-1 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                  langTab === lang
                    ? "bg-white dark:bg-gray-700 text-gray-800 dark:text-white shadow-theme-xs"
                    : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                }`}
              >
                {lang}
              </button>
            ))}
          </div>

          <div className="space-y-4">
            <div>
              <label className={labelCls}>Name ({langTab})</label>
              <input
                type="text"
                placeholder={`Store name in ${langTab}`}
                value={translationByLang[langTab].name}
                onChange={(e) => setTranslationField(langTab, "name", e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Description ({langTab})</label>
              <textarea
                rows={3}
                placeholder={`Description in ${langTab}`}
                value={translationByLang[langTab].description}
                onChange={(e) => setTranslationField(langTab, "description", e.target.value)}
                className={`${inputCls} resize-none`}
              />
            </div>
          </div>
        </div>

        {/* Error */}
        {error && (
          <p className="rounded-xl border border-red-200 dark:border-red-800/40 bg-red-50 dark:bg-red-500/5 px-4 py-2.5 text-sm text-red-600 dark:text-red-400">
            {error}
          </p>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => navigate("/stores")}
            disabled={saving}
            className="rounded-xl border border-gray-200 dark:border-gray-700 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-700 transition-colors disabled:opacity-60"
          >
            {saving && (
              <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
            )}
            {saving ? "Creating…" : "Create Store"}
          </button>
        </div>
      </form>
    </>
  );
}
