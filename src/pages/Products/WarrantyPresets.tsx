import { useCallback, useEffect, useState } from "react";
import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import { ApiRequestError } from "../../api";
import {
  warrantyPresetsService,
  type WarrantyPreset,
} from "../../api/services/warrantyPresets.service";
import { formatWarranty, splitWarranty, warrantyMonthsFrom, type WarrantyUnit } from "../../utils/warranty";

type Form = { id: string | null; name: string; value: string; unit: WarrantyUnit };

const emptyForm: Form = { id: null, name: "", value: "12", unit: "months" };

const inputCls =
  "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white";

export default function WarrantyPresets() {
  const [presets, setPresets] = useState<WarrantyPreset[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [form, setForm] = useState<Form | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback((signal?: AbortSignal) => {
    setLoading(true);
    warrantyPresetsService
      .getAll(signal)
      .then((r) => {
        setPresets(r.data ?? []);
        setLoadError("");
      })
      .catch((err) => {
        if (signal?.aborted) return;
        setLoadError(err instanceof ApiRequestError ? err.message : "Failed to load warranty presets.");
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const ac = new AbortController();
    load(ac.signal);
    return () => ac.abort();
  }, [load]);

  const openCreate = () => {
    setForm({ ...emptyForm });
    setFormError("");
  };

  const openEdit = (p: WarrantyPreset) => {
    setForm({ id: p.id, name: p.name, ...splitWarranty(p.durationMonths) });
    setFormError("");
  };

  const handleSave = async () => {
    if (!form) return;
    const name = form.name.trim();
    if (!name) {
      setFormError("Name is required, e.g. Laptop or Accessory.");
      return;
    }
    const length = warrantyMonthsFrom(form.value, form.unit);
    if (length.error !== undefined) {
      setFormError(length.error);
      return;
    }
    const editing = presets.find((p) => p.id === form.id);
    if (editing && editing.durationMonths !== length.months && editing.productCount > 0) {
      const ok = confirm(
        `${editing.productCount} product(s) use "${editing.name}". They will change from ` +
          `${formatWarranty(editing.durationMonths)} to ${formatWarranty(length.months)}. ` +
          "Warranty cards already issued keep their dates. Continue?",
      );
      if (!ok) return;
    }
    setSaving(true);
    setFormError("");
    try {
      const body = { name, durationMonths: length.months };
      if (form.id) await warrantyPresetsService.update(form.id, body);
      else await warrantyPresetsService.create(body);
      setForm(null);
      setNotice(form.id ? `Saved "${name}".` : `Created "${name}".`);
      load();
    } catch (err) {
      setFormError(err instanceof ApiRequestError ? err.message : "Failed to save the preset.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (p: WarrantyPreset) => {
    const usage =
      p.productCount > 0
        ? ` ${p.productCount} product(s) use it and will keep ${formatWarranty(p.durationMonths)} as a custom warranty.`
        : "";
    if (!confirm(`Delete warranty preset "${p.name}"?${usage}`)) return;
    try {
      await warrantyPresetsService.remove(p.id);
      setNotice(`Deleted "${p.name}".`);
      load();
    } catch (err) {
      setLoadError(err instanceof ApiRequestError ? err.message : "Failed to delete the preset.");
    }
  };

  return (
    <>
      <PageMeta title="Warranty Presets | Buyology" description="Manage warranty presets for products" />
      <PageBreadcrumb pageTitle="Warranty Presets" />

      <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white">
              Warranty Presets ({presets.length})
            </h2>
            <p className="mt-1 max-w-2xl text-sm text-gray-500 dark:text-gray-400">
              Named warranty lengths offered in the product form, such as Laptop or Accessory. Changing a
              preset&apos;s length changes it for every product that uses it. Each unit sold gets its own
              warranty card when its order is delivered, and cards keep the length they were issued with.
            </p>
          </div>
          <button
            onClick={openCreate}
            className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600"
          >
            + Add Preset
          </button>
        </div>

        {notice && (
          <p className="mb-3 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700 dark:bg-green-900/20 dark:text-green-400">
            {notice}
          </p>
        )}
        {loadError && (
          <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
            {loadError}
          </p>
        )}

        {loading && presets.length === 0 ? (
          <p className="text-sm text-gray-500">Loading...</p>
        ) : presets.length === 0 ? (
          <p className="py-6 text-center text-sm text-gray-500 dark:text-gray-400">
            No presets yet. Add one for each kind of product, e.g. Laptop — 1 year, Accessory — 6 months.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs uppercase text-gray-500 dark:border-gray-800">
                  <th className="pb-3 pr-4">Name</th>
                  <th className="pb-3 pr-4">Warranty</th>
                  <th className="pb-3 pr-4">Products</th>
                  <th className="pb-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {presets.map((p) => (
                  <tr key={p.id}>
                    <td className="py-3 pr-4 font-semibold text-gray-800 dark:text-gray-200">{p.name}</td>
                    <td className="py-3 pr-4 text-gray-600 dark:text-gray-400">{formatWarranty(p.durationMonths)}</td>
                    <td className="py-3 pr-4 text-gray-600 dark:text-gray-400">{p.productCount}</td>
                    <td className="flex gap-2 py-3">
                      <button
                        onClick={() => openEdit(p)}
                        className="rounded-lg bg-brand-50 px-2 py-1 text-xs text-brand-600 hover:bg-brand-100 dark:bg-brand-900/20 dark:text-brand-400"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(p)}
                        className="rounded-lg bg-red-50 px-2 py-1 text-xs text-red-600 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {form && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-900">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold dark:text-white">
                {form.id ? "Edit Warranty Preset" : "Add Warranty Preset"}
              </h3>
              <button onClick={() => setForm(null)} className="text-gray-400 hover:text-gray-600" aria-label="Close">
                ✕
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label htmlFor="preset-name" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Name
                </label>
                <input
                  id="preset-name"
                  type="text"
                  placeholder="e.g. Laptop"
                  maxLength={100}
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className={inputCls}
                />
              </div>
              <div>
                <label htmlFor="preset-length" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Warranty length
                </label>
                <div className="flex gap-2">
                  <input
                    id="preset-length"
                    type="number"
                    min={1}
                    value={form.value}
                    onChange={(e) => setForm({ ...form, value: e.target.value })}
                    className={inputCls}
                  />
                  <select
                    value={form.unit}
                    onChange={(e) => setForm({ ...form, unit: e.target.value as WarrantyUnit })}
                    className="rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                    aria-label="Unit"
                  >
                    <option value="months">Months</option>
                    <option value="years">Years</option>
                  </select>
                </div>
              </div>
            </div>
            {formError && <p className="mt-2 text-sm text-red-500">{formError}</p>}
            <div className="mt-4 flex gap-3">
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 rounded-lg bg-brand-500 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50"
              >
                {saving ? "Saving..." : form.id ? "Save" : "Create"}
              </button>
              <button
                onClick={() => setForm(null)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm dark:border-gray-600 dark:text-gray-300"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
