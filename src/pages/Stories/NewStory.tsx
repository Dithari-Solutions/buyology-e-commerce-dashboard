import { useRef, useState } from "react";
import { useNavigate } from "react-router";
import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import Label from "../../components/form/Label";
import Input from "../../components/form/input/InputField";
import Button from "../../components/ui/button/Button";
import { storiesService, ApiRequestError } from "../../api";
import type { StoryStatus, CreateStoryRequest } from "../../api";

// ─────────────────────────────────────────────────────────────────────────────
// Section wrapper (same style as NewProduct)
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
      <div className="px-6 py-5 space-y-5">{children}</div>
    </div>
  );
}

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null;
  return <p className="mt-1 text-xs text-red-500 dark:text-red-400">{msg}</p>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Validation
// ─────────────────────────────────────────────────────────────────────────────

type FormErrors = Partial<{
  titleAz: string;
  titleEn: string;
  titleAr: string;
  files: string;
}>;

function validate(
  titleAz: string,
  titleEn: string,
  titleAr: string,
  filesCount: number
): FormErrors {
  const e: FormErrors = {};
  if (!titleAz.trim()) e.titleAz = "Title (AZ) is required.";
  if (!titleEn.trim()) e.titleEn = "Title (EN) is required.";
  if (!titleAr.trim()) e.titleAr = "Title (AR) is required.";
  if (filesCount === 0) e.files = "At least one image is required (used as thumbnail).";
  return e;
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export default function NewStory() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Form fields ─────────────────────────────────────────────────────────
  const [status, setStatus] = useState<StoryStatus>("ACTIVE");

  const [titleAz, setTitleAz] = useState("");
  const [titleEn, setTitleEn] = useState("");
  const [titleAr, setTitleAr] = useState("");
  const [descAz, setDescAz] = useState("");
  const [descEn, setDescEn] = useState("");
  const [descAr, setDescAr] = useState("");

  const [files, setFiles] = useState<File[]>([]);
  const [filePreviews, setFilePreviews] = useState<string[]>([]);

  // ── Submit state ─────────────────────────────────────────────────────────
  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  // ── Section refs for scroll-to-error ────────────────────────────────────
  const translationsRef = useRef<HTMLDivElement>(null);
  const mediaRef = useRef<HTMLDivElement>(null);

  // ── File handling ────────────────────────────────────────────────────────

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

  // ── Submit ───────────────────────────────────────────────────────────────

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setApiError(null);
    setSubmitted(true);

    const errs = validate(titleAz, titleEn, titleAr, files.length);
    setErrors(errs);

    if (Object.keys(errs).length > 0) {
      if (errs.titleAz || errs.titleEn || errs.titleAr)
        translationsRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      else if (errs.files)
        mediaRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: CreateStoryRequest = {
        translation: {
          titleAz,
          titleEn,
          titleAr,
          ...(descAz ? { descriptionAz: descAz } : {}),
          ...(descEn ? { descriptionEn: descEn } : {}),
          ...(descAr ? { descriptionAr: descAr } : {}),
        },
        status,
      };

      const [thumbnail, ...mediaFiles] = files;
      await storiesService.create(payload, thumbnail, mediaFiles);
      navigate("/stories");
    } catch (err) {
      const message =
        err instanceof ApiRequestError
          ? err.message
          : "Failed to create story. Please try again.";
      setApiError(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  // Derived error states per section
  const translationsHasError =
    submitted && !!(errors.titleAz || errors.titleEn || errors.titleAr);
  const mediaHasError = submitted && !!errors.files;

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <>
      <PageMeta
        title="New Story | Buyology Dashboard"
        description="Create a new story in the Buyology platform."
      />

      <PageBreadcrumb pageTitle="New Story" />

      <form onSubmit={handleSubmit} noValidate className="space-y-6 pb-10">

        {/* ── API error banner ───────────────────────────────────────────── */}
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

        {/* ── Validation summary banner ──────────────────────────────────── */}
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
                {(errors.titleAz || errors.titleEn || errors.titleAr) && (
                  <li>All titles are required (AZ, EN, AR)</li>
                )}
                {errors.files && <li>{errors.files}</li>}
              </ul>
            </div>
          </div>
        )}

        {/* ── Basic Info ─────────────────────────────────────────────────── */}
        <Section title="Basic Info">
          <div className="w-48">
            <Label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Status
            </Label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as StoryStatus)}
              className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-700 shadow-sm focus:border-[#402F75] focus:outline-none focus:ring-1 focus:ring-[#402F75] dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
            >
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </select>
          </div>
        </Section>

        {/* ── Translations ───────────────────────────────────────────────── */}
        <div ref={translationsRef}>
          <Section title="Translations" hasError={translationsHasError}>
            {/* Azerbaijani */}
            <div>
              <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                Azerbaijani (AZ)
              </h4>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <Label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Title <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    type="text"
                    placeholder="AZ başlıq"
                    value={titleAz}
                    onChange={(e) => setTitleAz(e.target.value)}
                    error={submitted && !!errors.titleAz}
                  />
                  <FieldError msg={submitted ? errors.titleAz : undefined} />
                </div>
                <div>
                  <Label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Description
                  </Label>
                  <Input
                    type="text"
                    placeholder="AZ təsvir (optional)"
                    value={descAz}
                    onChange={(e) => setDescAz(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="border-t border-gray-100 dark:border-gray-700" />

            {/* English */}
            <div>
              <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                English (EN)
              </h4>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <Label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Title <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    type="text"
                    placeholder="EN title"
                    value={titleEn}
                    onChange={(e) => setTitleEn(e.target.value)}
                    error={submitted && !!errors.titleEn}
                  />
                  <FieldError msg={submitted ? errors.titleEn : undefined} />
                </div>
                <div>
                  <Label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Description
                  </Label>
                  <Input
                    type="text"
                    placeholder="EN description (optional)"
                    value={descEn}
                    onChange={(e) => setDescEn(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="border-t border-gray-100 dark:border-gray-700" />

            {/* Arabic */}
            <div>
              <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                Arabic (AR)
              </h4>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <Label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Title <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    type="text"
                    placeholder="AR عنوان"
                    value={titleAr}
                    onChange={(e) => setTitleAr(e.target.value)}
                    error={submitted && !!errors.titleAr}
                  />
                  <FieldError msg={submitted ? errors.titleAr : undefined} />
                </div>
                <div>
                  <Label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Description
                  </Label>
                  <Input
                    type="text"
                    placeholder="AR الوصف (optional)"
                    value={descAr}
                    onChange={(e) => setDescAr(e.target.value)}
                  />
                </div>
              </div>
            </div>
          </Section>
        </div>

        {/* ── Media Files ────────────────────────────────────────────────── */}
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

            <p className="text-xs text-gray-400 dark:text-gray-500 -mt-1">
              The <strong className="text-gray-600 dark:text-gray-300">first image</strong> will be used as the thumbnail. Remaining files become story media.
            </p>

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
                  {i === 0 && (
                    <span className="absolute bottom-1 left-1 rounded bg-[#402F75]/80 px-1.5 text-[10px] text-white font-medium">
                      thumb
                    </span>
                  )}
                  {i > 0 && (
                    <span className="absolute bottom-1 left-1 rounded bg-black/50 px-1 text-[10px] text-white">
                      #{i}
                    </span>
                  )}
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

            <div className="mt-1 flex items-center justify-between">
              <p className="text-xs text-gray-400 dark:text-gray-500">
                {files.length > 0
                  ? `${files.length} file${files.length > 1 ? "s" : ""} added — 1 thumbnail + ${Math.max(0, files.length - 1)} media`
                  : "No files added yet"}
              </p>
              {mediaHasError && (
                <span className="text-xs font-semibold text-red-500 dark:text-red-400">
                  Required
                </span>
              )}
            </div>
          </Section>
        </div>

        {/* ── Submit ─────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate("/stories")}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Creating…" : "Create Story"}
          </Button>
        </div>
      </form>
    </>
  );
}
