import { apiClient } from "../client";
import type { ApiResponse } from "../types/api.types";
import type { Question } from "../../types/question.types";

const BASE = "/api/admin/questions";

export interface ModerateQuestionRequest {
  status: "APPROVED" | "REJECTED";
  moderatedBy: string;
}

export interface AddQuestionAnswerRequest {
  adminId: string;
  body: string;
}

export const questionsService = {
  getAll(
    params?: { status?: string; page?: number; size?: number },
    signal?: AbortSignal
  ): Promise<ApiResponse<Question[]>> {
    const query = new URLSearchParams();
    if (params?.status) query.set("status", params.status);
    if (params?.page !== undefined) query.set("page", String(params.page));
    if (params?.size !== undefined) query.set("size", String(params.size));
    const qs = query.toString();
    return apiClient.get<ApiResponse<Question[]>>(`${BASE}${qs ? `?${qs}` : ""}`, { signal });
  },

  getById(questionId: string, signal?: AbortSignal): Promise<ApiResponse<Question>> {
    return apiClient.get<ApiResponse<Question>>(`${BASE}/${questionId}`, { signal });
  },

  moderate(questionId: string, data: ModerateQuestionRequest): Promise<ApiResponse<Question>> {
    return apiClient.patch<ApiResponse<Question>>(`${BASE}/${questionId}/moderate`, data);
  },

  delete(questionId: string): Promise<ApiResponse<null>> {
    return apiClient.delete<ApiResponse<null>>(`${BASE}/${questionId}`);
  },

  addAnswer(questionId: string, data: AddQuestionAnswerRequest): Promise<ApiResponse<Question>> {
    return apiClient.post<ApiResponse<Question>>(`${BASE}/${questionId}/answer`, data);
  },

  updateAnswer(questionId: string, data: { body: string }): Promise<ApiResponse<Question>> {
    return apiClient.put<ApiResponse<Question>>(`${BASE}/${questionId}/answer`, data);
  },

  toggleAnswer(questionId: string): Promise<ApiResponse<Question>> {
    return apiClient.patch<ApiResponse<Question>>(`${BASE}/${questionId}/answer/toggle`, {});
  },

  deleteAnswer(questionId: string): Promise<ApiResponse<null>> {
    return apiClient.delete<ApiResponse<null>>(`${BASE}/${questionId}/answer`);
  },
};
