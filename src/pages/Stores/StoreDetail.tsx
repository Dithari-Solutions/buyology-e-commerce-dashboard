import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router";
import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import Badge from "../../components/ui/badge/Badge";
import { Modal } from "../../components/ui/modal";
import { storesService, storeProductsService, ApiRequestError } from "../../api";
import { validateFileUpload } from "../../utils/fileValidation";
import type { StoreProductResponse } from "../../types";
import LocationPickerMap from "../../components/store/LocationPickerMap";
import type { GeoResult } from "../../components/store/LocationPickerMap";
import type {
  Store,
  StoreStatus,
  StoreTranslation,
  StoreLocation,
  OperatingHours,
  StoreAdmin,
  StoreAdminRole,
  DayOfWeek,
  UpdateStoreRequest,
  CreateLocationRequest,
  UpdateLocationRequest,
  AssignAdminRequest,
} from "../../types";

// ---------------------------------------------------------------------------
// Constants & Helpers
// ---------------------------------------------------------------------------

const DAYS_OF_WEEK: DayOfWeek[] = [
  "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY",
];

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(iso));
}

function statusColor(status: StoreStatus): "success" | "error" | "warning" | "info" | "light" {
  switch (status) {
    case "ACTIVE": return "success";
    case "INACTIVE": return "error";
    case "SUSPENDED": return "error";
    case "PENDING_APPROVAL": return "warning";
  }
}

function statusLabel(status: StoreStatus): string {
  switch (status) {
    case "ACTIVE": return "Active";
    case "INACTIVE": return "Inactive";
    case "SUSPENDED": return "Suspended";
    case "PENDING_APPROVAL": return "Pending Approval";
  }
}

function roleColor(role: StoreAdminRole): "success" | "error" | "warning" | "info" | "light" {
  switch (role) {
    case "STORE_OWNER": return "info";
    case "STORE_MANAGER": return "warning";
    case "STORE_STAFF": return "light";
  }
}

const inputCls =
  "w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-2.5 text-sm text-gray-800 dark:text-white placeholder-gray-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-400/20 transition-all";

const labelCls = "block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1";

// ---------------------------------------------------------------------------
// Spinner
// ---------------------------------------------------------------------------

function Spinner() {
  return (
    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Edit Store Modal
// ---------------------------------------------------------------------------

interface EditStoreModalProps {
  isOpen: boolean;
  onClose: () => void;
  store: Store;
  onSaved: (updated: Store) => void;
}

function EditStoreModal({ isOpen, onClose, store, onSaved }: EditStoreModalProps) {
  const [form, setForm] = useState<UpdateStoreRequest>({});
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setForm({
        name: store.name,
        slug: store.slug,
        status: store.status,
        contactEmail: store.contactEmail ?? "",
        contactPhone: store.contactPhone ?? "",
      });
      setBannerFile(null);
      setBannerPreview(null);
      setError(null);
    }
  }, [isOpen, store]);

  function field(key: keyof UpdateStoreRequest) {
    return {
      value: (form[key] as string) ?? "",
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
        setForm((prev) => ({ ...prev, [key]: e.target.value })),
    };
  }

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

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const res = await storesService.update(store.id, form, bannerFile ?? undefined);
      onSaved(res.data);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof ApiRequestError ? err.message : "Failed to update store.");
    } finally {
      setSaving(false);
    }
  }

  const currentBanner = bannerPreview ?? store.bannerUrl;

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="mx-4 max-w-lg w-full p-4 sm:p-5">
      <h2 className="mb-4 text-base font-semibold text-gray-800 dark:text-white/90">Edit Store</h2>

      <div className="space-y-4">
        <div>
          <label className={labelCls}>Name</label>
          <input type="text" {...field("name")} className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Slug</label>
          <input type="text" {...field("slug")} className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Status</label>
          <select {...field("status")} className={inputCls}>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
            <option value="SUSPENDED">Suspended</option>
            <option value="PENDING_APPROVAL">Pending Approval</option>
          </select>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Contact Email</label>
            <input type="email" {...field("contactEmail")} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Contact Phone</label>
            <input type="text" {...field("contactPhone")} className={inputCls} />
          </div>
        </div>
        <div>
          <label className={labelCls}>Banner Image</label>
          {currentBanner && (
            <img
              src={currentBanner}
              alt="Banner"
              className="mb-2 h-24 w-full rounded-xl object-cover border border-gray-200 dark:border-gray-700"
            />
          )}
          <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800/40 px-4 py-2.5 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="text-gray-400 flex-shrink-0">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
            <span className="text-sm text-gray-600 dark:text-gray-300">
              {bannerFile ? bannerFile.name : store.bannerUrl ? "Replace banner…" : "Upload banner…"}
            </span>
            <input type="file" accept="image/*" className="hidden" onChange={handleBannerChange} />
          </label>
        </div>
      </div>

      {error && (
        <p className="mt-4 rounded-xl border border-red-200 dark:border-red-800/40 bg-red-50 dark:bg-red-500/5 px-4 py-2.5 text-xs text-red-600 dark:text-red-400">
          {error}
        </p>
      )}

      <div className="mt-4 flex justify-end gap-3">
        <button
          onClick={onClose}
          disabled={saving}
          className="rounded-xl border border-gray-200 dark:border-gray-700 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-700 transition-colors disabled:opacity-60"
        >
          {saving && <Spinner />}
          {saving ? "Saving…" : "Save Changes"}
        </button>
      </div>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Translation Modal (Add / Edit)
