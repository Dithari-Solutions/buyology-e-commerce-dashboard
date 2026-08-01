import { useEffect, useState } from "react";
import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import Badge from "../../components/ui/badge/Badge";
import { reviewsService, getUserIdFromToken, ApiRequestError } from "../../api";
import type { Review, ModerationStatus } from "../../types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(iso));
}

function StarRating({ rating }: { rating: number }) {
  return (
    <span className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <svg
          key={star}
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill={star <= rating ? "currentColor" : "none"}
          stroke="currentColor"
          strokeWidth="1.5"
          className={star <= rating ? "text-yellow-400" : "text-gray-300 dark:text-gray-600"}
        >
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
      ))}
      <span className="ml-1 text-xs font-medium text-gray-500 dark:text-gray-400">{rating}/5</span>
    </span>
  );
}

type BadgeColor = "success" | "error" | "warning" | "info" | "light";

function statusBadgeColor(status: ModerationStatus): BadgeColor {
  switch (status) {
    case "APPROVED": return "success";
    case "REJECTED": return "error";
    case "PENDING": return "warning";
  }
}

// ---------------------------------------------------------------------------
// Modals
// ---------------------------------------------------------------------------

function RejectModal({
  onConfirm,
  onCancel,
  loading,
}: {
  onConfirm: (reason: string) => void;
  onCancel: () => void;
  loading: boolean;
}) {
  const [reason, setReason] = useState("");
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4 shadow-theme-lg">
        <h3 className="text-base font-semibold text-gray-800 dark:text-white/90 mb-1">Reject Review</h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">Please provide a reason for rejection.</p>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Rejection reason…"
          rows={3}
          className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-3 py-2 text-sm text-gray-800 dark:text-white placeholder-gray-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-400/20 resize-none"
        />
        <div className="mt-4 flex gap-2 justify-end">
          <button
            onClick={onCancel}
            className="rounded-xl border border-gray-200 dark:border-gray-700 px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => reason.trim() && onConfirm(reason.trim())}
            disabled={!reason.trim() || loading}
            className="rounded-xl bg-red-500 px-4 py-2 text-sm font-medium text-white hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? "Rejecting…" : "Reject"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ReplyModal({
  initialValue,
  onConfirm,
  onCancel,
  loading,
}: {
  initialValue: string;
  onConfirm: (body: string) => void;
  onCancel: () => void;
  loading: boolean;
}) {
  const [body, setBody] = useState(initialValue);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4 shadow-theme-lg">
        <h3 className="text-base font-semibold text-gray-800 dark:text-white/90 mb-1">
          {initialValue ? "Edit Reply" : "Add Reply"}
        </h3>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Write your reply…"
          rows={4}
          className="mt-3 w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-3 py-2 text-sm text-gray-800 dark:text-white placeholder-gray-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-400/20 resize-none"
        />
        <div className="mt-4 flex gap-2 justify-end">
          <button
            onClick={onCancel}
            className="rounded-xl border border-gray-200 dark:border-gray-700 px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => body.trim() && onConfirm(body.trim())}
            disabled={!body.trim() || loading}
            className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? "Saving…" : "Save Reply"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ReviewCard
// ---------------------------------------------------------------------------

function ReviewCard({
  review,
  onModerate,
  onReply,
  onDelete,
  actionLoading,
}: {
  review: Review;
  onModerate: (id: string, action: "approve" | "reject") => void;
  onReply: (id: string, action: "add" | "edit" | "delete") => void;
  onDelete: (id: string) => void;
  actionLoading: string | null;
}) {
  const isLoading = actionLoading === review.id;

  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
      {/* Header row */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-gray-800 dark:text-white/90">
              {review.userFirstName} {review.userLastName}
            </span>
            {review.isVerifiedPurchase && (
              <span className="inline-flex items-center gap-1 rounded-full bg-green-100 dark:bg-green-500/10 px-2 py-0.5 text-[10px] font-semibold text-green-700 dark:text-green-400">
                ✓ Verified Purchase
              </span>
            )}
          </div>
          <StarRating rating={review.rating} />
          <p className="text-[11px] text-gray-400 dark:text-gray-500 font-mono">
            Product: {review.productId}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge size="sm" color={statusBadgeColor(review.status)}>
            {review.status}
          </Badge>
          <span className="text-xs text-gray-400 dark:text-gray-500">{formatDate(review.createdAt)}</span>
        </div>
      </div>

      {/* Review content */}
      {(review.title || review.body) && (
        <div className="mt-3">
          {review.title && (
            <p className="text-sm font-semibold text-gray-800 dark:text-white/90 mb-1">{review.title}</p>
          )}
          {review.body && (
            <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">{review.body}</p>
          )}
        </div>
      )}

      {/* Rejection reason */}
      {review.rejectionReason && (
        <div className="mt-3 rounded-xl border border-red-200 dark:border-red-800/40 bg-red-50 dark:bg-red-500/5 px-3 py-2">
          <p className="text-xs font-medium text-red-600 dark:text-red-400">Rejection reason:</p>
          <p className="text-xs text-red-500 dark:text-red-400/80 mt-0.5">{review.rejectionReason}</p>
        </div>
      )}

      {/* Media */}
      {review.media.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {review.media.map((m) => (
            <div
              key={m.id}
              className="flex h-10 w-10 items-center justify-center rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 text-gray-400"
            >
              {m.mediaType === "IMAGE" ? (
                <img src={m.url} alt="" className="h-10 w-10 object-cover" />
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <polygon points="5 3 19 12 5 21 5 3" />
                </svg>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Helpful votes */}
      <div className="mt-3 flex items-center gap-3 text-xs text-gray-400 dark:text-gray-500">
        <span>👍 {review.helpfulCount} helpful</span>
        <span>👎 {review.notHelpfulCount} not helpful</span>
      </div>

      {/* Admin reply */}
      {review.reply && (
        <div className="mt-4 rounded-xl border border-brand-200 dark:border-brand-800/30 bg-brand-50 dark:bg-brand-500/5 px-4 py-2.5">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <p className="text-xs font-semibold text-brand-600 dark:text-brand-400 mb-1">
                Admin reply — {review.reply.adminFirstName} {review.reply.adminLastName}
              </p>
              <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{review.reply.body}</p>
              <p className="mt-1 text-[11px] text-gray-400 dark:text-gray-500">{formatDate(review.reply.updatedAt)}</p>
            </div>
            <div className="flex gap-1 flex-shrink-0">
              <button
                onClick={() => onReply(review.id, "edit")}
                className="rounded-lg p-1.5 text-gray-400 hover:text-brand-500 hover:bg-brand-50 dark:hover:bg-brand-500/10 transition-colors"
                title="Edit reply"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
              </button>
              <button
                onClick={() => onReply(review.id, "delete")}
                className="rounded-lg p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                title="Delete reply"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6l-1 14H6L5 6" />
                  <path d="M10 11v6M14 11v6" />
                  <path d="M9 6V4h6v2" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-gray-100 dark:border-gray-800 pt-4">
        {review.status === "PENDING" && (
          <>
            <button
              onClick={() => onModerate(review.id, "approve")}
              disabled={isLoading}
              className="rounded-xl bg-success-50 dark:bg-success-500/10 px-3 py-1.5 text-xs font-semibold text-success-600 dark:text-success-400 hover:bg-success-100 dark:hover:bg-success-500/20 disabled:opacity-50 transition-colors"
            >
              ✓ Approve
            </button>
            <button
              onClick={() => onModerate(review.id, "reject")}
              disabled={isLoading}
              className="rounded-xl bg-error-50 dark:bg-error-500/10 px-3 py-1.5 text-xs font-semibold text-error-600 dark:text-error-400 hover:bg-error-100 dark:hover:bg-error-500/20 disabled:opacity-50 transition-colors"
            >
              ✗ Reject
            </button>
          </>
        )}
        {review.status === "APPROVED" && !review.reply && (
          <button
            onClick={() => onReply(review.id, "add")}
            className="rounded-xl bg-brand-50 dark:bg-brand-500/10 px-3 py-1.5 text-xs font-semibold text-brand-600 dark:text-brand-400 hover:bg-brand-100 dark:hover:bg-brand-500/20 transition-colors"
          >
            + Add Reply
          </button>
        )}
        <button
          onClick={() => onDelete(review.id)}
          disabled={isLoading}
          className="ml-auto rounded-xl border border-red-200 dark:border-red-800/30 px-3 py-1.5 text-xs font-semibold text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 disabled:opacity-50 transition-colors"
        >
          {isLoading ? "…" : "Delete"}
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

type StatusFilter = ModerationStatus | "ALL";

type RejectTarget = { reviewId: string };
type ReplyTarget = { reviewId: string; mode: "add" | "edit"; currentBody: string };

export default function Reviews() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [search, setSearch] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Modal state
  const [rejectTarget, setRejectTarget] = useState<RejectTarget | null>(null);
  const [rejectLoading, setRejectLoading] = useState(false);
  const [replyTarget, setReplyTarget] = useState<ReplyTarget | null>(null);
  const [replyLoading, setReplyLoading] = useState(false);

  const load = (signal?: AbortSignal) => {
    setLoading(true);
    setError(null);
    const params = statusFilter !== "ALL" ? { status: statusFilter } : undefined;
    reviewsService
      .getAll(params, signal)
      .then((res) => setReviews(res.data))
      .catch((err: unknown) => {
        if (err instanceof Error && err.name === "AbortError") return;
        setError(err instanceof ApiRequestError ? err.message : "Failed to load reviews.");
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);
    return () => controller.abort();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  const filtered = reviews.filter((r) => {
    const term = search.toLowerCase();
    return (
      `${r.userFirstName} ${r.userLastName}`.toLowerCase().includes(term) ||
      (r.title ?? "").toLowerCase().includes(term) ||
      (r.body ?? "").toLowerCase().includes(term) ||
      r.productId.toLowerCase().includes(term)
    );
  });

  const pendingCount = reviews.filter((r) => r.status === "PENDING").length;
  const approvedCount = reviews.filter((r) => r.status === "APPROVED").length;
  const rejectedCount = reviews.filter((r) => r.status === "REJECTED").length;

  // ── Moderation ─────────────────────────────────────────────────────────────

  const handleApprove = async (reviewId: string) => {
    const adminId = getUserIdFromToken();
    if (!adminId) return;
    setActionLoading(reviewId);
    try {
      const res = await reviewsService.moderate(reviewId, {
        status: "APPROVED",
        moderatedBy: adminId,
        rejectionReason: null,
      });
      setReviews((prev) => prev.map((r) => (r.id === reviewId ? res.data : r)));
    } catch {
      // silently ignore — user can retry
    } finally {
      setActionLoading(null);
    }
  };

  const handleRejectConfirm = async (reason: string) => {
    if (!rejectTarget) return;
    const adminId = getUserIdFromToken();
    if (!adminId) return;
    setRejectLoading(true);
    try {
      const res = await reviewsService.moderate(rejectTarget.reviewId, {
        status: "REJECTED",
        moderatedBy: adminId,
        rejectionReason: reason,
      });
      setReviews((prev) => prev.map((r) => (r.id === rejectTarget.reviewId ? res.data : r)));
      setRejectTarget(null);
    } catch {
      // ignore
    } finally {
      setRejectLoading(false);
    }
  };

  const handleModerate = (reviewId: string, action: "approve" | "reject") => {
    if (action === "approve") {
      handleApprove(reviewId);
    } else {
      setRejectTarget({ reviewId });
    }
  };

  // ── Reply ───────────────────────────────────────────────────────────────────

  const handleReply = (reviewId: string, action: "add" | "edit" | "delete") => {
    if (action === "delete") {
      handleDeleteReply(reviewId);
      return;
    }
    const review = reviews.find((r) => r.id === reviewId);
    setReplyTarget({
      reviewId,
      mode: action,
      currentBody: action === "edit" ? (review?.reply?.body ?? "") : "",
    });
  };

  const handleReplyConfirm = async (body: string) => {
    if (!replyTarget) return;
    const adminId = getUserIdFromToken();
    if (!adminId) return;
    setReplyLoading(true);
    try {
      const res =
        replyTarget.mode === "add"
          ? await reviewsService.addReply(replyTarget.reviewId, { adminId, body })
          : await reviewsService.updateReply(replyTarget.reviewId, { body });
      setReviews((prev) => prev.map((r) => (r.id === replyTarget.reviewId ? res.data : r)));
      setReplyTarget(null);
    } catch {
      // ignore
    } finally {
      setReplyLoading(false);
    }
  };

  const handleDeleteReply = async (reviewId: string) => {
    setActionLoading(reviewId);
    try {
      await reviewsService.deleteReply(reviewId);
      setReviews((prev) =>
        prev.map((r) => (r.id === reviewId ? { ...r, reply: null } : r))
      );
    } catch {
      // ignore
    } finally {
      setActionLoading(null);
    }
  };

  // ── Delete review ───────────────────────────────────────────────────────────

  const handleDelete = async (reviewId: string) => {
    if (!window.confirm("Delete this review? This cannot be undone.")) return;
    setActionLoading(reviewId);
    try {
      await reviewsService.delete(reviewId);
      setReviews((prev) => prev.filter((r) => r.id !== reviewId));
    } catch {
      // ignore
    } finally {
      setActionLoading(null);
    }
  };

  // ── Stats ───────────────────────────────────────────────────────────────────

  const stats = [
    {
      label: "Total",
      value: reviews.length,
      color: "text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-500/10",
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
      ),
    },
    {
      label: "Pending",
      value: pendingCount,
      color: "text-warning-600 dark:text-warning-400 bg-warning-50 dark:bg-warning-500/10",
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
      ),
    },
    {
      label: "Approved",
      value: approvedCount,
      color: "text-success-600 dark:text-success-400 bg-success-50 dark:bg-success-500/10",
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
          <polyline points="22 4 12 14.01 9 11.01" />
        </svg>
      ),
    },
    {
      label: "Rejected",
      value: rejectedCount,
      color: "text-error-600 dark:text-error-400 bg-error-50 dark:bg-error-500/10",
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <circle cx="12" cy="12" r="10" />
          <line x1="15" y1="9" x2="9" y2="15" />
          <line x1="9" y1="9" x2="15" y2="15" />
        </svg>
      ),
    },
  ];

  const filterOptions: { label: string; value: StatusFilter }[] = [
    { label: "All", value: "ALL" },
    { label: "Pending", value: "PENDING" },
    { label: "Approved", value: "APPROVED" },
    { label: "Rejected", value: "REJECTED" },
  ];

  return (
    <>
      <PageMeta
        title="Reviews | Buyology Dashboard"
        description="Moderate product reviews submitted by customers."
      />
      <PageBreadcrumb pageTitle="Reviews" />

      {/* Stats */}
      <div className="mb-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="flex items-center gap-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4"
          >
            <span className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl ${stat.color}`}>
              {stat.icon}
            </span>
            <div>
              <p className="text-xl font-bold text-gray-800 dark:text-white/90 leading-none">
                {loading ? "—" : stat.value}
              </p>
              <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-base font-semibold text-gray-800 dark:text-white/90">
          Product Reviews
          {!loading && (
            <span className="ml-2 text-sm font-normal text-gray-400">({filtered.length})</span>
          )}
        </h2>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          {/* Status filter */}
          <div className="flex gap-1 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60 p-1">
            {filterOptions.map(({ label, value }) => (
              <button
                key={value}
                onClick={() => setStatusFilter(value)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                  statusFilter === value
                    ? "bg-white dark:bg-gray-700 text-gray-800 dark:text-white shadow-theme-xs"
                    : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          {/* Search */}
          <div className="relative w-full sm:w-60">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </span>
            <input
              type="text"
              placeholder="Search by user or content…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 py-2.5 pl-9 pr-4 text-sm text-gray-800 dark:text-white placeholder-gray-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-400/20 transition-all"
            />
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-red-200 dark:border-red-800/40 bg-red-50 dark:bg-red-500/5 py-16 text-center">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mb-3 text-red-400">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <p className="text-sm font-medium text-red-600 dark:text-red-400">{error}</p>
          <button
            onClick={() => load()}
            className="mt-3 text-xs text-brand-500 hover:text-brand-600 dark:text-brand-400"
          >
            Retry
          </button>
        </div>
      )}

      {/* Loading skeletons */}
      {loading && !error && (
        <div className="flex flex-col gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 space-y-3 animate-pulse"
            >
              <div className="flex justify-between">
                <div className="space-y-2">
                  <div className="h-4 w-32 rounded-full bg-gray-200 dark:bg-gray-700" />
                  <div className="h-3 w-24 rounded-full bg-gray-100 dark:bg-gray-800" />
                </div>
                <div className="h-5 w-20 rounded-full bg-gray-200 dark:bg-gray-700" />
              </div>
              <div className="h-3 w-full rounded-full bg-gray-100 dark:bg-gray-800" />
              <div className="h-3 w-3/4 rounded-full bg-gray-100 dark:bg-gray-800" />
            </div>
          ))}
        </div>
      )}

      {/* Review cards */}
      {!loading && !error && (
        <div className="flex flex-col gap-4">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-gray-200 dark:border-gray-800 py-20 text-center">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" className="mb-4 text-gray-300 dark:text-gray-600">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                {search ? "No reviews match your search." : "No reviews found."}
              </p>
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="mt-3 text-xs text-brand-500 hover:text-brand-600 dark:text-brand-400"
                >
                  Clear search
                </button>
              )}
            </div>
          ) : (
            filtered.map((review) => (
              <ReviewCard
                key={review.id}
                review={review}
                onModerate={handleModerate}
                onReply={handleReply}
                onDelete={handleDelete}
                actionLoading={actionLoading}
              />
            ))
          )}
        </div>
      )}

      {/* Modals */}
      {rejectTarget && (
        <RejectModal
          onConfirm={handleRejectConfirm}
          onCancel={() => setRejectTarget(null)}
          loading={rejectLoading}
        />
      )}
      {replyTarget && (
        <ReplyModal
          initialValue={replyTarget.currentBody}
          onConfirm={handleReplyConfirm}
          onCancel={() => setReplyTarget(null)}
          loading={replyLoading}
        />
      )}
    </>
  );
}
