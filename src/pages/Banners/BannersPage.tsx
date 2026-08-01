import { useEffect, useMemo, useRef, useState } from "react";
import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import {
  bannersService,
  type BannerAdmin,
  type BannerPlatform,
  type BannerRequest,
  type BannerStatus,
  type BannerTranslationFields,
} from "../../api/services/banners.service";
import { compressImage } from "../../utils/imageCompression";
import { getImageUrl } from "../../utils/imageUrl";

const LANGUAGES = ["EN", "AZ", "AR"] as const;
type Lang = (typeof LANGUAGES)[number];

const emptyTranslation = (): BannerTranslationFields => ({
  textAz: "",
  textEn: "",
  textAr: "",
  buttonLabelAz: "",
  buttonLabelEn: "",
  buttonLabelAr: "",
});

const emptyForm = (platform: BannerPlatform = "WEB"): BannerRequest => ({
  translation: emptyTranslation(),
  buttonUrl: "",
  sortOrder: 0,
  status: "ACTIVE",
  platform,
});

const isValidButtonUrl = (url: string) => {
  if (!url) return true;
  return /^https?:\/\/.+/i.test(url) || /^\/[A-Za-z0-9\-_/?=&%.#]*$/.test(url);
};

export default function BannersPage() {
  const [banners, setBanners] = useState<BannerAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [platformFilter, setPlatformFilter] = useState<BannerPlatform>("WEB");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<BannerRequest>(emptyForm("WEB"));
  const [tab, setTab] = useState<Lang>("EN");
  const [file, setFile] = useState<File | null>(null);
  const [existingImageUrl, setExistingImageUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Drag-and-drop reordering state
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const [reordering, setReordering] = useState(false);

  const previewUrl = useMemo(() => {
    if (file) return URL.createObjectURL(file);
    return existingImageUrl ? getImageUrl(existingImageUrl) : null;
  }, [file, existingImageUrl]);

  useEffect(() => {
    return () => {
      if (file) URL.revokeObjectURL(URL.createObjectURL(file));
    };
  }, [file]);

  const reload = async (platform: BannerPlatform = platformFilter) => {
    setLoading(true);
    try {
      const r = await bannersService.list(platform);
      setBanners(
        (r.data ?? []).slice().sort((a, b) => a.sortOrder - b.sortOrder)
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    reload(platformFilter).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [platformFilter]);

  const startCreate = () => {
    setEditingId(null);
    setForm(emptyForm(platformFilter));
    setFile(null);
    setExistingImageUrl(null);
    setTab("EN");
    setMsg("");
    setShowForm(true);
  };

  const startEdit = (b: BannerAdmin) => {
    setEditingId(b.id);
    setForm({
      translation: { ...emptyTranslation(), ...b.translation },
      buttonUrl: b.buttonUrl ?? "",
      sortOrder: b.sortOrder,
      status: b.status,
      platform: b.platform,
    });
    setFile(null);
    setExistingImageUrl(b.backgroundImageUrl);
    setTab("EN");
    setMsg("");
    setShowForm(true);
  };

  const cancelForm = () => {
    setShowForm(false);
    setEditingId(null);
    setFile(null);
  };

  const setTr = (field: keyof BannerTranslationFields, value: string) => {
    setForm((f) => ({ ...f, translation: { ...f.translation, [field]: value } }));
  };

  const buttonUrlInvalid = !!form.buttonUrl && !isValidButtonUrl(form.buttonUrl);

  const anyLabel =
    !!(form.translation.buttonLabelAz?.trim()
      || form.translation.buttonLabelEn?.trim()
      || form.translation.buttonLabelAr?.trim());
  const labelButNoUrl = anyLabel && !form.buttonUrl?.trim();
  const urlButNoLabel = !!form.buttonUrl?.trim() && !anyLabel;

  const submit = async () => {
    if (!editingId && !file) {
      setMsg("✗ Background image is required");
      return;
    }
    if (buttonUrlInvalid) {
      setMsg("✗ Button URL must be a path starting with / or an http(s) URL");
      return;
    }
    if (labelButNoUrl || urlButNoLabel) {
      setMsg("✗ Button label and URL must be set together");
      return;
    }
    setSaving(true);
    try {
      let upload: File | null = file;
      if (upload) {
        setMsg("Compressing image…");
        upload = await compressImage(upload, {
          maxWidth: 1920,
          maxHeight: 1080,
          quality: 0.85,
        });
      }
      setMsg("Uploading…");
      if (editingId) {
        await bannersService.update(editingId, form, upload);
      } else {
        await bannersService.create(form, upload as File);
      }
      setShowForm(false);
      await reload();
      setMsg(editingId ? "✓ Banner updated" : "✓ Banner created");
    } catch (e) {
      const m = e instanceof Error ? e.message : "Failed to save banner";
      setMsg(`✗ ${m}`);
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (b: BannerAdmin) => {
    const next: BannerStatus = b.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    await bannersService.setStatus(b.id, next);
    reload();
  };

  const remove = async (b: BannerAdmin) => {
    if (!window.confirm("Delete this banner?")) return;
    await bannersService.remove(b.id);
    reload();
  };

  const setOrder = async (b: BannerAdmin, value: number) => {
    await bannersService.setSortOrder(b.id, value);
    reload();
  };

  // Move the dragged banner to the dropped banner's position and persist the
  // new sequential sortOrder for every banner whose position changed.
  const reorder = async (fromId: string | null, toId: string) => {
    if (!fromId || fromId === toId) return;
    const ordered = [...banners];
    const fromIdx = ordered.findIndex((b) => b.id === fromId);
    const toIdx = ordered.findIndex((b) => b.id === toId);
    if (fromIdx < 0 || toIdx < 0) return;

    const previous = banners;
    const [moved] = ordered.splice(fromIdx, 1);
    ordered.splice(toIdx, 0, moved);
    const updated = ordered.map((b, i) => ({ ...b, sortOrder: i }));
    setBanners(updated); // optimistic

    const changed = updated.filter((b) => {
      const orig = previous.find((o) => o.id === b.id);
      return orig && orig.sortOrder !== b.sortOrder;
    });
    if (changed.length === 0) return;

    setReordering(true);
    setMsg("Saving order…");
    try {
      await Promise.all(
        changed.map((b) => bannersService.setSortOrder(b.id, b.sortOrder))
      );
      setMsg("✓ Order updated");
    } catch {
      setMsg("✗ Failed to save order");
      setBanners(previous); // revert on failure
    } finally {
      setReordering(false);
    }
  };

  const tabField = (key: keyof BannerTranslationFields) => key as keyof BannerTranslationFields;
  const textKey = (l: Lang) => tabField(`text${l[0]}${l[1].toLowerCase()}` as keyof BannerTranslationFields);
  const labelKey = (l: Lang) => tabField(`buttonLabel${l[0]}${l[1].toLowerCase()}` as keyof BannerTranslationFields);

  return (
    <>
      <PageMeta title="Banners | Buyology" description="Manage home page promo banners" />
      <PageBreadcrumb pageTitle="Banners" />

      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-4">
            <h2 className="text-base font-semibold text-gray-800 dark:text-white">Promo Banners</h2>
            <div className="inline-flex rounded-lg border border-gray-200 p-0.5 dark:border-gray-700">
              {(["WEB", "MOBILE"] as BannerPlatform[]).map((p) => (
                <button
                  key={p}
                  onClick={() => setPlatformFilter(p)}
                  className={`px-3 py-1 text-xs font-semibold rounded-md ${
                    platformFilter === p
                      ? "bg-brand-500 text-white"
                      : "text-gray-600 dark:text-gray-300"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
          {!showForm && (
            <button
              onClick={startCreate}
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
            >
              + Add {platformFilter.toLowerCase()} banner
            </button>
          )}
        </div>

        {msg && (
          <div className="rounded-lg border border-gray-200 bg-white p-3 text-sm dark:border-gray-800 dark:bg-gray-900 dark:text-white">
            {msg}
          </div>
        )}

        {showForm && (
          <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
            <h3 className="mb-4 text-base font-semibold text-gray-800 dark:text-white">
              {editingId ? "Edit banner" : "New banner"}
            </h3>

            {/* Background image */}
            <div className="mb-4">
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Background image
              </label>
              <div
                className="relative flex h-48 w-full items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 dark:border-gray-700 dark:bg-gray-900"
                style={
                  previewUrl
                    ? {
                        backgroundImage: `url(${previewUrl})`,
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                      }
                    : undefined
                }
              >
                {!previewUrl && (
                  <span className="text-sm text-gray-500 dark:text-gray-400">No image selected</span>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                />
              </div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="mt-2 rounded-lg border border-gray-300 px-3 py-1.5 text-sm dark:border-gray-700 dark:text-gray-200"
              >
                {previewUrl ? "Replace image" : "Choose image"}
              </button>
            </div>

            {/* Language tabs */}
            <div className="mb-4">
              <div className="flex gap-2 border-b border-gray-200 dark:border-gray-800">
                {LANGUAGES.map((l) => (
                  <button
                    key={l}
                    type="button"
                    onClick={() => setTab(l)}
                    className={`px-4 py-2 text-sm font-medium ${
                      tab === l
                        ? "border-b-2 border-brand-500 text-brand-500"
                        : "text-gray-500 dark:text-gray-400"
                    }`}
                  >
                    {l}
                  </button>
                ))}
              </div>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Text (optional)
                  </label>
                  <textarea
                    value={(form.translation[textKey(tab)] as string) ?? ""}
                    onChange={(e) => setTr(textKey(tab), e.target.value)}
                    rows={3}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Button label (optional)
                  </label>
                  <input
                    type="text"
                    value={(form.translation[labelKey(tab)] as string) ?? ""}
                    onChange={(e) => setTr(labelKey(tab), e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                  />
                </div>
              </div>
            </div>

            {/* Button URL + status + sort order */}
            <div className="grid gap-4 md:grid-cols-3">
              <div className="md:col-span-2">
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Button URL (optional)
                </label>
                <input
                  type="text"
                  value={form.buttonUrl ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, buttonUrl: e.target.value }))}
                  placeholder="/catalog or https://partner.com/page"
                  className={`w-full rounded-lg border px-3 py-2 text-sm dark:bg-gray-800 dark:text-white ${
                    buttonUrlInvalid
                      ? "border-red-400"
                      : "border-gray-300 dark:border-gray-600"
                  }`}
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Internal path starting with <code>/</code>, or absolute <code>https://...</code> URL.
                </p>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Sort order
                </label>
                <input
                  type="number"
                  value={form.sortOrder ?? 0}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, sortOrder: Number(e.target.value) }))
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Status
                </label>
                <select
                  value={form.status ?? "ACTIVE"}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, status: e.target.value as BannerStatus }))
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                >
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                </select>
              </div>
            </div>

            {/* Platform selector */}
            <div className="mt-4">
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Platform
              </label>
              <div className="flex gap-2">
                {(["WEB", "MOBILE"] as BannerPlatform[]).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, platform: p }))}
                    className={`rounded-lg border px-4 py-2 text-sm font-semibold ${
                      form.platform === p
                        ? "border-brand-500 bg-brand-500 text-white"
                        : "border-gray-300 text-gray-600 dark:border-gray-700 dark:text-gray-300"
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Choose which client surface this banner appears on. Web and mobile each pull only their own banners.
              </p>
            </div>

            <div className="mt-4 flex gap-2">
              <button
                onClick={submit}
                disabled={saving}
                className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
              >
                {saving ? "Saving…" : editingId ? "Save changes" : "Create banner"}
              </button>
              <button
                onClick={cancelForm}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm dark:border-gray-700 dark:text-gray-200"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        <div className="rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
          {loading ? (
            <div className="p-4 text-sm text-gray-500 dark:text-gray-400">Loading…</div>
          ) : banners.length === 0 ? (
            <div className="p-4 text-sm text-gray-500 dark:text-gray-400">No banners yet.</div>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="border-b border-gray-200 text-xs uppercase text-gray-500 dark:border-gray-800 dark:text-gray-400">
                <tr>
                  <th className="w-10 px-2 py-3"></th>
                  <th className="px-4 py-2.5">Preview</th>
                  <th className="px-4 py-2.5">Text (EN)</th>
                  <th className="px-4 py-2.5">Button</th>
                  <th className="px-4 py-2.5">Order</th>
                  <th className="px-4 py-2.5">Status</th>
                  <th className="px-4 py-2.5"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                {banners.map((b) => (
                  <tr
                    key={b.id}
                    onDragOver={(e) => {
                      if (!dragId) return;
                      e.preventDefault();
                      if (overId !== b.id) setOverId(b.id);
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      reorder(dragId, b.id);
                      setDragId(null);
                      setOverId(null);
                    }}
                    className={`text-gray-800 transition-colors dark:text-white ${
                      dragId === b.id ? "opacity-40" : ""
                    } ${
                      overId === b.id && dragId !== b.id
                        ? "bg-brand-50 dark:bg-brand-500/10"
                        : ""
                    }`}
                  >
                    <td className="px-2 py-3">
                      <div
                        draggable={!reordering}
                        onDragStart={() => setDragId(b.id)}
                        onDragEnd={() => {
                          setDragId(null);
                          setOverId(null);
                        }}
                        title="Drag to reorder"
                        className="flex cursor-grab items-center justify-center text-gray-400 hover:text-brand-500 active:cursor-grabbing"
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                          <circle cx="9" cy="6" r="1.6" />
                          <circle cx="15" cy="6" r="1.6" />
                          <circle cx="9" cy="12" r="1.6" />
                          <circle cx="15" cy="12" r="1.6" />
                          <circle cx="9" cy="18" r="1.6" />
                          <circle cx="15" cy="18" r="1.6" />
                        </svg>
                      </div>
                    </td>
                    <td className="px-4 py-2.5">
                      <div
                        className="h-12 w-24 rounded-md bg-gray-200 dark:bg-gray-700"
                        style={{
                          backgroundImage: b.backgroundImageUrl
                            ? `url(${getImageUrl(b.backgroundImageUrl)})`
                            : undefined,
                          backgroundSize: "cover",
                          backgroundPosition: "center",
                        }}
                      />
                    </td>
                    <td className="max-w-xs truncate px-4 py-2.5">
                      <div>{b.translation.textEn || "—"}</div>
                      <span className="mt-1 inline-block rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                        {b.platform}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      {b.buttonUrl ? (
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {b.translation.buttonLabelEn || "(no label)"} → {b.buttonUrl}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">none</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      <input
                        type="number"
                        defaultValue={b.sortOrder}
                        onBlur={(e) => {
                          const v = Number(e.target.value);
                          if (v !== b.sortOrder) setOrder(b, v);
                        }}
                        className="w-16 rounded border border-gray-300 px-2 py-1 text-sm dark:border-gray-600 dark:bg-gray-800"
                      />
                    </td>
                    <td className="px-4 py-2.5">
                      <button
                        onClick={() => toggleStatus(b)}
                        className={`rounded-full px-2 py-1 text-xs font-medium ${
                          b.status === "ACTIVE"
                            ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300"
                            : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300"
                        }`}
                      >
                        {b.status}
                      </button>
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <button
                        onClick={() => startEdit(b)}
                        className="mr-2 text-sm text-brand-500 hover:underline"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => remove(b)}
                        className="text-sm text-red-500 hover:underline"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  );
}
