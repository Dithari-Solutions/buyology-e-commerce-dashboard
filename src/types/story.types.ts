export type MediaType = "IMAGE" | "VIDEO";

export interface StoryMedia {
  id: string;
  mediaType: MediaType;
  orderIndex: number;
  thumbnailUrl: string | null;
  url: string;
}

export enum StoryStatus {
  ACTIVE = "ACTIVE",
  SUSPENDED = "SUSPENDED",
  EXPIRED = "EXPIRED",
}

export interface Story {
  id: string;
  title: string;
  thumbnailUrl: string;
  status: StoryStatus;
  media: StoryMedia[];
  viewCount: number;
  likeCount: number;
  likedByMe: boolean;
  /** Lower is shown first in the feed. Set via drag-and-drop reordering. */
  displayOrder?: number;
}
