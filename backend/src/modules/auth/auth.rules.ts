// Aturan auth/2FA/session/bearer dari PRD + keputusan terkunci.
// Satu sumber angka agar service, guard, dan test konsisten.
export const AUTH_RULES = {
  PASSWORD_MIN_LENGTH: 8,
  // 5 gagal login beruntun → kunci 15 menit.
  MAX_FAILED_LOGINS: 5,
  LOCK_MINUTES: 15,
  // OTP: 6 digit, 5 menit, ≤5 percobaan, resend ≥60 detik.
  OTP_LENGTH: 6,
  OTP_TTL_MINUTES: 5,
  OTP_MAX_ATTEMPTS: 5,
  OTP_RESEND_SECONDS: 60,
  // 3 gagal kirim email beruntun → kunci 15 menit + audit log.
  MAX_FAILED_EMAILS: 3,
  // Access ≤1 jam; refresh ≤30 hari, rotasi sekali pakai.
  ACCESS_TTL_SECONDS: 3600,
  REFRESH_TTL_DAYS: 30,
  // Maks 3 sesi aktif; ke-4 mencabut sesi terlama.
  MAX_SESSIONS: 3,
  // Reset password: sekali pakai, 1 jam.
  RESET_TTL_MINUTES: 60,
} as const;

// Rate limit auth (konfigurasi awal §6.1 butir 1 rencana; dapat diubah
// tanpa ganti kontrak). Nilai per-IP kecuali disebut lain.
export const AUTH_THROTTLE = {
  login: { limit: 10, ttlMs: 60_000 },
  otpVerify: { limit: 10, ttlMs: 60_000 },
  otpResend: { limit: 5, ttlMs: 3_600_000 },
  forgotPassword: { limit: 5, ttlMs: 3_600_000 },
  refresh: { limit: 30, ttlMs: 60_000 },
} as const;
