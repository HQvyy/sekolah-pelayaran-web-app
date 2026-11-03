import type { ApiSuccess } from "../../types/api.ts";

export type LiveLessonStatus = "SCHEDULED" | "ONGOING" | "COMPLETED" | "CANCELLED" | "RESCHEDULED";
export type AttendanceStatus = "PRESENT" | "ABSENT" | "EXCUSED" | "PENDING";

export interface LiveLesson {
  id: string;
  title: string;
  description?: string;
  cohortId?: string;
  mentorId?: string;
  mentorName?: string;
  startsAt: string;
  endsAt: string;
  status: LiveLessonStatus;
  isJoinable: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface LiveLessonQuery {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: LiveLessonStatus | "";
  cohortId?: string;
  from?: string;
  to?: string;
}

export interface LiveLessonPayload {
  title: string;
  description?: string;
  cohortId?: string;
  startsAt: string;
  endsAt: string;
}

export interface JoinLiveLessonResult {
  status: "JOIN_ALLOWED" | "JOIN_DENIED";
  redirectUrl?: string;
  message?: string;
  attendanceRecorded?: boolean;
}

export interface AttendanceRecord {
  participantId: string;
  userId: string;
  userName: string;
  userEmail: string;
  status: AttendanceStatus;
  joinedAt?: string;
  updatedAt: string;
  correctionNote?: string;
}

export interface AttendanceCorrectionPayload {
  status: AttendanceStatus;
  note?: string;
}

export type LiveLessonListResult = ApiSuccess<LiveLesson[]>;
export type LiveLessonDetailResult = ApiSuccess<LiveLesson>;
export type JoinLiveLessonResponse = ApiSuccess<JoinLiveLessonResult>;
export type AttendanceListResult = ApiSuccess<AttendanceRecord[]>;
export type MyLiveLessonListResult = ApiSuccess<LiveLesson[]>;

// TODO: tipe di atas mengikuti usulan docs/api-specification.md dan belum final.
// Jangan menambah endpoint, payload, respons, role, status, atau error code baru
// sebelum review dan persetujuan bersama backend. Status kelas, absensi resmi,
// batas H-1, dan penutupan 24 jam selalu dari backend.
