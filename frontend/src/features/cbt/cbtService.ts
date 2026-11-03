import { apiRequest } from "../../services/apiClient.ts";
import type {
  AssessmentDetailResult,
  AssessmentListResult,
  AssessmentQuery,
  AttemptResultDetail,
  AttemptResultResponse,
  EssayGradePayload,
  EssayQueueResult,
  SaveAnswerPayload,
} from "./cbtTypes.ts";
import type { ApiSuccess } from "../../types/api.ts";

// TODO: endpoint di bawah mengikuti usulan docs/api-specification.md dan kontraknya
// belum final. Ini hanya typed service. Autosave memakai Idempotency-Key per jawaban agar
// retry tidak membuat data ganda bila endpoint backend mendukungnya.

function toQuery(params: Record<string, string | number | undefined>): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === "") continue;
    query.set(key, String(value));
  }
  const text = query.toString();
  return text ? `?${text}` : "";
}

export function newIdempotencyKey(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `cbt-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function listAssessments(query: AssessmentQuery, accessToken: string): Promise<AssessmentListResult> {
  return apiRequest<AssessmentListResult>(`/assessments${toQuery(query as Record<string, string | number | undefined>)}`, {
    accessToken,
  });
}

export function getAssessment(id: string, accessToken: string): Promise<AssessmentDetailResult> {
  return apiRequest<AssessmentDetailResult>(`/assessments/${id}`, { accessToken });
}

export function startAttempt(assessmentId: string, accessToken: string): Promise<AttemptResultResponse> {
  return apiRequest<AttemptResultResponse>(`/assessments/${assessmentId}/attempts`, {
    method: "POST",
    accessToken,
    idempotencyKey: newIdempotencyKey(),
  });
}

export function resumeAttempt(attemptId: string, accessToken: string): Promise<AttemptResultResponse> {
  return apiRequest<AttemptResultResponse>(`/attempts/${attemptId}`, { accessToken });
}

export function saveAnswer(
  attemptId: string,
  questionId: string,
  payload: SaveAnswerPayload,
  accessToken: string,
  idempotencyKey: string,
): Promise<ApiSuccess<unknown>> {
  assertNoAnswerKey(payload);
  return apiRequest<ApiSuccess<unknown>>(`/attempts/${attemptId}/answers/${questionId}`, {
    method: "PUT",
    body: JSON.stringify(payload),
    accessToken,
    idempotencyKey,
  });
}

export function submitAttempt(attemptId: string, accessToken: string): Promise<ApiSuccess<unknown>> {
  return apiRequest<ApiSuccess<unknown>>(`/attempts/${attemptId}/submit`, {
    method: "POST",
    accessToken,
    idempotencyKey: `submit-${attemptId}`,
  });
}

export function getAttemptResult(attemptId: string, accessToken: string): Promise<AttemptResultDetail> {
  return apiRequest<AttemptResultDetail>(`/attempts/${attemptId}/result`, { accessToken });
}

export function listEssayQueue(accessToken: string): Promise<EssayQueueResult> {
  return apiRequest<EssayQueueResult>("/mentor/essay-grading", { accessToken });
}

export function gradeEssay(
  attemptId: string,
  answerId: string,
  payload: EssayGradePayload,
  accessToken: string,
): Promise<ApiSuccess<unknown>> {
  return apiRequest<ApiSuccess<unknown>>(`/attempts/${attemptId}/answers/${answerId}/grade`, {
    method: "POST",
    body: JSON.stringify(payload),
    accessToken,
    idempotencyKey: `grade-${attemptId}-${answerId}`,
  });
}

export function listOverdueGrading(accessToken: string): Promise<EssayQueueResult> {
  return apiRequest<EssayQueueResult>("/admin/assessments/overdue-grading", { accessToken });
}

const FORBIDDEN_ANSWER_KEYS = ["answerKey", "correctAnswer", "correctOption", "key", "solution"];

export function assertNoAnswerKey(payload: unknown): void {
  if (!payload || typeof payload !== "object") return;
  const record = payload as Record<string, unknown>;
  for (const key of FORBIDDEN_ANSWER_KEYS) {
    if (key in record) {
      throw new Error("Payload jawaban tidak boleh mengandung kunci jawaban.");
    }
  }
}
