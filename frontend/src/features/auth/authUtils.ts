export const OTP_LENGTH = 6;
export const OTP_VALIDITY_SECONDS = 5 * 60;
export const RESEND_COOLDOWN_SECONDS = 60;
export const PASSWORD_MIN_LENGTH = 8;

export function normalizeOtp(value: string): string {
  return value.replace(/\D/g, "").slice(0, OTP_LENGTH);
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export function isValidPassword(password: string): boolean {
  return password.length >= PASSWORD_MIN_LENGTH && /[A-Za-z]/.test(password) && /\d/.test(password);
}

export function passwordError(password: string): string {
  if (!password) return "Password wajib diisi.";
  if (password.length < PASSWORD_MIN_LENGTH) {
    return `Password minimal ${PASSWORD_MIN_LENGTH} karakter.`;
  }
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
    return "Password harus mengandung huruf dan angka.";
  }
  return "";
}

export function formatCountdown(totalSeconds: number): string {
  const clamped = Math.max(0, totalSeconds);
  const minutes = Math.floor(clamped / 60);
  const seconds = clamped % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function otpExpirySeconds(expiresAt: string, now = Date.now()): number {
  const target = new Date(expiresAt).getTime();
  if (Number.isNaN(target)) return OTP_VALIDITY_SECONDS;
  return Math.max(0, Math.round((target - now) / 1000));
}

export function isLockedOutError(code?: string): boolean {
  return code === "ACCOUNT_LOCKED" || code === "TOO_MANY_ATTEMPTS";
}

export function otpErrorMessage(code?: string, fallback?: string): string {
  if (code === "OTP_EXPIRED") return "Kode OTP kedaluwarsa. Minta kode baru lalu coba lagi.";
  if (code === "OTP_INVALID") return "Kode OTP salah. Periksa kembali 6 digit yang dikirim ke email.";
  if (code === "OTP_ATTEMPT_LIMIT") {
    return "Batas percobaan OTP tercapai. Minta kode baru setelah cooldown selesai.";
  }
  if (code === "ACCOUNT_LOCKED" || code === "TOO_MANY_ATTEMPTS") {
    return "Akun dikunci sementara selama 15 menit karena terlalu banyak percobaan gagal.";
  }
  if (code === "RESEND_THROTTLED" || code === "RATE_LIMITED") {
    return "Terlalu sering meminta kode. Tunggu cooldown selesai lalu coba lagi.";
  }
  if (fallback && fallback.trim()) return fallback;
  return "Verifikasi gagal. Periksa kode OTP lalu coba lagi.";
}
