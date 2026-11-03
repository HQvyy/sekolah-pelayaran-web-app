import type { ApiSuccess } from "../../types/api.ts";

export type ContentStatus = "ACTIVE" | "INACTIVE";
export type MaterialType = "VIDEO" | "DOKUMEN" | "TAUTAN";
export type VideoStatus = "READY" | "PROCESSING" | "FAILED";
export type PlaybackStatus = "READY" | "EXPIRED" | "UNAVAILABLE" | "FORBIDDEN";

export interface ShipCategory {
  id: string;
  name: string;
  description?: string;
  status: ContentStatus;
  createdAt: string;
}

export interface Course {
  id: string;
  categoryId: string;
  title: string;
  description?: string;
  status: ContentStatus;
  createdAt: string;
}

export interface Chapter {
  id: string;
  courseId: string;
  title: string;
  order: number;
  status: ContentStatus;
}

export interface LearningMaterial {
  id: string;
  chapterId: string;
  title: string;
  type: MaterialType;
  description?: string;
  thumbnailUrl?: string;
  videoId?: string;
  status: ContentStatus;
  isLocked: boolean;
  isCompleted: boolean;
  createdAt: string;
}

export interface VideoMetadata {
  id: string;
  title: string;
  description?: string;
  durationSeconds?: number;
  thumbnailUrl?: string;
  status: VideoStatus;
  createdAt: string;
}

export interface PlaybackAuthorization {
  playbackUrl: string;
  token?: string;
  expiresAt: string;
  status: PlaybackStatus;
}

export interface CategoryQuery {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: ContentStatus | "";
}

export interface CourseQuery extends CategoryQuery {
  categoryId?: string;
}

export interface CategoryPayload {
  name: string;
  description?: string;
  status: ContentStatus;
}

export interface CoursePayload {
  categoryId: string;
  title: string;
  description?: string;
  status: ContentStatus;
}

export interface ChapterPayload {
  title: string;
  order: number;
  status: ContentStatus;
}

export interface MaterialPayload {
  title: string;
  type: MaterialType;
  description?: string;
  videoId?: string;
  status: ContentStatus;
}

export interface VideoPayload {
  title: string;
  description?: string;
}

export type CategoryListResult = ApiSuccess<ShipCategory[]>;
export type CategoryDetailResult = ApiSuccess<ShipCategory>;
export type CourseListResult = ApiSuccess<Course[]>;
export type CourseDetailResult = ApiSuccess<Course>;
export type ChapterListResult = ApiSuccess<Chapter[]>;
export type MaterialListResult = ApiSuccess<LearningMaterial[]>;
export type MaterialDetailResult = ApiSuccess<LearningMaterial>;
export type VideoDetailResult = ApiSuccess<VideoMetadata>;
export type PlaybackResult = ApiSuccess<PlaybackAuthorization>;

// TODO: tipe di atas mengikuti usulan docs/api-specification.md dan belum final.
// Jangan menambah endpoint, payload, respons, role, status, atau error code baru
// sebelum review dan persetujuan bersama backend. Status selesai, progres, unlock,
// dan akses materi selalu dari backend.
