import { useEffect, useState } from "react";
import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import {
  specCodesService,
  type SpecCodeItem,
  type SpecCodeRequest,
} from "../../api/services/specCodes.service";

type EditState = { id: string | null; data: SpecCodeRequest };

const emptyForm: SpecCodeRequest = {
  code: "",
  labelEn: "",
  labelAz: "",
  labelAr: "",
  filterable: false,
};

export default function SpecCodes() {
  const [codes, setCodes] = useState<SpecCodeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [edit, setEdit] = useState<EditState>({ id: null, data: { ...emptyForm } });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  const load = () => {
    const ac = new AbortController();
    specCodesService
      .getAll(ac.signal)
      .then((r) => setCodes(r.data ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
    return () => ac.abort();
  };

  useEffect(() => load(), []);

  const openCreate = () => {
    setEdit({ id: null, data: { ...emptyForm } });
    setMsg("");
    setShowModal(true);
  };

  const openEdit = (c: SpecCodeItem) => {
    setEdit({
      id: c.id,
      data: {
        code: c.code,
        labelEn: c.labelEn ?? "",
        labelAz: c.labelAz ?? "",
        labelAr: c.labelAr ?? "",
        filterable: c.filterable,
        displayOrder: c.displayOrder,
      },
    });
    setMsg("");
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!edit.data.code.trim()) {
      setMsg("Code is required");
      return;
    }
    setSaving(true);
    setMsg("");
    try {
      if (edit.id) {
        const r = await specCodesService.update(edit.id, edit.data);
        setCodes((cs) => cs.map((c) => (c.id === edit.id ? (r.data as SpecCodeItem) : c)));
      } else {
        const r = await specCodesService.create(edit.data);
        setCodes((cs) => [...cs, r.data as SpecCodeItem]);
      }
      setShowModal(false);
    } catch (e) {
      const m = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setMsg(m || "Failed to save spec code");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (c: SpecCodeItem) => {
    if (!confirm(`Delete spec code "${c.code}"? Existing products keep their specs.`)) return;
    await specCodesService.remove(c.id);
    setCodes((cs) => cs.filter((x) => x.id !== c.id));
  };

  const setField = <K extends keyof SpecCodeRequest>(key: K, value: SpecCodeRequest[K]) =>
    setEdit((s) => ({ ...s, data: { ...s.data, [key]: value } }));

  return (
    <>
      <PageMeta title="Spec Codes | Buyology" description="Manage product spec codes" />
      <PageBreadcrumb pageTitle="Spec Codes" />

      <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white">Spec Codes ({codes.length})</h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              The codes admins can attach to products. Codes marked <span className="font-medium">Filter</span> drive storefront filters.
            </p>
          </div>
          <button onClick={openCreate}
            className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600">
            + Add Code
          </button>
        </div>

        {loading ? <p className="text-sm text-gray-500">Loading...</p> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-800 text-left text-gray-500 text-xs uppercase">
                  <th className="pb-3 pr-4">Code</th>
                  <th className="pb-3 pr-4">Label (EN)</th>
                  <th className="pb-3 pr-4">AZ</th>
                  <th className="pb-3 pr-4">AR</th>
                  <th className="pb-3 pr-4">Filter</th>
                  <th className="pb-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {codes.map((c) => (
                  <tr key={c.id}>
                    <td className="py-3 pr-4 font-mono font-semibold text-gray-800 dark:text-gray-200">{c.code}</td>
                    <td className="py-3 pr-4 text-gray-600 dark:text-gray-400">{c.labelEn ?? "—"}</td>
                    <td className="py-3 pr-4 text-gray-600 dark:text-gray-400">{c.labelAz ?? "—"}</td>
                    <td className="py-3 pr-4 text-gray-600 dark:text-gray-400">{c.labelAr ?? "—"}</td>
                    <td className="py-3 pr-4">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${c.filterable ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                        {c.filterable ? "Yes" : "No"}
                      </span>
                    </td>
                    <td className="py-3 flex gap-2">
                      <button onClick={() => openEdit(c)}
                        className="rounded-lg bg-brand-50 px-2 py-1 text-xs text-brand-600 hover:bg-brand-100 dark:bg-brand-900/20 dark:text-brand-400">
                        Edit
                      </button>
                      <button onClick={() => handleDelete(c)}
                        className="rounded-lg bg-red-50 px-2 py-1 text-xs text-red-600 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400">
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

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-900">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold dark:text-white">{edit.id ? "Edit Spec Code" : "Add Spec Code"}</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Code (machine id)</label>
                <input type="text" placeholder="e.g. battery_life"
                  value={edit.data.code}
                  disabled={!!edit.id}
                  onChange={(e) => setField("code", e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 font-mono text-sm disabled:bg-gray-100 disabled:text-gray-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:disabled:bg-gray-800/50" />
                {edit.id && <p className="mt-1 text-xs text-gray-400">The code is immutable once created.</p>}
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Label (EN)</label>
                  <input type="text" value={edit.data.labelEn ?? ""}
                    onChange={(e) => setField("labelEn", e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white" />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Label (AZ)</label>
                  <input type="text" value={edit.data.labelAz ?? ""}
                    onChange={(e) => setField("labelAz", e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white" />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Label (AR)</label>
                  <input type="text" value={edit.data.labelAr ?? ""}
                    onChange={(e) => setField("labelAr", e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white" />
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                <input type="checkbox" checked={edit.data.filterable}
                  onChange={(e) => setField("filterable", e.target.checked)} />
                Recognised by the storefront catalog filter
              </label>
            </div>
            {msg && <p className="mt-2 text-sm text-red-500">{msg}</p>}
            <div className="mt-4 flex gap-3">
              <button onClick={handleSave} disabled={saving}
                className="flex-1 rounded-lg bg-brand-500 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50">
                {saving ? "Saving..." : edit.id ? "Save" : "Create"}
              </button>
              <button onClick={() => setShowModal(false)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm dark:border-gray-600 dark:text-gray-300">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
