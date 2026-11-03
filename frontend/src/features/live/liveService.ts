import { apiRequest } from "../../services/apiClient.ts";
import type {
  AttendanceCorrectionPayload,
  AttendanceListResult,
  JoinLiveLessonResponse,
  LiveLessonDetailResult,
  LiveLessonListResult,
  LiveLessonPayload,
  LiveLessonQuery,
  MyLiveLessonListResult,
} from "./liveTypes.ts";
import type { ApiSuccess } from "../../types/api.ts";

// TODO: endpoint di bawah mengikuti usulan docs/api-specification.md dan kontraknya
// belum final. Ini hanya typed service dan belum boleh dianggap kontrak final sebelum
// review bersama backend. Frontend tidak menampilkan tautan konferensi mentah.

function toQuery(params: Record<string, string | number | undefined>): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === "") continue;
    query.set(key, String(value));
  }
  const text = query.toString();
  return text ? `?${text}` : "";
}

export function listLiveLessons(query: LiveLessonQuery, accessToken: string): Promise<LiveLessonListResult> {
  return apiRequest<LiveLessonListResult>(`/live-lessons${toQuery(query as Record<string, string | number | undefined>)}`, {
    accessToken,
  });
}

export function listMyLiveLessons(accessToken: string): Promise<MyLiveLessonListResult> {
  return apiRequest<MyLiveLessonListResult>("/me/live-lessons", { accessToken });
}

export function getLiveLesson(id: string, accessToken: string): Promise<LiveLessonDetailResult> {
  return apiRequest<LiveLessonDetailResult>(`/live-lessons/${id}`, { accessToken });
}

export function createLiveLesson(payload: LiveLessonPayload, accessToken: string): Promise<LiveLessonDetailResult> {
  return apiRequest<LiveLessonDetailResult>("/live-lessons", {
    method: "POST",
    body: JSON.stringify(payload),
    accessToken,
  });
}

export function updateLiveLesson(id: string, payload: LiveLessonPayload, accessToken: string): Promise<LiveLessonDetailResult> {
  return apiRequest<LiveLessonDetailResult>(`/live-lessons/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
    accessToken,
  });
}

export function cancelLiveLesson(id: string, accessToken: string): Promise<LiveLessonDetailResult> {
  return apiRequest<LiveLessonDetailResult>(`/live-lessons/${id}/cancel`, {
    method: "POST",
    accessToken,
  });
}

export function joinLiveLesson(id: string, accessToken: string): Promise<JoinLiveLessonResponse> {
  return apiRequest<JoinLiveLessonResponse>(`/live-lessons/${id}/join`, {
    method: "POST",
    accessToken,
  });
}

export function getAttendance(liveLessonId: string, accessToken: string): Promise<AttendanceListResult> {
  return apiRequest<AttendanceListResult>(`/live-lessons/${liveLessonId}/attendance`, { accessToken });
}

export function correctAttendance(
  liveLessonId: string,
  participantId: string,
  payload: AttendanceCorrectionPayload,
  accessToken: string,
): Promise<ApiSuccess<unknown>> {
  return apiRequest<ApiSuccess<unknown>>(`/live-lessons/${liveLessonId}/attendance/${participantId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
    accessToken,
  });
}

export function attendanceExportUrl(liveLessonId: string): string {
  // TODO: URL ekspor final menunggu kontrak backend. Jangan memakai URL publik permanen.
  return `/api/v1/live-lessons/${liveLessonId}/attendance/export`;
}
