import { useEffect, useRef, useState } from "react";
import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import {
  specsService,
  SPEC_CODES,
  ApiRequestError,
  getGroupName,
  getOptionValue,
} from "../../api";
import type {
  GlobalSpecGroup,
  GlobalSpecOption,
  CreateGlobalSpecGroupRequest,
  CreateGlobalSpecOptionInput,
} from "../../api";

// ─────────────────────────────────────────────────────────────────────────────
// Types / helpers
// ─────────────────────────────────────────────────────────────────────────────

const UNIT_OPTIONS = [
  "", "KB", "MB", "GB", "TB", "MHz", "GHz", "mAh", "Wh", "W",
  "INCH", "MP", "Mbps", "Gbps", "G", "KG", "Hz", "RPM",
];

function FieldInput({
  label,
  value,
  onChange,
  placeholder,
  error,
  dir,
  readOnly,
}: {
  label: string;
  value: string;
  onChange?: (v: string) => void;
  placeholder?: string;
  error?: string;
  dir?: "rtl";
  readOnly?: boolean;
}) {
  return (
    <div>
      {label && (
        <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">
          {label}
        </label>
      )}
      <input
        type="text"
        value={value}
        onChange={onChange ? (e) => onChange(e.target.value) : undefined}
        placeholder={placeholder}
        dir={dir}
        readOnly={readOnly}
        className={`h-10 w-full rounded-lg border bg-transparent px-3 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 ${
          error
            ? "border-red-400 focus:border-red-400 focus:ring-red-400/20"
            : readOnly
            ? "border-gray-200 bg-gray-50 dark:bg-gray-800 cursor-default"
            : "border-gray-300 focus:border-[#FBBB14] focus:ring-[#FBBB14]/30 dark:border-gray-700"
        }`}
      />
      {error && (
        <p className="mt-1 text-xs text-red-500 dark:text-red-400">{error}</p>
      )}
    </div>
  );
}

function UnitSelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">
        Unit
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 w-full rounded-lg border border-gray-300 bg-transparent px-3 text-sm text-gray-800 focus:border-[#FBBB14] focus:outline-none focus:ring-2 focus:ring-[#FBBB14]/30 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
      >
        {UNIT_OPTIONS.map((u) => (
          <option key={u} value={u}>
            {u || "— none —"}
          </option>
        ))}
      </select>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Add Option inline form
// ─────────────────────────────────────────────────────────────────────────────

function AddOptionForm({
  groupId,
  onAdded,
  onCancel,
}: {
  groupId: string;
  onAdded: (opt: GlobalSpecOption) => void;
  onCancel: () => void;
}) {
  const [valueAz, setValueAz] = useState("");
  const [valueEn, setValueEn] = useState("");
  const [valueAr, setValueAr] = useState("");
  const [unit, setUnit] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!valueAz.trim()) errs.valueAz = "Required";
    if (!valueEn.trim()) errs.valueEn = "Required";
    if (!valueAr.trim()) errs.valueAr = "Required";
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setSubmitting(true);
    setApiError(null);
    try {
      const body: CreateGlobalSpecOptionInput = {
        valueAz: valueAz.trim(),
        valueEn: valueEn.trim(),
        valueAr: valueAr.trim(),
        unit: unit || undefined,
      };
      const res = await specsService.addOption(groupId, body);
      onAdded(res.data);
    } catch (err) {
      setApiError(
        err instanceof ApiRequestError ? err.message : "Failed to add option."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="mt-3 rounded-xl border border-dashed border-[#402F75]/30 dark:border-[#FBBB14]/20 bg-[#402F75]/5 dark:bg-[#FBBB14]/5 p-4"
    >
      {apiError && (
        <p className="mb-3 text-xs text-red-500 dark:text-red-400">{apiError}</p>
      )}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <FieldInput label="Value AZ" value={valueAz} onChange={setValueAz} placeholder="8GB" error={errors.valueAz} />
        <FieldInput label="Value EN" value={valueEn} onChange={setValueEn} placeholder="8GB" error={errors.valueEn} />
        <FieldInput label="Value AR" value={valueAr} onChange={setValueAr} placeholder="8GB" dir="rtl" error={errors.valueAr} />
        <UnitSelect value={unit} onChange={setUnit} />
      </div>
      <div className="mt-3 flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-gray-300 dark:border-gray-700 px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex items-center gap-1.5 rounded-[30px] bg-[#402F75] px-4 py-1.5 text-xs font-semibold text-white hover:bg-[#332560] disabled:opacity-50 transition-colors"
        >
          {submitting ? "Adding…" : "Add Option"}
        </button>
      </div>
    </form>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Spec group accordion row
// ─────────────────────────────────────────────────────────────────────────────

function SpecGroupRow({
  group,
  onOptionDeleted,
  onOptionAdded,
  onOptionsReordered,
}: {
  group: GlobalSpecGroup;
  onOptionDeleted: (groupId: string, optionId: string) => void;
  onOptionAdded: (groupId: string, opt: GlobalSpecOption) => void;
  onOptionsReordered: (groupId: string, options: GlobalSpecOption[]) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [addingOption, setAddingOption] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [reordering, setReordering] = useState(false);

  // Options sorted by their configured display order.
  const sortedOptions = [...group.options].sort(
    (a, b) => a.displayOrder - b.displayOrder
  );

  async function moveOption(index: number, dir: -1 | 1) {
    const target = index + dir;
    if (target < 0 || target >= sortedOptions.length) return;
    const next = [...sortedOptions];
    [next[index], next[target]] = [next[target], next[index]];
    setReordering(true);
    setDeleteError(null);
    try {
      const res = await specsService.reorderOptions(
        group.id,
        next.map((o) => o.id)
      );
      onOptionsReordered(group.id, res.data);
    } catch (err) {
      setDeleteError(
        err instanceof ApiRequestError ? err.message : "Failed to reorder options."
      );
    } finally {
      setReordering(false);
    }
  }

  async function handleDeleteOption(optionId: string) {
    setDeletingId(optionId);
    setDeleteError(null);
    try {
      await specsService.deleteOption(optionId);
      onOptionDeleted(group.id, optionId);
    } catch (err) {
      setDeleteError(
        err instanceof ApiRequestError
          ? err.message
          : "Failed to delete option."
      );
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* Header */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center gap-3 px-5 py-4 text-left hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors"
      >
        <span className="inline-flex items-center rounded-md bg-[#402F75]/10 dark:bg-[#402F75]/30 px-2.5 py-1 text-xs font-mono font-semibold text-[#402F75] dark:text-[#FBBB14]">
          {group.code}
        </span>
        <span className="flex-1 text-sm font-semibold text-gray-800 dark:text-white/90">
          {getGroupName(group, "EN")}
        </span>
        <span className="rounded-full bg-gray-100 dark:bg-gray-800 px-2.5 py-0.5 text-xs font-medium text-gray-500 dark:text-gray-400">
          {group.options.length} option{group.options.length !== 1 ? "s" : ""}
        </span>
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className={`shrink-0 text-gray-400 transition-transform ${expanded ? "rotate-180" : ""}`}
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="border-t border-gray-100 dark:border-gray-800 px-5 pb-5 pt-4">
          {/* Names */}
          <div className="mb-4 grid grid-cols-3 gap-3 text-xs">
            <div>
              <span className="font-medium text-gray-500">AZ:</span>{" "}
              <span className="text-gray-700 dark:text-gray-300">{getGroupName(group, "AZ")}</span>
            </div>
            <div>
              <span className="font-medium text-gray-500">EN:</span>{" "}
              <span className="text-gray-700 dark:text-gray-300">{getGroupName(group, "EN")}</span>
            </div>
            <div>
              <span className="font-medium text-gray-500">AR:</span>{" "}
              <span className="text-gray-700 dark:text-gray-300" dir="rtl">{getGroupName(group, "AR")}</span>
            </div>
          </div>

          {deleteError && (
            <p className="mb-3 text-xs text-red-500 dark:text-red-400">{deleteError}</p>
          )}

          {/* Options table */}
          {group.options.length > 0 ? (
            <div className="overflow-x-auto rounded-xl border border-gray-100 dark:border-gray-800">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-white/[0.02]">
                    {["Order", "Value EN", "Value AZ", "Value AR", "Unit", ""].map((h) => (
                      <th key={h} className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-gray-400">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sortedOptions.map((opt, index) => (
                    <tr key={opt.id} className="border-b border-gray-100 dark:border-gray-800 last:border-0">
                      {/* Display order controls */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="w-5 text-center text-xs font-semibold text-gray-500 dark:text-gray-400">
                            {index + 1}
                          </span>
                          <div className="flex flex-col">
                            <button
                              onClick={() => moveOption(index, -1)}
                              disabled={reordering || index === 0}
                              title="Move up"
                              className="flex h-4 w-5 items-center justify-center rounded text-gray-400 hover:bg-[#402F75]/10 hover:text-[#402F75] disabled:opacity-30 disabled:hover:bg-transparent dark:hover:text-[#FBBB14] transition-colors"
                            >
                              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                <path d="M18 15l-6-6-6 6" />
                              </svg>
                            </button>
                            <button
                              onClick={() => moveOption(index, 1)}
                              disabled={reordering || index === sortedOptions.length - 1}
                              title="Move down"
                              className="flex h-4 w-5 items-center justify-center rounded text-gray-400 hover:bg-[#402F75]/10 hover:text-[#402F75] disabled:opacity-30 disabled:hover:bg-transparent dark:hover:text-[#FBBB14] transition-colors"
                            >
                              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                <path d="M6 9l6 6 6-6" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-700 dark:text-gray-300">{getOptionValue(opt, "EN")}</td>
                      <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{getOptionValue(opt, "AZ")}</td>
                      <td className="px-4 py-3 text-gray-500 dark:text-gray-400" dir="rtl">{getOptionValue(opt, "AR")}</td>
                      <td className="px-4 py-3">
                        {opt.unit ? (
                          <span className="rounded bg-gray-100 dark:bg-gray-800 px-2 py-0.5 text-xs font-mono text-gray-600 dark:text-gray-400">
                            {opt.unit}
                          </span>
                        ) : (
                          <span className="text-gray-300 dark:text-gray-600">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleDeleteOption(opt.id)}
                          disabled={deletingId === opt.id}
                          title="Delete option (won't affect existing products)"
                          className="flex h-7 w-7 items-center justify-center rounded-full text-red-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10 disabled:opacity-50 transition-colors"
                        >
                          {deletingId === opt.id ? (
                            <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                            </svg>
                          ) : (
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <polyline points="3 6 5 6 21 6" />
                              <path d="M19 6l-1 14H6L5 6" />
                              <path d="M10 11v6M14 11v6" />
                              <path d="M9 6V4h6v2" />
                            </svg>
                          )}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-xs text-gray-400 dark:text-gray-500 mb-2">No options yet.</p>
          )}

          {/* Add option toggle */}
          {addingOption ? (
            <AddOptionForm
              groupId={group.id}
              onAdded={(opt) => {
                onOptionAdded(group.id, opt);
                setAddingOption(false);
              }}
              onCancel={() => setAddingOption(false)}
            />
          ) : (
            <button
              type="button"
              onClick={() => setAddingOption(true)}
              className="mt-3 inline-flex items-center gap-1.5 rounded-[30px] border border-dashed border-[#402F75] px-4 py-1.5 text-xs font-medium text-[#402F75] hover:bg-[#402F75]/5 dark:border-[#FBBB14] dark:text-[#FBBB14] dark:hover:bg-[#FBBB14]/5 transition-colors"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Add Option
            </button>
          )}
          <p className="mt-2 text-[11px] text-gray-400 dark:text-gray-500">
            Deleting an option won't affect products where it was already used.
          </p>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Create spec group form
// ─────────────────────────────────────────────────────────────────────────────

type OptionInput = { valueAz: string; valueEn: string; valueAr: string; unit: string };

function defaultOptionInput(): OptionInput {
  return { valueAz: "", valueEn: "", valueAr: "", unit: "" };
}

function CreateGroupForm({ onCreated, onCancel }: { onCreated: (g: GlobalSpecGroup) => void; onCancel: () => void }) {
  const [code, setCode] = useState<string>("");
  const [nameAz, setNameAz] = useState("");
  const [nameEn, setNameEn] = useState("");
  const [nameAr, setNameAr] = useState("");
  const [options, setOptions] = useState<OptionInput[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  function addOption() {
    setOptions((prev) => [...prev, defaultOptionInput()]);
  }

  function removeOption(i: number) {
    setOptions((prev) => prev.filter((_, idx) => idx !== i));
  }

  function updateOption(i: number, key: keyof OptionInput, value: string) {
    setOptions((prev) => prev.map((o, idx) => (idx === i ? { ...o, [key]: value } : o)));
  }

  function validate() {
    const e: Record<string, string> = {};
    if (!code) e.code = "Required";
    if (!nameAz.trim()) e.nameAz = "Required";
    if (!nameEn.trim()) e.nameEn = "Required";
    if (!nameAr.trim()) e.nameAr = "Required";
    return e;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitted(true);
    setApiError(null);
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setSubmitting(true);
    try {
      const body: CreateGlobalSpecGroupRequest = {
        code,
        nameAz: nameAz.trim(),
        nameEn: nameEn.trim(),
        nameAr: nameAr.trim(),
        options: options.filter((o) => o.valueEn.trim()).map((o) => ({
          valueAz: o.valueAz.trim(),
          valueEn: o.valueEn.trim(),
          valueAr: o.valueAr.trim(),
          unit: o.unit || undefined,
        })),
      };
      const res = await specsService.create(body);
      onCreated(res.data);
    } catch (err) {
      setApiError(
        err instanceof ApiRequestError ? err.message : "Failed to create spec group."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mb-6 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-white/[0.03] overflow-hidden">
      <div className="border-b border-gray-100 dark:border-gray-700 bg-[#402F75]/5 dark:bg-[#402F75]/20 px-6 py-4">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-[#402F75] dark:text-[#FBBB14]">
          New Spec Group
        </h3>
      </div>
      <form onSubmit={handleSubmit} noValidate className="p-6 space-y-5">
        {apiError && (
          <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 dark:border-red-800/40 dark:bg-red-500/5 px-4 py-3">
            <p className="text-sm text-red-600 dark:text-red-400">{apiError}</p>
          </div>
        )}

        {/* Code + names */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Code <span className="text-red-500">*</span>
            </label>
            <select
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className={`h-11 w-full rounded-lg border bg-transparent px-4 text-sm text-gray-800 focus:outline-none focus:ring-3 dark:bg-gray-900 dark:text-white/90 ${
                submitted && errors.code
                  ? "border-red-400 focus:border-red-400 focus:ring-red-400/20"
                  : "border-gray-300 focus:border-[#FBBB14] focus:ring-[#FBBB14]/30 dark:border-gray-700"
              }`}
            >
              <option value="">Select code…</option>
              {SPEC_CODES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            {submitted && errors.code && (
              <p className="mt-1 text-xs text-red-500">{errors.code}</p>
            )}
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Name AZ <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={nameAz}
              onChange={(e) => setNameAz(e.target.value)}
              placeholder="RAM"
              className={`h-11 w-full rounded-lg border bg-transparent px-4 text-sm text-gray-800 focus:outline-none focus:ring-3 dark:bg-gray-900 dark:text-white/90 placeholder:text-gray-400 dark:placeholder:text-white/30 ${
                submitted && errors.nameAz
                  ? "border-red-400 focus:border-red-400 focus:ring-red-400/20"
                  : "border-gray-300 focus:border-[#FBBB14] focus:ring-[#FBBB14]/30 dark:border-gray-700"
              }`}
            />
            {submitted && errors.nameAz && (
              <p className="mt-1 text-xs text-red-500">{errors.nameAz}</p>
            )}
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Name EN <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={nameEn}
              onChange={(e) => setNameEn(e.target.value)}
              placeholder="RAM"
              className={`h-11 w-full rounded-lg border bg-transparent px-4 text-sm text-gray-800 focus:outline-none focus:ring-3 dark:bg-gray-900 dark:text-white/90 placeholder:text-gray-400 dark:placeholder:text-white/30 ${
                submitted && errors.nameEn
                  ? "border-red-400 focus:border-red-400 focus:ring-red-400/20"
                  : "border-gray-300 focus:border-[#FBBB14] focus:ring-[#FBBB14]/30 dark:border-gray-700"
              }`}
            />
            {submitted && errors.nameEn && (
              <p className="mt-1 text-xs text-red-500">{errors.nameEn}</p>
            )}
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Name AR <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={nameAr}
              onChange={(e) => setNameAr(e.target.value)}
              placeholder="ذاكرة الوصول العشوائي"
              dir="rtl"
              className={`h-11 w-full rounded-lg border bg-transparent px-4 text-sm text-gray-800 focus:outline-none focus:ring-3 dark:bg-gray-900 dark:text-white/90 placeholder:text-gray-400 dark:placeholder:text-white/30 ${
                submitted && errors.nameAr
                  ? "border-red-400 focus:border-red-400 focus:ring-red-400/20"
                  : "border-gray-300 focus:border-[#FBBB14] focus:ring-[#FBBB14]/30 dark:border-gray-700"
              }`}
            />
            {submitted && errors.nameAr && (
              <p className="mt-1 text-xs text-red-500">{errors.nameAr}</p>
            )}
          </div>
        </div>

        {/* Initial options */}
        {options.length > 0 && (
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Initial Options <span className="font-normal text-gray-400">(optional)</span>
            </p>
            {options.map((opt, i) => (
              <div key={i} className="flex items-end gap-3 rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/40 p-3">
                <div className="grid flex-1 grid-cols-2 gap-3 sm:grid-cols-4">
                  <FieldInput label="Value AZ" value={opt.valueAz} onChange={(v) => updateOption(i, "valueAz", v)} placeholder="8GB" />
                  <FieldInput label="Value EN" value={opt.valueEn} onChange={(v) => updateOption(i, "valueEn", v)} placeholder="8GB" />
                  <FieldInput label="Value AR" value={opt.valueAr} onChange={(v) => updateOption(i, "valueAr", v)} placeholder="8GB" dir="rtl" />
                  <UnitSelect value={opt.unit} onChange={(v) => updateOption(i, "unit", v)} />
                </div>
                <button
                  type="button"
                  onClick={() => removeOption(i)}
                  className="mb-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-red-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10 transition-colors"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}

        <button
          type="button"
          onClick={addOption}
          className="inline-flex items-center gap-1.5 rounded-[30px] border border-dashed border-[#402F75] px-4 py-2 text-xs font-medium text-[#402F75] hover:bg-[#402F75]/5 dark:border-[#FBBB14] dark:text-[#FBBB14] dark:hover:bg-[#FBBB14]/5 transition-colors"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Add Initial Option
        </button>

        <div className="flex justify-end gap-3 pt-2 border-t border-gray-100 dark:border-gray-800">
          <button
            type="button"
            onClick={onCancel}
            disabled={submitting}
            className="rounded-lg border border-gray-300 dark:border-gray-700 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center gap-2 rounded-[30px] bg-[#402F75] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#332560] disabled:opacity-50 transition-colors"
          >
            {submitting ? (
              <>
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                </svg>
                Creating…
              </>
            ) : (
              "Create Spec Group"
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────

export default function Specs() {
  const [groups, setGroups] = useState<GlobalSpecGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  function fetchGroups() {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setLoading(true);
    setError(null);

    specsService
      .getAll(ctrl.signal)
      .then((res) => setGroups(res.data))
      .catch((err: unknown) => {
        if (err instanceof Error && err.name === "AbortError") return;
        setError(
          err instanceof ApiRequestError ? err.message : "Failed to load spec library."
        );
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    fetchGroups();
    return () => abortRef.current?.abort();
  }, []);

  function handleOptionDeleted(groupId: string, optionId: string) {
    setGroups((prev) =>
      prev.map((g) =>
        g.id === groupId
          ? { ...g, options: g.options.filter((o) => o.id !== optionId) }
          : g
      )
    );
  }

  function handleOptionAdded(groupId: string, opt: GlobalSpecOption) {
    setGroups((prev) =>
      prev.map((g) =>
        g.id === groupId ? { ...g, options: [...g.options, opt] } : g
      )
    );
  }

  function handleOptionsReordered(groupId: string, options: GlobalSpecOption[]) {
    setGroups((prev) =>
      prev.map((g) => (g.id === groupId ? { ...g, options } : g))
    );
  }

  const totalOptions = groups.reduce((sum, g) => sum + g.options.length, 0);

  return (
    <>
      <PageMeta
        title="Spec Library | Buyology Dashboard"
        description="Manage global spec groups and options."
      />
      <PageBreadcrumb pageTitle="Spec Library" />

      {/* Stats */}
      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
        {[
          { label: "Spec Groups", value: groups.length },
          { label: "Total Options", value: totalOptions },
          { label: "Valid Codes", value: SPEC_CODES.length },
        ].map((s) => (
          <div
            key={s.label}
            className="flex items-center gap-3 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03] p-4"
          >
            <div>
              <p className="text-2xl font-bold leading-none text-brand-600 dark:text-brand-400">
                {loading ? "—" : s.value}
              </p>
              <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="mb-5 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90">
          Global Spec Groups
          {!loading && (
            <span className="ml-2 text-sm font-normal text-gray-400">({groups.length})</span>
          )}
        </h2>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="inline-flex items-center gap-2 rounded-[30px] bg-[#402F75] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#332560] transition-colors"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Add Spec Group
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <CreateGroupForm
          onCreated={(g) => {
            setGroups((prev) => [...prev, g]);
            setShowForm(false);
          }}
          onCancel={() => setShowForm(false)}
        />
      )}

      {/* Code convention info */}
      <div className="mb-5 rounded-xl border border-brand-200 dark:border-brand-700/30 bg-brand-50 dark:bg-brand-500/5 px-5 py-3">
        <p className="text-xs text-brand-700 dark:text-brand-400">
          <strong>Valid spec codes:</strong>{" "}
          {SPEC_CODES.map((c) => (
            <code key={c} className="mx-1 rounded bg-brand-100 dark:bg-brand-500/20 px-1.5 py-0.5 font-mono">
              {c}
            </code>
          ))}
          — product specs must use exactly these codes to appear in storefront filters.
        </p>
      </div>

      {/* Error */}
      {error && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-red-200 dark:border-red-800/40 bg-red-50 dark:bg-red-500/5 py-14 text-center">
          <p className="text-sm font-medium text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-14 animate-pulse rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/40"
            />
          ))}
        </div>
      )}

      {/* Spec group list */}
      {!loading && !error && (
        <div className="space-y-3">
          {groups.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03] py-20 text-center">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" className="mb-4 text-gray-300 dark:text-gray-600">
                <line x1="8" y1="6" x2="21" y2="6" />
                <line x1="8" y1="12" x2="21" y2="12" />
                <line x1="8" y1="18" x2="21" y2="18" />
                <line x1="3" y1="6" x2="3.01" y2="6" />
                <line x1="3" y1="12" x2="3.01" y2="12" />
                <line x1="3" y1="18" x2="3.01" y2="18" />
              </svg>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                No spec groups yet. Create your first one above.
              </p>
            </div>
          ) : (
            groups.map((group) => (
              <SpecGroupRow
                key={group.id}
                group={group}
                onOptionDeleted={handleOptionDeleted}
                onOptionAdded={handleOptionAdded}
                onOptionsReordered={handleOptionsReordered}
              />
            ))
          )}
        </div>
      )}
    </>
  );
}
