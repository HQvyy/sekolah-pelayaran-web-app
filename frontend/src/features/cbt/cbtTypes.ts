import type { ApiSuccess } from "../../types/api.ts";

export type AssessmentLevel = 1 | 2 | 3 | 4 | 5;
export type AttemptStatus =
  | "IN_PROGRESS"
  | "SUBMITTED"
  | "AUTO_GRADED"
  | "WAITING_MANUAL_GRADING"
  | "GRADED"
  | "EXPIRED";
export type QuestionType = "MULTIPLE_CHOICE" | "ESSAY";
export type AutosaveState = "SAVED" | "SAVING" | "ERROR";

export interface Assessment {
  id: string;
  title: string;
  description?: string;
  level: AssessmentLevel;
  durationMinutes: number;
  status: string;
  createdAt: string;
}

export interface AssessmentQuery {
  page?: number;
  pageSize?: number;
  search?: string;
  level?: string;
}

export interface ChoiceOption {
  id: string;
  label: string;
}

export interface AttemptQuestion {
  id: string;
  type: QuestionType;
  prompt: string;
  options?: ChoiceOption[];
  savedAnswer?: string | string[];
}

export interface Attempt {
  attemptId: string;
  assessmentId: string;
  status: AttemptStatus;
  serverNow: string;
  startedAt: string;
  expiresAt: string;
  questions: AttemptQuestion[];
}

export interface AttemptResult {
  attemptId: string;
  assessmentId: string;
  status: AttemptStatus;
  score?: number;
  isPassed?: boolean;
  essayStatus?: "PENDING" | "GRADED" | "OVERDUE";
  message?: string;
}

export interface EssayQueueItem {
  answerId: string;
  attemptId: string;
  questionId: string;
  participantName: string;
  answerText: string;
  submittedAt: string;
  dueAt?: string;
  isOverdue?: boolean;
}

export interface EssayGradePayload {
  score: number;
  feedback?: string;
}

export interface SaveAnswerPayload {
  answer: string | string[];
}

export type AssessmentListResult = ApiSuccess<Assessment[]>;
export type AssessmentDetailResult = ApiSuccess<Assessment>;
export type AttemptResultResponse = ApiSuccess<Attempt>;
export type AttemptResultDetail = ApiSuccess<AttemptResult>;
export type EssayQueueResult = ApiSuccess<EssayQueueItem[]>;

// TODO: tipe di atas mengikuti usulan docs/api-specification.md dan belum final.
// Kunci jawaban tidak pernah ada di payload Taruna. Kelulusan, nilai akhir, kesempatan
// tersisa, remedial, unlock, timer resmi, dan progres selalu dari backend. Jangan menambah
// endpoint, payload, respons, role, status, atau error code baru sebelum review backend.
