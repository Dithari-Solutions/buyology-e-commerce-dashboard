import { useEffect, useRef, useState } from "react";
import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import { newsletterService, type NewsArticle } from "../../api/services/newsletter.service";

/**
 * Announcements — the public posts at buyology.online/news.
 *
 * Separate from Newsletter on purpose. Newsletter is an audience (who subscribed, how many);
 * an announcement is a piece of content with a headline, artwork and a permanent URL. They meet
 * at exactly one point — publishing can email the announcement to that audience — and running
 * them from one screen made the artwork fields look optional to the newsletter and the
 * subscriber count look like part of the article.
 *
 * The API has always accepted a thumbnail and a gallery; nothing sent them. That is the gap this
 * page closes, which is why the upload fields carry their own size guidance rather than leaving
 * it to whoever is pasting the file in.
 */

const SITE = "https://buyology.online";

/** Mirrors the server allowlist exactly (FileValidationUtils): extension AND MIME must both pass. */
const OK_EXT = ["jpg", "jpeg", "png", "gif", "webp"];
const OK_MIME = ["image/jpeg", "image/png", "image/gif", "image/webp"];
/**
 * Nothing on the server resizes or re-compresses an announcement image — the bytes uploaded are
 * the bytes served, including to the social card. No cap is enforced, so this is a warning rather
 * than a rejection.
 */
const HEAVY_BYTES = 2 * 1024 * 1024;

type Rejection = { name: string; reason: string };

/** Returns null when the file would be accepted, or the reason the server would refuse it. */
function rejectionFor(file: File): string | null {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (ext === "svg" || file.type === "image/svg+xml") {
    return "SVG is rejected by the server — export a PNG or JPEG instead.";
  }
  if (!OK_EXT.includes(ext)) {
    return `.${ext} is not accepted. Use JPG, PNG, GIF or WEBP.`;
  }
  if (!OK_MIME.includes(file.type)) {
    return `The file says it is "${file.type || "unknown"}", which does not match its extension.`;
  }
  return null;
}

function humanSize(bytes: number): string {
  return bytes >= 1024 * 1024
    ? `${(bytes / 1024 / 1024).toFixed(1)} MB`
    : `${Math.round(bytes / 1024)} KB`;
}

