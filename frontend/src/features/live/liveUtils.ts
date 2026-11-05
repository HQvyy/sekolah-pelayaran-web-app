import { formatWib } from "../../lib/config.ts";
import type { AttendanceStatus, LiveLesson, LiveLessonStatus } from "./liveTypes.ts";

export function formatLiveRange(startsAt: string, endsAt: string): string {
  return `${formatWib(startsAt)} - ${formatWib(endsAt)} WIB`;
}

export function liveStatusLabel(status: LiveLessonStatus): string {
  if (status === "SCHEDULED") return "Dijadwalkan";
  if (status === "ONGOING") return "Berlangsung";
  if (status === "FINISHED" || status === "COMPLETED") return "Selesai";
  if (status === "CANCELLED") return "Dibatalkan";
  return "Dijadwalkan ulang";
}

export function attendanceLabel(status: AttendanceStatus): string {
  if (status === "PRESENT") return "Hadir";
  if (status === "ABSENT") return "Tidak hadir";
  if (status === "EXCUSED") return "Izin";
  return "Menunggu";
}

export function canJoinLesson(lesson: LiveLesson): boolean {
  if (
    lesson.status === "CANCELLED" ||
    lesson.status === "FINISHED" ||
    lesson.status === "COMPLETED"
  ) {
    return false;
  }
  if (typeof lesson.isJoinable === "boolean") return lesson.isJoinable;
  // Backend tidak mengirim isJoinable: izinkan selama jadwal sedang berlangsung
  // (toleransi 15 menit sebelum mulai). Otorisasi akhir tetap di backend.
  const now = Date.now();
  const startsAt = new Date(lesson.startsAt).getTime();
  const endsAt = new Date(lesson.endsAt).getTime();
  if (Number.isNaN(startsAt) || Number.isNaN(endsAt)) return false;
  return now >= startsAt - 15 * 60_000 && now <= endsAt;
}

export function joinBlockedMessage(lesson: LiveLesson): string {
  if (lesson.status === "CANCELLED") return "Kelas dibatalkan dan tidak dapat diikuti.";
  if (lesson.status === "FINISHED" || lesson.status === "COMPLETED") {
    return "Kelas sudah selesai dan absensi ditutup sesuai aturan backend.";
  }
  if (lesson.status === "RESCHEDULED") return "Jadwal berubah. Periksa waktu terbaru sebelum masuk kelas.";
  if (!lesson.isJoinable) return "Kelas belum dapat diikuti. Tunggu waktu atau persetujuan backend.";
  return "";
}

export function toLocalInputValue(isoDate: string): string {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function fromLocalInputValue(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toISOString();
}

export function validateLessonTime(startsAt: string, endsAt: string): string {
  if (!startsAt || !endsAt) return "Waktu mulai dan selesai wajib diisi.";
  const start = new Date(startsAt).getTime();
  const end = new Date(endsAt).getTime();
  if (Number.isNaN(start) || Number.isNaN(end)) return "Format waktu tidak valid.";
  if (end <= start) return "Waktu selesai harus setelah waktu mulai.";
  return "";
}
