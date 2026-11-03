// Aturan Live Lesson (PRD §4.3 + pengesahan Tahap 5 2026-11-03).
// Timestamp tersimpan UTC; perhitungan H-1/24 jam memakai Instantiate Date
// (UTC) dan ditampilkan WIB (Asia/Jakarta) di frontend.
export const LESSON_RULES = {
  // Perubahan/pembatalan paling lambat H-1 (24 jam sebelum mulai).
  RESCHEDULE_MIN_HOURS: 24,
  // Absensi ditutup 24 jam setelah sesi berakhir.
  ATTENDANCE_CLOSE_HOURS: 24,
  // Jitsi: ruang gratis via meet.jit.si; embed iframe di aplikasi.
  JITSI_BASE_URL: 'https://meet.jit.si',
  // Jadwal dibuat Mentor pemilik kelas + Admin/Superadmin (keputusan Tahap 5).
  MANAGER_ROLES: ['SUPERADMIN', 'ADMIN', 'MENTOR'] as const,
} as const;

export const LESSON_AUDIT_ACTIONS = {
  LESSON_CREATED: 'lesson.created',
  LESSON_UPDATED: 'lesson.updated',
  LESSON_CANCELLED: 'lesson.cancelled',
  ATTENDANCE_RECORDED: 'attendance.recorded',
  ATTENDANCE_CORRECTED: 'attendance.corrected',
} as const;