export default function AnnouncementsPage() {
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"articles" | "create">("articles");

  const [form, setForm] = useState({ title: "", summary: "", content: "" });
  const [thumbnail, setThumbnail] = useState<File | null>(null);
  const [gallery, setGallery] = useState<File[]>([]);
  const [rejected, setRejected] = useState<Rejection[]>([]);

  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [publishing, setPublishing] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  // The thumbnail already on the article being edited, so the form can show what it would keep.
  const [existingThumb, setExistingThumb] = useState<string | null>(null);
  const [existingGallery, setExistingGallery] = useState<string[]>([]);

  const thumbInput = useRef<HTMLInputElement>(null);
  const galleryInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const ac = new AbortController();
    newsletterService
      .listArticles(ac.signal)
      .then((res) => setArticles(res.data ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
    return () => ac.abort();
  }, []);

  // Object URLs are revoked when the selection changes, otherwise every re-pick leaks one.
  const thumbPreview = usePreview(thumbnail);
  const galleryPreviews = usePreviews(gallery);

  const resetForm = () => {
    setForm({ title: "", summary: "", content: "" });
    setThumbnail(null);
    setGallery([]);
    setRejected([]);
    setExistingThumb(null);
    setExistingGallery([]);
    setEditingId(null);
    if (thumbInput.current) thumbInput.current.value = "";
    if (galleryInput.current) galleryInput.current.value = "";
  };

  const pickThumbnail = (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    const reason = rejectionFor(file);
    if (reason) {
      setRejected([{ name: file.name, reason }]);
      if (thumbInput.current) thumbInput.current.value = "";
      return;
    }
    setRejected([]);
    setThumbnail(file);
  };

  const pickGallery = (files: FileList | null) => {
    if (!files) return;
    const accepted: File[] = [];
    const refused: Rejection[] = [];
    Array.from(files).forEach((file) => {
      const reason = rejectionFor(file);
      if (reason) refused.push({ name: file.name, reason });
      else accepted.push(file);
    });
    setRejected(refused);
    setGallery(accepted);
  };

  const handleSave = async () => {
    setSaving(true);
    setMsg("");
    try {
      const fd = new FormData();
      fd.append("request", new Blob([JSON.stringify(form)], { type: "application/json" }));
      if (thumbnail) fd.append("image", thumbnail);
      gallery.forEach((g) => fd.append("gallery", g));

      if (editingId) {
        const updated = await newsletterService.updateArticle(editingId, fd);
        setArticles((a) => a.map((art) => (art.id === editingId ? (updated.data as NewsArticle) : art)));
        setMsg("✓ Announcement updated");
      } else {
        const created = await newsletterService.createArticle(fd);
        setArticles((a) => [created.data as NewsArticle, ...a]);
        setMsg("✓ Saved as a draft — publish it from the Announcements tab");
      }
      resetForm();
      setActiveTab("articles");
    } catch {
      setMsg(editingId ? "✗ Failed to update the announcement" : "✗ Failed to save the announcement");
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (art: NewsArticle) => {
    setForm({ title: art.title, summary: art.summary ?? "", content: art.content ?? "" });
    setEditingId(art.id);
    setThumbnail(null);
    setGallery([]);
    setRejected([]);
    setExistingThumb(art.imageUrl ?? null);
    setExistingGallery(art.galleryUrls ?? []);
    setMsg("");
    if (thumbInput.current) thumbInput.current.value = "";
    if (galleryInput.current) galleryInput.current.value = "";
    setActiveTab("create");
  };

  const handleDelete = async (id: string) => {
    setDeleting(id);
    try {
      await newsletterService.deleteArticle(id);
      setArticles((a) => a.filter((art) => art.id !== id));
      setConfirmDelete(null);
      if (editingId === id) resetForm();
    } catch {
      alert("Failed to delete the announcement. Please try again.");
    } finally {
      setDeleting(null);
    }
  };

  const handlePublish = async (id: string, send: boolean) => {
    if (send) {
      const ok = window.confirm(
        "Publish this announcement and email every active newsletter subscriber?\n\n" +
          "The email cannot be recalled, and this is the only chance to send it — " +
          "once published, the send option is gone.",
      );
      if (!ok) return;
    }
    setPublishing(id);
    try {
      await newsletterService.publishArticle(id, send);
      setArticles((a) =>
        a.map((art) => (art.id === id ? { ...art, status: "PUBLISHED" as const } : art)),
      );
    } catch {
      alert("Failed to publish the announcement. Please try again.");
    } finally {
      setPublishing(null);
    }
  };

  const drafts = articles.filter((a) => a.status === "DRAFT").length;
  const published = articles.length - drafts;

  const field =
    "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white";
  const label = "mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300";
  const hint = "mt-1 text-xs text-gray-500 dark:text-gray-400";

  return (
    <>
      <PageMeta title="Announcements | Buyology" description="Write and publish announcements" />
      <PageBreadcrumb pageTitle="Announcements" />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Stat label="Published" value={published} />
        <Stat label="Drafts" value={drafts} />
        <Stat label="Total" value={articles.length} />
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="border-b border-gray-100 px-6 pt-4 dark:border-gray-800">
          <div className="flex gap-6">
            {(["articles", "create"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => {
                  if (tab === "create" && activeTab !== "create" && !editingId) resetForm();
                  setActiveTab(tab);
                }}
                className={`border-b-2 pb-3 text-sm font-medium transition-colors ${
                  activeTab === tab
                    ? "border-brand-500 text-brand-500"
                    : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400"
                }`}
              >
                {tab === "articles" ? "Announcements" : editingId ? "Edit" : "New Announcement"}
              </button>
            ))}
          </div>
        </div>

        <div className="p-6">
          {/* ── List ─────────────────────────────────────────────── */}
          {activeTab === "articles" && (
            <>
              {loading ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">Loading…</p>
              ) : articles.length === 0 ? (
                <div className="py-12 text-center">
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    No announcements yet.
                  </p>
                  <button
                    onClick={() => {
                      resetForm();
                      setActiveTab("create");
                    }}
                    className="mt-3 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600"
                  >
                    Write the first one
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {articles.map((art) => (
                    <div
                      key={art.id}
                      className="flex flex-col gap-4 rounded-xl border border-gray-200 p-4 dark:border-gray-700 sm:flex-row sm:items-start"
                    >
                      <div className="h-20 w-32 shrink-0 overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-800">
                        {art.imageUrl ? (
                          <img
                            src={art.imageUrl}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center px-2 text-center text-[10px] uppercase tracking-wider text-gray-400">
                            No image
                          </div>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="truncate font-medium text-gray-800 dark:text-white">
                            {art.title}
                          </h3>
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                              art.status === "PUBLISHED"
                                ? "bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-400"
                                : "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300"
                            }`}
                          >
                            {art.status}
                          </span>
                          {art.galleryUrls && art.galleryUrls.length > 0 && (
                            <span className="text-[11px] text-gray-500 dark:text-gray-400">
                              {art.galleryUrls.length} gallery image
                              {art.galleryUrls.length === 1 ? "" : "s"}
                            </span>
                          )}
                        </div>

                        {art.summary && (
                          <p className="mt-1 line-clamp-2 text-sm text-gray-500 dark:text-gray-400">
                            {art.summary}
                          </p>
                        )}

                        {art.status === "PUBLISHED" && art.slug && (
                          <a
                            href={`${SITE}/news/${art.slug}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-1 inline-block truncate text-xs text-brand-500 hover:underline"
                          >
                            {SITE}/news/{art.slug}
                          </a>
                        )}
                      </div>

                      {confirmDelete === art.id ? (
                        <div className="flex shrink-0 items-center gap-2">
                          <span className="text-xs text-gray-500 dark:text-gray-400">Delete?</span>
                          <button
                            onClick={() => handleDelete(art.id)}
                            disabled={deleting === art.id}
                            className="rounded-lg bg-red-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-600 disabled:opacity-50"
                          >
                            {deleting === art.id ? "…" : "Yes, delete"}
                          </button>
                          <button
                            onClick={() => setConfirmDelete(null)}
                            disabled={deleting === art.id}
                            className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 disabled:opacity-50"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <div className="flex shrink-0 flex-wrap gap-2">
                          {art.status === "DRAFT" && (
                            <>
                              <button
                                onClick={() => handlePublish(art.id, false)}
                                disabled={publishing === art.id}
                                className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 disabled:opacity-50"
                              >
                                Publish Only
                              </button>
                              <button
                                onClick={() => handlePublish(art.id, true)}
                                disabled={publishing === art.id}
                                className="rounded-lg bg-brand-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-600 disabled:opacity-50"
                              >
                                {publishing === art.id ? "…" : "Publish & Send"}
                              </button>
                            </>
                          )}
                          <button
                            onClick={() => startEdit(art)}
                            className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => setConfirmDelete(art.id)}
                            className="rounded-lg border border-red-200 px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 dark:border-red-500/30 dark:text-red-400"
                          >
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* ── Composer ─────────────────────────────────────────── */}
          {activeTab === "create" && (
            <div className="max-w-3xl space-y-5">
              {editingId && (
                <div className="flex items-center justify-between rounded-lg bg-brand-50 px-4 py-3 dark:bg-brand-500/10">
                  <p className="text-sm text-brand-700 dark:text-brand-300">
                    Editing an existing announcement. Its web address stays the same.
                  </p>
                  <button
                    onClick={() => {
                      resetForm();
                      setMsg("");
                    }}
                    className="text-xs font-medium text-gray-600 underline dark:text-gray-300"
                  >
                    Cancel edit
                  </button>
                </div>
              )}

              <div>
                <label className={label}>Title *</label>
                <input
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  className={field}
                  placeholder="Win an iPhone 18 Pro"
                />
                <p className={hint}>
                  Also used as the subject line if you email this to subscribers.
                </p>
              </div>

              <div>
                <label className={label}>Summary</label>
                <input
                  value={form.summary}
                  onChange={(e) => setForm((f) => ({ ...f, summary: e.target.value }))}
                  className={field}
                  placeholder="One sentence describing the announcement"
                />
                <p className={hint}>Shown under the title on the announcements list. Optional.</p>
              </div>

              {/* ── Thumbnail ── */}
              <div>
                <label className={label}>Thumbnail image</label>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                  <div className="h-28 w-44 shrink-0 overflow-hidden rounded-lg border border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800">
                    {thumbPreview || existingThumb ? (
                      <img
                        src={thumbPreview ?? existingThumb ?? ""}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center px-2 text-center text-[10px] uppercase tracking-wider text-gray-400">
                        16:10 preview
                      </div>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <input
                      ref={thumbInput}
                      type="file"
                      accept=".jpg,.jpeg,.png,.gif,.webp,image/jpeg,image/png,image/gif,image/webp"
                      onChange={(e) => pickThumbnail(e.target.files)}
                      className="block w-full text-sm text-gray-600 file:mr-3 file:rounded-lg file:border-0 file:bg-brand-500 file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-brand-600 dark:text-gray-300"
                    />
                    <p className={hint}>
                      <strong>1920 × 1200 px (16:10)</strong>, JPG or PNG. Keep anything important
                      inside the centre 1560 × 1005 px — the site crops this to three different
                      shapes, and it is also the image shown when the link is shared on WhatsApp
                      or Instagram.
                    </p>
                    {thumbnail && (
                      <p className="mt-1 text-xs text-gray-600 dark:text-gray-300">
                        {thumbnail.name} · {humanSize(thumbnail.size)}
                        {thumbnail.size > HEAVY_BYTES && (
                          <span className="text-amber-600 dark:text-amber-400">
                            {" "}
                            — heavy. Nothing compresses this on the way in, so visitors download it
                            as-is.
                          </span>
                        )}
                      </p>
                    )}
                    {editingId && existingThumb && !thumbnail && (
                      <p className={hint}>
                        Leaving this empty keeps the current image.
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* ── Gallery ── */}
              <div>
                <label className={label}>Gallery images</label>
                <input
                  ref={galleryInput}
                  type="file"
                  multiple
                  accept=".jpg,.jpeg,.png,.gif,.webp,image/jpeg,image/png,image/gif,image/webp"
                  onChange={(e) => pickGallery(e.target.files)}
                  className="block w-full text-sm text-gray-600 file:mr-3 file:rounded-lg file:border-0 file:bg-gray-100 file:px-4 file:py-2 file:text-sm file:font-medium file:text-gray-700 hover:file:bg-gray-200 dark:text-gray-300 dark:file:bg-gray-700 dark:file:text-gray-200"
                />
                <p className={hint}>
                  Optional strip below the article body. Cropped to squares —{" "}
                  <strong>1000 × 1000 px</strong> is plenty. Selecting files here{" "}
                  <strong>replaces</strong> the whole gallery, it does not add to it.
                </p>

                {(galleryPreviews.length > 0 || existingGallery.length > 0) && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {(galleryPreviews.length > 0 ? galleryPreviews : existingGallery).map((src, i) => (
                      <img
                        key={`${src}-${i}`}
                        src={src}
                        alt=""
                        className="h-16 w-16 rounded-lg border border-gray-200 object-cover dark:border-gray-700"
                      />
                    ))}
                    {galleryPreviews.length === 0 && existingGallery.length > 0 && (
                      <span className="self-center text-xs text-gray-500 dark:text-gray-400">
                        current gallery
                      </span>
                    )}
                  </div>
                )}
              </div>

              {rejected.length > 0 && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-500/30 dark:bg-red-500/10">
                  {rejected.map((r) => (
                    <p key={r.name} className="text-xs text-red-700 dark:text-red-300">
                      <strong>{r.name}</strong> — {r.reason}
                    </p>
                  ))}
                </div>
              )}

              <div>
                <label className={label}>Content *</label>
                <textarea
                  rows={12}
                  value={form.content}
                  onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
                  className={`${field} font-mono`}
                  placeholder="<p>Your announcement…</p>"
                />
                <p className={hint}>
                  HTML. Allowed: <code>p, br, hr, h2, h3, h4, strong, em, u, s, ul, ol, li,
                  blockquote, code, pre, a, img, figure, table</code>. Anything else is stripped
                  before it reaches the site. Use full <code>https://</code> links — this same HTML
                  becomes the subscriber email, where relative links are dead.
                </p>
              </div>

              {msg && <p className="text-sm text-gray-600 dark:text-gray-400">{msg}</p>}

              <button
                onClick={handleSave}
                disabled={saving || !form.title || !form.content}
                className="rounded-lg bg-brand-500 px-6 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50"
              >
                {saving ? "Saving…" : editingId ? "Save changes" : "Save as Draft"}
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
      <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
      <p className="text-3xl font-bold text-gray-800 dark:text-white">{value.toLocaleString()}</p>
    </div>
  );
}

/** A preview URL for one picked file, revoked as soon as the pick changes or the form unmounts. */
function usePreview(file: File | null): string | null {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!file) {
      setUrl(null);
      return;
    }
    const objectUrl = URL.createObjectURL(file);
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);
  return url;
}

function usePreviews(files: File[]): string[] {
  const [urls, setUrls] = useState<string[]>([]);
  useEffect(() => {
    const objectUrls = files.map((f) => URL.createObjectURL(f));
    setUrls(objectUrls);
    return () => objectUrls.forEach(URL.revokeObjectURL);
  }, [files]);
  return urls;
}
