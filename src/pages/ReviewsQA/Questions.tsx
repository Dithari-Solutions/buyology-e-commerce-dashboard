import { useEffect, useState } from "react";
import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import Badge from "../../components/ui/badge/Badge";
import { questionsService, getUserIdFromToken, ApiRequestError } from "../../api";
import type { Question, ModerationStatus } from "../../types";

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

type BadgeColor = "success" | "error" | "warning" | "info" | "light";

function statusBadgeColor(status: ModerationStatus): BadgeColor {
  switch (status) {
    case "APPROVED": return "success";
    case "REJECTED": return "error";
    case "PENDING": return "warning";
  }
}

// ---------------------------------------------------------------------------
// Answer modal
// ---------------------------------------------------------------------------

function AnswerModal({
  initialValue,
  mode,
  onConfirm,
  onCancel,
  loading,
}: {
  initialValue: string;
  mode: "add" | "edit";
  onConfirm: (body: string) => void;
  onCancel: () => void;
  loading: boolean;
}) {
  const [body, setBody] = useState(initialValue);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-6 shadow-xl">
        <h3 className="text-base font-semibold text-gray-800 dark:text-white/90 mb-1">
          {mode === "add" ? "Add Answer" : "Edit Answer"}
        </h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
          Write a clear, helpful answer to the customer's question.
        </p>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Type your answer here…"
          rows={4}
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
            onClick={() => body.trim() && onConfirm(body.trim())}
            disabled={!body.trim() || loading}
            className="rounded-xl bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? "Saving…" : "Save Answer"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// QuestionCard
// ---------------------------------------------------------------------------

function QuestionCard({
  question,
  onModerate,
  onAnswer,
  onDelete,
  actionLoading,
}: {
  question: Question;
  onModerate: (id: string, action: "approve" | "reject") => void;
  onAnswer: (id: string, action: "add" | "edit" | "toggle" | "delete") => void;
  onDelete: (id: string) => void;
  actionLoading: string | null;
}) {
  const isLoading = actionLoading === question.id;

  return (
    <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03] p-5">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <span className="text-sm font-semibold text-gray-800 dark:text-white/90">
            {question.userFirstName} {question.userLastName}
          </span>
          <p className="text-[11px] font-mono text-gray-400 dark:text-gray-500">
            Product: {question.productId}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 dark:bg-blue-500/10 px-2 py-0.5 text-[11px] font-medium text-blue-600 dark:text-blue-400">
            👍 {question.helpfulCount}
          </span>
          <Badge size="sm" color={statusBadgeColor(question.status)}>
            {question.status}
          </Badge>
          <span className="text-xs text-gray-400 dark:text-gray-500">{formatDate(question.createdAt)}</span>
        </div>
      </div>

      {/* Question body */}
      <div className="mt-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 px-4 py-3">
        <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
          <span className="font-semibold text-gray-500 dark:text-gray-400 mr-1">Q:</span>
          {question.body}
        </p>
      </div>

      {/* Answer section */}
      {question.answer && (
        <div className={`mt-3 rounded-xl border px-4 py-3 ${
          question.answer.isActive
            ? "border-brand-200 dark:border-brand-800/30 bg-brand-50 dark:bg-brand-500/5"
            : "border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/30 opacity-60"
        }`}>
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <p className="text-xs font-semibold text-brand-600 dark:text-brand-400">
                  A: {question.answer.adminFirstName} {question.answer.adminLastName}
                </p>
                {!question.answer.isActive && (
                  <span className="rounded-full bg-gray-200 dark:bg-gray-700 px-2 py-0.5 text-[10px] font-semibold text-gray-500 dark:text-gray-400">
                    Hidden
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{question.answer.body}</p>
              <p className="mt-1 text-[11px] text-gray-400 dark:text-gray-500">{formatDate(question.answer.updatedAt)}</p>
            </div>
            {/* Answer actions */}
            <div className="flex gap-1 flex-shrink-0">
              <button
                onClick={() => onAnswer(question.id, "toggle")}
                disabled={isLoading}
                className={`rounded-lg p-1.5 transition-colors ${
                  question.answer.isActive
                    ? "text-gray-400 hover:text-warning-500 hover:bg-warning-50 dark:hover:bg-warning-500/10"
                    : "text-gray-400 hover:text-success-500 hover:bg-success-50 dark:hover:bg-success-500/10"
                } disabled:opacity-50`}
                title={question.answer.isActive ? "Hide answer" : "Show answer"}
              >
                {question.answer.isActive ? (
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                ) : (
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
              <button
                onClick={() => onAnswer(question.id, "edit")}
                className="rounded-lg p-1.5 text-gray-400 hover:text-brand-500 hover:bg-brand-50 dark:hover:bg-brand-500/10 transition-colors"
                title="Edit answer"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
              </button>
              <button
                onClick={() => onAnswer(question.id, "delete")}
                className="rounded-lg p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                title="Delete answer"
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
        {question.status === "PENDING" && (
          <>
            <button
              onClick={() => onModerate(question.id, "approve")}
              disabled={isLoading}
              className="rounded-xl bg-success-50 dark:bg-success-500/10 px-3 py-1.5 text-xs font-semibold text-success-600 dark:text-success-400 hover:bg-success-100 dark:hover:bg-success-500/20 disabled:opacity-50 transition-colors"
            >
              ✓ Approve
            </button>
            <button
              onClick={() => onModerate(question.id, "reject")}
              disabled={isLoading}
              className="rounded-xl bg-error-50 dark:bg-error-500/10 px-3 py-1.5 text-xs font-semibold text-error-600 dark:text-error-400 hover:bg-error-100 dark:hover:bg-error-500/20 disabled:opacity-50 transition-colors"
            >
              ✗ Reject
            </button>
          </>
        )}
        {question.status === "APPROVED" && !question.answer && (
          <button
            onClick={() => onAnswer(question.id, "add")}
            className="rounded-xl bg-brand-50 dark:bg-brand-500/10 px-3 py-1.5 text-xs font-semibold text-brand-600 dark:text-brand-400 hover:bg-brand-100 dark:hover:bg-brand-500/20 transition-colors"
          >
            + Add Answer
          </button>
        )}
        <button
          onClick={() => onDelete(question.id)}
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
type AnswerTarget = { questionId: string; mode: "add" | "edit"; currentBody: string };

export default function Questions() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [search, setSearch] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const [answerTarget, setAnswerTarget] = useState<AnswerTarget | null>(null);
  const [answerLoading, setAnswerLoading] = useState(false);

  const load = (signal?: AbortSignal) => {
    setLoading(true);
    setError(null);
    const params = statusFilter !== "ALL" ? { status: statusFilter } : undefined;
    questionsService
      .getAll(params, signal)
      .then((res) => setQuestions(res.data))
      .catch((err: unknown) => {
        if (err instanceof Error && err.name === "AbortError") return;
        setError(err instanceof ApiRequestError ? err.message : "Failed to load questions.");
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);
    return () => controller.abort();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  const filtered = questions.filter((q) => {
    const term = search.toLowerCase();
    return (
      q.body.toLowerCase().includes(term) ||
      `${q.userFirstName} ${q.userLastName}`.toLowerCase().includes(term) ||
      q.productId.toLowerCase().includes(term)
    );
  });

  const pendingCount = questions.filter((q) => q.status === "PENDING").length;
  const approvedCount = questions.filter((q) => q.status === "APPROVED").length;
  const rejectedCount = questions.filter((q) => q.status === "REJECTED").length;
  const unansweredCount = questions.filter((q) => q.status === "APPROVED" && !q.answer).length;

  // ── Moderation ─────────────────────────────────────────────────────────────

  const handleModerate = async (questionId: string, action: "approve" | "reject") => {
    const adminId = getUserIdFromToken();
    if (!adminId) return;
    setActionLoading(questionId);
    try {
      const res = await questionsService.moderate(questionId, {
        status: action === "approve" ? "APPROVED" : "REJECTED",
        moderatedBy: adminId,
      });
      setQuestions((prev) => prev.map((q) => (q.id === questionId ? res.data : q)));
    } catch {
      // ignore
    } finally {
      setActionLoading(null);
    }
  };

  // ── Answer ──────────────────────────────────────────────────────────────────

  const handleAnswer = async (questionId: string, action: "add" | "edit" | "toggle" | "delete") => {
    if (action === "add" || action === "edit") {
      const q = questions.find((q) => q.id === questionId);
      setAnswerTarget({
        questionId,
        mode: action,
        currentBody: action === "edit" ? (q?.answer?.body ?? "") : "",
      });
      return;
    }

    if (action === "toggle") {
      setActionLoading(questionId);
      try {
        const res = await questionsService.toggleAnswer(questionId);
        setQuestions((prev) => prev.map((q) => (q.id === questionId ? res.data : q)));
      } catch {
        // ignore
      } finally {
        setActionLoading(null);
      }
      return;
    }

    // delete answer
    setActionLoading(questionId);
    try {
      await questionsService.deleteAnswer(questionId);
      setQuestions((prev) =>
        prev.map((q) => (q.id === questionId ? { ...q, answer: null } : q))
      );
    } catch {
      // ignore
    } finally {
      setActionLoading(null);
    }
  };

  const handleAnswerConfirm = async (body: string) => {
    if (!answerTarget) return;
    const adminId = getUserIdFromToken();
    if (!adminId) return;
    setAnswerLoading(true);
    try {
      const res =
        answerTarget.mode === "add"
          ? await questionsService.addAnswer(answerTarget.questionId, { adminId, body })
          : await questionsService.updateAnswer(answerTarget.questionId, { body });
      setQuestions((prev) =>
        prev.map((q) => (q.id === answerTarget.questionId ? res.data : q))
      );
      setAnswerTarget(null);
    } catch {
      // ignore
    } finally {
      setAnswerLoading(false);
    }
  };

  // ── Delete question ─────────────────────────────────────────────────────────

  const handleDelete = async (questionId: string) => {
    if (!window.confirm("Delete this question? This cannot be undone.")) return;
    setActionLoading(questionId);
    try {
      await questionsService.delete(questionId);
      setQuestions((prev) => prev.filter((q) => q.id !== questionId));
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
      value: questions.length,
      color: "text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-500/10",
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <circle cx="12" cy="12" r="10" />
          <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
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
      label: "Need Answer",
      value: unansweredCount,
      color: "text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10",
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
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
        title="Questions & Answers | Buyology Dashboard"
        description="Review and answer customer questions about products."
      />
      <PageBreadcrumb pageTitle="Questions & Answers" />

      {/* Stats */}
      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {stats.map((stat) => (
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

      {/* Toolbar */}
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90">
          Customer Questions
          {!loading && (
            <span className="ml-2 text-sm font-normal text-gray-400">({filtered.length})</span>
          )}
        </h2>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="flex gap-1 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60 p-1">
            {filterOptions.map(({ label, value }) => (
              <button
                key={value}
                onClick={() => setStatusFilter(value)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                  statusFilter === value
                    ? "bg-white dark:bg-gray-700 text-gray-800 dark:text-white shadow-sm"
                    : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                }`}
              >
                {label}
                {value === "PENDING" && pendingCount > 0 && (
                  <span className="ml-1.5 rounded-full bg-warning-100 dark:bg-warning-500/20 px-1.5 py-0.5 text-[10px] font-bold text-warning-600 dark:text-warning-400">
                    {pendingCount}
                  </span>
                )}
              </button>
            ))}
          </div>
          <div className="relative w-full sm:w-60">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </span>
            <input
              type="text"
              placeholder="Search questions…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 py-2.5 pl-9 pr-4 text-sm text-gray-800 dark:text-white placeholder-gray-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-400/20 transition-all"
            />
          </div>
        </div>
      </div>

      {/* Rejected count note */}
      {rejectedCount > 0 && statusFilter === "ALL" && (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-error-200 dark:border-error-800/30 bg-error-50 dark:bg-error-500/5 px-4 py-2.5">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-error-500">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <p className="text-xs text-error-600 dark:text-error-400">
            {rejectedCount} question{rejectedCount > 1 ? "s" : ""} have been rejected and are hidden from customers.
          </p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-red-200 dark:border-red-800/40 bg-red-50 dark:bg-red-500/5 py-16 text-center">
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
              className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03] p-5 space-y-3 animate-pulse"
            >
              <div className="flex justify-between">
                <div className="h-4 w-32 rounded-full bg-gray-200 dark:bg-gray-700" />
                <div className="h-5 w-20 rounded-full bg-gray-200 dark:bg-gray-700" />
              </div>
              <div className="h-10 w-full rounded-xl bg-gray-100 dark:bg-gray-800" />
            </div>
          ))}
        </div>
      )}

      {/* Question cards */}
      {!loading && !error && (
        <div className="flex flex-col gap-4">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-gray-200 dark:border-gray-800 py-20 text-center">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" className="mb-4 text-gray-300 dark:text-gray-600">
                <circle cx="12" cy="12" r="10" />
                <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                {search ? "No questions match your search." : "No questions found."}
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
            filtered.map((question) => (
              <QuestionCard
                key={question.id}
                question={question}
                onModerate={handleModerate}
                onAnswer={handleAnswer}
                onDelete={handleDelete}
                actionLoading={actionLoading}
              />
            ))
          )}
        </div>
      )}

      {/* Answer modal */}
      {answerTarget && (
        <AnswerModal
          initialValue={answerTarget.currentBody}
          mode={answerTarget.mode}
          onConfirm={handleAnswerConfirm}
          onCancel={() => setAnswerTarget(null)}
          loading={answerLoading}
        />
      )}
    </>
  );
}
