import type {
  ApiSuccess,
  SessionUser,
  UserRole,
} from "../../types/api.ts";

export type AuthChallengeStatus = "OTP_REQUIRED";

export interface AuthRegisterPayload {
  email: string;
  password: string;
  consent: boolean;
}

export interface AuthLoginPayload {
  email: string;
  password: string;
}

export interface AuthLoginResponse {
  status: AuthChallengeStatus;
  challengeId: string;
  expiresAt: string;
}

export interface AuthVerifyOtpPayload {
  challengeId: string;
  code: string;
}

export interface AuthVerifyOtpResponse {
  accessToken: string;
  user: Pick<SessionUser, "id" | "email" | "role"> & { status: string };
}

export interface AuthResendOtpPayload {
  challengeId: string;
}

export interface AuthResendOtpResponse {
  challengeId: string;
  expiresAt: string;
  retryAfterSeconds: number;
}

export interface AuthForgotPasswordPayload {
  email: string;
}

export interface AuthResetPasswordPayload {
  token: string;
  newPassword: string;
}

// GET /auth/me mengembalikan objek user langsung di `data` (tanpa pembungkus
// `user`), sesuai kontrak backend dan e2e test.
export type AuthMeResponse = SessionUser & { status: string };

export interface AuthRoleResponse {
  role: UserRole;
}

export type AuthRegisterResult = ApiSuccess<Pick<SessionUser, "id" | "email">>;
export type AuthLoginResult = ApiSuccess<AuthLoginResponse>;
export type AuthVerifyOtpResult = ApiSuccess<AuthVerifyOtpResponse>;
export type AuthResendOtpResult = ApiSuccess<AuthResendOtpResponse>;
export type AuthMeResult = ApiSuccess<AuthMeResponse>;

// TODO: kontrak di atas mengikuti usulan docs/api-specification.md dan belum final.
// Jangan menambah endpoint, payload, respons, role, status, atau error code baru
// sebelum review dan persetujuan bersama backend.
