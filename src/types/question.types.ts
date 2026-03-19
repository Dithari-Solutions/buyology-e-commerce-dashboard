import type { ModerationStatus } from "./review.types";

export type { ModerationStatus };

export interface QuestionAnswer {
  id: string;
  adminId: string;
  adminFirstName: string;
  adminLastName: string;
  body: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Question {
  id: string;
  productId: string;
  userId: string;
  userFirstName: string;
  userLastName: string;
  body: string;
  status: ModerationStatus;
  helpfulCount: number;
  answer: QuestionAnswer | null;
  createdAt: string;
  updatedAt: string;
}
