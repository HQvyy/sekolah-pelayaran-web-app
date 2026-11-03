// Kontrak pengiriman email. Implementasi real disuntik belakangan via
// EMAIL_PROVIDER (diputuskan: provider bisa nanti). FakeEmailProvider hanya
// untuk dev/test — jangan pernah dipakai di jalur production.
export interface SendOtpParams {
  to: string;
  code: string;
  expiresAt: Date;
}

export interface SendPasswordResetParams {
  to: string;
  resetUrl: string;
  expiresAt: Date;
}

export interface SendScheduleChangeParams {
  to: string;
  title: string;
  detail: string;
}

export interface EmailService {
  readonly providerName: string;
  sendOtp(params: SendOtpParams): Promise<void>;
  sendPasswordReset(params: SendPasswordResetParams): Promise<void>;
  sendScheduleChange(params: SendScheduleChangeParams): Promise<void>;
}
