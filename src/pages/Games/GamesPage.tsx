import { useEffect, useState } from "react";
import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import { gamesService, type QuizQuestion, type CreateQuizRequest, type DailyGameConfig } from "../../api/services/games.service";

const LANGUAGES = ["EN", "AZ", "AR"] as const;

const emptyTranslation = (lang: string) => ({
  language: lang,
  questionText: "",
  optionA: "",
  optionB: "",
  optionC: "",
  optionD: "",
});

const emptyForm = (): CreateQuizRequest => ({
  correctOptionIndex: 0,
  points: 10,
  active: true,
  translations: LANGUAGES.map((l) => emptyTranslation(l)),
});

export default function GamesPage() {
  const [quizzes, setQuizzes] = useState<QuizQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [configDate, setConfigDate] = useState(new Date().toISOString().slice(0, 10));
  const [configType, setConfigType] = useState<"QUIZ" | "MINI_GAME">("QUIZ");
  const [configSaving, setConfigSaving] = useState(false);
  const [configMsg, setConfigMsg] = useState("");
  const [todayConfig, setTodayConfig] = useState<DailyGameConfig | null>(null);
  const [showQuizModal, setShowQuizModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [quizLang, setQuizLang] = useState<"EN" | "AZ" | "AR">("EN");
  const [quizForm, setQuizForm] = useState<CreateQuizRequest>(emptyForm());
  const [quizSaving, setQuizSaving] = useState(false);
  const [quizMsg, setQuizMsg] = useState("");
  // Admin-tunable token rewards (#11).
  const [quizReward, setQuizReward] = useState(10);
  const [miniGameReward, setMiniGameReward] = useState(10);
  const [rewardSaving, setRewardSaving] = useState(false);
  const [rewardMsg, setRewardMsg] = useState("");

  useEffect(() => {
    const ac = new AbortController();
    Promise.all([
      gamesService.getAllQuizQuestions(ac.signal).then((r) => setQuizzes(r.data ?? [])).catch(() => {}),
      gamesService.getDailyGameConfig(undefined, ac.signal).then((r) => {
        setTodayConfig(r.data ?? null);
        if (r.data) setConfigType(r.data.gameType);
      }).catch(() => {}),
      gamesService.getRewardConfig(ac.signal).then((r) => {
        if (r.data) {
          setQuizReward(r.data.quizReward);
          setMiniGameReward(r.data.miniGameReward);
        }
      }).catch(() => {}),
    ]).finally(() => setLoading(false));
    return () => ac.abort();
  }, []);

  const handleConfigSave = async () => {
    setConfigSaving(true);
    setConfigMsg("");
    try {
      const res = await gamesService.configureDailyGame({ gameDate: configDate, gameType: configType });
      if (configDate === new Date().toISOString().slice(0, 10)) setTodayConfig(res.data ?? null);
      setConfigMsg("✓ Game configured for " + configDate);
    } catch {
      setConfigMsg("✗ Failed to save configuration");
    } finally {
      setConfigSaving(false);
    }
  };

  const handleRewardSave = async () => {
    setRewardSaving(true);
    setRewardMsg("");
    try {
      const res = await gamesService.updateRewardConfig({ quizReward, miniGameReward });
      if (res.data) {
        setQuizReward(res.data.quizReward);
        setMiniGameReward(res.data.miniGameReward);
      }
      setRewardMsg("✓ Token rewards saved");
    } catch {
      setRewardMsg("✗ Failed to save rewards");
    } finally {
      setRewardSaving(false);
    }
  };

  const updateTranslation = (lang: string, field: string, value: string) => {
    setQuizForm((f) => ({
      ...f,
      translations: f.translations.map((t) =>
        t.language === lang ? { ...t, [field]: value } : t
      ),
    }));
  };

  const openCreate = () => {
    setEditingId(null);
    setQuizForm(emptyForm());
    setQuizLang("EN");
    setQuizMsg("");
    setShowQuizModal(true);
  };

  const openEdit = (q: QuizQuestion) => {
    setEditingId(q.id);
    setQuizForm({
      correctOptionIndex: q.correctOptionIndex,
      points: q.points,
      active: q.active,
      translations: LANGUAGES.map((l) => {
        const existing = q.translations.find((t) => t.language === l);
        return existing ?? emptyTranslation(l);
      }),
    });
    setQuizLang("EN");
    setQuizMsg("");
    setShowQuizModal(true);
  };

  const handleSaveQuiz = async () => {
    setQuizSaving(true);
    setQuizMsg("");
    try {
      if (editingId) {
        const res = await gamesService.updateQuizQuestion(editingId, quizForm);
        setQuizzes((qs) => qs.map((q) => (q.id === editingId ? (res.data as QuizQuestion) : q)));
        setQuizMsg("✓ Quiz question updated");
      } else {
        const created = await gamesService.createQuizQuestion(quizForm);
        setQuizzes((qs) => [...qs, created.data as QuizQuestion]);
        setQuizMsg("✓ Quiz question created");
      }
      setShowQuizModal(false);
      setEditingId(null);
      setQuizForm(emptyForm());
    } catch {
      setQuizMsg("✗ Failed to save quiz question");
    } finally {
      setQuizSaving(false);
    }
  };

  const handleDeleteQuiz = async (id: string) => {
    if (!window.confirm("Delete this quiz question? This cannot be undone.")) return;
    try {
      await gamesService.deleteQuizQuestion(id);
      setQuizzes((qs) => qs.filter((q) => q.id !== id));
    } catch {
      window.alert("Failed to delete quiz question");
    }
  };

  const currentTranslation = quizForm.translations.find((t) => t.language === quizLang);

  return (
    <>
      <PageMeta title="Games Management | Buyology" description="Manage daily games and quiz questions" />
      <PageBreadcrumb pageTitle="Games" />

      <div className="space-y-4">
        {/* Today indicator */}
        <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Today's active game:{" "}
            <span className="font-semibold text-gray-900 dark:text-white">
              {todayConfig ? (todayConfig.gameType === "QUIZ" ? "Quiz" : "Mini Game") : "Not configured (defaults to Mini Game)"}
            </span>
          </p>
        </div>

        {/* Daily game config */}
        <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
          <h2 className="mb-4 text-base font-semibold text-gray-800 dark:text-white">Daily Game Configuration</h2>
          <div className="flex flex-wrap gap-4 items-end">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Date</label>
              <input type="date" value={configDate} onChange={(e) => setConfigDate(e.target.value)}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Game Type</label>
              <select value={configType} onChange={(e) => setConfigType(e.target.value as "QUIZ" | "MINI_GAME")}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white">
                <option value="QUIZ">Quiz</option>
                <option value="MINI_GAME">Mini Game (Flow Free)</option>
              </select>
            </div>
            <button onClick={handleConfigSave} disabled={configSaving}
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50">
              {configSaving ? "Saving..." : "Save Config"}
            </button>
            {configMsg && <p className="text-sm text-gray-600 dark:text-gray-400">{configMsg}</p>}
          </div>
        </div>

        {/* Token rewards (#11) — tokens granted per successful play */}
        <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
          <h2 className="mb-1 text-base font-semibold text-gray-800 dark:text-white">Token Rewards</h2>
          <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
            Tokens awarded to a customer for a successful play.
          </p>
          <div className="flex flex-wrap items-end gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Quiz reward</label>
              <input type="number" min={0} value={quizReward}
                onChange={(e) => setQuizReward(Math.max(0, Number(e.target.value)))}
                className="w-32 rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Mini-game reward</label>
              <input type="number" min={0} value={miniGameReward}
                onChange={(e) => setMiniGameReward(Math.max(0, Number(e.target.value)))}
                className="w-32 rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white" />
            </div>
            <button onClick={handleRewardSave} disabled={rewardSaving}
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50">
              {rewardSaving ? "Saving..." : "Save Rewards"}
            </button>
            {rewardMsg && <p className="text-sm text-gray-600 dark:text-gray-400">{rewardMsg}</p>}
          </div>
        </div>

        {/* Quiz questions manager */}
        <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-800 dark:text-white">
              Quiz Questions ({quizzes.length})
            </h2>
            <button onClick={openCreate}
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700">
              + New Question
            </button>
          </div>

          {loading ? (
            <p className="text-sm text-gray-500">Loading...</p>
          ) : quizzes.length === 0 ? (
            <div className="rounded-xl border-2 border-dashed border-gray-200 p-5 text-center dark:border-gray-700">
              <p className="text-gray-500 dark:text-gray-400">No quiz questions yet. Create one to get started.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-gray-800 text-left text-gray-500">
                    <th className="pb-3 pr-4">Question (EN)</th>
                    <th className="pb-3 pr-4">Points</th>
                    <th className="pb-3 pr-4">Correct</th>
                    <th className="pb-3 pr-4">Status</th>
                    <th className="pb-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {quizzes.map((q) => {
                    const en = q.translations.find((t) => t.language === "EN");
                    return (
                      <tr key={q.id}>
                        <td className="py-3 pr-4 text-gray-800 dark:text-gray-200 max-w-xs truncate">
                          {en?.questionText ?? "—"}
                        </td>
                        <td className="py-3 pr-4 text-gray-600 dark:text-gray-400">{q.points}</td>
                        <td className="py-3 pr-4 text-gray-600 dark:text-gray-400">
                          Option {["A", "B", "C", "D"][q.correctOptionIndex]}
                        </td>
                        <td className="py-3 pr-4">
                          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${q.active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}>
                            {q.active ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td className="py-3">
                          <div className="flex gap-2">
                            <button onClick={() => openEdit(q)}
                              className="rounded-md border border-gray-300 px-2.5 py-1 text-xs text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-800">
                              Edit
                            </button>
                            <button onClick={() => handleDeleteQuiz(q.id)}
                              className="rounded-md border border-red-300 px-2.5 py-1 text-xs text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950">
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Create/edit quiz modal */}
        {showQuizModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="w-full max-w-2xl rounded-xl bg-white p-4 shadow-theme-lg dark:bg-gray-900 overflow-y-auto max-h-[90vh]">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-base font-semibold text-gray-800 dark:text-white">
                  {editingId ? "Edit Quiz Question" : "Create Quiz Question"}
                </h3>
                <button onClick={() => setShowQuizModal(false)} className="text-gray-400 hover:text-gray-600">✕</button>
              </div>

              <div className="mb-4 flex gap-2">
                {LANGUAGES.map((l) => (
                  <button key={l} onClick={() => setQuizLang(l as "EN" | "AZ" | "AR")}
                    className={`rounded-lg px-3 py-1.5 text-sm font-medium ${quizLang === l ? "bg-brand-500 text-white" : "border border-gray-300 text-gray-600 dark:border-gray-600 dark:text-gray-300"}`}>
                    {l}
                  </button>
                ))}
              </div>

              {currentTranslation && (
                <div className="space-y-3 mb-4">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Question ({quizLang})</label>
                    <textarea rows={2} value={currentTranslation.questionText}
                      onChange={(e) => updateTranslation(quizLang, "questionText", e.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white" />
                  </div>
                  {(["optionA", "optionB", "optionC", "optionD"] as const).map((opt, i) => (
                    <div key={opt}>
                      <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Option {["A","B","C","D"][i]}</label>
                      <input value={currentTranslation[opt]}
                        onChange={(e) => updateTranslation(quizLang, opt, e.target.value)}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white" />
                    </div>
                  ))}
                </div>
              )}

              <div className="mb-4 flex gap-4 items-end flex-wrap">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Correct Answer</label>
                  <select value={quizForm.correctOptionIndex}
                    onChange={(e) => setQuizForm((f) => ({ ...f, correctOptionIndex: Number(e.target.value) }))}
                    className="rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white">
                    {["A","B","C","D"].map((l, i) => <option key={l} value={i}>Option {l}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Points</label>
                  <input type="number" min={1} value={quizForm.points}
                    onChange={(e) => setQuizForm((f) => ({ ...f, points: Number(e.target.value) }))}
                    className="w-24 rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white" />
                </div>
                <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                  <input type="checkbox" checked={quizForm.active}
                    onChange={(e) => setQuizForm((f) => ({ ...f, active: e.target.checked }))} />
                  Active
                </label>
              </div>

              {quizMsg && <p className="mb-3 text-sm text-red-500">{quizMsg}</p>}

              <div className="flex gap-3">
                <button onClick={handleSaveQuiz} disabled={quizSaving}
                  className="flex-1 rounded-lg bg-brand-600 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50">
                  {quizSaving ? "Saving..." : editingId ? "Save Changes" : "Create Question"}
                </button>
                <button onClick={() => setShowQuizModal(false)}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
