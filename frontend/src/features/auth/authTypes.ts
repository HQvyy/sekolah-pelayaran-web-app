import type {
  ApiSuccess,
  SessionUser,
  UserRole,
} from "../../types/api.ts";

export type AuthChallengeStatus = "OTP_REQUIRED";

export interface AuthRegisterPayload {
  name: string;
  email: string;
  password: string;
  dataProcessingConsent: boolean;
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

export interface AuthTokens {
  accessToken: string;
  tokenType: "Bearer";
  expiresIn: number;
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
  password: string;
}

export interface AuthMeResponse {
  user: SessionUser;
}

export interface AuthRoleResponse {
  role: UserRole;
}

export type AuthRegisterResult = ApiSuccess<Pick<SessionUser, "id" | "email">>;
export type AuthLoginResult = ApiSuccess<AuthLoginResponse>;
export type AuthVerifyOtpResult = ApiSuccess<AuthTokens>;
export type AuthResendOtpResult = ApiSuccess<AuthResendOtpResponse>;
export type AuthMeResult = ApiSuccess<AuthMeResponse>;

// TODO: kontrak di atas mengikuti usulan docs/api-specification.md dan belum final.
// Jangan menambah endpoint, payload, respons, role, status, atau error code baru
// sebelum review dan persetujuan bersama backend.