// ---------------------------------------------------------------------------

interface TranslationModalProps {
  isOpen: boolean;
  onClose: () => void;
  storeId: string;
  existing: StoreTranslation | null;
  onSaved: () => void;
}

function TranslationModal({ isOpen, onClose, storeId, existing, onSaved }: TranslationModalProps) {
  const [language, setLanguage] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setLanguage(existing?.language ?? "");
      setName(existing?.name ?? "");
      setDescription(existing?.description ?? "");
      setError(null);
    }
  }, [isOpen, existing]);

  async function handleSave() {
    if (!language.trim()) { setError("Language code is required."); return; }
    if (!name.trim()) { setError("Name is required."); return; }
    setSaving(true);
    setError(null);
    try {
      if (existing) {
        await storesService.updateTranslation(storeId, existing.language, {
          language: language.toLowerCase(),
          name,
          ...(description.trim() ? { description } : {}),
        });
      } else {
        await storesService.addTranslation(storeId, {
          language: language.toLowerCase(),
          name,
          ...(description.trim() ? { description } : {}),
        });
      }
      onSaved();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof ApiRequestError ? err.message : "Failed to save translation.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="mx-4 max-w-md w-full p-4 sm:p-5">
      <h2 className="mb-4 text-base font-semibold text-gray-800 dark:text-white/90">
        {existing ? "Edit Translation" : "Add Translation"}
      </h2>

      <div className="space-y-4">
        <div>
          <label className={labelCls}>Language Code</label>
          <input
            type="text"
            placeholder="en, az, ar…"
            maxLength={5}
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            disabled={!!existing}
            className={`${inputCls} ${existing ? "opacity-60 cursor-not-allowed" : ""}`}
          />
        </div>
        <div>
          <label className={labelCls}>Name</label>
          <input
            type="text"
            placeholder="Store name in this language"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={inputCls}
          />
        </div>
        <div>
          <label className={labelCls}>Description</label>
          <textarea
            rows={3}
            placeholder="Optional description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className={`${inputCls} resize-none`}
          />
        </div>
      </div>

      {error && (
        <p className="mt-4 rounded-xl border border-red-200 dark:border-red-800/40 bg-red-50 dark:bg-red-500/5 px-4 py-2.5 text-xs text-red-600 dark:text-red-400">
          {error}
        </p>
      )}

      <div className="mt-4 flex justify-end gap-3">
        <button
          onClick={onClose}
          disabled={saving}
          className="rounded-xl border border-gray-200 dark:border-gray-700 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-700 transition-colors disabled:opacity-60"
        >
          {saving && <Spinner />}
          {saving ? "Saving…" : "Save"}
        </button>
      </div>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Add / Edit Location Modal
// ---------------------------------------------------------------------------

interface LocationFormState {
  branchName: string;
  address: string;
  city: string;
  state: string;
  country: string;
  postalCode: string;
  latitude: number | null;
  longitude: number | null;
  isPrimary: boolean;
}

const emptyLocationForm = (): LocationFormState => ({
  branchName: "",
  address: "",
  city: "",
  state: "",
  country: "",
  postalCode: "",
  latitude: null,
  longitude: null,
  isPrimary: false,
});

function locationToForm(loc: StoreLocation): LocationFormState {
  return {
    branchName: loc.branchName,
    address: loc.address,
    city: loc.city,
    state: loc.state ?? "",
    country: loc.country,
    postalCode: loc.postalCode ?? "",
    latitude: loc.latitude,
    longitude: loc.longitude,
    isPrimary: loc.isPrimary,
  };
}

interface LocationModalProps {
  isOpen: boolean;
  onClose: () => void;
  storeId: string;
  existing: StoreLocation | null;
  onSaved: () => void;
}

function LocationModal({ isOpen, onClose, storeId, existing, onSaved }: LocationModalProps) {
  const [form, setForm] = useState<LocationFormState>(emptyLocationForm());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setForm(existing ? locationToForm(existing) : emptyLocationForm());
      setError(null);
    }
  }, [isOpen, existing]);

  function setF<K extends keyof LocationFormState>(key: K, value: LocationFormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleMapChange(geo: GeoResult) {
    setForm((prev) => ({
      ...prev,
      latitude: geo.latitude,
      longitude: geo.longitude,
      address: geo.address || prev.address,
      city: geo.city || prev.city,
      state: geo.state || prev.state,
      country: geo.country || prev.country,
      postalCode: geo.postalCode || prev.postalCode,
    }));
  }

  async function handleSave() {
    if (!form.branchName.trim()) { setError("Branch name is required."); return; }
    if (!form.address.trim()) { setError("Address is required."); return; }
    if (!form.city.trim()) { setError("City is required."); return; }
    if (!form.country.trim()) { setError("Country code is required."); return; }
    if (form.latitude === null || form.longitude === null) {
      setError("Please select a location on the map.");
      return;
    }

    setSaving(true);
    setError(null);

    const payload: CreateLocationRequest | UpdateLocationRequest = {
      branchName: form.branchName,
      address: form.address,
      city: form.city,
      ...(form.state.trim() ? { state: form.state } : {}),
      country: form.country,
      ...(form.postalCode.trim() ? { postalCode: form.postalCode } : {}),
      latitude: form.latitude,
      longitude: form.longitude,
      isPrimary: form.isPrimary,
    };

    try {
      if (existing) {
        await storesService.updateLocation(existing.id, payload as UpdateLocationRequest);
      } else {
        await storesService.addLocation(storeId, payload as CreateLocationRequest);
      }
      onSaved();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof ApiRequestError ? err.message : "Failed to save location.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="mx-4 max-w-2xl w-full p-4 sm:p-5">
      <h2 className="mb-4 text-base font-semibold text-gray-800 dark:text-white/90">
        {existing ? "Edit Branch" : "Add Branch"}
      </h2>

      <div className="space-y-4">
        {/* Map picker */}
        <div>
          <label className={labelCls}>Location * — click or drag the pin to set coordinates</label>
          <LocationPickerMap
            initialLat={form.latitude}
            initialLng={form.longitude}
            onChange={handleMapChange}
          />
        </div>

        <div>
          <label className={labelCls}>Branch Name *</label>
          <input
            type="text"
            placeholder="e.g. Baku Main Branch"
            value={form.branchName}
            onChange={(e) => setF("branchName", e.target.value)}
            className={inputCls}
          />
        </div>
        <div>
          <label className={labelCls}>Address *</label>
          <input
            type="text"
            placeholder="Street address"
            value={form.address}
            onChange={(e) => setF("address", e.target.value)}
            className={inputCls}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>City *</label>
            <input
              type="text"
              placeholder="Baku"
              value={form.city}
              onChange={(e) => setF("city", e.target.value)}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>State / Province</label>
            <input
              type="text"
              placeholder="Optional"
              value={form.state}
              onChange={(e) => setF("state", e.target.value)}
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
              value={form.country}
              onChange={(e) => setF("country", e.target.value.toUpperCase())}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Postal Code</label>
            <input
              type="text"
              placeholder="AZ1000"
              value={form.postalCode}
              onChange={(e) => setF("postalCode", e.target.value)}
              className={inputCls}
            />
          </div>
        </div>
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={form.isPrimary}
            onChange={(e) => setF("isPrimary", e.target.checked)}
            className="w-4 h-4 rounded border-gray-300 text-brand-500 focus:ring-brand-400"
          />
          <span className="text-sm text-gray-700 dark:text-gray-300">Set as primary branch</span>
        </label>
      </div>

      {error && (
        <p className="mt-4 rounded-xl border border-red-200 dark:border-red-800/40 bg-red-50 dark:bg-red-500/5 px-4 py-2.5 text-xs text-red-600 dark:text-red-400">
          {error}
        </p>
      )}

      <div className="mt-4 flex justify-end gap-3">
        <button
          onClick={onClose}
          disabled={saving}
          className="rounded-xl border border-gray-200 dark:border-gray-700 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-700 transition-colors disabled:opacity-60"
        >
          {saving && <Spinner />}
          {saving ? "Saving…" : "Save"}
        </button>
      </div>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Manage Hours Modal
// ---------------------------------------------------------------------------

interface HoursRow {
  day: DayOfWeek;
  isClosed: boolean;
  openTime: string;
  closeTime: string;
  existing: OperatingHours | null;
}

interface ManageHoursModalProps {
  isOpen: boolean;
  onClose: () => void;
  location: StoreLocation;
}

function ManageHoursModal({ isOpen, onClose, location }: ManageHoursModalProps) {
  const [rows, setRows] = useState<HoursRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    setError(null);
    storesService
      .getHours(location.id)
      .then((res) => {
        const existingByDay = new Map(res.data.map((h) => [h.dayOfWeek, h]));
        setRows(
          DAYS_OF_WEEK.map((day) => {
            const ex = existingByDay.get(day) ?? null;
            return {
              day,
              isClosed: ex?.isClosed ?? false,
              openTime: ex?.openTime ?? "09:00:00",
              closeTime: ex?.closeTime ?? "18:00:00",
              existing: ex,
            };
          })
        );
      })
      .catch((err: unknown) => {
        if (err instanceof Error && err.name === "AbortError") return;
        setError(err instanceof ApiRequestError ? err.message : "Failed to load hours.");
      })
      .finally(() => setLoading(false));
  }, [isOpen, location.id]);

  function updateRow(day: DayOfWeek, patch: Partial<HoursRow>) {
    setRows((prev) => prev.map((r) => (r.day === day ? { ...r, ...patch } : r)));
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      for (const row of rows) {
        const payload = {
          dayOfWeek: row.day,
          isClosed: row.isClosed,
          ...(row.isClosed ? {} : { openTime: row.openTime, closeTime: row.closeTime }),
        };
        if (row.existing) {
          await storesService.updateHours(row.existing.id, payload);
        } else {
          await storesService.setHours(location.id, payload);
        }
      }
      onClose();
    } catch (err: unknown) {
      setError(err instanceof ApiRequestError ? err.message : "Failed to save hours.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="mx-4 max-w-xl w-full p-4 sm:p-5">
      <h2 className="mb-1 text-base font-semibold text-gray-800 dark:text-white/90">Operating Hours</h2>
      <p className="mb-4 text-xs text-gray-500 dark:text-gray-400">{location.branchName}</p>

      {loading ? (
        <div className="flex justify-center py-10">
          <Spinner />
        </div>
      ) : (
        <div className="space-y-2">
          {rows.map((row) => (
            <div key={row.day} className="flex items-center gap-3 rounded-xl border border-gray-100 dark:border-gray-800 p-3">
              <div className="w-24 flex-shrink-0">
                <p className="text-xs font-semibold text-gray-700 dark:text-gray-200 capitalize">
                  {row.day.charAt(0) + row.day.slice(1).toLowerCase()}
                </p>
              </div>
              <label className="flex items-center gap-1.5 cursor-pointer flex-shrink-0">
                <input
                  type="checkbox"
                  checked={row.isClosed}
                  onChange={(e) => updateRow(row.day, { isClosed: e.target.checked })}
                  className="w-3.5 h-3.5 rounded border-gray-300 text-brand-500"
                />
                <span className="text-xs text-gray-500 dark:text-gray-400">Closed</span>
              </label>
              {!row.isClosed && (
                <>
                  <input
                    type="time"
                    value={row.openTime.slice(0, 5)}
                    onChange={(e) => updateRow(row.day, { openTime: e.target.value.slice(0, 5) + ":00" })}
                    className="flex-1 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-2 py-1.5 text-xs text-gray-800 dark:text-white focus:outline-none focus:border-brand-400"
                  />
                  <span className="text-xs text-gray-400">to</span>
                  <input
                    type="time"
                    value={row.closeTime.slice(0, 5)}
                    onChange={(e) => updateRow(row.day, { closeTime: e.target.value.slice(0, 5) + ":00" })}
                    className="flex-1 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-2 py-1.5 text-xs text-gray-800 dark:text-white focus:outline-none focus:border-brand-400"
                  />
                </>
              )}
              {row.isClosed && (
                <span className="flex-1 text-xs text-gray-400 italic">Day off</span>
              )}
            </div>
          ))}
        </div>
      )}

      {error && (
        <p className="mt-4 rounded-xl border border-red-200 dark:border-red-800/40 bg-red-50 dark:bg-red-500/5 px-4 py-2.5 text-xs text-red-600 dark:text-red-400">
          {error}
        </p>
      )}

      <div className="mt-4 flex justify-end gap-3">
        <button
          onClick={onClose}
          disabled={saving}
          className="rounded-xl border border-gray-200 dark:border-gray-700 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
        >
          Close
        </button>
        <button
          onClick={handleSave}
          disabled={saving || loading}
          className="flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-700 transition-colors disabled:opacity-60"
        >
          {saving && <Spinner />}
          {saving ? "Saving…" : "Save Hours"}
        </button>
      </div>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Assign Admin Modal
// ---------------------------------------------------------------------------

interface AssignAdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  storeId: string;
  existing: StoreAdmin | null;
  onSaved: () => void;
}

function AssignAdminModal({ isOpen, onClose, storeId, existing, onSaved }: AssignAdminModalProps) {
  const [userId, setUserId] = useState("");
  const [role, setRole] = useState<StoreAdminRole>("STORE_MANAGER");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setUserId(existing?.userId ?? "");
      setRole(existing?.storeRole ?? "STORE_MANAGER");
      setError(null);
    }
  }, [isOpen, existing]);

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      if (existing) {
        await storesService.updateAdmin(existing.id, { storeRole: role });
      } else {
        if (!userId.trim()) { setError("User ID is required."); setSaving(false); return; }
        const data: AssignAdminRequest = { userId, storeRole: role };
        await storesService.assignAdmin(storeId, data);
      }
      onSaved();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof ApiRequestError ? err.message : "Failed to save admin.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="mx-4 max-w-sm w-full p-4 sm:p-5">
      <h2 className="mb-4 text-base font-semibold text-gray-800 dark:text-white/90">
        {existing ? "Update Role" : "Assign Admin"}
      </h2>

      <div className="space-y-4">
        {!existing && (
          <div>
            <label className={labelCls}>User ID *</label>
            <input
              type="text"
              placeholder="UUID of the user"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              className={inputCls}
            />
            <p className="mt-1 text-xs text-gray-400">Must be an existing platform user (ADMIN type).</p>
          </div>
        )}
        {existing && (
          <div className="rounded-xl bg-gray-50 dark:bg-gray-800/60 px-4 py-2.5">
            <p className="text-xs text-gray-500 dark:text-gray-400">Admin</p>
            <p className="text-sm font-medium text-gray-800 dark:text-white/90">
              {existing.userFirstName} {existing.userLastName}
            </p>
          </div>
        )}
        <div>
          <label className={labelCls}>Role *</label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as StoreAdminRole)}
            className={inputCls}
          >
            <option value="STORE_OWNER">Store Owner</option>
            <option value="STORE_MANAGER">Store Manager</option>
            <option value="STORE_STAFF">Store Staff</option>
          </select>
        </div>
      </div>

      {error && (
        <p className="mt-4 rounded-xl border border-red-200 dark:border-red-800/40 bg-red-50 dark:bg-red-500/5 px-4 py-2.5 text-xs text-red-600 dark:text-red-400">
          {error}
        </p>
      )}

      <div className="mt-4 flex justify-end gap-3">
        <button
          onClick={onClose}
          disabled={saving}
          className="rounded-xl border border-gray-200 dark:border-gray-700 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-700 transition-colors disabled:opacity-60"
        >
          {saving && <Spinner />}
          {saving ? "Saving…" : existing ? "Update Role" : "Assign"}
        </button>
      </div>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Page Tabs
