import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import Label from "../../components/form/Label";
import Input from "../../components/form/input/InputField";
import Button from "../../components/ui/button/Button";
import {
  productsService,
  brandsService,
  specsService,
  ApiRequestError,
  getOptionValue,
  getGroupName,
  SPEC_CODES,
} from "../../api";
import { validateFileUpload } from "../../utils/fileValidation";
import type { CreateProductRequest } from "../../api/services/products.service";
import type { GlobalSpecGroup } from "../../api";
import type {
  ProductStatus,
  ProductType,
  RefurbGrade,
  AvailabilityStatus,
} from "../../types/product.types";
import type { Brand } from "../../types/brand.types";

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const UNIT_OPTIONS = [
  "", "KB", "MB", "GB", "TB", "MHz", "GHz",
  "mAh", "Wh", "W", "INCH", "MP", "Mbps", "Gbps",
  "G", "KG", "Hz", "RPM",
] as const;

const SPEC_CODE_LABELS: Record<string, string> = {
  ram: "RAM",
  storage: "Storage",
  processor: "Processor",
  screen_size: "Screen Size",
  touchable_screen: "Touchable Screen",
  operating_system: "Operating System",
  keyboard_language: "Keyboard Language",
};

// ─────────────────────────────────────────────────────────────────────────────
// Local state types
// ─────────────────────────────────────────────────────────────────────────────

type SpecGroupMode = "library" | "inline";
type SpecOptionMode = "manual" | "library";

type SpecOptionState = {
  localKey: string;
  mode: SpecOptionMode;
  // library mode
  globalOptionId?: string;
  displayValue?: string;
  // manual mode
  valueAz: string;
  valueEn: string;
  valueAr: string;
  unit: string;
  additionalPrice: number;
};

type SpecState = {
  // Group mode
  groupMode: SpecGroupMode;
  // Mode A — library
  globalSpecGroupId: string;
  groupDisplayName: string;
  // Mode B — inline
  code: string;
  nameAz: string;
  nameEn: string;
  nameAr: string;
  options: SpecOptionState[];
};

type VariantState = {
  sku: string;
  selectedLocalKeys: string[];
};

type ColorState = {
  localKey: string;
  valueAz: string;
  valueEn: string;
  valueAr: string;
  colorCode: string;
  _mediaIndicesRaw: string;
};

// ─────────────────────────────────────────────────────────────────────────────
// Default empty shapes
// ─────────────────────────────────────────────────────────────────────────────

const defaultSpec = (): SpecState => ({
  groupMode: "inline",
  globalSpecGroupId: "",
  groupDisplayName: "",
  code: "",
  nameAz: "",
  nameEn: "",
  nameAr: "",
  options: [{ localKey: "", mode: "manual", valueAz: "", valueEn: "", valueAr: "", unit: "", additionalPrice: 0 }],
});

const defaultVariant = (): VariantState => ({
  sku: "",
  selectedLocalKeys: [],
});

const defaultColor = (): ColorState => ({
  localKey: "",
  valueAz: "",
  valueEn: "",
  valueAr: "",
  colorCode: "#000000",
  _mediaIndicesRaw: "",
});

// ─────────────────────────────────────────────────────────────────────────────
// Section wrapper
// ─────────────────────────────────────────────────────────────────────────────

