import { useEffect, useState, useCallback } from "react";
import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import Badge from "../../components/ui/badge/Badge";
import { Modal } from "../../components/ui/modal";
import { storesService, ApiRequestError } from "../../api";
import { isSuperAdmin } from "../../auth/roles";
import type { Country, CreateCountryRequest, UpdateCountryRequest } from "../../types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(iso));
}

// Derived tri-state market mode from the two independent channel flags.
type MarketMode = "BOTH" | "B2C_ONLY" | "B2B_ONLY" | "INACTIVE";

function marketMode(isActive: boolean, b2bEnabled: boolean): MarketMode {
  if (isActive && b2bEnabled) return "BOTH";
  if (isActive) return "B2C_ONLY";
  if (b2bEnabled) return "B2B_ONLY";
  return "INACTIVE";
}

const MARKET_MODE_META: Record<
  MarketMode,
  { label: string; color: "success" | "info" | "warning" | "error" }
> = {
  BOTH: { label: "B2C + B2B", color: "success" },
  B2C_ONLY: { label: "B2C only", color: "info" },
  B2B_ONLY: { label: "B2B only", color: "warning" },
  INACTIVE: { label: "Inactive", color: "error" },
};

const inputCls =
  "w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-2.5 text-sm text-gray-800 dark:text-white placeholder-gray-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-400/20 transition-all";

const labelCls = "block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1";

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------

function SkeletonRow() {
  return (
    <tr className="border-b border-gray-100 dark:border-gray-800">
      <td className="px-5 py-4">
        <div className="space-y-2">
          <div className="h-3.5 w-36 rounded-full bg-gray-200 dark:bg-gray-700 animate-pulse" />
        </div>
      </td>
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <td key={i} className="px-4 py-4">
          <div className="h-3 w-16 rounded-full bg-gray-100 dark:bg-gray-800 animate-pulse" />
        </td>
      ))}
    </tr>
  );
}

// ---------------------------------------------------------------------------
// Country Form Modal  (create + edit)
// ---------------------------------------------------------------------------

interface CountryFormState {
  code: string;
  name: string;
  currency: string;
  isActive: boolean;
  b2bEnabled: boolean;
}

const emptyForm = (): CountryFormState => ({
  code: "",
  name: "",
  currency: "",
  isActive: true,
  b2bEnabled: false,
});

function countryToForm(c: Country): CountryFormState {
  return {
    code: c.code,
    name: c.name,
    currency: c.currency,
    isActive: c.isActive,
    b2bEnabled: c.b2bEnabled,
  };
}

interface CountryFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (form: CountryFormState) => Promise<void>;
  initialForm: CountryFormState;
  editingId: string | null;
  saving: boolean;
  saveError: string | null;
  canEditB2b: boolean;
}