// ---------------------------------------------------------------------------

type Tab = "overview" | "locations" | "admins" | "products";

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function StoreDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [store, setStore] = useState<Store | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("overview");

  // Edit store modal
  const [editStoreOpen, setEditStoreOpen] = useState(false);

  // Translation modals
  const [translationModalOpen, setTranslationModalOpen] = useState(false);
  const [editingTranslation, setEditingTranslation] = useState<StoreTranslation | null>(null);

  // Locations
  const [locations, setLocations] = useState<StoreLocation[]>([]);
  const [locationsLoading, setLocationsLoading] = useState(false);
  const [locationModalOpen, setLocationModalOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<StoreLocation | null>(null);
  const [hoursModalOpen, setHoursModalOpen] = useState(false);
  const [hoursLocation, setHoursLocation] = useState<StoreLocation | null>(null);

  // Admins
  const [admins, setAdmins] = useState<StoreAdmin[]>([]);
  const [adminsLoading, setAdminsLoading] = useState(false);
  const [adminModalOpen, setAdminModalOpen] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState<StoreAdmin | null>(null);

  // Store Products
  const [storeProducts, setStoreProducts] = useState<StoreProductResponse[]>([]);
  const [storeProductsLoading, setStoreProductsLoading] = useState(false);

  // ── Load store ─────────────────────────────────────────────────────────────

  const fetchStore = useCallback(
    (signal?: AbortSignal) => {
      if (!id) return;
      setLoading(true);
      setError(null);
      storesService
        .getById(id, signal)
        .then((res) => setStore(res.data))
        .catch((err: unknown) => {
          if (err instanceof Error && err.name === "AbortError") return;
          setError(err instanceof ApiRequestError ? err.message : "Failed to load store.");
        })
        .finally(() => setLoading(false));
    },
    [id]
  );

  useEffect(() => {
    const controller = new AbortController();
    fetchStore(controller.signal);
    return () => controller.abort();
  }, [fetchStore]);

  // ── Load locations ─────────────────────────────────────────────────────────

  const fetchLocations = useCallback(
    (signal?: AbortSignal) => {
      if (!id) return;
      setLocationsLoading(true);
      storesService
        .getLocations(id, signal)
        .then((res) => setLocations(res.data))
        .catch((err: unknown) => {
          if (err instanceof Error && err.name === "AbortError") return;
        })
        .finally(() => setLocationsLoading(false));
    },
    [id]
  );

  useEffect(() => {
    if (tab === "locations") {
      const controller = new AbortController();
      fetchLocations(controller.signal);
      return () => controller.abort();
    }
  }, [tab, fetchLocations]);

  // ── Load admins ────────────────────────────────────────────────────────────

  const fetchAdmins = useCallback(
    (signal?: AbortSignal) => {
      if (!id) return;
      setAdminsLoading(true);
      storesService
        .getAdmins(id, signal)
        .then((res) => setAdmins(res.data))
        .catch((err: unknown) => {
          if (err instanceof Error && err.name === "AbortError") return;
        })
        .finally(() => setAdminsLoading(false));
    },
    [id]
  );

  useEffect(() => {
    if (tab === "admins") {
      const controller = new AbortController();
      fetchAdmins(controller.signal);
      return () => controller.abort();
    }
  }, [tab, fetchAdmins]);

  // ── Load store products ─────────────────────────────────────────────────────

  const fetchStoreProducts = useCallback(
    (signal?: AbortSignal) => {
      if (!id) return;
      setStoreProductsLoading(true);
      storeProductsService
        .list(id, signal)
        .then((res) => setStoreProducts(res.data))
        .catch((err: unknown) => {
          if (err instanceof Error && err.name === "AbortError") return;
        })
        .finally(() => setStoreProductsLoading(false));
    },
    [id]
  );

  useEffect(() => {
    if (tab === "products") {
      const controller = new AbortController();
      fetchStoreProducts(controller.signal);
      return () => controller.abort();
    }
  }, [tab, fetchStoreProducts]);

  // ── Actions ────────────────────────────────────────────────────────────────

  async function handleDeactivateLocation(location: StoreLocation) {
    if (!confirm(`Deactivate branch "${location.branchName}"?`)) return;
    try {
      await storesService.deactivateLocation(location.id);
      fetchLocations();
    } catch (err: unknown) {
      alert(err instanceof ApiRequestError ? err.message : "Failed to deactivate location.");
    }
  }

  async function handleRemoveAdmin(admin: StoreAdmin) {
    if (!confirm(`Remove ${admin.userFirstName} ${admin.userLastName} from this store?`)) return;
    try {
      await storesService.removeAdmin(admin.id);
      fetchAdmins();
    } catch (err: unknown) {
      alert(err instanceof ApiRequestError ? err.message : "Failed to remove admin.");
    }
  }

  async function handleDeleteTranslation(translation: StoreTranslation) {
    if (!confirm(`Delete "${translation.language.toUpperCase()}" translation?`)) return;
    try {
      await storesService.deleteTranslation(id!, translation.language);
      fetchStore();
    } catch (err: unknown) {
      alert(err instanceof ApiRequestError ? err.message : "Failed to delete translation.");
    }
  }

  // ── Loading / Error ────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-gray-400">
        <Spinner />
        <p className="mt-3 text-sm">Loading store…</p>
      </div>
    );
  }

  if (error || !store) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-red-200 dark:border-red-800/40 bg-red-50 dark:bg-red-500/5 py-20 text-center">
        <p className="text-sm font-medium text-red-600 dark:text-red-400">{error ?? "Store not found."}</p>
        <button
          onClick={() => navigate("/stores")}
          className="mt-3 text-xs text-brand-500 hover:text-brand-600"
        >
          Back to stores
        </button>
      </div>
    );
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: "overview", label: "Overview" },
    { id: "locations", label: "Locations" },
    { id: "admins", label: "Admins" },
    { id: "products", label: "Products" },
  ];

  return (
    <>
      <PageMeta
        title={`${store.name} | Buyology Dashboard`}
        description={`Manage store ${store.name}`}
      />
      <PageBreadcrumb pageTitle={store.name} />

      {/* Store header */}
      <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 dark:bg-brand-500/10 text-brand-500">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-gray-800 dark:text-white/90">{store.name}</h1>
              <Badge size="sm" color={statusColor(store.status)}>{statusLabel(store.status)}</Badge>
            </div>
            <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">{store.countryName}</p>
          </div>
        </div>
        <button
          onClick={() => setEditStoreOpen(true)}
          className="flex items-center gap-2 self-start sm:self-auto rounded-xl border border-gray-200 dark:border-gray-700 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
          Edit Store
        </button>
      </div>

      {/* Tabs */}
      <div className="mb-4 flex gap-1 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60 p-1 w-fit">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-all ${
              tab === t.id
                ? "bg-white dark:bg-gray-700 text-gray-800 dark:text-white shadow-theme-xs"
                : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW TAB ─────────────────────────────────────────────────────── */}
      {tab === "overview" && (
        <div className="space-y-4">
          {/* Info grid */}
          <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
            <h2 className="mb-4 text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Store Info</h2>
            <div className="grid grid-cols-2 gap-x-4 gap-y-4 sm:grid-cols-3">
              {[
                { label: "Slug", value: store.slug, mono: true },
                { label: "Country", value: store.countryName },
                { label: "Email", value: store.contactEmail ?? "—" },
                { label: "Phone", value: store.contactPhone ?? "—" },
                { label: "Created", value: formatDate(store.createdAt) },
                { label: "Updated", value: formatDate(store.updatedAt) },
              ].map((item) => (
                <div key={item.label}>
                  <p className="text-xs text-gray-400 dark:text-gray-500">{item.label}</p>
                  {item.mono ? (
                    <code className="mt-0.5 block rounded bg-gray-100 dark:bg-gray-800 px-2 py-0.5 text-xs font-mono text-gray-700 dark:text-gray-200">
                      {item.value}
                    </code>
                  ) : (
                    <p className="mt-0.5 text-sm font-medium text-gray-800 dark:text-white/90">{item.value}</p>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Translations */}
          <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                Translations ({store.translations.length})
              </h2>
              <button
                onClick={() => { setEditingTranslation(null); setTranslationModalOpen(true); }}
                className="flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-700 transition-colors"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                Add Translation
              </button>
            </div>

            {store.translations.length === 0 ? (
              <p className="text-sm text-gray-400 dark:text-gray-500 py-3 text-center">No translations yet.</p>
            ) : (
              <div className="space-y-2">
                {store.translations.map((t) => (
                  <div
                    key={t.id}
                    className="flex items-start justify-between gap-4 rounded-xl border border-gray-100 dark:border-gray-800 p-4"
                  >
                    <div className="flex items-start gap-3">
                      <span className="flex-shrink-0 inline-flex items-center justify-center h-7 w-10 rounded-lg bg-brand-50 dark:bg-brand-500/10 text-xs font-bold text-brand-600 dark:text-brand-400 uppercase">
                        {t.language}
                      </span>
                      <div>
                        <p className="text-sm font-semibold text-gray-800 dark:text-white/90">{t.name}</p>
                        {t.description && (
                          <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{t.description}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      <button
                        onClick={() => { setEditingTranslation(t); setTranslationModalOpen(true); }}
                        className="flex items-center justify-center h-7 w-7 rounded-lg text-gray-400 hover:text-brand-500 hover:bg-brand-50 dark:hover:bg-brand-500/10 transition-colors"
                        title="Edit"
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDeleteTranslation(t)}
                        className="flex items-center justify-center h-7 w-7 rounded-lg text-gray-400 hover:text-error-500 hover:bg-error-50 dark:hover:bg-error-500/10 transition-colors"
                        title="Delete"
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="3 6 5 6 21 6" />
                          <path d="M19 6l-1 14H6L5 6" />
                          <path d="M10 11v6M14 11v6" />
                          <path d="M9 6V4h6v2" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── LOCATIONS TAB ────────────────────────────────────────────────────── */}
      {tab === "locations" && (
        <div>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-800 dark:text-white/90">
              Branches
              {!locationsLoading && (
                <span className="ml-2 text-sm font-normal text-gray-400">({locations.length})</span>
              )}
            </h2>
            <button
              onClick={() => { setEditingLocation(null); setLocationModalOpen(true); }}
              className="flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-700 transition-colors"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Add Branch
            </button>
          </div>

          {locationsLoading ? (
            <div className="flex justify-center py-16">
              <Spinner />
            </div>
          ) : locations.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-gray-200 dark:border-gray-800 py-20 text-center">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" className="mb-4 text-gray-300 dark:text-gray-600">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
              <p className="text-sm text-gray-500 dark:text-gray-400">No branches yet.</p>
              <button
                onClick={() => { setEditingLocation(null); setLocationModalOpen(true); }}
                className="mt-3 text-xs text-brand-500 hover:text-brand-600"
              >
                Add your first branch
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {locations.map((loc) => (
                <div
                  key={loc.id}
                  className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 flex items-center justify-center h-10 w-10 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-500">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                          <circle cx="12" cy="10" r="3" />
                        </svg>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-gray-800 dark:text-white/90">{loc.branchName}</p>
                          {loc.isPrimary && (
                            <span className="inline-flex items-center rounded-full bg-brand-50 dark:bg-brand-500/10 px-2 py-0.5 text-xs font-medium text-brand-600 dark:text-brand-400">
                              Primary
                            </span>
                          )}
                          {!loc.isActive && (
                            <span className="inline-flex items-center rounded-full bg-error-50 dark:bg-error-500/10 px-2 py-0.5 text-xs font-medium text-error-600 dark:text-error-400">
                              Inactive
                            </span>
                          )}
                        </div>
                        <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                          {loc.address}, {loc.city}{loc.state ? `, ${loc.state}` : ""}, {loc.country}
                          {loc.postalCode ? ` ${loc.postalCode}` : ""}
                        </p>
                        <p className="mt-0.5 text-xs text-gray-400">
                          {loc.latitude}, {loc.longitude}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      <button
                        onClick={() => { setHoursLocation(loc); setHoursModalOpen(true); }}
                        className="flex items-center gap-1.5 rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                        title="Manage Hours"
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <circle cx="12" cy="12" r="10" />
                          <polyline points="12 6 12 12 16 14" />
                        </svg>
                        Hours
                      </button>
                      <button
                        onClick={() => { setEditingLocation(loc); setLocationModalOpen(true); }}
                        className="flex items-center justify-center h-8 w-8 rounded-lg text-gray-400 hover:text-brand-500 hover:bg-brand-50 dark:hover:bg-brand-500/10 transition-colors"
                        title="Edit"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                      </button>
                      {loc.isActive && (
                        <button
                          onClick={() => handleDeactivateLocation(loc)}
                          className="flex items-center justify-center h-8 w-8 rounded-lg text-gray-400 hover:text-error-500 hover:bg-error-50 dark:hover:bg-error-500/10 transition-colors"
                          title="Deactivate"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="10" />
                            <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── ADMINS TAB ───────────────────────────────────────────────────────── */}
      {tab === "admins" && (
        <div>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-800 dark:text-white/90">
              Store Admins
              {!adminsLoading && (
                <span className="ml-2 text-sm font-normal text-gray-400">({admins.length})</span>
              )}
            </h2>
            <button
              onClick={() => { setEditingAdmin(null); setAdminModalOpen(true); }}
              className="flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-700 transition-colors"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Assign Admin
            </button>
          </div>

          {adminsLoading ? (
            <div className="flex justify-center py-16">
              <Spinner />
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900">
                    {["Admin", "Role", "Status", "Assigned", "Actions"].map((col) => (
                      <th
                        key={col}
                        className="px-4 py-2.5 first:pl-5 text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500"
                      >
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {admins.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-16 text-center text-sm text-gray-400 dark:text-gray-500">
                        No admins assigned yet.
                      </td>
                    </tr>
                  ) : (
                    admins.map((admin) => (
                      <tr
                        key={admin.id}
                        className="border-b border-gray-100 dark:border-gray-800 last:border-0"
                      >
                        {/* Name */}
                        <td className="px-4 py-2.5">
                          <p className="text-sm font-semibold text-gray-800 dark:text-white/90">
                            {admin.userFirstName} {admin.userLastName}
                          </p>
                          <p className="mt-0.5 text-xs text-gray-400 font-mono">{admin.userId}</p>
                        </td>

                        {/* Role */}
                        <td className="px-4 py-2.5">
                          <Badge size="sm" color={roleColor(admin.storeRole)}>
                            {admin.storeRole.replace("STORE_", "").replace("_", " ")}
                          </Badge>
                        </td>

                        {/* Status */}
                        <td className="px-4 py-2.5">
                          <Badge size="sm" color={admin.isActive ? "success" : "error"}>
                            {admin.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </td>

                        {/* Assigned at */}
                        <td className="px-4 py-2.5 text-xs text-gray-500 dark:text-gray-400">
                          {formatDate(admin.assignedAt)}
                        </td>

                        {/* Actions */}
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => { setEditingAdmin(admin); setAdminModalOpen(true); }}
                              className="flex items-center justify-center h-8 w-8 rounded-lg text-gray-400 hover:text-brand-500 hover:bg-brand-50 dark:hover:bg-brand-500/10 transition-colors"
                              title="Edit Role"
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                              </svg>
                            </button>
                            {admin.isActive && (
                              <button
                                onClick={() => handleRemoveAdmin(admin)}
                                className="flex items-center justify-center h-8 w-8 rounded-lg text-gray-400 hover:text-error-500 hover:bg-error-50 dark:hover:bg-error-500/10 transition-colors"
                                title="Remove"
                              >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <polyline points="3 6 5 6 21 6" />
                                  <path d="M19 6l-1 14H6L5 6" />
                                  <path d="M10 11v6M14 11v6" />
                                  <path d="M9 6V4h6v2" />
                                </svg>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── PRODUCTS TAB ─────────────────────────────────────────────────────── */}
      {tab === "products" && (
        <div>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-800 dark:text-white/90">
              Store Products
              {!storeProductsLoading && (
                <span className="ml-2 text-sm font-normal text-gray-400">({storeProducts.length})</span>
              )}
            </h2>
            <button
              onClick={() => navigate(`/stores/${id}/products/assign`)}
              className="flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-700 transition-colors"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Assign Product
            </button>
          </div>

          {storeProductsLoading ? (
            <div className="flex justify-center py-16">
              <Spinner />
            </div>
          ) : storeProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 dark:border-gray-700 py-20 text-center">
              <p className="text-sm text-gray-400 dark:text-gray-500">No products assigned to this store yet.</p>
              <button
                onClick={() => navigate(`/stores/${id}/products/assign`)}
                className="mt-3 text-sm font-semibold text-brand-500 hover:text-brand-600"
              >
                Assign your first product
              </button>
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900">
                    {["Product", "Price", "Sale Price", "Discount", "Variants", "Status", ""].map((col) => (
                      <th
                        key={col}
                        className="px-4 py-2.5 first:pl-5 text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500"
                      >
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-800/60">
                  {storeProducts.map((sp) => {
                    const hasDiscount = sp.effectivePrice < sp.storePrice;
                    const discountLabel = !sp.discountType
                      ? "—"
                      : sp.discountType === "PERCENTAGE"
                      ? `${sp.discountValue}% OFF`
                      : `Sale: ${sp.discountValue?.toLocaleString()}`;
                    return (
                      <tr key={sp.id} className="hover:bg-gray-50/50 dark:hover:bg-white/[0.02] transition-colors">
                        <td className="px-4 py-2.5">
                          <p className="font-semibold text-gray-800 dark:text-white/90 max-w-[180px] truncate">
                            {sp.productTitle}
                          </p>
                          <p className="mt-0.5 font-mono text-xs text-gray-400">{sp.productSku}</p>
                        </td>
                        <td className="px-4 py-2.5 text-gray-700 dark:text-gray-300">
                          {sp.storePrice.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 py-2.5">
                          {hasDiscount ? (
                            <span className="font-semibold text-green-600 dark:text-green-400">
                              {sp.effectivePrice.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                            </span>
                          ) : (
                            <span className="text-gray-300 dark:text-gray-600">—</span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-gray-600 dark:text-gray-300">{discountLabel}</td>
                        <td className="px-4 py-2.5 text-gray-600 dark:text-gray-300">
                          {sp.variants.length} variant{sp.variants.length !== 1 ? "s" : ""}
                        </td>
                        <td className="px-4 py-2.5">
                          <Badge size="sm" color={sp.isActive ? "success" : "error"}>
                            {sp.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </td>
                        <td className="px-4 py-2.5">
                          <button
                            onClick={() => navigate(`/stores/${id}/products`)}
                            className="text-xs text-brand-500 hover:text-brand-600 font-medium hover:underline"
                          >
                            Manage
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Modals ─────────────────────────────────────────────────────────── */}

      <EditStoreModal
        isOpen={editStoreOpen}
        onClose={() => setEditStoreOpen(false)}
        store={store}
        onSaved={(updated) => setStore(updated)}
      />

      <TranslationModal
        isOpen={translationModalOpen}
        onClose={() => setTranslationModalOpen(false)}
        storeId={store.id}
        existing={editingTranslation}
        onSaved={() => fetchStore()}
      />

      {locationModalOpen && (
        <LocationModal
          isOpen={locationModalOpen}
          onClose={() => setLocationModalOpen(false)}
          storeId={store.id}
          existing={editingLocation}
          onSaved={() => fetchLocations()}
        />
      )}

      {hoursModalOpen && hoursLocation && (
        <ManageHoursModal
          isOpen={hoursModalOpen}
          onClose={() => { setHoursModalOpen(false); setHoursLocation(null); }}
          location={hoursLocation}
        />
      )}

      {adminModalOpen && (
        <AssignAdminModal
          isOpen={adminModalOpen}
          onClose={() => setAdminModalOpen(false)}
          storeId={store.id}
          existing={editingAdmin}
          onSaved={() => fetchAdmins()}
        />
      )}
    </>
  );
}
