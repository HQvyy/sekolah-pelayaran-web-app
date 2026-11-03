import type { ApiSuccess, SessionUser, UserRole } from "../../types/api.ts";

export type AccountStatus = "PENDING_VERIFICATION" | "ACTIVE" | "SUSPENDED";
export type CohortStatus = "ACTIVE" | "INACTIVE";
export type EnrollmentStatus = "ACTIVE" | "INACTIVE";

export interface AdminUser extends SessionUser {
  status: AccountStatus;
  createdAt: string;
}

export interface UserQuery {
  page?: number;
  pageSize?: number;
  search?: string;
  role?: UserRole | "";
  status?: AccountStatus | "";
}

export interface UpdateUserPayload {
  status?: AccountStatus;
  role?: UserRole;
}

export interface UserImportSummary {
  importId: string;
  totalRows: number;
  successRows: number;
  failedRows: number;
  logDownloadUrl?: string;
}

export interface Cohort {
  id: string;
  code: string;
  name: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
}

export interface CohortQuery {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: CohortStatus | "";
}

export interface CohortPayload {
  code: string;
  name: string;
  description?: string;
  isActive?: boolean;
}

export interface EnrollmentUser {
  id: string;
  email: string;
  role: UserRole;
  status: AccountStatus;
}

export interface EnrollmentCohort {
  id: string;
  code: string;
  name: string;
}

export interface Enrollment {
  id: string;
  cohortId: string;
  userId: string;
  status: EnrollmentStatus;
  userName: string;
  userEmail: string;
  createdAt: string;
  user?: EnrollmentUser;
  cohort?: EnrollmentCohort;
}

export interface AddEnrollmentPayload {
  userId: string;
}

export type UserListResult = ApiSuccess<AdminUser[]>;
export type UserDetailResult = ApiSuccess<AdminUser>;
export type UserImportResult = ApiSuccess<UserImportSummary>;
export type CohortListResult = ApiSuccess<Cohort[]>;
export type CohortDetailResult = ApiSuccess<Cohort>;
export type EnrollmentListResult = ApiSuccess<Enrollment[]>;
export type MyEnrollmentListResult = ApiSuccess<Enrollment[]>;

// TODO: tipe di atas mengikuti usulan docs/api-specification.md dan belum final.
// Jangan menambah endpoint, payload, respons, role, status, atau error code baru
// sebelum review dan persetujuan bersama backend.
