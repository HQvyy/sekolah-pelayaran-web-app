import { apiRequest } from "../../services/apiClient.ts";
import type {
  AuthForgotPasswordPayload,
  AuthLoginPayload,
  AuthLoginResult,
  AuthMeResult,
  AuthRegisterPayload,
  AuthRegisterResult,
  AuthResendOtpPayload,
  AuthResendOtpResult,
  AuthResetPasswordPayload,
  AuthVerifyOtpPayload,
  AuthVerifyOtpResult,
} from "./authTypes.ts";

// TODO: endpoint di bawah mengikuti usulan docs/api-specification.md dan kontraknya
// belum final. Implementasi ini hanya typed service dan belum boleh dianggap kontrak final
// sebelum review bersama backend. Refresh token tetap via cookie HttpOnly milik browser,
// frontend tidak membaca atau menyimpan refresh token.

export function registerTaruna(payload: AuthRegisterPayload): Promise<AuthRegisterResult> {
  return apiRequest<AuthRegisterResult>("/auth/register", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function login(payload: AuthLoginPayload): Promise<AuthLoginResult> {
  return apiRequest<AuthLoginResult>("/auth/login", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function verifyOtp(payload: AuthVerifyOtpPayload): Promise<AuthVerifyOtpResult> {
  return apiRequest<AuthVerifyOtpResult>("/auth/2fa/verify", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function resendOtp(payload: AuthResendOtpPayload): Promise<AuthResendOtpResult> {
  return apiRequest<AuthResendOtpResult>("/auth/2fa/resend", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function refreshSession(): Promise<void> {
  return apiRequest<void>("/auth/refresh", { method: "POST" });
}

export function logout(accessToken?: string | null): Promise<void> {
  return apiRequest<void>("/auth/logout", { method: "POST", accessToken: accessToken ?? undefined });
}

export function forgotPassword(payload: AuthForgotPasswordPayload): Promise<void> {
  return apiRequest<void>("/auth/password/forgot", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function resetPassword(payload: AuthResetPasswordPayload): Promise<void> {
  return apiRequest<void>("/auth/password/reset", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function fetchMe(accessToken: string): Promise<AuthMeResult> {
  return apiRequest<AuthMeResult>("/auth/me", { accessToken });
}
