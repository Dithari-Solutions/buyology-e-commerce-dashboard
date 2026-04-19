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

export const gamesService = {
  configureDailyGame(req: DailyGameConfigRequest): Promise<ApiResponse<unknown>> {
    return apiClient.post("/api/admin/game/config", req);
  },
  createQuizQuestion(req: CreateQuizRequest): Promise<ApiResponse<QuizQuestion>> {
    return apiClient.post("/api/admin/game/quiz", req);
  },
  getAllQuizQuestions(signal?: AbortSignal): Promise<ApiResponse<QuizQuestion[]>> {
    return apiClient.get("/api/admin/game/quiz", { signal });
  },
};
