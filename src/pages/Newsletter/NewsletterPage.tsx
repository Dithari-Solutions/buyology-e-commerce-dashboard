import { useEffect, useState } from "react";
import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import { newsletterService, type NewsArticle } from "../../api/services/newsletter.service";

export default function NewsletterPage() {
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [subscriberCount, setSubscriberCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"articles" | "create">("articles");
  const [form, setForm] = useState({ title: "", summary: "", content: "" });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [publishing, setPublishing] = useState<string | null>(null);

  useEffect(() => {
    const ac = new AbortController();
    Promise.all([
      newsletterService.listArticles(ac.signal),
      newsletterService.getStats(ac.signal),
    ]).then(([arts, stats]) => {
      setArticles(arts.data ?? []);
      setSubscriberCount(stats.data?.subscriberCount ?? 0);
    }).catch(() => {}).finally(() => setLoading(false));
    return () => ac.abort();
  }, []);

  const handleCreate = async () => {
    setSaving(true); setMsg("");
    try {
      const fd = new FormData();
      fd.append("request", new Blob([JSON.stringify(form)], { type: "application/json" }));
      const created = await newsletterService.createArticle(fd);
      setArticles((a) => [created.data as NewsArticle, ...a]);
      setForm({ title: "", summary: "", content: "" });
      setActiveTab("articles");
      setMsg("✓ Article created as draft");
    } catch { setMsg("✗ Failed to create article"); }
    finally { setSaving(false); }
  };

  const handlePublish = async (id: string, send: boolean) => {
    setPublishing(id);
    try {
      await newsletterService.publishArticle(id, send);
      setArticles((a) => a.map((art) => art.id === id ? { ...art, status: "PUBLISHED" as const } : art));
    } catch { } finally { setPublishing(null); }
  };

  return (
    <>
      <PageMeta title="Newsletter | Buyology" description="Manage newsletter and news articles" />
      <PageBreadcrumb pageTitle="Newsletter" />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
          <p className="text-sm text-gray-500 dark:text-gray-400">Active Subscribers</p>
          <p className="text-3xl font-bold text-gray-800 dark:text-white">{subscriberCount.toLocaleString()}</p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
          <p className="text-sm text-gray-500 dark:text-gray-400">Total Articles</p>
          <p className="text-3xl font-bold text-gray-800 dark:text-white">{articles.length}</p>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="border-b border-gray-100 dark:border-gray-800 px-6 pt-4">
          <div className="flex gap-6">
            {(["articles", "create"] as const).map((tab) => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className={`pb-3 text-sm font-medium capitalize border-b-2 transition-colors ${activeTab === tab ? "border-brand-500 text-brand-500" : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400"}`}>
                {tab === "articles" ? "Articles" : "Create Article"}
              </button>
            ))}
          </div>
        </div>

        <div className="p-6">
          {activeTab === "articles" && (
            loading ? <p className="text-sm text-gray-500">Loading...</p> :
            articles.length === 0 ? (
              <div className="rounded-xl border-2 border-dashed border-gray-200 p-8 text-center dark:border-gray-700">
                <p className="text-gray-500 dark:text-gray-400">No articles yet. Create one!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {articles.map((art) => (
                  <div key={art.id} className="flex items-start justify-between rounded-xl border border-gray-100 p-4 dark:border-gray-800">
                    <div className="flex-1 min-w-0 pr-4">
                      <h3 className="font-medium text-gray-800 dark:text-white truncate">{art.title}</h3>
                      {art.summary && <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{art.summary}</p>}
                      <p className="mt-1 text-xs text-gray-400">
                        {new Date(art.createdAt).toLocaleDateString()} ·{" "}
                        <span className={`font-medium ${art.status === "PUBLISHED" ? "text-green-600" : "text-yellow-600"}`}>
                          {art.status}
                        </span>
                      </p>
                    </div>
                    {art.status === "DRAFT" && (
                      <div className="flex gap-2 shrink-0">
                        <button onClick={() => handlePublish(art.id, false)} disabled={publishing === art.id}
                          className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 disabled:opacity-50">
                          Publish Only
                        </button>
                        <button onClick={() => handlePublish(art.id, true)} disabled={publishing === art.id}
                          className="rounded-lg bg-brand-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-600 disabled:opacity-50">
                          {publishing === art.id ? "..." : "Publish & Send"}
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )
          )}

          {activeTab === "create" && (
            <div className="max-w-2xl space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Title *</label>
                <input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Summary</label>
                <input value={form.summary} onChange={(e) => setForm((f) => ({ ...f, summary: e.target.value }))}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Content (HTML allowed) *</label>
                <textarea rows={8} value={form.content} onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white" />
              </div>
              {msg && <p className="text-sm text-gray-600 dark:text-gray-400">{msg}</p>}
              <button onClick={handleCreate} disabled={saving || !form.title || !form.content}
                className="rounded-lg bg-brand-500 px-6 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50">
                {saving ? "Saving..." : "Save as Draft"}
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