function Section({
  title,
  hasError = false,
  children,
}: {
  title: string;
  hasError?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`rounded-2xl overflow-hidden border bg-white dark:bg-gray-800 ${
        hasError
          ? "border-red-300 dark:border-red-700"
          : "border-gray-200 dark:border-gray-700"
      }`}
    >
      <div
        className={`px-6 py-4 border-b flex items-center justify-between ${
          hasError
            ? "bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-700"
            : "bg-[#402F75]/5 dark:bg-[#402F75]/20 border-gray-100 dark:border-gray-700"
        }`}
      >
        <h3
          className={`text-sm font-semibold uppercase tracking-wide ${
            hasError
              ? "text-red-600 dark:text-red-400"
              : "text-[#402F75] dark:text-[#FBBB14]"
          }`}
        >
          {title}
        </h3>
        {hasError && (
          <span className="inline-flex items-center gap-1 rounded-full bg-red-100 dark:bg-red-500/20 px-2.5 py-0.5 text-xs font-medium text-red-600 dark:text-red-400">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            Incomplete
          </span>
        )}
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Field error hint
// ─────────────────────────────────────────────────────────────────────────────

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null;
  return (
    <p className="mt-1 flex items-center gap-1 text-xs text-red-500 dark:text-red-400">
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
      {msg}
    </p>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Select helper
// ─────────────────────────────────────────────────────────────────────────────

function Select({
  value,
  onChange,
  children,
  className = "",
}: {
  value: string;
  onChange: (v: string) => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs focus:border-[#FBBB14] focus:outline-none focus:ring-3 focus:ring-[#FBBB14]/30 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 ${className}`}
    >
      {children}
    </select>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Remove button
// ─────────────────────────────────────────────────────────────────────────────

function RemoveBtn({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="ml-2 flex h-7 w-7 items-center justify-center rounded-full text-red-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10 transition-colors"
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <line x1="18" y1="6" x2="6" y2="18" />
        <line x1="6" y1="6" x2="18" y2="18" />
      </svg>
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Add button
// ─────────────────────────────────────────────────────────────────────────────

function AddBtn({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mt-3 inline-flex items-center gap-1.5 rounded-[30px] border border-dashed border-[#402F75] px-4 py-2 text-xs font-medium text-[#402F75] hover:bg-[#402F75]/5 dark:border-[#FBBB14] dark:text-[#FBBB14] dark:hover:bg-[#FBBB14]/5 transition-colors"
    >
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <line x1="12" y1="5" x2="12" y2="19" />
        <line x1="5" y1="12" x2="19" y2="12" />
      </svg>
      {label}
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Textarea helper
// ─────────────────────────────────────────────────────────────────────────────

function Textarea({
  value,
  onChange,
  placeholder,
  rows = 3,
  hasError = false,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
  hasError?: boolean;
}) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className={`w-full rounded-lg border bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:outline-none focus:ring-3 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 ${
        hasError
          ? "border-red-400 focus:border-red-400 focus:ring-red-400/20 dark:border-red-600"
          : "border-gray-300 focus:border-[#FBBB14] focus:ring-[#FBBB14]/30 dark:border-gray-700"
      }`}
    />
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Toggle switch
// ─────────────────────────────────────────────────────────────────────────────

function Toggle({
  checked,
  onChange,
  color = "purple",
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  color?: "purple" | "yellow" | "red";
}) {
  const bg = checked
    ? color === "yellow"
      ? "bg-yellow-400"
      : color === "red"
      ? "bg-red-400"
      : "bg-[#402F75]"
    : "bg-gray-200 dark:bg-gray-700";
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors ${bg}`}
    >
      <span
        className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${
          checked ? "translate-x-6" : "translate-x-1"
        }`}
      />
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Validation
// ─────────────────────────────────────────────────────────────────────────────

type FormErrors = Partial<{
  categoryId: string;
  titleAz: string;
  titleEn: string;
  titleAr: string;
  descAz: string;
  descEn: string;
  descAr: string;
  specs: string;
  colors: string;
  media: string;
}>;

function validate(
  categoryId: string,
  titleAz: string,
  titleEn: string,
  titleAr: string,
  descAz: string,
  descEn: string,
  descAr: string,
  specs: SpecState[],
  colors: ColorState[],
  filesCount: number
): FormErrors {
  const e: FormErrors = {};

  if (!categoryId.trim()) e.categoryId = "Category ID is required";

  if (!titleAz.trim()) e.titleAz = "Required";
  if (!titleEn.trim()) e.titleEn = "Required";
  if (!titleAr.trim()) e.titleAr = "Required";
  if (!descAz.trim()) e.descAz = "Required";
  if (!descEn.trim()) e.descEn = "Required";
  if (!descAr.trim()) e.descAr = "Required";

  if (specs.length === 0) {
    e.specs = "At least one specification is required";
  } else {
    const invalidGroup = specs.some((s) => {
      if (s.groupMode === "library") return !s.globalSpecGroupId;
      return !s.code || !s.nameAz.trim() || !s.nameEn.trim() || !s.nameAr.trim();
    });
    if (invalidGroup) {
      e.specs = "Each spec group needs a selection or code + names (AZ, EN, AR)";
    } else {
      const invalidOption = specs.some((s) =>
        s.options.some((o) => {
          if (!o.localKey.trim()) return true;
          if (!o.globalOptionId && (!o.valueAz.trim() || !o.valueEn.trim() || !o.valueAr.trim())) return true;
          if (o.additionalPrice < 0) return true;
          return false;
        })
      );
      if (invalidOption) e.specs = "Each option requires a localKey and values (AZ, EN, AR) unless a global option is selected";
    }
  }

  if (colors.length === 0) e.colors = "At least one color is required";
  if (filesCount < 3)
    e.media = `At least 3 media files are required (${filesCount} added)`;

  return e;
}

// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────

export default function NewProduct() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Basic fields ──────────────────────────────────────────────────────────
  const [status, setStatus] = useState<ProductStatus>("ACTIVE");
  const [productType, setProductType] = useState<ProductType>("SIMPLE");
  const [brandId, setBrandId] = useState<string>("");
  const [isRefurbished, setIsRefurbished] = useState(false);
  const [refurbGrade, setRefurbGrade] = useState<RefurbGrade | "">("");
  const [availabilityStatus, setAvailabilityStatus] = useState<AvailabilityStatus>("PRE_ORDER");
  const [isSuperDeal, setIsSuperDeal] = useState(false);
  const [isLimitedStock, setIsLimitedStock] = useState(false);
  const [categoryId, setCategoryId] = useState("");
  const [accessoryIdsRaw, setAccessoryIdsRaw] = useState("");

  // ── Brands (fetched from API) ─────────────────────────────────────────────
  const [brands, setBrands] = useState<Brand[]>([]);

  // ── Global spec library ───────────────────────────────────────────────────
  const [globalSpecGroups, setGlobalSpecGroups] = useState<GlobalSpecGroup[]>([]);
  const [specLibraryLoaded, setSpecLibraryLoaded] = useState(false);

  // Pickers — { si, oi } for option picker; { si } for group picker
  const [activePicker, setActivePicker] = useState<{ si: number; oi: number } | null>(null);
  const [activeGroupPicker, setActiveGroupPicker] = useState<{ si: number } | null>(null);

  // ── Translations ──────────────────────────────────────────────────────────
  const [titleAz, setTitleAz] = useState("");
  const [titleEn, setTitleEn] = useState("");
  const [titleAr, setTitleAr] = useState("");
  const [descAz, setDescAz] = useState("");
  const [descEn, setDescEn] = useState("");
  const [descAr, setDescAr] = useState("");

  // ── Specs — start with one default ────────────────────────────────────────
  const [specs, setSpecs] = useState<SpecState[]>([defaultSpec()]);

  // ── Variants ──────────────────────────────────────────────────────────────
  const [variants, setVariants] = useState<VariantState[]>([]);

  // ── Colors — start with one default ──────────────────────────────────────
  const [colors, setColors] = useState<ColorState[]>([defaultColor()]);

  // ── Files ─────────────────────────────────────────────────────────────────
  const [files, setFiles] = useState<File[]>([]);
  const [filePreviews, setFilePreviews] = useState<string[]>([]);

  // ── Validation & submit state ─────────────────────────────────────────────
  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  // ─────────────────────────────────────────────────────────────────────────
  // Section refs for scroll-to-error
  // ─────────────────────────────────────────────────────────────────────────

  const basicRef = useRef<HTMLDivElement>(null);
  const translationsRef = useRef<HTMLDivElement>(null);
  const specsRef = useRef<HTMLDivElement>(null);
  const colorsRef = useRef<HTMLDivElement>(null);
  const mediaRef = useRef<HTMLDivElement>(null);

  // ─────────────────────────────────────────────────────────────────────────
  // Load brands and global spec library on mount
  // ─────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    const ctrl = new AbortController();
    brandsService.getAll(ctrl.signal)
      .then((res) => setBrands(res.data.filter((b) => b.status === "ACTIVE")))
      .catch(() => {});
    return () => ctrl.abort();
  }, []);

  useEffect(() => {
    if (specLibraryLoaded) return;
    const ctrl = new AbortController();
    specsService.getAll(ctrl.signal)
      .then((res) => {
        setGlobalSpecGroups(res.data);
        setSpecLibraryLoaded(true);
      })
      .catch(() => {});
    return () => ctrl.abort();
  }, [specLibraryLoaded]);

  // ─────────────────────────────────────────────────────────────────────────
  // File handling
  // ─────────────────────────────────────────────────────────────────────────

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const newFiles = Array.from(e.target.files ?? []);
    if (!newFiles.length) return;
    setFiles((prev) => [...prev, ...newFiles]);
    setFilePreviews((prev) => [
      ...prev,
      ...newFiles.map((f) => URL.createObjectURL(f)),
    ]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function removeFile(index: number) {
    setFiles((prev) => prev.filter((_, i) => i !== index));
    setFilePreviews((prev) => {
      URL.revokeObjectURL(prev[index]);
      return prev.filter((_, i) => i !== index);
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Spec GROUP helpers
  // ─────────────────────────────────────────────────────────────────────────

  function addSpec() {
    setSpecs((prev) => [...prev, defaultSpec()]);
  }

  function removeSpec(si: number) {
    setSpecs((prev) => prev.filter((_, i) => i !== si));
  }

  function setSpecGroupMode(si: number, mode: SpecGroupMode) {
    setSpecs((prev) =>
      prev.map((s, i) =>
        i === si
          ? { ...s, groupMode: mode, globalSpecGroupId: "", groupDisplayName: "" }
          : s
      )
    );
  }

  function selectGlobalSpecGroup(si: number, group: GlobalSpecGroup) {
    const displayName = getGroupName(group, "EN");
    setSpecs((prev) =>
      prev.map((s, i) =>
        i === si
          ? {
              ...s,
              groupMode: "library" as SpecGroupMode,
              globalSpecGroupId: group.id,
              groupDisplayName: displayName,
              code: group.code,
            }
          : s
      )
    );
    setActiveGroupPicker(null);
  }

  function clearSpecGroup(si: number) {
    setSpecs((prev) =>
      prev.map((s, i) =>
        i === si
          ? { ...s, globalSpecGroupId: "", groupDisplayName: "", groupMode: "inline" as SpecGroupMode }
          : s
      )
    );
  }

  function updateSpecCode(si: number, code: string) {
    // When code is selected in inline mode, auto-populate names from library if found
    const found = globalSpecGroups.find((g) => g.code === code);
    setSpecs((prev) =>
      prev.map((s, i) => {
        if (i !== si) return s;
        return {
          ...s,
          code,
          nameAz: found ? getGroupName(found, "AZ") : s.nameAz,
          nameEn: found ? getGroupName(found, "EN") : s.nameEn,
          nameAr: found ? getGroupName(found, "AR") : s.nameAr,
        };
      })
    );
  }

  function updateSpecName(si: number, key: "nameAz" | "nameEn" | "nameAr", value: string) {
    setSpecs((prev) => prev.map((s, i) => (i === si ? { ...s, [key]: value } : s)));
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Spec OPTION helpers
  // ─────────────────────────────────────────────────────────────────────────

  function addSpecOption(si: number) {
    setSpecs((prev) =>
      prev.map((s, i) =>
        i === si
          ? {
              ...s,
              options: [
                ...s.options,
                { localKey: "", mode: "manual" as SpecOptionMode, valueAz: "", valueEn: "", valueAr: "", unit: "", additionalPrice: 0 },
              ],
            }
          : s
      )
    );
  }

  function removeSpecOption(si: number, oi: number) {
    setSpecs((prev) =>
      prev.map((s, i) =>
        i === si ? { ...s, options: s.options.filter((_, j) => j !== oi) } : s
      )
    );
  }

  function updateSpecOption(si: number, oi: number, key: string, value: string | number) {
    setSpecs((prev) =>
      prev.map((s, i) => {
        if (i !== si) return s;
        return {
          ...s,
          options: s.options.map((o, j) => {
            if (j !== oi) return o;
            const updated = { ...o, [key]: value };
            if (key === "valueEn" && !o.localKey) {
              const slug = `${s.code || "spec"}-${String(value).toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "")}`;
              updated.localKey = slug;
            }
            return updated;
          }),
        };
      })
    );
  }

  function selectGlobalOption(si: number, oi: number, optionId: string, displayValue: string, specCode: string) {
    const slug = `${specCode}-${displayValue.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "")}`;
    setSpecs((prev) =>
      prev.map((s, i) =>
        i === si
          ? {
              ...s,
              options: s.options.map((o, j) =>
                j === oi
                  ? { ...o, mode: "library" as SpecOptionMode, globalOptionId: optionId, displayValue, localKey: o.localKey || slug }
                  : o
              ),
            }
          : s
      )
    );
    setActivePicker(null);
  }

  function openOptionPicker(si: number, oi: number) {
    updateSpecOption(si, oi, "mode", "library");
    setActivePicker({ si, oi });
  }

  function clearGlobalOption(si: number, oi: number) {
    setSpecs((prev) =>
      prev.map((s, i) =>
        i === si
          ? {
              ...s,
              options: s.options.map((o, j) =>
                j === oi
                  ? { ...o, mode: "manual" as SpecOptionMode, globalOptionId: undefined, displayValue: undefined }
                  : o
              ),
            }
          : s
      )
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Variant helpers
  // ─────────────────────────────────────────────────────────────────────────

  function addVariant() {
    setVariants((prev) => [...prev, defaultVariant()]);
  }

  function removeVariant(vi: number) {
    setVariants((prev) => prev.filter((_, i) => i !== vi));
  }

  function updateVariant(vi: number, key: "sku", value: string) {
    setVariants((prev) => prev.map((v, i) => (i === vi ? { ...v, [key]: value } : v)));
  }

  function toggleVariantLocalKey(vi: number, localKey: string) {
    setVariants((prev) =>
      prev.map((v, i) => {
        if (i !== vi) return v;
        const already = v.selectedLocalKeys.includes(localKey);
        return {
          ...v,
          selectedLocalKeys: already
            ? v.selectedLocalKeys.filter((k) => k !== localKey)
            : [...v.selectedLocalKeys, localKey],
        };
      })
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Color helpers
  // ─────────────────────────────────────────────────────────────────────────

  function addColor() {
    setColors((prev) => [...prev, defaultColor()]);
  }

  function removeColor(ci: number) {
    setColors((prev) => prev.filter((_, i) => i !== ci));
  }

  function updateColor(ci: number, key: keyof ColorState, value: string) {
    setColors((prev) => prev.map((c, i) => (i === ci ? { ...c, [key]: value } : c)));
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Submit
  // ─────────────────────────────────────────────────────────────────────────

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setApiError(null);
    setSubmitted(true);

    const errs = validate(
      categoryId,
      titleAz, titleEn, titleAr,
      descAz, descEn, descAr,
      specs, colors, files.length
    );

    // Detailed file validation
    if (files.length > 0) {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const result = await validateFileUpload(file, "GENERAL");
        if (!result.isValid) {
          errs.media = `File #${i + 1}: ${result.message}`;
          break;
        }
      }
    }

    setErrors(errs);

    if (Object.keys(errs).length > 0) {
      const hasBasic = errs.categoryId;
      const hasTrans = errs.titleAz || errs.titleEn || errs.titleAr || errs.descAz || errs.descEn || errs.descAr;
      if (hasBasic) basicRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      else if (hasTrans) translationsRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      else if (errs.specs) specsRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      else if (errs.colors) colorsRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      else if (errs.media) mediaRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: CreateProductRequest = {
        categoryId,
        brandId: brandId || null,
        productType,
        status,
        isRefurbished,
        refurbGrade: isRefurbished ? (refurbGrade || null) : null,
        availabilityStatus,
        isSuperDeal,
        isLimitedStock,
        accessoryIds: accessoryIdsRaw.split(",").map((s) => s.trim()).filter(Boolean),
        translations: {
          titleAz, titleEn, titleAr,
          descriptionAz: descAz,
          descriptionEn: descEn,
          descriptionAr: descAr,
        },
        specs: specs.map((s) => {
          const mappedOptions = s.options.map((o) =>
            o.mode === "library" && o.globalOptionId
              ? { localKey: o.localKey, globalOptionId: o.globalOptionId, additionalPrice: Number(o.additionalPrice) || 0 }
              : { localKey: o.localKey, valueAz: o.valueAz, valueEn: o.valueEn, valueAr: o.valueAr, unit: o.unit || undefined, additionalPrice: Number(o.additionalPrice) || 0 }
          );
          if (s.groupMode === "library") {
            return { globalSpecGroupId: s.globalSpecGroupId, options: mappedOptions };
          }
          return { code: s.code, nameAz: s.nameAz, nameEn: s.nameEn, nameAr: s.nameAr, options: mappedOptions };
        }),
        variants: variants.map((v) => ({
          sku: v.sku,
          specOptionLocalKeys: v.selectedLocalKeys,
        })),
        colors: colors.map((c) => ({
          localKey: c.localKey,
          valueAz: c.valueAz,
          valueEn: c.valueEn,
          valueAr: c.valueAr,
          colorCode: c.colorCode,
          mediaIndices: c._mediaIndicesRaw
            .split(",")
            .map((s) => parseInt(s.trim()))
            .filter((n) => !isNaN(n)),
        })),
      };

      await productsService.create(payload, files);
      navigate("/products");
    } catch (err) {
      const message =
        err instanceof ApiRequestError
          ? err.message
          : "Failed to create product. Please try again.";
      setApiError(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Derived
  // ─────────────────────────────────────────────────────────────────────────

  const basicHasError = submitted && !!errors.categoryId;
  const translationsHasError =
    submitted &&
    !!(errors.titleAz || errors.titleEn || errors.titleAr || errors.descAz || errors.descEn || errors.descAr);
  const specsHasError = submitted && !!errors.specs;
  const colorsHasError = submitted && !!errors.colors;
  const mediaHasError = submitted && !!errors.media;

  // All defined local keys across all specs (for variant multi-select)
  const allLocalKeys = specs.flatMap((s) => s.options.map((o) => o.localKey)).filter(Boolean);

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <>
      <PageMeta
        title="New Product | Buyology Dashboard"
        description="Create a new product in the Buyology platform."
      />

      <PageBreadcrumb pageTitle="New Product" />

      {/* ── Spec Group Picker Modal ───────────────────────────────────────── */}
      {activeGroupPicker !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
          onClick={() => setActiveGroupPicker(null)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white dark:bg-gray-800 shadow-xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-700">
              <h4 className="text-sm font-semibold text-[#402F75] dark:text-[#FBBB14]">
                Select Global Spec Group
              </h4>
              <button
                type="button"
                onClick={() => setActiveGroupPicker(null)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <div className="p-4 max-h-80 overflow-y-auto space-y-2">
              {globalSpecGroups.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-6">No spec groups in library yet</p>
              ) : (
                globalSpecGroups.map((group) => (
                  <button
                    key={group.id}
                    type="button"
                    onClick={() => selectGlobalSpecGroup(activeGroupPicker.si, group)}
                    className="w-full flex items-center justify-between rounded-lg px-4 py-3 text-left text-sm hover:bg-[#402F75]/5 dark:hover:bg-[#402F75]/20 transition-colors border border-gray-100 dark:border-gray-700"
                  >
                    <div>
                      <span className="font-medium text-gray-800 dark:text-white">
                        {getGroupName(group, "EN")}
                      </span>
                      <span className="ml-2 rounded bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 text-xs text-gray-500 dark:text-gray-400 font-mono">
                        {group.code}
                      </span>
                    </div>
                    <span className="text-xs text-gray-400">{group.options.length} opts</span>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Option Library Picker Modal ───────────────────────────────────── */}
      {activePicker !== null && (() => {
        const spec = specs[activePicker.si];
        // For library mode group, use group options from globalSpecGroups; otherwise use spec's code
        const globalGroup = spec.groupMode === "library"
          ? globalSpecGroups.find((g) => g.id === spec.globalSpecGroupId)
          : globalSpecGroups.find((g) => g.code === spec.code);
        const options = globalGroup?.options ?? [];
        return (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
            onClick={() => setActivePicker(null)}
          >
            <div
              className="w-full max-w-md rounded-2xl bg-white dark:bg-gray-800 shadow-xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-700">
                <h4 className="text-sm font-semibold text-[#402F75] dark:text-[#FBBB14]">
                  Pick Option — {spec.groupMode === "library" ? spec.groupDisplayName : (SPEC_CODE_LABELS[spec.code] ?? spec.code)}
                </h4>
                <button
                  type="button"
                  onClick={() => setActivePicker(null)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
              <div className="p-4 max-h-72 overflow-y-auto space-y-2">
                {options.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-6">
                    {globalGroup ? "No options in this group yet" : "Select a spec group first to see library options"}
                  </p>
                ) : (
                  options.map((opt) => {
                    const val = getOptionValue(opt, "EN");
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() =>
                          selectGlobalOption(
                            activePicker.si,
                            activePicker.oi,
                            opt.id,
                            val,
                            spec.code || spec.groupDisplayName
                          )
                        }
                        className="w-full flex items-center justify-between rounded-lg px-4 py-3 text-left text-sm hover:bg-[#402F75]/5 dark:hover:bg-[#402F75]/20 transition-colors border border-gray-100 dark:border-gray-700"
                      >
                        <span className="font-medium text-gray-800 dark:text-white">{val}</span>
                        {opt.unit && (
                          <span className="text-xs text-gray-400">{opt.unit}</span>
                        )}
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        );
      })()}

      <form onSubmit={handleSubmit} noValidate className="space-y-6 pb-10">

        {/* ── API error banner ─────────────────────────────────────────────── */}
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

        {/* ── Validation summary banner ────────────────────────────────────── */}
        {submitted && Object.keys(errors).length > 0 && (
          <div className="flex items-start gap-3 rounded-xl border border-orange-200 bg-orange-50 px-5 py-4 dark:border-orange-700/40 dark:bg-orange-500/5">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mt-0.5 shrink-0 text-orange-500">
              <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            <div>
              <p className="text-sm font-medium text-orange-700 dark:text-orange-400">
                Please fix the following before submitting:
              </p>
              <ul className="mt-1.5 space-y-0.5 text-xs text-orange-600 dark:text-orange-500 list-disc list-inside">
                {errors.categoryId && <li>{errors.categoryId}</li>}
                {(errors.titleAz || errors.titleEn || errors.titleAr) && <li>All titles are required (AZ, EN, AR)</li>}
                {(errors.descAz || errors.descEn || errors.descAr) && <li>All descriptions are required (AZ, EN, AR)</li>}
                {errors.specs && <li>{errors.specs}</li>}
                {errors.colors && <li>{errors.colors}</li>}
                {errors.media && <li>{errors.media}</li>}
              </ul>
            </div>
          </div>
        )}

        {/* ── Basic Info ───────────────────────────────────────────────────── */}
        <div ref={basicRef}>
          <Section title="Basic Info" hasError={basicHasError}>
            {/* Store assignment reminder banner */}
            <div className="mb-5 flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 dark:border-blue-800/40 dark:bg-blue-500/5">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mt-0.5 shrink-0 text-blue-500">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <div>
                <p className="text-sm font-medium text-blue-700 dark:text-blue-400">No pricing or SKU required</p>
                <p className="mt-0.5 text-xs text-blue-600 dark:text-blue-500">
                  The SKU is auto-generated by the backend. After creating this product, assign it to stores from the Store Management section to set pricing and stock.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <Label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Category ID <span className="text-red-500">*</span>
                </Label>
                <Input
                  placeholder="3fa85f64-5717-4562-b3fc-2c963f66afa6"
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  error={submitted && !!errors.categoryId}
                />
                <FieldError msg={submitted ? errors.categoryId : undefined} />
              </div>

              <div>
                <Label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Brand
                </Label>
                <Select value={brandId} onChange={setBrandId}>
                  <option value="">No brand</option>
                  {brands.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.translations.find((t) => t.language === "EN")?.name ?? b.id}
                    </option>
                  ))}
                </Select>
              </div>

              <div>
                <Label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Product Type
                </Label>
                <Select value={productType} onChange={(v) => setProductType(v as ProductType)}>
                  <option value="SIMPLE">Simple (SKU: DTDX-XXXXXX)</option>
                  <option value="DIY">DIY (SKU: DTDX-XXXXXX)</option>
                  <option value="ACCESSORY">Accessory (SKU: DTAX-XXXXXX)</option>
                </Select>
              </div>

              <div>
                <Label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Status
                </Label>
                <Select value={status} onChange={(v) => setStatus(v as ProductStatus)}>
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                </Select>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <Toggle checked={isRefurbished} onChange={setIsRefurbished} />
                <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Refurbished
                </Label>
              </div>

              {isRefurbished && (
                <div>
                  <Label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Refurb Grade
                  </Label>
                  <Select value={refurbGrade} onChange={(v) => setRefurbGrade(v as RefurbGrade | "")}>
                    <option value="">Select grade</option>
                    <option value="A">A — Like new</option>
                    <option value="B">B — Minor cosmetic wear</option>
                    <option value="C">C — Visible wear, fully functional</option>
                  </Select>
                </div>
              )}
            </div>

            <div className="mt-5">
              <Label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Accessory IDs{" "}
                <span className="text-xs font-normal text-gray-400">(optional — comma-separated UUIDs)</span>
              </Label>
              <Input
                placeholder="3fa85f64-..., 4bc92f74-..."
                value={accessoryIdsRaw}
                onChange={(e) => setAccessoryIdsRaw(e.target.value)}
              />
            </div>
          </Section>
        </div>

        {/* ── Availability & Flags ─────────────────────────────────────────── */}
        <Section title="Availability &amp; Flags">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <Label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Stock Status
              </Label>
              <Select value={availabilityStatus} onChange={(v) => setAvailabilityStatus(v as AvailabilityStatus)}>
                <option value="IN_STOCK">In Stock</option>
                <option value="OUT_OF_STOCK">Out of Stock</option>
                <option value="PRE_ORDER">Pre-Order</option>
              </Select>
            </div>

            <div className="flex items-center gap-4 pt-6">
              <Toggle checked={isSuperDeal} onChange={setIsSuperDeal} color="yellow" />
              <div>
                <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Super Deal
                </Label>
                <p className="text-xs text-gray-400 dark:text-gray-500">
                  Shows product in Super Deals section.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4 pt-6">
              <Toggle checked={isLimitedStock} onChange={setIsLimitedStock} color="red" />
              <div>
                <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Limited Stock
                </Label>
                <p className="text-xs text-gray-400 dark:text-gray-500">
                  Flags product as limited stock.
                </p>
              </div>
            </div>
          </div>
        </Section>

        {/* ── Translations ─────────────────────────────────────────────────── */}
        <div ref={translationsRef}>
          <Section title="Translations" hasError={translationsHasError}>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">

              {/* Azerbaijani */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center rounded-md bg-[#402F75]/10 px-2.5 py-1 text-xs font-semibold text-[#402F75] dark:bg-[#402F75]/30 dark:text-[#FBBB14]">AZ</span>
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Azerbaijani</span>
                </div>
                <div>
                  <Label className="mb-1 block text-xs text-gray-500 dark:text-gray-400">Title <span className="text-red-500">*</span></Label>
                  <Input placeholder="Yeni Məhsul" value={titleAz} onChange={(e) => setTitleAz(e.target.value)} error={submitted && !!errors.titleAz} />
                  <FieldError msg={submitted ? errors.titleAz : undefined} />
                </div>
                <div>
                  <Label className="mb-1 block text-xs text-gray-500 dark:text-gray-400">Description <span className="text-red-500">*</span></Label>
                  <Textarea placeholder="Təsvir..." value={descAz} onChange={setDescAz} hasError={submitted && !!errors.descAz} />
                  <FieldError msg={submitted ? errors.descAz : undefined} />
                </div>
              </div>

              {/* English */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center rounded-md bg-[#402F75]/10 px-2.5 py-1 text-xs font-semibold text-[#402F75] dark:bg-[#402F75]/30 dark:text-[#FBBB14]">EN</span>
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">English</span>
                </div>
                <div>
                  <Label className="mb-1 block text-xs text-gray-500 dark:text-gray-400">Title <span className="text-red-500">*</span></Label>
                  <Input placeholder="New Product" value={titleEn} onChange={(e) => setTitleEn(e.target.value)} error={submitted && !!errors.titleEn} />
                  <FieldError msg={submitted ? errors.titleEn : undefined} />
                </div>
                <div>
                  <Label className="mb-1 block text-xs text-gray-500 dark:text-gray-400">Description <span className="text-red-500">*</span></Label>
                  <Textarea placeholder="Description..." value={descEn} onChange={setDescEn} hasError={submitted && !!errors.descEn} />
                  <FieldError msg={submitted ? errors.descEn : undefined} />
                </div>
              </div>

              {/* Arabic */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center rounded-md bg-[#402F75]/10 px-2.5 py-1 text-xs font-semibold text-[#402F75] dark:bg-[#402F75]/30 dark:text-[#FBBB14]">AR</span>
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Arabic</span>
                </div>
                <div>
                  <Label className="mb-1 block text-xs text-gray-500 dark:text-gray-400">Title <span className="text-red-500">*</span></Label>
                  <Input placeholder="منتج جديد" value={titleAr} onChange={(e) => setTitleAr(e.target.value)} error={submitted && !!errors.titleAr} className="text-right" />
                  <FieldError msg={submitted ? errors.titleAr : undefined} />
                </div>
                <div>
                  <Label className="mb-1 block text-xs text-gray-500 dark:text-gray-400">Description <span className="text-red-500">*</span></Label>
                  <Textarea placeholder="وصف..." value={descAr} onChange={setDescAr} hasError={submitted && !!errors.descAr} />
                  <FieldError msg={submitted ? errors.descAr : undefined} />
                </div>
              </div>

            </div>
          </Section>
        </div>

        {/* ── Specifications ────────────────────────────────────────────────── */}
        <div ref={specsRef}>
          <Section title="Specifications" hasError={specsHasError}>
            <div className="space-y-5">
              {specs.map((spec, si) => (
                <div key={si} className="rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                  <div className="mb-4 flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wide text-[#402F75] dark:text-[#FBBB14]">
                      Spec #{si + 1}
                    </span>
                    <RemoveBtn onClick={() => removeSpec(si)} />
                  </div>

                  {/* Group mode toggle */}
                  <div className="mb-4">
                    <p className="mb-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Spec Group</p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setSpecGroupMode(si, "library")}
                        className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                          spec.groupMode === "library"
                            ? "bg-[#402F75] text-white"
                            : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
                        }`}
                      >
                        From Global Library
                      </button>
                      <button
                        type="button"
                        onClick={() => setSpecGroupMode(si, "inline")}
                        className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                          spec.groupMode === "inline"
                            ? "bg-[#402F75] text-white"
                            : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
                        }`}
                      >
                        Define Inline
                      </button>
                    </div>
                  </div>

                  {/* Mode A — From Global Library */}
                  {spec.groupMode === "library" && (
                    <div className="mb-4">
                      {spec.globalSpecGroupId ? (
                        <div className="flex items-center gap-3 rounded-lg bg-[#402F75]/5 dark:bg-[#402F75]/10 px-4 py-3">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-[#402F75] dark:text-[#FBBB14] flex-shrink-0">
                            <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
                            <path d="M9 12l2 2 4-4" />
                          </svg>
                          <div className="flex-1">
                            <span className="text-sm font-medium text-gray-800 dark:text-white">{spec.groupDisplayName}</span>
                            <span className="ml-2 rounded bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 text-xs font-mono text-gray-500 dark:text-gray-400">{spec.code}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => clearSpecGroup(si)}
                            className="text-xs text-gray-400 hover:text-red-500 transition-colors"
                          >
                            Change
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setActiveGroupPicker({ si })}
                          className="w-full flex items-center justify-center gap-2 rounded-lg border-2 border-dashed border-[#402F75]/30 dark:border-[#FBBB14]/20 px-4 py-3 text-sm text-[#402F75] dark:text-[#FBBB14] hover:border-[#402F75]/60 dark:hover:border-[#FBBB14]/40 hover:bg-[#402F75]/5 transition-colors"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="11" cy="11" r="8" />
                            <line x1="21" y1="21" x2="16.65" y2="16.65" />
                          </svg>
                          Browse Spec Library
                        </button>
                      )}
                    </div>
                  )}

                  {/* Mode B — Define Inline */}
                  {spec.groupMode === "inline" && (
                    <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                      <div>
                        <Label className="mb-1 block text-xs text-gray-500">
                          Code <span className="text-red-500">*</span>
                        </Label>
                        <Select value={spec.code} onChange={(v) => updateSpecCode(si, v)}>
                          <option value="">Select code…</option>
                          {SPEC_CODES.map((code) => (
                            <option key={code} value={code}>
                              {SPEC_CODE_LABELS[code] ?? code} ({code})
                            </option>
                          ))}
                        </Select>
                      </div>
                      <div>
                        <Label className="mb-1 block text-xs text-gray-500">
                          Name AZ <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          placeholder="Zəmanət"
                          value={spec.nameAz}
                          onChange={(e) => updateSpecName(si, "nameAz", e.target.value)}
                        />
                      </div>
                      <div>
                        <Label className="mb-1 block text-xs text-gray-500">
                          Name EN <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          placeholder="Warranty"
                          value={spec.nameEn}
                          onChange={(e) => updateSpecName(si, "nameEn", e.target.value)}
                        />
                      </div>
                      <div>
                        <Label className="mb-1 block text-xs text-gray-500">
                          Name AR <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          placeholder="ضمان"
                          value={spec.nameAr}
                          onChange={(e) => updateSpecName(si, "nameAr", e.target.value)}
                          className="text-right"
                        />
                      </div>
                    </div>
                  )}

                  {/* Options */}
                  <div className="mt-2 space-y-3">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Options</p>
                    {spec.options.map((opt, oi) => (
                      <div key={oi} className="flex items-start gap-2 rounded-lg bg-gray-50 dark:bg-gray-900/50 p-3">
                        <div className="flex-1">
                          {/* Option mode toggle */}
                          <div className="mb-3 flex items-center gap-2 flex-wrap">
                            <button
                              type="button"
                              onClick={() => opt.mode === "library" ? clearGlobalOption(si, oi) : updateSpecOption(si, oi, "mode", "manual")}
                              className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                                opt.mode === "manual"
                                  ? "bg-[#402F75] text-white"
                                  : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400 hover:bg-gray-200"
                              }`}
                            >
                              Manual
                            </button>
                            <button
                              type="button"
                              onClick={() => openOptionPicker(si, oi)}
                              className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                                opt.mode === "library"
                                  ? "bg-[#402F75] text-white"
                                  : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400 hover:bg-gray-200"
                              }`}
                            >
                              From Library
                            </button>
                            {opt.mode === "library" && opt.displayValue && (
                              <span className="ml-1 text-xs text-[#402F75] dark:text-[#FBBB14] font-medium">
                                → {opt.displayValue}
                              </span>
                            )}
                          </div>

                          {opt.mode === "library" ? (
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <Label className="mb-1 block text-xs text-gray-400">Local Key</Label>
                                <Input
                                  placeholder="ram-16gb"
                                  value={opt.localKey}
                                  onChange={(e) => updateSpecOption(si, oi, "localKey", e.target.value)}
                                />
                              </div>
                              <div>
                                <Label className="mb-1 block text-xs text-gray-400">+Price</Label>
                                <Input
                                  type="number"
                                  placeholder="0"
                                  value={opt.additionalPrice}
                                  onChange={(e) => updateSpecOption(si, oi, "additionalPrice", parseFloat(e.target.value) || 0)}
                                  min="0"
                                  step={0.01}
                                />
                              </div>
                            </div>
                          ) : (
                            <div className="grid grid-cols-2 gap-3 sm:grid-cols-6">
                              <div>
                                <Label className="mb-1 block text-xs text-gray-400">Local Key</Label>
                                <Input
                                  placeholder="ram-16gb"
                                  value={opt.localKey}
                                  onChange={(e) => updateSpecOption(si, oi, "localKey", e.target.value)}
                                />
                              </div>
                              <div>
                                <Label className="mb-1 block text-xs text-gray-400">Value AZ</Label>
                                <Input
                                  placeholder="16GB"
                                  value={opt.valueAz}
                                  onChange={(e) => updateSpecOption(si, oi, "valueAz", e.target.value)}
                                />
                              </div>
                              <div>
                                <Label className="mb-1 block text-xs text-gray-400">Value EN</Label>
                                <Input
                                  placeholder="16GB"
                                  value={opt.valueEn}
                                  onChange={(e) => updateSpecOption(si, oi, "valueEn", e.target.value)}
                                />
                              </div>
                              <div>
                                <Label className="mb-1 block text-xs text-gray-400">Value AR</Label>
                                <Input
                                  placeholder="16GB"
                                  value={opt.valueAr}
                                  onChange={(e) => updateSpecOption(si, oi, "valueAr", e.target.value)}
                                />
                              </div>
                              <div>
                                <Label className="mb-1 block text-xs text-gray-400">Unit</Label>
                                <Select
                                  value={opt.unit}
                                  onChange={(v) => updateSpecOption(si, oi, "unit", v)}
                                >
                                  {UNIT_OPTIONS.map((u) => (
                                    <option key={u} value={u}>{u || "—"}</option>
                                  ))}
                                </Select>
                              </div>
                              <div>
                                <Label className="mb-1 block text-xs text-gray-400">+Price</Label>
                                <Input
                                  type="number"
                                  placeholder="0"
                                  value={opt.additionalPrice}
                                  onChange={(e) => updateSpecOption(si, oi, "additionalPrice", parseFloat(e.target.value) || 0)}
                                  min="0"
                                  step={0.01}
                                />
                              </div>
                            </div>
                          )}
                        </div>
                        <div className="mt-10">
                          <RemoveBtn onClick={() => removeSpecOption(si, oi)} />
                        </div>
                      </div>
                    ))}
                    <AddBtn onClick={() => addSpecOption(si)} label="Add Option" />
                  </div>
                </div>
              ))}
            </div>

            {specsHasError && errors.specs && (
              <p className="mt-3 flex items-center gap-1 text-sm text-red-500 dark:text-red-400">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                {errors.specs}
              </p>
            )}

            <AddBtn onClick={addSpec} label="Add Specification" />
          </Section>
        </div>

        {/* ── Variants ─────────────────────────────────────────────────────── */}
        <Section title="Variants">
          <div className="mb-4 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-800/40 dark:bg-amber-500/5">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mt-0.5 shrink-0 text-amber-500">
              <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            <p className="text-xs text-amber-700 dark:text-amber-400">
              Price and stock are set per-store after creation. Variants here define only SKU and which spec options they represent.
            </p>
          </div>
          <div className="space-y-4">
            {variants.map((v, vi) => (
              <div key={vi} className="rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                <div className="mb-4 flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wide text-[#402F75] dark:text-[#FBBB14]">
                    Variant #{vi + 1}
                  </span>
                  <RemoveBtn onClick={() => removeVariant(vi)} />
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <Label className="mb-1 block text-xs text-gray-500">SKU</Label>
                    <Input
                      placeholder="HP-15-V1-512"
                      value={v.sku}
                      onChange={(e) => updateVariant(vi, "sku", e.target.value)}
                    />
                  </div>
                </div>

                {/* Spec option local keys — multi-select from defined options */}
                <div className="mt-4">
                  <Label className="mb-2 block text-xs text-gray-500">
                    Spec Option Local Keys
                    <span className="ml-1 font-normal text-gray-400">(select which spec options apply to this variant)</span>
                  </Label>
                  {allLocalKeys.length === 0 ? (
                    <p className="text-xs text-gray-400 italic">Define spec options above to link them here</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {allLocalKeys.map((key) => {
                        const active = v.selectedLocalKeys.includes(key);
                        return (
                          <button
                            key={key}
                            type="button"
                            onClick={() => toggleVariantLocalKey(vi, key)}
                            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                              active
                                ? "bg-[#402F75] text-white dark:bg-[#402F75]"
                                : "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                            }`}
                          >
                            {key}
                          </button>
                        );
                      })}
                    </div>
                  )}
                  {v.selectedLocalKeys.length > 0 && (
                    <p className="mt-2 text-xs text-gray-400">
                      Selected: {v.selectedLocalKeys.join(", ")}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
          <AddBtn onClick={addVariant} label="Add Variant" />
        </Section>

        {/* ── Colors ───────────────────────────────────────────────────────── */}
        <div ref={colorsRef}>
          <Section title="Colors" hasError={colorsHasError}>
            <div className="space-y-4">
              {colors.map((c, ci) => (
                <div key={ci} className="rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                  <div className="mb-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-semibold uppercase tracking-wide text-[#402F75] dark:text-[#FBBB14]">
                        Color #{ci + 1}
                      </span>
                      <span
                        className="h-5 w-5 rounded-full border border-gray-300 dark:border-gray-600"
                        style={{ backgroundColor: c.colorCode }}
                      />
                    </div>
                    <RemoveBtn onClick={() => removeColor(ci)} />
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    <div>
                      <Label className="mb-1 block text-xs text-gray-500">Local Key</Label>
                      <Input placeholder="color-silver" value={c.localKey} onChange={(e) => updateColor(ci, "localKey", e.target.value)} />
                    </div>
                    <div>
                      <Label className="mb-1 block text-xs text-gray-500">Value AZ</Label>
                      <Input placeholder="Gümüşü" value={c.valueAz} onChange={(e) => updateColor(ci, "valueAz", e.target.value)} />
                    </div>
                    <div>
                      <Label className="mb-1 block text-xs text-gray-500">Value EN</Label>
                      <Input placeholder="Silver" value={c.valueEn} onChange={(e) => updateColor(ci, "valueEn", e.target.value)} />
                    </div>
                    <div>
                      <Label className="mb-1 block text-xs text-gray-500">Value AR</Label>
                      <Input placeholder="فضي" value={c.valueAr} onChange={(e) => updateColor(ci, "valueAr", e.target.value)} className="text-right" />
                    </div>
                    <div>
                      <Label className="mb-1 block text-xs text-gray-500">Color Code</Label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={c.colorCode}
                          onChange={(e) => updateColor(ci, "colorCode", e.target.value)}
                          className="h-11 w-14 cursor-pointer rounded-lg border border-gray-300 p-1 dark:border-gray-700"
                        />
                        <Input placeholder="#C0C0C0" value={c.colorCode} onChange={(e) => updateColor(ci, "colorCode", e.target.value)} />
                      </div>
                    </div>
                    <div>
                      <Label className="mb-1 block text-xs text-gray-500">
                        Media Indices <span className="text-gray-400">(comma-separated, e.g. 0,1)</span>
                      </Label>
                      <Input placeholder="0, 1" value={c._mediaIndicesRaw} onChange={(e) => updateColor(ci, "_mediaIndicesRaw", e.target.value)} />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {colorsHasError && errors.colors && (
              <p className="mt-3 flex items-center gap-1 text-sm text-red-500 dark:text-red-400">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                {errors.colors}
              </p>
            )}

            <AddBtn onClick={addColor} label="Add Color" />
          </Section>
        </div>

        {/* ── Media Files ──────────────────────────────────────────────────── */}
        <div ref={mediaRef}>
          <Section title="Media Files" hasError={mediaHasError}>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*"
              multiple
              onChange={handleFileChange}
              className="hidden"
            />

            <div className="flex flex-wrap gap-3">
              {filePreviews.map((src, i) => (
                <div key={i} className="relative group">
                  <img
                    src={src}
                    alt={`media-${i}`}
                    className="h-20 w-20 rounded-xl object-cover border border-gray-200 dark:border-gray-700"
                  />
                  <button
                    type="button"
                    onClick={() => removeFile(i)}
                    className="absolute -right-2 -top-2 hidden group-hover:flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-white shadow"
                  >
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                  <span className="absolute bottom-1 left-1 rounded bg-black/50 px-1 text-[10px] text-white">
                    #{i}
                  </span>
                </div>
              ))}

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className={`flex h-20 w-20 flex-col items-center justify-center rounded-xl border-2 border-dashed transition-colors ${
                  mediaHasError
                    ? "border-red-400 text-red-400 hover:border-red-500 hover:bg-red-50 dark:hover:bg-red-500/5"
                    : "border-[#402F75]/40 text-[#402F75] hover:border-[#402F75] hover:bg-[#402F75]/5 dark:border-[#FBBB14]/30 dark:text-[#FBBB14] dark:hover:border-[#FBBB14]/60"
                }`}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                <span className="mt-1 text-[10px] font-medium">Add</span>
              </button>
            </div>

            <div className="mt-3 flex items-center justify-between">
              <p className="text-xs text-gray-400 dark:text-gray-500">
                {files.length > 0
                  ? `${files.length} file${files.length > 1 ? "s" : ""} added — index numbers on thumbnails map to color mediaIndices`
                  : "No files added yet"}
              </p>
              <span className={`text-xs font-semibold ${files.length >= 3 ? "text-green-600 dark:text-green-400" : "text-red-500 dark:text-red-400"}`}>
                {files.length}/3 min
              </span>
            </div>

            {mediaHasError && errors.media && (
              <p className="mt-1 flex items-center gap-1 text-sm text-red-500 dark:text-red-400">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                {errors.media}
              </p>
            )}
          </Section>
        </div>

        {/* ── Actions ──────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Button
            variant="outline"
            size="md"
            onClick={() => navigate("/products")}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center justify-center gap-2 rounded-[30px] bg-[#402F75] px-6 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#332560] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                </svg>
                Creating…
              </>
            ) : (
              "Create Product"
            )}
          </button>
        </div>
      </form>
    </>
  );
}
