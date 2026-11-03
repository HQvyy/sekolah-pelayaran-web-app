import type { ApiSuccess } from "../../types/api.ts";

export type ContentStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";
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

export interface LearningMaterialVideo {
  id: string;
  title: string;
  status: string;
  durationSeconds?: number | null;
}

export interface LearningMaterial {
  id: string;
  chapterId: string;
  title: string;
  description?: string;
  status: ContentStatus;
  sortOrder?: number;
  thumbnailPath?: string | null;
  createdAt: string;
  videos?: LearningMaterialVideo[];
  // Field turunan tampilan (bukan dari backend langsung).
  type?: MaterialType;
  videoId?: string;
  isLocked?: boolean;
  isCompleted?: boolean;
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
  cohortId?: string;
  title: string;
  description?: string;
  status: ContentStatus;
}

export interface CourseCreatePayload {
  categoryId: string;
  cohortId: string;
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
  description?: string;
  status: ContentStatus;
  sortOrder?: number;
  // Hanya untuk form FE (type/videoId dikelola via endpoint videos terpisah).
  type?: MaterialType;
  videoId?: string;
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
