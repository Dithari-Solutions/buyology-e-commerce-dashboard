import { apiClient } from "../client";
import type { ApiResponse } from "../types/api.types";

export interface DailyGameConfigRequest {
  gameDate: string; // YYYY-MM-DD
  gameType: "QUIZ" | "MINI_GAME";
}

export interface QuizTranslation {
  language: string;
  questionText: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
}

export interface CreateQuizRequest {
  correctOptionIndex: number;
  points: number;
  active: boolean;
  translations: QuizTranslation[];
}

export interface QuizQuestion {
  id: string;
  correctOptionIndex: number;
  points: number;
  active: boolean;
  translations: QuizTranslation[];
}

export interface DailyGameConfig {
  id: string;
  gameDate: string;
  gameType: "QUIZ" | "MINI_GAME";
}

export const gamesService = {
  configureDailyGame(req: DailyGameConfigRequest): Promise<ApiResponse<DailyGameConfig>> {
    return apiClient.post("/api/admin/game/config", req);
  },
  getDailyGameConfig(date?: string, signal?: AbortSignal): Promise<ApiResponse<DailyGameConfig | null>> {
    const qs = date ? `?date=${encodeURIComponent(date)}` : "";
    return apiClient.get(`/api/admin/game/config${qs}`, { signal });
  },
  createQuizQuestion(req: CreateQuizRequest): Promise<ApiResponse<QuizQuestion>> {
    return apiClient.post("/api/admin/game/quiz", req);
  },
  updateQuizQuestion(id: string, req: CreateQuizRequest): Promise<ApiResponse<QuizQuestion>> {
    return apiClient.put(`/api/admin/game/quiz/${id}`, req);
  },
  deleteQuizQuestion(id: string): Promise<ApiResponse<void>> {
    return apiClient.delete(`/api/admin/game/quiz/${id}`);
  },
  getAllQuizQuestions(signal?: AbortSignal): Promise<ApiResponse<QuizQuestion[]>> {
    return apiClient.get("/api/admin/game/quiz", { signal });
  },
};
