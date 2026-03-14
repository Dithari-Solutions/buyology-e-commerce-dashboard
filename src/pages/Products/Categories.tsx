import { useEffect, useState, useCallback } from "react";
import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import Badge from "../../components/ui/badge/Badge";
import { Modal } from "../../components/ui/modal";
import { categoriesService, ApiRequestError } from "../../api";
import type {
  Category,
  CategoryStatus,
  CategoryDetail,
  CreateCategoryTranslations,
} from "../../types";

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

type BadgeColor = "success" | "error" | "warning" | "info" | "light";

function statusColor(status: CategoryStatus): BadgeColor {
  return status === "ACTIVE" ? "success" : "error";
}

// ---------------------------------------------------------------------------
// Form state
// ---------------------------------------------------------------------------

interface CategoryFormState {
  parentId: string;
  status: CategoryStatus;
  nameAz: string;
  descriptionAz: string;
  slugAz: string;
  nameEn: string;
  descriptionEn: string;
  slugEn: string;
  nameAr: string;
  descriptionAr: string;
  slugAr: string;
}

const emptyForm = (): CategoryFormState => ({
  parentId: "",
  status: "ACTIVE",
  nameAz: "",
  descriptionAz: "",
  slugAz: "",
  nameEn: "",
  descriptionEn: "",
  slugEn: "",
  nameAr: "",
  descriptionAr: "",
  slugAr: "",
});

function detailToForm(detail: CategoryDetail): CategoryFormState {
  const az = detail.translations.find((t) => t.language === "AZ");
  const en = detail.translations.find((t) => t.language === "EN");
  const ar = detail.translations.find((t) => t.language === "AR");
  return {
    parentId: detail.parentId ?? "",
    status: detail.status,
    nameAz: az?.name ?? "",
    descriptionAz: az?.description ?? "",
    slugAz: az?.slug ?? "",
    nameEn: en?.name ?? "",
    descriptionEn: en?.description ?? "",
    slugEn: en?.slug ?? "",
    nameAr: ar?.name ?? "",
    descriptionAr: ar?.description ?? "",
    slugAr: ar?.slug ?? "",
  };
}

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------

function SkeletonRow() {
  return (
    <tr className="border-b border-gray-100 dark:border-gray-800">
      <td className="px-5 py-4">
        <div className="space-y-2">
          <div className="h-3.5 w-40 rounded-full bg-gray-200 dark:bg-gray-700 animate-pulse" />
          <div className="h-2.5 w-28 rounded-full bg-gray-100 dark:bg-gray-800 animate-pulse" />
        </div>
      </td>
      {[1, 2, 3, 4, 5].map((i) => (
        <td key={i} className="px-4 py-4">
          <div className="h-3 w-16 rounded-full bg-gray-100 dark:bg-gray-800 animate-pulse" />
        </td>
      ))}
    </tr>
  );
}

// ---------------------------------------------------------------------------
// Language tab labels
// ---------------------------------------------------------------------------

type LangTab = "EN" | "AZ" | "AR";

const LANG_TABS: LangTab[] = ["EN", "AZ", "AR"];

// ---------------------------------------------------------------------------
// CategoryFormModal
// ---------------------------------------------------------------------------

interface CategoryFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (form: CategoryFormState) => Promise<void>;
  initialForm: CategoryFormState;
  categories: Category[];
  editingId: string | null;
  saving: boolean;
  saveError: string | null;
}

