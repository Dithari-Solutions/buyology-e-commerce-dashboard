export type ModerationStatus = "PENDING" | "APPROVED" | "REJECTED";

export type ReviewMediaType = "IMAGE" | "VIDEO";

export interface ReviewMedia {
  id: string;
  url: string;
  mediaType: ReviewMediaType;
  sortOrder: number;
  createdAt: string;
}

export interface ReviewReply {
  id: string;
  adminId: string;
  adminFirstName: string;
  adminLastName: string;
  body: string;
  createdAt: string;
  updatedAt: string;
}

export interface Review {
  id: string;
  productId: string;
  userId: string;
  userFirstName: string;
  userLastName: string;
  rating: number;
  title: string | null;
  body: string | null;
  isVerifiedPurchase: boolean;
  status: ModerationStatus;
  rejectionReason: string | null;
  helpfulCount: number;
  notHelpfulCount: number;
  media: ReviewMedia[];
  reply: ReviewReply | null;
  createdAt: string;
  updatedAt: string;
}

export interface ReviewStats {
  productId: string;
  totalReviews: number;
  averageRating: string;
  rating1Count: number;
  rating2Count: number;
  rating3Count: number;
  rating4Count: number;
  rating5Count: number;
  updatedAt: string;
}
