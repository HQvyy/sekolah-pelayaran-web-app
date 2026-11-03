import type { PlaybackAuthorization } from "./learningTypes.ts";

export function playbackMessage(status: PlaybackAuthorization["status"]): string {
  if (status === "EXPIRED") return "Token playback kedaluwarsa. Minta akses baru lalu coba lagi.";
  if (status === "UNAVAILABLE") return "Video belum tersedia. Coba lagi setelah konten diproses backend.";
  if (status === "FORBIDDEN") return "Akun ini tidak memiliki akses video. Otorisasi resmi ditentukan backend.";
  return "Video siap diputar.";
}

export function canPlay(status: PlaybackAuthorization["status"]): boolean {
  return status === "READY";
}
