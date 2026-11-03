import { apiRequest } from "../../services/apiClient.ts";
import type {
  CategoryDetailResult,
  CategoryListResult,
  CategoryPayload,
  CategoryQuery,
  ChapterListResult,
  ChapterPayload,
  CourseCreatePayload,
  CourseDetailResult,
  CourseListResult,
  CoursePayload,
  CourseQuery,
  MaterialDetailResult,
  MaterialListResult,
  MaterialPayload,
  PlaybackResult,
  VideoDetailResult,
  VideoPayload,
} from "./learningTypes.ts";
import type { ApiSuccess } from "../../types/api.ts";

// TODO: endpoint di bawah mengikuti usulan docs/api-specification.md dan kontraknya
// belum final. Ini hanya typed service dan belum boleh dianggap kontrak final sebelum
// review bersama backend. Frontend tidak memanggil Bunny Stream langsung dan tidak
// menyusun URL privat sendiri.

function toQuery(params: Record<string, string | number | undefined>): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === "") continue;
    query.set(key, String(value));
  }
  const text = query.toString();
  return text ? `?${text}` : "";
}

export function listCategories(query: CategoryQuery, accessToken: string): Promise<CategoryListResult> {
  return apiRequest<CategoryListResult>(`/ship-categories${toQuery(query as Record<string, string | number | undefined>)}`, {
    accessToken,
  });
}

export function getCategory(id: string, accessToken: string): Promise<CategoryDetailResult> {
  return apiRequest<CategoryDetailResult>(`/ship-categories/${id}`, { accessToken });
}

export function createCategory(payload: CategoryPayload, accessToken: string): Promise<CategoryDetailResult> {
  return apiRequest<CategoryDetailResult>("/ship-categories", {
    method: "POST",
    body: JSON.stringify(payload),
    accessToken,
  });
}

export function updateCategory(id: string, payload: CategoryPayload, accessToken: string): Promise<CategoryDetailResult> {
  return apiRequest<CategoryDetailResult>(`/ship-categories/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
    accessToken,
  });
}

export function deleteCategory(id: string, accessToken: string): Promise<void> {
  return apiRequest<void>(`/ship-categories/${id}`, { method: "DELETE", accessToken });
}

export function listCourses(query: CourseQuery, accessToken: string): Promise<CourseListResult> {
  return apiRequest<CourseListResult>(`/courses${toQuery(query as Record<string, string | number | undefined>)}`, {
    accessToken,
  });
}

export function getCourse(id: string, accessToken: string): Promise<CourseDetailResult> {
  return apiRequest<CourseDetailResult>(`/courses/${id}`, { accessToken });
}

export function createCourse(payload: CourseCreatePayload, accessToken: string): Promise<CourseDetailResult> {
  return apiRequest<CourseDetailResult>("/courses", {
    method: "POST",
    body: JSON.stringify(payload),
    accessToken,
  });
}

export function updateCourse(id: string, payload: CoursePayload, accessToken: string): Promise<CourseDetailResult> {
  return apiRequest<CourseDetailResult>(`/courses/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
    accessToken,
  });
}

export function deleteCourse(id: string, accessToken: string): Promise<void> {
  return apiRequest<void>(`/courses/${id}`, { method: "DELETE", accessToken });
}

export function listChapters(courseId: string, accessToken: string): Promise<ChapterListResult> {
  return apiRequest<ChapterListResult>(`/courses/${courseId}/chapters`, { accessToken });
}

export function createChapter(courseId: string, payload: ChapterPayload, accessToken: string): Promise<ApiSuccess<unknown>> {
  return apiRequest<ApiSuccess<unknown>>(`/courses/${courseId}/chapters`, {
    method: "POST",
    body: JSON.stringify(payload),
    accessToken,
  });
}

export function updateChapter(chapterId: string, payload: ChapterPayload, accessToken: string): Promise<ApiSuccess<unknown>> {
  return apiRequest<ApiSuccess<unknown>>(`/chapters/${chapterId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
    accessToken,
  });
}

export function deleteChapter(chapterId: string, accessToken: string): Promise<void> {
  return apiRequest<void>(`/chapters/${chapterId}`, { method: "DELETE", accessToken });
}

export function listMaterials(chapterId: string, accessToken: string): Promise<MaterialListResult> {
  return apiRequest<MaterialListResult>(`/chapters/${chapterId}/materials`, { accessToken });
}

export function createMaterial(chapterId: string, payload: MaterialPayload, accessToken: string): Promise<MaterialDetailResult> {
  return apiRequest<MaterialDetailResult>(`/chapters/${chapterId}/materials`, {
    method: "POST",
    body: JSON.stringify(payload),
    accessToken,
  });
}

export function getMaterial(materialId: string, accessToken: string): Promise<MaterialDetailResult> {
  return apiRequest<MaterialDetailResult>(`/materials/${materialId}`, { accessToken });
}

export function updateMaterial(materialId: string, payload: MaterialPayload, accessToken: string): Promise<MaterialDetailResult> {
  return apiRequest<MaterialDetailResult>(`/materials/${materialId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
    accessToken,
  });
}

export function deleteMaterial(materialId: string, accessToken: string): Promise<void> {
  return apiRequest<void>(`/materials/${materialId}`, { method: "DELETE", accessToken });
}

export function completeMaterial(materialId: string, accessToken: string): Promise<void> {
  return apiRequest<void>(`/materials/${materialId}/complete`, { method: "POST", accessToken });
}

export function createVideo(payload: VideoPayload, accessToken: string): Promise<VideoDetailResult> {
  return apiRequest<VideoDetailResult>("/videos", {
    method: "POST",
    body: JSON.stringify(payload),
    accessToken,
  });
}

export function getVideo(videoId: string, accessToken: string): Promise<VideoDetailResult> {
  return apiRequest<VideoDetailResult>(`/videos/${videoId}`, { accessToken });
}

export function updateVideo(videoId: string, payload: VideoPayload, accessToken: string): Promise<VideoDetailResult> {
  return apiRequest<VideoDetailResult>(`/videos/${videoId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
    accessToken,
  });
}

export function requestPlaybackToken(videoId: string, accessToken: string): Promise<PlaybackResult> {
  return apiRequest<PlaybackResult>(`/videos/${videoId}/playback-token`, {
    method: "POST",
    accessToken,
  });
}
