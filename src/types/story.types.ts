export type MediaType = "IMAGE" | "VIDEO";

export interface StoryMedia {
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
}
