import { useEffect, useState, useCallback } from "react";
import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import Badge from "../../components/ui/badge/Badge";
import { Modal } from "../../components/ui/modal";
import { useModal } from "../../hooks/useModal";
import { storiesService, ApiRequestError } from "../../api";
import { getImageUrl } from "../../utils/imageUrl";
import type { Story, StoryMedia } from "../../types";
import { StoryStatus } from "../../types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mediaUrl(path: string | null | undefined): string {
  return getImageUrl(path);
}

type BadgeColor = "success" | "warning" | "error" | "light";

function statusBadgeColor(status: StoryStatus): BadgeColor {
  switch (status) {
    case StoryStatus.ACTIVE:    return "success";
    case StoryStatus.SUSPENDED: return "warning";
    case StoryStatus.EXPIRED:   return "error";
  }
}

function statusLabel(status: StoryStatus): string {
  switch (status) {
    case StoryStatus.ACTIVE:    return "Active";
    case StoryStatus.SUSPENDED: return "Suspended";
    case StoryStatus.EXPIRED:   return "Expired";
  }
}

// ---------------------------------------------------------------------------
// MediaSlider
// ---------------------------------------------------------------------------

function MediaSlider({
  media,
  initialIndex,
  onDeleteMedia,
}: {
  media: StoryMedia[];
  initialIndex: number;
  onDeleteMedia: (mediaId: string) => void;
}) {
  const [current, setCurrent] = useState(initialIndex);

  useEffect(() => {
    if (media.length > 0 && current >= media.length) {
      setCurrent(Math.max(0, media.length - 1));
    }
  }, [media.length, current]);

  const prev = useCallback(
    () => setCurrent((c) => (c - 1 + media.length) % media.length),
    [media.length]
  );
  const next = useCallback(
    () => setCurrent((c) => (c + 1) % media.length),
    [media.length]
  );

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [prev, next]);

  if (media.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 dark:border-gray-800 py-20 text-gray-500 dark:text-gray-400">
        <svg
          width="40"
          height="40"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          className="mb-3 opacity-20"
        >
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <line x1="3" y1="3" x2="21" y2="21" />
        </svg>
        <p className="text-sm font-medium">No media items in this story.</p>
      </div>
    );
  }

  const item = media[current];

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Main media display */}
      <div className="relative w-full max-h-[65vh] flex items-center justify-center bg-black/40 rounded-2xl overflow-hidden group/main">
        {item.mediaType === "VIDEO" ? (
          <video
            src={mediaUrl(item.url)}
            controls
            className="max-h-[65vh] w-full object-contain rounded-2xl"
          />
        ) : (
          <img
            src={mediaUrl(item.url)}
            alt={`Media ${current + 1}`}
            className="max-h-[65vh] w-full object-contain rounded-2xl"
          />
        )}

        {/* Delete button for specific media */}
        <button
          onClick={() => onDeleteMedia(item.id)}
          className="absolute top-3 left-3 flex h-9 w-9 items-center justify-center rounded-full bg-red-500/80 text-white backdrop-blur-sm hover:bg-red-600 transition-all opacity-0 group-hover/main:opacity-100"
          title="Delete this media"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            <line x1="10" y1="11" x2="10" y2="17"></line>
            <line x1="14" y1="11" x2="14" y2="17"></line>
          </svg>
        </button>

        {/* Nav arrows */}
        {media.length > 1 && (
          <>
            <button
              onClick={prev}
              className="absolute left-3 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm hover:bg-black/70 transition-all"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path
                  d="M15 18L9 12L15 6"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
            <button
              onClick={next}
              className="absolute right-3 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm hover:bg-black/70 transition-all"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path
                  d="M9 18L15 12L9 6"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </>
        )}

        {/* Counter pill */}
        <span className="absolute bottom-3 right-3 rounded-full bg-black/60 px-3 py-1 text-xs font-medium text-white backdrop-blur-sm">
          {current + 1} / {media.length}
        </span>
      </div>

      {/* Thumbnail strip */}
      {media.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {media.map((m, i) => (
            <button
              key={m.orderIndex}
              onClick={() => setCurrent(i)}
              className={`relative h-14 w-14 flex-shrink-0 overflow-hidden rounded-lg border-2 transition-all ${
                i === current
                  ? "border-brand-500 scale-110"
                  : "border-transparent opacity-60 hover:opacity-90"
              }`}
            >
              {m.mediaType === "VIDEO" ? (
                <div className="flex h-full w-full items-center justify-center bg-gray-800">
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    className="text-white"
                  >
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </div>
              ) : (
                <img
                  src={mediaUrl(m.thumbnailUrl ?? m.url)}
                  alt={`thumb-${i}`}
                  className="h-full w-full object-cover"
                />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// StoryCard
// ---------------------------------------------------------------------------

function StoryCard({
  story,
  onClick,
  onDelete,
}: {
  story: Story;
  onClick: (story: Story) => void;
  onDelete: (storyId: string) => void;
}) {
  const imageCount = story.media.filter((m) => m.mediaType === "IMAGE").length;
  const videoCount = story.media.filter((m) => m.mediaType === "VIDEO").length;

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03] text-left transition-all duration-300 hover:border-brand-300 dark:hover:border-brand-600 hover:shadow-lg hover:shadow-brand-500/10 hover:-translate-y-1">
      {/* Clickable area for details */}
      <button
        onClick={() => onClick(story)}
        className="w-full text-left focus:outline-none focus:ring-2 focus:ring-brand-500/40"
      >
        {/* Thumbnail */}
        <div className="relative h-52 w-full overflow-hidden bg-gray-100 dark:bg-gray-800">
          <img
            src={mediaUrl(story.thumbnailUrl)}
            alt={story.title}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />

          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />

          {/* Media count chips */}
          <div className="absolute top-3 right-3 flex flex-col gap-1.5 items-end">
            {imageCount > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-black/50 px-2.5 py-1 text-xs font-medium text-white backdrop-blur-sm">
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <polyline points="21 15 16 10 5 21" />
                </svg>
                {imageCount}
              </span>
            )}
            {videoCount > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-black/50 px-2.5 py-1 text-xs font-medium text-white backdrop-blur-sm">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                  <polygon points="23 7 16 12 23 17 23 7" />
                  <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
                </svg>
                {videoCount}
              </span>
            )}
          </div>

          {/* Play hint on hover */}
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm border border-white/30">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Card body */}
        <div className="p-4">
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-sm font-semibold text-gray-800 dark:text-white/90 line-clamp-1">
              {story.title}
            </h3>
            <Badge size="sm" color="info">
              {story.media.length} {story.media.length === 1 ? "item" : "items"}
            </Badge>
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Badge size="sm" color={statusBadgeColor(story.status)}>
              {statusLabel(story.status)}
            </Badge>
            <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 dark:bg-white/[0.06] px-2 py-0.5 text-xs font-medium text-gray-700 dark:text-gray-300" title="Views">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
              {story.viewCount ?? 0}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 dark:bg-rose-500/10 px-2 py-0.5 text-xs font-medium text-rose-600 dark:text-rose-300" title="Likes">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
              {story.likeCount ?? 0}
            </span>
          </div>

          {/* Media type pills */}
          <div className="mt-3 flex flex-wrap gap-1.5">
            {story.media.map((m, i) => (
              <span
                key={i}
                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                  m.mediaType === "VIDEO"
                    ? "bg-purple-100 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400"
                    : "bg-brand-100 text-brand-700 dark:bg-brand-500/10 dark:text-brand-400"
                }`}
              >
                {m.mediaType === "VIDEO" ? (
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
                    <polygon points="23 7 16 12 23 17 23 7" />
                    <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
                  </svg>
                ) : (
                  <svg
                    width="10"
                    height="10"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                    <circle cx="8.5" cy="8.5" r="1.5" />
                    <polyline points="21 15 16 10 5 21" />
                  </svg>
                )}
                {m.mediaType === "VIDEO" ? "Video" : "Image"} {i + 1}
              </span>
            ))}
          </div>
        </div>
      </button>

      {/* Delete Story Button */}
      <button
        onClick={() => onDelete(story.id)}
        className="absolute top-3 left-3 flex h-8 w-8 items-center justify-center rounded-full bg-red-500/80 text-white opacity-0 group-hover:opacity-100 hover:bg-red-600 transition-all backdrop-blur-sm shadow-sm"
        title="Delete Story"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="3 6 5 6 21 6"></polyline>
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
          <line x1="10" y1="11" x2="10" y2="17"></line>
          <line x1="14" y1="11" x2="14" y2="17"></line>
        </svg>
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function Stories() {
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedStory, setSelectedStory] = useState<Story | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StoryStatus | "ALL">("ALL");
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [reorderSaving, setReorderSaving] = useState(false);
  const { isOpen, openModal, closeModal } = useModal();

  // Drag-to-reorder is only safe on the full, unfiltered list (card index === list index).
  const reorderEnabled = statusFilter === "ALL" && search.trim() === "";

  function handleReorderDrop(dropIndex: number) {
    if (dragIndex === null || dragIndex === dropIndex) {
      setDragIndex(null);
      return;
    }
    const next = [...stories];
    const [moved] = next.splice(dragIndex, 1);
    next.splice(dropIndex, 0, moved);
    setStories(next);
    setDragIndex(null);
    // Persist the new order: displayOrder = position in the list.
    setReorderSaving(true);
    Promise.all(next.map((s, idx) => storiesService.updateDisplayOrder(s.id, idx)))
      .catch(() => fetchStories())
      .finally(() => setReorderSaving(false));
  }

  const fetchStories = useCallback((signal?: AbortSignal) => {
    setLoading(true);
    setError(null);
    storiesService
      .getAll("EN", signal)
      .then((res) => setStories(res.data))
      .catch((err: unknown) => {
        if (err instanceof Error && err.name === "AbortError") return;
        const message =
          err instanceof ApiRequestError
            ? err.message
            : "Failed to load stories.";
        setError(message);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    fetchStories(controller.signal);
    return () => controller.abort();
  }, [fetchStories]);

  const handleCardClick = (story: Story) => {
    setSelectedStory(story);
    openModal();
  };

  const handleClose = () => {
    closeModal();
    setSelectedStory(null);
  };

  const handleDeleteStory = async (storyId: string) => {
    if (!window.confirm("Are you sure you want to delete this entire story?")) {
      return;
    }

    try {
      await storiesService.deleteStory(storyId);
      setStories((prev) => prev.filter((s) => s.id !== storyId));
      if (selectedStory?.id === storyId) {
        handleClose();
      }
    } catch (err: unknown) {
      alert(err instanceof ApiRequestError ? err.message : "Failed to delete story.");
    }
  };

  const handleDeleteMedia = async (mediaId: string) => {
    if (!selectedStory) return;
    if (!window.confirm("Are you sure you want to delete this media item?")) {
      return;
    }

    try {
      await storiesService.deleteMedia(selectedStory.id, mediaId);
      // Refresh selected story to get updated media list and presigned URLs
      const updatedStory = await storiesService.getById(selectedStory.id, "EN");
      setSelectedStory(updatedStory.data);
      // Also update it in the list
      setStories((prev) =>
        prev.map((s) => (s.id === selectedStory.id ? updatedStory.data : s))
      );
    } catch (err: unknown) {
      alert(err instanceof ApiRequestError ? err.message : "Failed to delete media.");
    }
  };

  const filtered = stories.filter((s) => {
    const matchesSearch = s.title.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "ALL" || s.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalMedia = stories.reduce((acc, s) => acc + s.media.length, 0);
  const totalImages = stories.reduce(
    (acc, s) => acc + s.media.filter((m) => m.mediaType === "IMAGE").length,
    0
  );
  const totalVideos = stories.reduce(
    (acc, s) => acc + s.media.filter((m) => m.mediaType === "VIDEO").length,
    0
  );

  return (
    <>
      <PageMeta
        title="Stories | Buyology Dashboard"
        description="Manage and preview all stories published on the Buyology platform."
      />

      <PageBreadcrumb pageTitle="Stories" />

      {/* ── Stats row ── */}
      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {[
          {
            label: "Total Stories",
            value: stories.length,
            icon: (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M4 6h16M4 10h16M4 14h8" strokeLinecap="round" />
              </svg>
            ),
            color: "text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-500/10",
          },
          {
            label: "Total Media",
            value: totalMedia,
            icon: (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <polyline points="21 15 16 10 5 21" />
              </svg>
            ),
            color: "text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10",
          },
          {
            label: "Images",
            value: totalImages,
            icon: (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <polyline points="21 15 16 10 5 21" />
              </svg>
            ),
            color: "text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-500/10",
          },
          {
            label: "Videos",
            value: totalVideos,
            icon: (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <polygon points="23 7 16 12 23 17 23 7" />
                <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
              </svg>
            ),
            color: "text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-500/10",
          },
          {
            label: "Total Views",
            value: stories.reduce((sum, s) => sum + (s.viewCount ?? 0), 0),
            icon: (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            ),
            color: "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10",
          },
          {
            label: "Total Likes",
            value: stories.reduce((sum, s) => sum + (s.likeCount ?? 0), 0),
            icon: (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
            ),
            color: "text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-500/10",
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className="flex items-center gap-3 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03] p-4"
          >
            <span className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl ${stat.color}`}>
              {stat.icon}
            </span>
            <div>
              <p className="text-2xl font-bold text-gray-800 dark:text-white/90 leading-none">
                {loading ? "—" : stat.value}
              </p>
              <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Search + header ── */}
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90">
          All Stories
          {!loading && (
            <span className="ml-2 text-sm font-normal text-gray-400">
              ({filtered.length})
            </span>
          )}
        </h2>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          {/* Status filter tabs */}
          <div className="flex gap-1 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60 p-1">
            {(["ALL", StoryStatus.ACTIVE, StoryStatus.SUSPENDED, StoryStatus.EXPIRED] as const).map(
              (s) => {
                const isActive = statusFilter === s;
                const label =
                  s === "ALL" ? "All" : statusLabel(s);
                const activeColor =
                  s === "ALL"
                    ? "bg-white dark:bg-gray-700 text-gray-800 dark:text-white shadow-sm"
                    : s === StoryStatus.ACTIVE
                    ? "bg-white dark:bg-gray-700 text-success-600 dark:text-success-400 shadow-sm"
                    : s === StoryStatus.SUSPENDED
                    ? "bg-white dark:bg-gray-700 text-warning-600 dark:text-orange-400 shadow-sm"
                    : "bg-white dark:bg-gray-700 text-error-600 dark:text-error-400 shadow-sm";
                return (
                  <button
                    key={s}
                    onClick={() => setStatusFilter(s)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                      isActive
                        ? activeColor
                        : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                    }`}
                  >
                    {label}
                  </button>
                );
              }
            )}
          </div>

          {/* Search */}
          <div className="relative w-full sm:w-56">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </span>
            <input
              type="text"
              placeholder="Search stories…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 py-2.5 pl-9 pr-4 text-sm text-gray-800 dark:text-white placeholder-gray-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-400/20 transition-all"
            />
          </div>
        </div>
      </div>

      {/* ── Loading skeleton ── */}
      {loading && (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="animate-pulse rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03] overflow-hidden"
            >
              <div className="h-52 bg-gray-200 dark:bg-gray-700" />
              <div className="p-4 space-y-3">
                <div className="h-4 w-3/4 rounded bg-gray-200 dark:bg-gray-700" />
                <div className="flex gap-2">
                  <div className="h-5 w-16 rounded-full bg-gray-200 dark:bg-gray-700" />
                  <div className="h-5 w-16 rounded-full bg-gray-200 dark:bg-gray-700" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Error state ── */}
      {error && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-red-200 dark:border-red-800/40 bg-red-50 dark:bg-red-500/5 py-16 text-center">
          <svg
            width="40"
            height="40"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            className="mb-3 text-red-400"
          >
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

      {/* ── Empty state ── */}
      {!loading && !error && filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03] py-20 text-center">
          <svg
            width="48"
            height="48"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.2"
            className="mb-4 text-gray-300 dark:text-gray-600"
          >
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <polyline points="21 15 16 10 5 21" />
          </svg>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
            {search ? "No stories match your search." : "No stories found."}
          </p>
        </div>
      )}

      {/* ── Reorder hint ── */}
      {!loading && !error && filtered.length > 1 && (
        <p className="mb-3 flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="5 9 2 12 5 15" /><polyline points="9 5 12 2 15 5" />
            <polyline points="15 19 12 22 9 19" /><polyline points="19 9 22 12 19 15" />
            <line x1="2" y1="12" x2="22" y2="12" /><line x1="12" y1="2" x2="12" y2="22" />
          </svg>
          {reorderEnabled
            ? <>Drag cards to set the order stories appear in the app.{reorderSaving && <span className="text-brand-500 font-medium"> Saving…</span>}</>
            : "Clear search & status filters to drag-reorder stories."}
        </p>
      )}

      {/* ── Story grid ── */}
      {!loading && !error && filtered.length > 0 && (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((story, i) => (
            <div
              key={story.id}
              draggable={reorderEnabled}
              onDragStart={() => reorderEnabled && setDragIndex(i)}
              onDragOver={(e) => { if (reorderEnabled) e.preventDefault(); }}
              onDrop={() => reorderEnabled && handleReorderDrop(i)}
              className={`${reorderEnabled ? "cursor-move" : ""} ${dragIndex === i ? "opacity-50" : ""} transition-opacity`}
            >
              <StoryCard
                story={story}
                onClick={handleCardClick}
                onDelete={handleDeleteStory}
              />
            </div>
          ))}
        </div>
      )}

      {/* ── Media viewer modal ── */}
      <Modal
        isOpen={isOpen}
        onClose={handleClose}
        className="mx-4 w-full max-w-2xl p-6"
      >
        {selectedStory && (
          <div>
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
                  {selectedStory.title}
                </h3>
                <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                  {selectedStory.media.length}{" "}
                  {selectedStory.media.length === 1 ? "item" : "items"}
                </p>
              </div>
              <Badge size="sm" color={statusBadgeColor(selectedStory.status)}>
                {statusLabel(selectedStory.status)}
              </Badge>
            </div>
            <MediaSlider
              media={selectedStory.media}
              initialIndex={0}
              onDeleteMedia={handleDeleteMedia}
            />
          </div>
        )}
      </Modal>
    </>
  );
}
