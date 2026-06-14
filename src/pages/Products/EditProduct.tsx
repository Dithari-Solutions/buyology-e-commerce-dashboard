import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate, Link } from "react-router";
import PageMeta from "../../components/common/PageMeta";
import {
  productsService,
  categoriesService,
  brandsService,
  ApiRequestError,
} from "../../api";
import type { UpdateProductRequest } from "../../api";
import type { CreateProductSpec } from "../../api/services/products.service";
import type {
  Product,
  ProductMedia,
  ProductType,
  RefurbGrade,
  AvailabilityStatus,
} from "../../types";
import type { Category } from "../../types/category.types";
import type { Brand } from "../../types/brand.types";
import { getImageUrl } from "../../utils/imageUrl";
import { validateFileUpload } from "../../utils/fileValidation";
import { compressImage } from "../../utils/imageCompression";
import { useSpecCodes } from "../../hooks/useSpecCodes";

// ── helpers ──────────────────────────────────────────────────────────────────

function brandLabel(b: Brand): string {
  return b.translations.find((t) => t.language === "EN")?.name ?? b.id;
}

const PRODUCT_TYPES: ProductType[] = ["SIMPLE", "DIY", "ACCESSORY"];
const AVAILABILITY: AvailabilityStatus[] = ["IN_STOCK", "OUT_OF_STOCK", "PRE_ORDER"];
const REFURB_GRADES: RefurbGrade[] = ["A", "B", "C"];

const UNIT_OPTIONS = [
  "", "KB", "MB", "GB", "TB", "MHz", "GHz", "mAh", "Wh", "W",
  "INCH", "MP", "Mbps", "Gbps", "G", "KG", "HZ", "RPM",
];

// Inline spec editor state (the GET response can't restore library links, so specs edit as inline by code).
interface EditSpecOption {
  valueAz: string;
  valueEn: string;
  valueAr: string;
  unit: string;
}
interface EditSpec {
  code: string;
  nameAz: string;
  nameEn: string;
  nameAr: string;
  options: EditSpecOption[];
}
const emptyOption = (): EditSpecOption => ({ valueAz: "", valueEn: "", valueAr: "", unit: "" });
const emptySpec = (): EditSpec => ({ code: "", nameAz: "", nameEn: "", nameAr: "", options: [emptyOption()] });

// Per-language translation form state
interface Translations {
  titleAz: string;
  titleEn: string;
  titleAr: string;
  descriptionAz: string;
  descriptionEn: string;
  descriptionAr: string;
}

// A newly-added (not yet uploaded) media file with a preview URL
interface NewFile {
  file: File;
  preview: string;
}

// ── section wrapper ──────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
      <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 bg-[#402F75]/5 dark:bg-[#402F75]/20">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-[#402F75] dark:text-[#FBBB14]">
          {title}
        </h3>
      </div>
      <div className="px-6 py-5 space-y-5">{children}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
        {label}
      </label>
      {children}
    </div>
  );
}

const inputClass =
  "w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-700 shadow-sm focus:border-[#402F75] focus:outline-none focus:ring-1 focus:ring-[#402F75] dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200";

// ── page ─────────────────────────────────────────────────────────────────────

