import { apiRequest } from "../../services/apiClient.ts";
import type {
  AccountStatus,
  AddEnrollmentPayload,
  CohortDetailResult,
  CohortListResult,
  CohortPayload,
  CohortQuery,
  EnrollmentListResult,
  MyEnrollmentListResult,
  UserDetailResult,
  UserImportResult,
  UserImportSummary,
  UserListResult,
  UserQuery,
} from "./accountTypes.ts";
import type { ApiSuccess } from "../../types/api.ts";
import type { UserRole } from "../../types/api.ts";

// TODO: endpoint di bawah mengikuti usulan docs/api-specification.md dan kontraknya
// belum final. Implementasi ini hanya typed service dan belum boleh dianggap kontrak final
// sebelum review bersama backend.

function toQuery(params: Record<string, string | number | undefined>): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === "") continue;
    query.set(key, String(value));
  }
  const text = query.toString();
  return text ? `?${text}` : "";
}

export function listUsers(query: UserQuery, accessToken: string): Promise<UserListResult> {
  return apiRequest<UserListResult>(`/admin/users${toQuery(query as Record<string, string | number | undefined>)}`, {
    accessToken,
  });
}

export function getUser(userId: string, accessToken: string): Promise<UserDetailResult> {
  return apiRequest<UserDetailResult>(`/admin/users/${userId}`, { accessToken });
}

export function updateUserStatus(
  userId: string,
  status: AccountStatus,
  accessToken: string,
): Promise<UserDetailResult> {
  return apiRequest<UserDetailResult>(`/admin/users/${userId}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
    accessToken,
  });
}

export function updateUserRole(
  userId: string,
  role: UserRole,
  accessToken: string,
): Promise<UserDetailResult> {
  return apiRequest<UserDetailResult>(`/admin/users/${userId}/role`, {
    method: "PATCH",
    body: JSON.stringify({ role }),
    accessToken,
  });
}

export function verifyTaruna(userId: string, accessToken: string): Promise<UserDetailResult> {
  return apiRequest<UserDetailResult>(`/admin/users/${userId}/verify`, {
    method: "POST",
    accessToken,
  });
}

export function importUsers(file: File, accessToken: string): Promise<UserImportResult> {
  const body = new FormData();
  body.append("file", file);
  return apiRequest<UserImportResult>("/admin/users/import", {
    method: "POST",
    body,
    accessToken,
  });
}

export function getImportStatus(importId: string, accessToken: string): Promise<UserImportResult> {
  return apiRequest<UserImportResult>(`/admin/users/imports/${importId}`, { accessToken });
}

export function downloadImportLogUrl(importSummary: UserImportSummary): string {
  if (importSummary.logDownloadUrl) return importSummary.logDownloadUrl;
  // TODO: URL unduhan final menunggu kontrak backend. Jangan mengarang endpoint publik permanen.
  return `/api/v1/admin/users/imports/${importSummary.importId}/log`;
}

export function downloadImportTemplateUrl(): string {
  // TODO: URL template final menunggu kontrak backend dan kolom final Fase 1.
  return "/api/v1/admin/users/imports/template";
}

export function listCohorts(query: CohortQuery, accessToken: string): Promise<CohortListResult> {
  return apiRequest<CohortListResult>(`/cohorts${toQuery(query as Record<string, string | number | undefined>)}`, {
    accessToken,
  });
}

export function getCohort(cohortId: string, accessToken: string): Promise<CohortDetailResult> {
  return apiRequest<CohortDetailResult>(`/cohorts/${cohortId}`, { accessToken });
}

export function createCohort(payload: CohortPayload, accessToken: string): Promise<CohortDetailResult> {
  return apiRequest<CohortDetailResult>("/cohorts", {
    method: "POST",
    body: JSON.stringify(payload),
    accessToken,
  });
}

export function updateCohort(
  cohortId: string,
  payload: CohortPayload,
  accessToken: string,
): Promise<CohortDetailResult> {
  return apiRequest<CohortDetailResult>(`/cohorts/${cohortId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
    accessToken,
  });
}

export function deleteCohort(cohortId: string, accessToken: string): Promise<void> {
  return apiRequest<void>(`/cohorts/${cohortId}`, { method: "DELETE", accessToken });
}

export function listEnrollments(
  cohortId: string,
  accessToken: string,
): Promise<EnrollmentListResult> {
  return apiRequest<EnrollmentListResult>(`/cohorts/${cohortId}/enrollments`, { accessToken });
}

export function addEnrollment(
  cohortId: string,
  payload: AddEnrollmentPayload,
  accessToken: string,
): Promise<ApiSuccess<unknown>> {
  return apiRequest<ApiSuccess<unknown>>(`/cohorts/${cohortId}/enrollments`, {
    method: "POST",
    body: JSON.stringify(payload),
    accessToken,
  });
}

export function removeEnrollment(
  cohortId: string,
  enrollmentId: string,
  accessToken: string,
): Promise<void> {
  return apiRequest<void>(`/cohorts/${cohortId}/enrollments/${enrollmentId}`, {
    method: "DELETE",
    accessToken,
  });
}

export function listMyEnrollments(accessToken: string): Promise<MyEnrollmentListResult> {
  return apiRequest<MyEnrollmentListResult>("/me/enrollments", { accessToken });
}