function CountryFormModal({
  isOpen,
  onClose,
  onSave,
  initialForm,
  editingId,
  saving,
  saveError,
  canEditB2b,
}: CountryFormModalProps) {
  const [form, setForm] = useState<CountryFormState>(initialForm);

  useEffect(() => {
    setForm(initialForm);
  }, [initialForm, isOpen]);

  function field(key: keyof CountryFormState) {
    return {
      value: form[key] as string,
      onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
        setForm((prev) => ({ ...prev, [key]: e.target.value })),
    };
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="mx-4 max-w-md w-full p-6 sm:p-8">
      <h2 className="mb-6 text-lg font-semibold text-gray-800 dark:text-white/90">
        {editingId ? "Edit Country" : "New Country"}
      </h2>

      <div className="space-y-4">
        {/* Name */}
        <div>
          <label className={labelCls}>Country Name *</label>
          <input
            type="text"
            placeholder="e.g. Azerbaijan"
            {...field("name")}
            className={inputCls}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* Code */}
          <div>
            <label className={labelCls}>ISO Code *</label>
            <input
              type="text"
              placeholder="AZ"
              maxLength={3}
              {...field("code")}
              className={`${inputCls} uppercase`}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, code: e.target.value.toUpperCase() }))
              }
            />
            <p className="mt-1 text-xs text-gray-400">ISO 3166-1 alpha-2 or alpha-3 (2–3 chars)</p>
          </div>

          {/* Currency */}
          <div>
            <label className={labelCls}>Currency *</label>
            <input
              type="text"
              placeholder="AZN"
              maxLength={3}
              {...field("currency")}
              className={`${inputCls} uppercase`}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, currency: e.target.value.toUpperCase() }))
              }
            />
            <p className="mt-1 text-xs text-gray-400">ISO 4217, exactly 3 chars</p>
          </div>
        </div>

        {/* Market mode — tri-state via two independent channel switches */}
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="mb-3 flex items-center justify-between">
            <span className={labelCls + " mb-0"}>Market mode</span>
            {(() => {
              const meta = MARKET_MODE_META[marketMode(form.isActive, form.b2bEnabled)];
              return <Badge size="sm" color={meta.color}>{meta.label}</Badge>;
            })()}
          </div>

          {/* Consumer shop (B2C) */}
          <label className="flex items-start gap-3 cursor-pointer py-1.5">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => setForm((prev) => ({ ...prev, isActive: e.target.checked }))}
              className="mt-0.5 w-4 h-4 rounded border-gray-300 text-brand-500 focus:ring-brand-400"
            />
            <span>
              <span className="block text-sm text-gray-700 dark:text-gray-300">Consumer shop (B2C)</span>
              <span className="block text-xs text-gray-400">Storefront + region-gate for regular customers.</span>
            </span>
          </label>

          {/* B2B (bulk / quotes) — super-admin gated */}
          <label
            className={`flex items-start gap-3 py-1.5 ${canEditB2b ? "cursor-pointer" : "cursor-not-allowed opacity-60"}`}
          >
            <input
              type="checkbox"
              checked={form.b2bEnabled}
              disabled={!canEditB2b}
              onChange={(e) => setForm((prev) => ({ ...prev, b2bEnabled: e.target.checked }))}
              className="mt-0.5 w-4 h-4 rounded border-gray-300 text-brand-500 focus:ring-brand-400 disabled:opacity-60"
            />
            <span>
              <span className="block text-sm text-gray-700 dark:text-gray-300">B2B (bulk / quotes)</span>
              <span className="block text-xs text-gray-400">
                {canEditB2b
                  ? "Enables public B2B browse + request-for-quote in this region."
                  : "Only super admins can change the B2B channel."}
              </span>
            </span>
          </label>
        </div>
      </div>

      {saveError && (
        <p className="mt-4 rounded-xl border border-red-200 dark:border-red-800/40 bg-red-50 dark:bg-red-500/5 px-4 py-2.5 text-xs text-red-600 dark:text-red-400">
          {saveError}
        </p>
      )}

      <div className="mt-6 flex justify-end gap-3">
        <button
          onClick={onClose}
          disabled={saving}
          className="rounded-xl border border-gray-200 dark:border-gray-700 px-5 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          onClick={() => onSave(form)}
          disabled={saving}
          className="flex items-center gap-2 rounded-xl bg-brand-500 px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-600 transition-colors disabled:opacity-60"
        >
          {saving && (
            <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
            </svg>
          )}
          {saving ? "Saving…" : "Save"}
        </button>
      </div>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Deactivate Confirm Modal
// ---------------------------------------------------------------------------

function DeactivateConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  countryName,
  deactivating,
  deactivateError,
}: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  countryName: string;
  deactivating: boolean;
  deactivateError: string | null;
}) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} className="mx-4 max-w-sm w-full p-6 sm:p-8">
      <div className="flex flex-col items-center text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-warning-50 dark:bg-warning-500/10 mb-4">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="text-warning-500">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>
        <h3 className="text-base font-semibold text-gray-800 dark:text-white/90 mb-1">Deactivate Country</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
          Are you sure you want to deactivate
        </p>
        <p className="text-sm font-semibold text-gray-800 dark:text-white/90 mb-4">"{countryName}"?</p>
        <p className="text-xs text-gray-400 dark:text-gray-500 mb-6">
          This sets <code className="font-mono">isActive</code> to <code className="font-mono">false</code>. You can re-activate it via the edit action.
        </p>

        {deactivateError && (
          <p className="mb-4 w-full rounded-xl border border-red-200 dark:border-red-800/40 bg-red-50 dark:bg-red-500/5 px-4 py-2.5 text-xs text-red-600 dark:text-red-400">
            {deactivateError}
          </p>
        )}

        <div className="flex w-full gap-3">
          <button
            onClick={onClose}
            disabled={deactivating}
            className="flex-1 rounded-xl border border-gray-200 dark:border-gray-700 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={deactivating}
            className="flex-1 rounded-xl bg-warning-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-warning-600 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {deactivating && (
              <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
            )}
            {deactivating ? "Deactivating…" : "Deactivate"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

type StatusFilter = "ALL" | "ACTIVE" | "INACTIVE";

export default function Countries() {
  const canEditB2b = isSuperAdmin();
  const [countries, setCountries] = useState<Country[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");

  // Create / Edit modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCountry, setEditingCountry] = useState<Country | null>(null);
  const [formInitial, setFormInitial] = useState<CountryFormState>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Deactivate modal
  const [deactivateModalOpen, setDeactivateModalOpen] = useState(false);
  const [targetCountry, setTargetCountry] = useState<Country | null>(null);
  const [deactivating, setDeactivating] = useState(false);
  const [deactivateError, setDeactivateError] = useState<string | null>(null);

  const fetchCountries = useCallback((signal?: AbortSignal) => {
    setLoading(true);
    setError(null);
    storesService
      .getAllCountries(signal)
      .then((res) => setCountries(res.data))
      .catch((err: unknown) => {
        if (err instanceof Error && err.name === "AbortError") return;
        setError(err instanceof ApiRequestError ? err.message : "Failed to load countries.");
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    fetchCountries(controller.signal);
    return () => controller.abort();
  }, [fetchCountries]);

  // ── Filtering ─────────────────────────────────────────────────────────────

  const filtered = countries.filter((c) => {
    const term = search.toLowerCase();
    const matchesSearch =
      c.name.toLowerCase().includes(term) ||
      c.code.toLowerCase().includes(term) ||
      c.currency.toLowerCase().includes(term);
    const matchesStatus =
      statusFilter === "ALL" ||
      (statusFilter === "ACTIVE" && c.isActive) ||
      (statusFilter === "INACTIVE" && !c.isActive);
    return matchesSearch && matchesStatus;
  });

  const activeCount = countries.filter((c) => c.isActive).length;
  const inactiveCount = countries.filter((c) => !c.isActive).length;

  // ── Stats ─────────────────────────────────────────────────────────────────

  const stats = [
    {
      label: "Total Countries",
      value: countries.length,
      color: "text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-500/10",
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <circle cx="12" cy="12" r="10" />
          <line x1="2" y1="12" x2="22" y2="12" />
          <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
        </svg>
      ),
    },
    {
      label: "Active",
      value: activeCount,
      color: "text-success-600 dark:text-success-400 bg-success-50 dark:bg-success-500/10",
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
          <polyline points="22 4 12 14.01 9 11.01" />
        </svg>
      ),
    },
    {
      label: "Inactive",
      value: inactiveCount,
      color: "text-error-600 dark:text-error-400 bg-error-50 dark:bg-error-500/10",
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <circle cx="12" cy="12" r="10" />
          <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
        </svg>
      ),
    },
  ];

  // ── Create ────────────────────────────────────────────────────────────────

  function openCreate() {
    setEditingCountry(null);
    setFormInitial(emptyForm());
    setSaveError(null);
    setModalOpen(true);
  }

  // ── Edit ──────────────────────────────────────────────────────────────────

  function openEdit(country: Country) {
    setEditingCountry(country);
    setFormInitial(countryToForm(country));
    setSaveError(null);
    setModalOpen(true);
  }

  // ── Save ──────────────────────────────────────────────────────────────────

  async function handleSave(form: CountryFormState) {
    if (!form.name.trim()) { setSaveError("Name is required."); return; }
    if (!form.code.trim() || form.code.length < 2) { setSaveError("Code must be 2–3 characters."); return; }
    if (!form.currency.trim() || form.currency.length !== 3) { setSaveError("Currency must be exactly 3 characters (ISO 4217)."); return; }

    setSaving(true);
    setSaveError(null);

    try {
      if (editingCountry) {
        const data: UpdateCountryRequest = {
          code: form.code,
          name: form.name,
          currency: form.currency,
          isActive: form.isActive,
        };
        // Only super admins may change the B2B channel; omit otherwise (null = unchanged).
        if (canEditB2b) data.b2bEnabled = form.b2bEnabled;
        await storesService.updateCountry(editingCountry.id, data);
      } else {
        const data: CreateCountryRequest = {
          code: form.code,
          name: form.name,
          currency: form.currency,
          isActive: form.isActive,
        };
        if (canEditB2b) data.b2bEnabled = form.b2bEnabled;
        await storesService.createCountry(data);
      }
      setModalOpen(false);
      fetchCountries();
    } catch (err: unknown) {
      setSaveError(err instanceof ApiRequestError ? err.message : "Failed to save country.");
    } finally {
      setSaving(false);
    }
  }

  // ── Deactivate ────────────────────────────────────────────────────────────

  function openDeactivate(country: Country) {
    setTargetCountry(country);
    setDeactivateError(null);
    setDeactivateModalOpen(true);
  }

  async function handleDeactivate() {
    if (!targetCountry) return;
    setDeactivating(true);
    setDeactivateError(null);
    try {
      await storesService.deactivateCountry(targetCountry.id);
      setDeactivateModalOpen(false);
      setTargetCountry(null);
      fetchCountries();
    } catch (err: unknown) {
      setDeactivateError(err instanceof ApiRequestError ? err.message : "Failed to deactivate country.");
    } finally {
      setDeactivating(false);
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  const filterOptions: { label: string; value: StatusFilter }[] = [
    { label: "All", value: "ALL" },
    { label: "Active", value: "ACTIVE" },
    { label: "Inactive", value: "INACTIVE" },
  ];

  return (
    <>
      <PageMeta
        title="Countries | Buyology Dashboard"
        description="Manage reference countries for stores."
      />
      <PageBreadcrumb pageTitle="Countries" />

      {/* Stats */}
      <div className="mb-6 grid grid-cols-3 gap-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="flex items-center gap-3 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03] p-4"
          >
            <span className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl ${stat.color}`}>
              {stat.icon}
            </span>
            <div>
              <p className="text-2xl font-bold text-gray-800 dark:text-white/90 leading-none">
                {loading ? "—" : stat.value}
              </p>
              <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90">
          All Countries
          {!loading && (
            <span className="ml-2 text-sm font-normal text-gray-400">({filtered.length})</span>
          )}
        </h2>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          {/* Status filter */}
          <div className="flex gap-1 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60 p-1">
            {filterOptions.map(({ label, value }) => (
              <button
                key={value}
                onClick={() => setStatusFilter(value)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                  statusFilter === value
                    ? "bg-white dark:bg-gray-700 text-gray-800 dark:text-white shadow-sm"
                    : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="relative w-full sm:w-56">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </span>
            <input
              type="text"
              placeholder="Search countries…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 py-2.5 pl-9 pr-4 text-sm text-gray-800 dark:text-white placeholder-gray-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-400/20 transition-all"
            />
          </div>

          {/* New Country */}
          <button
            onClick={openCreate}
            className="flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-600 transition-colors whitespace-nowrap"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            New Country
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-red-200 dark:border-red-800/40 bg-red-50 dark:bg-red-500/5 py-16 text-center">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mb-3 text-red-400">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <p className="text-sm font-medium text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Table */}
      {!error && (
        <div className="overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03]">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-white/[0.02]">
                  {["Name", "Code", "Currency", "Status", "Market", "Created", "Actions"].map((col) => (
                    <th
                      key={col}
                      className="px-4 py-3.5 first:pl-5 text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500"
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading && Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)}

                {!loading &&
                  filtered.map((country) => (
                    <tr
                      key={country.id}
                      className="border-b border-gray-100 dark:border-gray-800 transition-colors hover:bg-brand-50/50 dark:hover:bg-white/[0.02]"
                    >
                      {/* Name */}
                      <td className="px-5 py-4">
                        <p className="text-sm font-semibold text-gray-800 dark:text-white/90">{country.name}</p>
                      </td>

                      {/* Code */}
                      <td className="px-4 py-4">
                        <code className="rounded bg-gray-100 dark:bg-gray-800 px-2.5 py-1 text-xs font-mono font-semibold text-gray-700 dark:text-gray-200">
                          {country.code}
                        </code>
                      </td>

                      {/* Currency */}
                      <td className="px-4 py-4">
                        <span className="inline-flex items-center rounded-full bg-indigo-50 dark:bg-indigo-500/10 px-2.5 py-0.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                          {country.currency}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-4">
                        <Badge size="sm" color={country.isActive ? "success" : "error"}>
                          {country.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </td>

                      {/* Market mode */}
                      <td className="px-4 py-4">
                        {(() => {
                          const meta = MARKET_MODE_META[marketMode(country.isActive, country.b2bEnabled)];
                          return <Badge size="sm" color={meta.color}>{meta.label}</Badge>;
                        })()}
                      </td>

                      {/* Created */}
                      <td className="px-4 py-4 text-xs text-gray-500 dark:text-gray-400">
                        {formatDate(country.createdAt)}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => openEdit(country)}
                            className="flex items-center justify-center h-8 w-8 rounded-lg text-gray-400 hover:text-brand-500 hover:bg-brand-50 dark:hover:bg-brand-500/10 transition-colors"
                            title="Edit"
                          >
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                            </svg>
                          </button>
                          {country.isActive && (
                            <button
                              onClick={() => openDeactivate(country)}
                              className="flex items-center justify-center h-8 w-8 rounded-lg text-gray-400 hover:text-warning-500 hover:bg-warning-50 dark:hover:bg-warning-500/10 transition-colors"
                              title="Deactivate"
                            >
                              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="12" cy="12" r="10" />
                                <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
                              </svg>
                            </button>
                          )}
                          {!country.isActive && (
                            <button
                              onClick={() => openEdit(country)}
                              title="Re-activate via edit"
                              className="flex items-center justify-center h-8 w-8 rounded-lg text-gray-400 hover:text-success-500 hover:bg-success-50 dark:hover:bg-success-500/10 transition-colors"
                            >
                              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                                <polyline points="22 4 12 14.01 9 11.01" />
                              </svg>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>

          {/* Empty state */}
          {!loading && filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" className="mb-4 text-gray-300 dark:text-gray-600">
                <circle cx="12" cy="12" r="10" />
                <line x1="2" y1="12" x2="22" y2="12" />
                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
              </svg>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                {search || statusFilter !== "ALL" ? "No countries match your filters." : "No countries found."}
              </p>
              {(search || statusFilter !== "ALL") && (
                <button
                  onClick={() => { setSearch(""); setStatusFilter("ALL"); }}
                  className="mt-3 text-xs text-brand-500 hover:text-brand-600 dark:text-brand-400 transition-colors"
                >
                  Clear filters
                </button>
              )}
              {!search && statusFilter === "ALL" && (
                <button
                  onClick={openCreate}
                  className="mt-3 text-xs text-brand-500 hover:text-brand-600 dark:text-brand-400 transition-colors"
                >
                  Add your first country
                </button>
              )}
            </div>
          )}
        </div>
      )}

      <CountryFormModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
        initialForm={formInitial}
        editingId={editingCountry?.id ?? null}
        saving={saving}
        saveError={saveError}
        canEditB2b={canEditB2b}
      />

      <DeactivateConfirmModal
        isOpen={deactivateModalOpen}
        onClose={() => setDeactivateModalOpen(false)}
        onConfirm={handleDeactivate}
        countryName={targetCountry?.name ?? ""}
        deactivating={deactivating}
        deactivateError={deactivateError}
      />
    </>
  );
}