export default function EditProduct() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Reference data
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);

  // Form state
  const [categoryId, setCategoryId] = useState("");
  const [brandId, setBrandId] = useState("");
  const [productType, setProductType] = useState<ProductType>("SIMPLE");
  const [status, setStatus] = useState<"ACTIVE" | "INACTIVE">("ACTIVE");
  const [availabilityStatus, setAvailabilityStatus] =
    useState<AvailabilityStatus>("PRE_ORDER");
  const [isSuperDeal, setIsSuperDeal] = useState(false);
  const [isLimitedStock, setIsLimitedStock] = useState(false);
  const [isRefurbished, setIsRefurbished] = useState(false);
  const [refurbGrade, setRefurbGrade] = useState<RefurbGrade | "">("");
  const [translations, setTranslations] = useState<Translations>({
    titleAz: "",
    titleEn: "",
    titleAr: "",
    descriptionAz: "",
    descriptionEn: "",
    descriptionAr: "",
  });

  // Media state
  const [existingMedia, setExistingMedia] = useState<ProductMedia[]>([]);
  const [removeMediaIds, setRemoveMediaIds] = useState<string[]>([]);
  const [primaryMediaId, setPrimaryMediaId] = useState<string | null>(null);
  const [newFiles, setNewFiles] = useState<NewFile[]>([]);

  // Specs state — editable only when the product has no variants (backend guard).
  const { codes: specCodes, labels: specCodeLabels } = useSpecCodes();
  const [specs, setSpecs] = useState<EditSpec[]>([]);
  const [hasVariants, setHasVariants] = useState(false);

  const addSpec = () => setSpecs((s) => [...s, emptySpec()]);
  const removeSpec = (i: number) => setSpecs((s) => s.filter((_, idx) => idx !== i));
  const setSpecField = (i: number, field: "code" | "nameAz" | "nameEn" | "nameAr", value: string) =>
    setSpecs((s) => s.map((sp, idx) => (idx === i ? { ...sp, [field]: value } : sp)));
  const setSpecCode = (i: number, code: string) =>
    setSpecs((s) => s.map((sp, idx) => (idx === i
      ? { ...sp, code, nameEn: sp.nameEn || (specCodeLabels[code] ?? code) }
      : sp)));
  const addOption = (i: number) =>
    setSpecs((s) => s.map((sp, idx) => (idx === i ? { ...sp, options: [...sp.options, emptyOption()] } : sp)));
  const removeOption = (i: number, j: number) =>
    setSpecs((s) => s.map((sp, idx) => (idx === i ? { ...sp, options: sp.options.filter((_, oj) => oj !== j) } : sp)));
  const updateOption = (i: number, j: number, field: keyof EditSpecOption, value: string) =>
    setSpecs((s) => s.map((sp, idx) => (idx === i
      ? { ...sp, options: sp.options.map((o, oj) => (oj === j ? { ...o, [field]: value } : o)) }
      : sp)));

  // Submit state
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  // ── load ───────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!id) return;
    const controller = new AbortController();
    setLoading(true);
    setLoadError(null);

    Promise.all([
      productsService.getById(id, "EN", controller.signal),
      productsService.getById(id, "AZ", controller.signal),
      productsService.getById(id, "AR", controller.signal),
      categoriesService.getAll("EN", controller.signal),
      brandsService.getAll(controller.signal),
    ])
      .then(([en, az, ar, cats, brs]) => {
        const p: Product = en.data;
        setCategoryId(p.categoryId);
        setBrandId(p.brandId ?? "");
        setProductType(p.productType);
        setStatus(p.status === "INACTIVE" ? "INACTIVE" : "ACTIVE");
        setAvailabilityStatus(p.availabilityStatus);
        setIsSuperDeal(p.isSuperDeal);
        setIsLimitedStock(p.isLimitedStock);
        setIsRefurbished(p.isRefurbished);
        setRefurbGrade(p.refurbGrade ?? "");
        setTranslations({
          titleEn: en.data.title ?? "",
          descriptionEn: en.data.description ?? "",
          titleAz: az.data.title ?? "",
          descriptionAz: az.data.description ?? "",
          titleAr: ar.data.title ?? "",
          descriptionAr: ar.data.description ?? "",
        });
        const media = [...p.media].sort((a, b) => a.orderIndex - b.orderIndex);
        setExistingMedia(media);
        setPrimaryMediaId(media.find((m) => m.isPrimary)?.id ?? media[0]?.id ?? null);
        setCategories(cats.data);
        setBrands(brs.data);

        // Prefill the spec editor by merging the EN/AZ/AR responses (matched by group + option id),
        // skipping the internal color_* group.
        setHasVariants((p.variants ?? []).length > 0);
        const azById = new Map((az.data.specs ?? []).map((g) => [g.id, g]));
        const arById = new Map((ar.data.specs ?? []).map((g) => [g.id, g]));
        const editSpecs: EditSpec[] = (en.data.specs ?? [])
          .filter((g) => !g.code?.startsWith("color_"))
          .map((g) => {
            const azG = azById.get(g.id);
            const arG = arById.get(g.id);
            const azOpt = new Map((azG?.options ?? []).map((o) => [o.id, o]));
            const arOpt = new Map((arG?.options ?? []).map((o) => [o.id, o]));
            return {
              code: g.code,
              nameEn: g.name,
              nameAz: azG?.name ?? g.name,
              nameAr: arG?.name ?? g.name,
              options: g.options.map((o) => ({
                valueEn: o.value,
                valueAz: azOpt.get(o.id)?.value ?? o.value,
                valueAr: arOpt.get(o.id)?.value ?? o.value,
                unit: o.unit ?? "",
              })),
            };
          });
        setSpecs(editSpecs);
      })
      .catch((err: unknown) => {
        if (err instanceof Error && err.name === "AbortError") return;
        setLoadError(
          err instanceof ApiRequestError ? err.message : "Failed to load product."
        );
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [id]);

  // ── media handlers ───────────────────────────────────────────────────────────
  function toggleRemove(mediaId: string) {
    setRemoveMediaIds((prev) =>
      prev.includes(mediaId)
        ? prev.filter((x) => x !== mediaId)
        : [...prev, mediaId]
    );
    // If the removed media was primary, fall back to the first kept media
    if (primaryMediaId === mediaId) {
      const firstKept = existingMedia.find(
        (m) => m.id !== mediaId && !removeMediaIds.includes(m.id)
      );
      setPrimaryMediaId(firstKept?.id ?? null);
    }
  }

  function handleAddFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(e.target.files ?? []);
    if (!picked.length) return;
    setNewFiles((prev) => [
      ...prev,
      ...picked.map((file) => ({ file, preview: URL.createObjectURL(file) })),
    ]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function removeNewFile(index: number) {
    setNewFiles((prev) => {
      URL.revokeObjectURL(prev[index].preview);
      return prev.filter((_, i) => i !== index);
    });
  }

  // ── submit ───────────────────────────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!id) return;
    setApiError(null);

    if (isRefurbished && !refurbGrade) {
      setApiError("Refurb grade is required when the product is refurbished.");
      return;
    }

    // Validate specs (only editable when there are no variants)
    if (!hasVariants) {
      for (const sp of specs) {
        if (!sp.code.trim()) { setApiError("Each specification needs a code."); return; }
        if (!sp.nameEn.trim() || !sp.nameAz.trim() || !sp.nameAr.trim()) {
          setApiError(`Specification "${sp.code || "(no code)"}" needs a name in EN, AZ and AR.`); return;
        }
        if (sp.options.length === 0) { setApiError(`Specification "${sp.code}" needs at least one option.`); return; }
        for (const o of sp.options) {
          if (!o.valueEn.trim() || !o.valueAz.trim() || !o.valueAr.trim()) {
            setApiError(`Specification "${sp.code}" has an option missing a value in EN, AZ or AR.`); return;
          }
        }
      }
    }

    // Validate any newly-added files (images only, like product create)
    for (let i = 0; i < newFiles.length; i++) {
      const result = await validateFileUpload(newFiles[i].file, "GENERAL");
      if (!result.isValid) {
        setApiError(`New file #${i + 1}: ${result.message}`);
        return;
      }
    }

    setSubmitting(true);
    try {
      const data: UpdateProductRequest = {
        categoryId,
        brandId: brandId || undefined,
        productType,
        status,
        availabilityStatus,
        isSuperDeal,
        isLimitedStock,
        isRefurbished,
        refurbGrade: isRefurbished ? (refurbGrade as RefurbGrade) : null,
        translations: {
          titleAz: translations.titleAz,
          titleEn: translations.titleEn,
          titleAr: translations.titleAr,
          descriptionAz: translations.descriptionAz,
          descriptionEn: translations.descriptionEn,
          descriptionAr: translations.descriptionAr,
        },
        removeMediaIds: removeMediaIds.length ? removeMediaIds : undefined,
        primaryMediaId:
          primaryMediaId && !removeMediaIds.includes(primaryMediaId)
            ? primaryMediaId
            : undefined,
        // Replace specs only when editable (no variants). Omitting leaves them untouched.
        specs: hasVariants
          ? undefined
          : specs.map((sp, i) => ({
              code: sp.code.trim(),
              nameAz: sp.nameAz,
              nameEn: sp.nameEn,
              nameAr: sp.nameAr,
              options: sp.options.map((o, j) => ({
                localKey: `g${i}o${j}`,
                valueAz: o.valueAz,
                valueEn: o.valueEn,
                valueAr: o.valueAr,
                unit: o.unit || undefined,
              })),
            })) as CreateProductSpec[],
      };

      const compressIfImage = (f: File) =>
        f.type.startsWith("image/")
          ? compressImage(f, { maxWidth: 2160, maxHeight: 2160, quality: 0.88 })
          : Promise.resolve(f);
      const files = await Promise.all(newFiles.map((nf) => compressIfImage(nf.file)));

      await productsService.update(id, data, files);
      navigate(`/products/${id}`);
    } catch (err) {
      setApiError(
        err instanceof ApiRequestError ? err.message : "Failed to update product."
      );
      setSubmitting(false);
    }
  }

  // ── render ───────────────────────────────────────────────────────────────────
  return (
    <>
      <PageMeta title="Edit Product | Buyology Dashboard" description="Edit a product" />

      {/* Breadcrumb */}
      <div className="mb-6 flex items-center gap-2 text-sm">
        <Link
          to={id ? `/products/${id}` : "/products"}
          className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400 hover:text-brand-600 dark:hover:text-brand-400 transition-colors"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M15 18l-6-6 6-6" />
          </svg>
          Product
        </Link>
        <span className="text-gray-300 dark:text-gray-700">/</span>
        <span className="text-gray-800 dark:text-white/80 font-medium">Edit</span>
      </div>

      {loadError && (
        <div className="rounded-2xl border border-red-200 dark:border-red-800/40 bg-red-50 dark:bg-red-500/5 px-5 py-4 text-sm text-red-600 dark:text-red-400">
          {loadError}
        </div>
      )}

      {loading && (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-40 animate-pulse rounded-2xl border border-gray-200 dark:border-gray-800 bg-gray-100 dark:bg-gray-800/40"
            />
          ))}
        </div>
      )}

      {!loading && !loadError && (
        <form onSubmit={handleSubmit} noValidate className="space-y-6 pb-10">
          {apiError && (
            <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-5 py-4 dark:border-red-800/40 dark:bg-red-500/5">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mt-0.5 shrink-0 text-red-500">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <p className="text-sm text-red-700 dark:text-red-400">{apiError}</p>
            </div>
          )}

          {/* Basic info */}
          <Section title="Basic Info">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Category">
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className={inputClass}
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Brand">
                <select
                  value={brandId}
                  onChange={(e) => setBrandId(e.target.value)}
                  className={inputClass}
                >
                  <option value="">— No brand —</option>
                  {brands.map((b) => (
                    <option key={b.id} value={b.id}>
                      {brandLabel(b)}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Product Type">
                <select
                  value={productType}
                  onChange={(e) => setProductType(e.target.value as ProductType)}
                  className={inputClass}
                >
                  {PRODUCT_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Status">
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as "ACTIVE" | "INACTIVE")}
                  className={inputClass}
                >
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                </select>
              </Field>
              <Field label="Availability">
                <select
                  value={availabilityStatus}
                  onChange={(e) => setAvailabilityStatus(e.target.value as AvailabilityStatus)}
                  className={inputClass}
                >
                  {AVAILABILITY.map((a) => (
                    <option key={a} value={a}>
                      {a.replace("_", " ")}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            <div className="flex flex-wrap gap-6 pt-1">
              <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                <input
                  type="checkbox"
                  checked={isSuperDeal}
                  onChange={(e) => setIsSuperDeal(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-[#402F75] focus:ring-[#402F75]"
                />
                Super Deal
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                <input
                  type="checkbox"
                  checked={isLimitedStock}
                  onChange={(e) => setIsLimitedStock(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-[#402F75] focus:ring-[#402F75]"
                />
                Limited Stock
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                <input
                  type="checkbox"
                  checked={isRefurbished}
                  onChange={(e) => {
                    setIsRefurbished(e.target.checked);
                    if (!e.target.checked) setRefurbGrade("");
                  }}
                  className="h-4 w-4 rounded border-gray-300 text-[#402F75] focus:ring-[#402F75]"
                />
                Refurbished
              </label>
              {isRefurbished && (
                <select
                  value={refurbGrade}
                  onChange={(e) => setRefurbGrade(e.target.value as RefurbGrade | "")}
                  className="rounded-xl border border-gray-300 bg-white px-3 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
                >
                  <option value="">Grade…</option>
                  {REFURB_GRADES.map((g) => (
                    <option key={g} value={g}>
                      Grade {g}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </Section>

          {/* Translations */}
          <Section title="Translations">
            {(["Az", "En", "Ar"] as const).map((suffix) => {
              const titleKey = `title${suffix}` as keyof Translations;
              const descKey = `description${suffix}` as keyof Translations;
              const langName =
                suffix === "Az" ? "Azerbaijani" : suffix === "En" ? "English" : "Arabic";
              return (
                <div key={suffix}>
                  <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                    {langName} ({suffix.toUpperCase()})
                  </h4>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Field label="Title">
                      <input
                        type="text"
                        value={translations[titleKey]}
                        onChange={(e) =>
                          setTranslations((t) => ({ ...t, [titleKey]: e.target.value }))
                        }
                        className={inputClass}
                      />
                    </Field>
                    <Field label="Description">
                      <input
                        type="text"
                        value={translations[descKey]}
                        onChange={(e) =>
                          setTranslations((t) => ({ ...t, [descKey]: e.target.value }))
                        }
                        className={inputClass}
                      />
                    </Field>
                  </div>
                </div>
              );
            })}
          </Section>

          {/* Specifications */}
          <Section title="Specifications">
            {hasVariants ? (
              <p className="text-sm text-amber-600 dark:text-amber-400">
                This product has variants, so its specifications are tied to the variants and can&apos;t be edited here.
              </p>
            ) : (
              <div className="space-y-4">
                {specs.length === 0 && (
                  <p className="text-xs text-gray-400 dark:text-gray-500">No specifications yet.</p>
                )}
                {specs.map((sp, i) => (
                  <div key={i} className="rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="flex-1">
                        <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Code</label>
                        <select value={sp.code} onChange={(e) => setSpecCode(i, e.target.value)} className={inputClass}>
                          <option value="">Select code…</option>
                          {specCodes.map((c) => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </select>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeSpec(i)}
                        className="mt-7 rounded-lg border border-red-200 px-3 py-2 text-xs font-medium text-red-500 hover:bg-red-50 dark:border-red-800/40 dark:hover:bg-red-500/10"
                      >
                        Remove
                      </button>
                    </div>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                      <input placeholder="Name EN" value={sp.nameEn} onChange={(e) => setSpecField(i, "nameEn", e.target.value)} className={inputClass} />
                      <input placeholder="Name AZ" value={sp.nameAz} onChange={(e) => setSpecField(i, "nameAz", e.target.value)} className={inputClass} />
                      <input placeholder="Name AR" dir="rtl" value={sp.nameAr} onChange={(e) => setSpecField(i, "nameAr", e.target.value)} className={inputClass} />
                    </div>
                    <div className="space-y-2">
                      {sp.options.map((o, j) => (
                        <div key={j} className="flex flex-wrap items-center gap-2">
                          <input placeholder="Value EN" value={o.valueEn} onChange={(e) => updateOption(i, j, "valueEn", e.target.value)} className={`${inputClass} min-w-[110px] flex-1`} />
                          <input placeholder="Value AZ" value={o.valueAz} onChange={(e) => updateOption(i, j, "valueAz", e.target.value)} className={`${inputClass} min-w-[110px] flex-1`} />
                          <input placeholder="Value AR" dir="rtl" value={o.valueAr} onChange={(e) => updateOption(i, j, "valueAr", e.target.value)} className={`${inputClass} min-w-[110px] flex-1`} />
                          <select value={o.unit} onChange={(e) => updateOption(i, j, "unit", e.target.value)} className={`${inputClass} w-24`}>
                            {UNIT_OPTIONS.map((u) => (
                              <option key={u} value={u}>{u || "—"}</option>
                            ))}
                          </select>
                          <button
                            type="button"
                            onClick={() => removeOption(i, j)}
                            title="Delete option"
                            className="flex h-9 w-9 items-center justify-center rounded-lg text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => addOption(i)}
                        className="rounded-lg border border-dashed border-[#402F75]/40 px-3 py-1.5 text-xs font-medium text-[#402F75] hover:bg-[#402F75]/5 dark:border-[#FBBB14]/40 dark:text-[#FBBB14]"
                      >
                        + Add option
                      </button>
                    </div>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addSpec}
                  className="rounded-xl border border-dashed border-[#402F75] px-4 py-2 text-sm font-medium text-[#402F75] hover:bg-[#402F75]/5 dark:border-[#FBBB14] dark:text-[#FBBB14]"
                >
                  + Add specification
                </button>
              </div>
            )}
          </Section>

          {/* Media */}
          <Section title="Media">
            <p className="-mt-1 text-xs text-gray-400 dark:text-gray-500">
              Mark items to remove, pick the primary image, and add new files. Changes
              apply when you save.
            </p>

            {existingMedia.length > 0 && (
              <div className="flex flex-wrap gap-3">
                {existingMedia.map((m) => {
                  const marked = removeMediaIds.includes(m.id);
                  const isPrimary = primaryMediaId === m.id;
                  return (
                    <div
                      key={m.id}
                      className={`relative h-24 w-24 overflow-hidden rounded-xl border-2 ${
                        marked
                          ? "border-error-400 opacity-40"
                          : isPrimary
                          ? "border-[#402F75] dark:border-[#FBBB14]"
                          : "border-gray-200 dark:border-gray-700"
                      }`}
                    >
                      {m.mediaType === "VIDEO" ? (
                        <div className="flex h-full w-full items-center justify-center bg-gray-100 dark:bg-gray-800 text-gray-400">
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                            <polygon points="5 3 19 12 5 21 5 3" />
                          </svg>
                        </div>
                      ) : (
                        <img
                          src={getImageUrl(m.thumbnailUrl ?? m.url)}
                          alt="media"
                          className="h-full w-full object-cover"
                        />
                      )}

                      {/* Remove toggle */}
                      <button
                        type="button"
                        onClick={() => toggleRemove(m.id)}
                        title={marked ? "Keep" : "Remove"}
                        className={`absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full text-white shadow ${
                          marked ? "bg-gray-500" : "bg-error-500"
                        }`}
                      >
                        {marked ? (
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                            <path d="M3 12a9 9 0 1 0 9-9" />
                            <path d="M3 4v5h5" />
                          </svg>
                        ) : (
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                          </svg>
                        )}
                      </button>

                      {/* Primary selector */}
                      {!marked && (
                        <button
                          type="button"
                          onClick={() => setPrimaryMediaId(m.id)}
                          className={`absolute bottom-1 left-1 rounded px-1.5 py-px text-[10px] font-bold leading-none ${
                            isPrimary
                              ? "bg-[#402F75] text-white"
                              : "bg-black/50 text-white/80 hover:bg-black/70"
                          }`}
                        >
                          {isPrimary ? "Primary" : "Set primary"}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* New files */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleAddFiles}
              className="hidden"
            />
            <div className="flex flex-wrap gap-3">
              {newFiles.map((nf, i) => (
                <div
                  key={i}
                  className="relative h-24 w-24 overflow-hidden rounded-xl border-2 border-dashed border-emerald-300 dark:border-emerald-700"
                >
                  <img src={nf.preview} alt={`new-${i}`} className="h-full w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removeNewFile(i)}
                    className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-error-500 text-white shadow"
                  >
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                  <span className="absolute bottom-1 left-1 rounded bg-emerald-600 px-1 text-[10px] font-medium text-white">
                    New
                  </span>
                </div>
              ))}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex h-24 w-24 flex-col items-center justify-center rounded-xl border-2 border-dashed border-[#402F75]/40 text-[#402F75] hover:border-[#402F75] hover:bg-[#402F75]/5 dark:border-[#FBBB14]/30 dark:text-[#FBBB14]"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                <span className="mt-1 text-[10px] font-medium">Add</span>
              </button>
            </div>
          </Section>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => navigate(id ? `/products/${id}` : "/products")}
              className="rounded-xl border border-gray-200 dark:border-gray-700 px-5 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-xl bg-[#402F75] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#352561] transition-colors disabled:opacity-60"
            >
              {submitting ? "Saving…" : "Save Changes"}
            </button>
          </div>
        </form>
      )}
    </>
  );
}
