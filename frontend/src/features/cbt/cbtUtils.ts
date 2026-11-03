import type { AttemptStatus, AutosaveState } from "./cbtTypes.ts";

export const AUTOSAVE_INTERVAL_MS = 30_000;

export function remainingSeconds(serverNow: string, expiresAt: string): number {
  const now = new Date(serverNow).getTime();
  const end = new Date(expiresAt).getTime();
  if (Number.isNaN(now) || Number.isNaN(end)) return 0;
  return Math.max(0, Math.floor((end - now) / 1000));
}

export function formatDuration(totalSeconds: number): string {
  const clamped = Math.max(0, totalSeconds);
  const hours = Math.floor(clamped / 3600);
  const minutes = Math.floor((clamped % 3600) / 60);
  const seconds = clamped % 60;
  const pad = (value: number) => String(value).padStart(2, "0");
  if (hours > 0) return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  return `${pad(minutes)}:${pad(seconds)}`;
}

export function attemptStatusLabel(status: AttemptStatus): string {
  if (status === "IN_PROGRESS") return "Berlangsung";
  if (status === "SUBMITTED") return "Terkirim";
  if (status === "AUTO_GRADED") return "Dinilai otomatis";
  if (status === "WAITING_MANUAL_GRADING") return "Menunggu penilaian esai";
  if (status === "GRADED") return "Selesai dinilai";
  return "Kedaluwarsa";
}

export function autosaveLabel(state: AutosaveState): string {
  if (state === "SAVING") return "Menyimpan...";
  if (state === "ERROR") return "Gagal tersimpan, akan dicoba lagi";
  return "Tersimpan";
}

export function isAttemptActive(status: AttemptStatus): boolean {
  return status === "IN_PROGRESS";
}

export function shouldBlockEditing(status: AttemptStatus, expired: boolean): boolean {
  if (expired) return true;
  return !isAttemptActive(status);
}