function CategoryFormModal({
  isOpen,
  onClose,
  onSave,
  initialForm,
  categories,
  editingId,
  saving,
  saveError,
}: CategoryFormModalProps) {
  const [form, setForm] = useState<CategoryFormState>(initialForm);
  const [langTab, setLangTab] = useState<LangTab>("EN");

  // Sync form when initialForm changes (e.g. when editing a different item)
  useEffect(() => {
    setForm(initialForm);
    setLangTab("EN");
  }, [initialForm, isOpen]);

  const field = (key: keyof CategoryFormState) => ({
    value: form[key] as string,
    onChange: (
      e: React.ChangeEvent<
        HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
      >
    ) => setForm((prev) => ({ ...prev, [key]: e.target.value })),
  });

  const inputCls =
    "w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-2.5 text-sm text-gray-800 dark:text-white placeholder-gray-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-400/20 transition-all";

  const labelCls = "block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1";

  const parentOptions = categories.filter((c) => c.id !== editingId);

  const currentLangPrefix = langTab.toLowerCase() as "en" | "az" | "ar";

  const nameKey = `name${langTab.charAt(0) + langTab.slice(1).toLowerCase()}` as keyof CategoryFormState;
  const descKey = `description${langTab.charAt(0) + langTab.slice(1).toLowerCase()}` as keyof CategoryFormState;
  const slugKey = `slug${langTab.charAt(0) + langTab.slice(1).toLowerCase()}` as keyof CategoryFormState;

  // Build correct field keys per language
  const langFieldKeys: Record<
    LangTab,
    { name: keyof CategoryFormState; desc: keyof CategoryFormState; slug: keyof CategoryFormState }
  > = {
    EN: { name: "nameEn", desc: "descriptionEn", slug: "slugEn" },
    AZ: { name: "nameAz", desc: "descriptionAz", slug: "slugAz" },
    AR: { name: "nameAr", desc: "descriptionAr", slug: "slugAr" },
  };

  const keys = langFieldKeys[langTab];

  void currentLangPrefix;
  void nameKey;
  void descKey;
  void slugKey;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      className="mx-4 max-w-xl w-full p-6 sm:p-8"
    >
      <h2 className="mb-6 text-lg font-semibold text-gray-800 dark:text-white/90">
        {editingId ? "Edit Category" : "New Category"}
      </h2>

      {/* General fields */}
      <div className="mb-5 grid grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>Parent Category</label>
          <select
            {...field("parentId")}
            className={inputCls}
          >
            <option value="">None (root)</option>
            {parentOptions.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelCls}>Status</label>
          <select {...field("status")} className={inputCls}>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </select>
        </div>
      </div>

      {/* Language tabs */}
      <div className="mb-4 flex gap-1 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60 p-1">
        {LANG_TABS.map((lang) => (
          <button
            key={lang}
            type="button"
            onClick={() => setLangTab(lang)}
            className={`flex-1 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
              langTab === lang
                ? "bg-white dark:bg-gray-700 text-gray-800 dark:text-white shadow-sm"
                : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
            }`}
          >
            {lang}
          </button>
        ))}
      </div>

      {/* Translation fields */}
      <div className="space-y-4">
        <div>
          <label className={labelCls}>Name ({langTab})</label>
          <input
            type="text"
            placeholder={`Category name in ${langTab}`}
            {...field(keys.name)}
            className={inputCls}
          />
        </div>
        <div>
          <label className={labelCls}>Description ({langTab})</label>
          <textarea
            rows={2}
            placeholder={`Description in ${langTab}`}
            {...field(keys.desc)}
            className={`${inputCls} resize-none`}
          />
        </div>
        <div>
          <label className={labelCls}>Slug ({langTab})</label>
          <input
            type="text"
            placeholder="lowercase-with-hyphens"
            {...field(keys.slug)}
            className={inputCls}
          />
        </div>
      </div>

      {/* Error */}
      {saveError && (
        <p className="mt-4 rounded-xl border border-red-200 dark:border-red-800/40 bg-red-50 dark:bg-red-500/5 px-4 py-2.5 text-xs text-red-600 dark:text-red-400">
          {saveError}
        </p>
      )}

      {/* Actions */}
      <div className="mt-6 flex justify-end gap-3">
        <button
          type="button"
          onClick={onClose}
          disabled={saving}
          className="rounded-xl border border-gray-200 dark:border-gray-700 px-5 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={() => onSave(form)}
          disabled={saving}
          className="rounded-xl bg-brand-500 px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-600 transition-colors disabled:opacity-60 flex items-center gap-2"
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
// DeleteConfirmModal
// ---------------------------------------------------------------------------

function DeleteConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  categoryName,
  deleting,
  deleteError,
}: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  categoryName: string;
  deleting: boolean;
  deleteError: string | null;
}) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} className="mx-4 max-w-sm w-full p-6 sm:p-8">
      <div className="flex flex-col items-center text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-error-50 dark:bg-error-500/10 mb-4">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="text-error-500">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6l-1 14H6L5 6" />
            <path d="M10 11v6M14 11v6" />
            <path d="M9 6V4h6v2" />
          </svg>
        </div>
        <h3 className="text-base font-semibold text-gray-800 dark:text-white/90 mb-1">
          Delete Category
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
          Are you sure you want to delete
        </p>
        <p className="text-sm font-semibold text-gray-800 dark:text-white/90 mb-4">
          "{categoryName}"?
        </p>
        <p className="text-xs text-gray-400 dark:text-gray-500 mb-6">
          This will soft-delete the category (set it to INACTIVE). It can be restored via the edit action.
        </p>

        {deleteError && (
          <p className="mb-4 w-full rounded-xl border border-red-200 dark:border-red-800/40 bg-red-50 dark:bg-red-500/5 px-4 py-2.5 text-xs text-red-600 dark:text-red-400">
            {deleteError}
          </p>
        )}

        <div className="flex w-full gap-3">
          <button
            onClick={onClose}
            disabled={deleting}
            className="flex-1 rounded-xl border border-gray-200 dark:border-gray-700 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={deleting}
            className="flex-1 rounded-xl bg-error-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-error-600 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {deleting && (
              <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
            )}
            {deleting ? "Deleting…" : "Delete"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

type StatusFilter = CategoryStatus | "ALL";

export default function Categories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");

  // Create / Edit modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formInitial, setFormInitial] = useState<CategoryFormState>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Delete modal state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deletingCategory, setDeletingCategory] = useState<Category | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const fetchCategories = useCallback((signal?: AbortSignal) => {
    setLoading(true);
    setError(null);
    categoriesService
      .getAll("EN", signal)
      .then((res) => setCategories(res.data))
      .catch((err: unknown) => {
        if (err instanceof Error && err.name === "AbortError") return;
        setError(
          err instanceof ApiRequestError ? err.message : "Failed to load categories."
        );
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    fetchCategories(controller.signal);
    return () => controller.abort();
  }, [fetchCategories]);

  // ── Filtering ─────────────────────────────────────────────────────────────

  const filtered = categories.filter((c) => {
    const term = search.toLowerCase();
    const matchesSearch =
      c.name.toLowerCase().includes(term) ||
      c.slug.toLowerCase().includes(term) ||
      c.description.toLowerCase().includes(term);
    const matchesStatus = statusFilter === "ALL" || c.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const activeCount = categories.filter((c) => c.status === "ACTIVE").length;
  const inactiveCount = categories.filter((c) => c.status === "INACTIVE").length;
  const rootCount = categories.filter((c) => c.parentId === null).length;

  // ── Create ────────────────────────────────────────────────────────────────

  function openCreate() {
    setEditingId(null);
    setFormInitial(emptyForm());
    setSaveError(null);
    setModalOpen(true);
  }

  // ── Edit ──────────────────────────────────────────────────────────────────

  async function openEdit(category: Category) {
    setSaveError(null);
    try {
      const res = await categoriesService.getById(category.id);
      setEditingId(category.id);
      setFormInitial(detailToForm(res.data));
      setModalOpen(true);
    } catch (err: unknown) {
      const msg =
        err instanceof ApiRequestError ? err.message : "Failed to load category.";
      setError(msg);
    }
  }

  // ── Save (create or update) ───────────────────────────────────────────────

  async function handleSave(form: CategoryFormState) {
    setSaving(true);
    setSaveError(null);

    const translations: CreateCategoryTranslations = {
      nameAz: form.nameAz,
      descriptionAz: form.descriptionAz,
      slugAz: form.slugAz,
      nameEn: form.nameEn,
      descriptionEn: form.descriptionEn,
      slugEn: form.slugEn,
      nameAr: form.nameAr,
      descriptionAr: form.descriptionAr,
      slugAr: form.slugAr,
    };

    try {
      if (editingId) {
        await categoriesService.update(editingId, {
          parentId: form.parentId || null,
          status: form.status,
          translations,
        });
      } else {
        await categoriesService.create({
          parentId: form.parentId || null,
          status: form.status,
          translations,
        });
      }
      setModalOpen(false);
      fetchCategories();
    } catch (err: unknown) {
      setSaveError(
        err instanceof ApiRequestError ? err.message : "Failed to save category."
      );
    } finally {
      setSaving(false);
    }
  }

  // ── Delete ────────────────────────────────────────────────────────────────

  function openDelete(category: Category) {
    setDeletingCategory(category);
    setDeleteError(null);
    setDeleteModalOpen(true);
  }

  async function handleDelete() {
    if (!deletingCategory) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await categoriesService.delete(deletingCategory.id);
      setDeleteModalOpen(false);
      setDeletingCategory(null);
      fetchCategories();
    } catch (err: unknown) {
      setDeleteError(
        err instanceof ApiRequestError ? err.message : "Failed to delete category."
      );
    } finally {
      setDeleting(false);
    }
  }

  // ── Stats ─────────────────────────────────────────────────────────────────

  const stats = [
    {
      label: "Total Categories",
      value: categories.length,
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <rect x="2" y="3" width="20" height="14" rx="2" />
          <line x1="8" y1="21" x2="16" y2="21" />
          <line x1="12" y1="17" x2="12" y2="21" />
        </svg>
      ),
      color: "text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-500/10",
    },
    {
      label: "Active",
      value: activeCount,
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
          <polyline points="22 4 12 14.01 9 11.01" />
        </svg>
      ),
      color: "text-success-600 dark:text-success-400 bg-success-50 dark:bg-success-500/10",
    },
    {
      label: "Inactive",
      value: inactiveCount,
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <circle cx="12" cy="12" r="10" />
          <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
        </svg>
      ),
      color: "text-error-600 dark:text-error-400 bg-error-50 dark:bg-error-500/10",
    },
    {
      label: "Root Categories",
      value: rootCount,
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M3 3h6l2 3H21v13H3z" />
        </svg>
      ),
      color: "text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10",
    },
  ];

  const filterOptions: { label: string; value: StatusFilter }[] = [
    { label: "All", value: "ALL" },
    { label: "Active", value: "ACTIVE" },
    { label: "Inactive", value: "INACTIVE" },
  ];

  // ── Parent lookup ──────────────────────────────────────────────────────────

  const categoryById = new Map(categories.map((c) => [c.id, c]));

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <>
      <PageMeta
        title="Categories | Buyology Dashboard"
        description="Manage product categories in the Buyology platform."
      />

      <PageBreadcrumb pageTitle="Categories" />

      {/* Stats row */}
      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="flex items-center gap-3 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03] p-4"
          >
            <span
              className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl ${stat.color}`}
            >
              {stat.icon}
            </span>
            <div>
              <p className="text-2xl font-bold text-gray-800 dark:text-white/90 leading-none">
                {loading ? "—" : stat.value}
              </p>
              <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                {stat.label}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90">
          All Categories
          {!loading && (
            <span className="ml-2 text-sm font-normal text-gray-400">
              ({filtered.length})
            </span>
          )}
        </h2>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          {/* Status filter tabs */}
          <div className="flex gap-1 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60 p-1">
            {filterOptions.map(({ label, value }) => {
              const isActive = statusFilter === value;
              const activeClass =
                value === "ALL"
                  ? "bg-white dark:bg-gray-700 text-gray-800 dark:text-white shadow-sm"
                  : value === "ACTIVE"
                  ? "bg-white dark:bg-gray-700 text-success-600 dark:text-success-400 shadow-sm"
                  : "bg-white dark:bg-gray-700 text-error-600 dark:text-error-400 shadow-sm";
              return (
                <button
                  key={value}
                  onClick={() => setStatusFilter(value)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                    isActive
                      ? activeClass
                      : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>

          {/* Search */}
          <div className="relative w-full sm:w-60">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </span>
            <input
              type="text"
              placeholder="Search by name or slug…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 py-2.5 pl-9 pr-4 text-sm text-gray-800 dark:text-white placeholder-gray-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-400/20 transition-all"
            />
          </div>

          {/* New category button */}
          <button
            onClick={openCreate}
            className="flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-600 transition-colors whitespace-nowrap"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            New Category
          </button>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-red-200 dark:border-red-800/40 bg-red-50 dark:bg-red-500/5 py-16 text-center">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mb-3 text-red-400">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <p className="text-sm font-medium text-red-600 dark:text-red-400">{error}</p>
          <p className="mt-1 text-xs text-red-400 dark:text-red-500">
            Check the API connection and try again.
          </p>
        </div>
      )}

      {/* Table */}
      {!error && (
        <div className="overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03]">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-white/[0.02]">
                  {["Name", "Parent", "Slug", "Status", "Created", "Actions"].map(
                    (col) => (
                      <th
                        key={col}
                        className="px-4 py-3.5 first:pl-5 text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500"
                      >
                        {col}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody>
                {loading &&
                  Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)}

                {!loading &&
                  filtered.map((category) => {
                    const parent = category.parentId
                      ? categoryById.get(category.parentId)
                      : null;

                    return (
                      <tr
                        key={category.id}
                        className="border-b border-gray-100 dark:border-gray-800 transition-colors hover:bg-brand-50/50 dark:hover:bg-white/[0.02]"
                      >
                        {/* Name */}
                        <td className="px-5 py-4">
                          <p className="text-sm font-semibold text-gray-800 dark:text-white/90">
                            {category.name}
                          </p>
                          <p className="mt-0.5 text-xs text-gray-400 dark:text-gray-500 truncate max-w-[200px]">
                            {category.description}
                          </p>
                        </td>

                        {/* Parent */}
                        <td className="px-4 py-4">
                          {parent ? (
                            <span className="inline-flex items-center rounded-full bg-gray-100 dark:bg-gray-800 px-2.5 py-0.5 text-xs font-medium text-gray-600 dark:text-gray-300">
                              {parent.name}
                            </span>
                          ) : (
                            <span className="inline-flex items-center rounded-full bg-indigo-50 dark:bg-indigo-500/10 px-2.5 py-0.5 text-xs font-medium text-indigo-600 dark:text-indigo-400">
                              Root
                            </span>
                          )}
                        </td>

                        {/* Slug */}
                        <td className="px-4 py-4">
                          <code className="rounded bg-gray-100 dark:bg-gray-800 px-2 py-0.5 text-xs font-mono text-gray-600 dark:text-gray-300">
                            {category.slug}
                          </code>
                        </td>

                        {/* Status */}
                        <td className="px-4 py-4">
                          <Badge size="sm" color={statusColor(category.status)}>
                            {category.status}
                          </Badge>
                        </td>

                        {/* Created */}
                        <td className="px-4 py-4 text-xs text-gray-500 dark:text-gray-400">
                          {formatDate(category.createdAt)}
                        </td>

                        {/* Actions */}
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => openEdit(category)}
                              className="flex items-center justify-center h-8 w-8 rounded-lg text-gray-400 hover:text-brand-500 hover:bg-brand-50 dark:hover:bg-brand-500/10 transition-colors"
                              title="Edit"
                            >
                              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                              </svg>
                            </button>
                            <button
                              onClick={() => openDelete(category)}
                              className="flex items-center justify-center h-8 w-8 rounded-lg text-gray-400 hover:text-error-500 hover:bg-error-50 dark:hover:bg-error-500/10 transition-colors"
                              title="Delete"
                            >
                              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polyline points="3 6 5 6 21 6" />
                                <path d="M19 6l-1 14H6L5 6" />
                                <path d="M10 11v6M14 11v6" />
                                <path d="M9 6V4h6v2" />
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>

          {/* Empty state */}
          {!loading && filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" className="mb-4 text-gray-300 dark:text-gray-600">
                <rect x="2" y="3" width="20" height="14" rx="2" />
                <line x1="8" y1="21" x2="16" y2="21" />
                <line x1="12" y1="17" x2="12" y2="21" />
              </svg>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                {search
                  ? "No categories match your search."
                  : statusFilter !== "ALL"
                  ? `No ${statusFilter.toLowerCase()} categories found.`
                  : "No categories found."}
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
                  Create your first category
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Create / Edit Modal */}
      <CategoryFormModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
        initialForm={formInitial}
        categories={categories}
        editingId={editingId}
        saving={saving}
        saveError={saveError}
      />

      {/* Delete Confirm Modal */}
      <DeleteConfirmModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={handleDelete}
        categoryName={deletingCategory?.name ?? ""}
        deleting={deleting}
        deleteError={deleteError}
      />
    </>
  );
}
