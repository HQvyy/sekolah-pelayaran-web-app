// Aturan CBT (PRD §4.4 + pengesahan: passing grade dkk. adalah KONFIGURASI
// sementara via env — bukan hardcode final — menunggu konfirmasi klien).
// SLA penilaian esai 7 hari kalender (final PRD).
export const CBT_RULES = {
  MIN_LEVEL: 1,
  MAX_LEVEL: 5,
  MIN_DURATION_MINUTES: 1,
  MAX_DURATION_MINUTES: 24 * 60,
  ESSAY_SLA_DAYS: 7,
  IMPORT_MAX_ROWS: 500,
  // Umur maksimum submitResult sebelum dibersihkan scheduler (hari). Nilai
  // default hanya dokumentasi; operasional dibaca dari env
  // SUBMIT_RESULT_RETENTION_DAYS (lihat config/configuration.ts). Batas bawah
  // dijaga 1 hari agar salah konfigurasi tidak menghapus hasil yang masih
  // mungkin di-replay.
  SUBMIT_RESULT_RETENTION_DAYS_MIN: 1,
  IMPORT_MAX_FILE_BYTES: 5 * 1024 * 1024,
  IMPORT_MINE_TYPES: [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ] as string[],
  BANK_TEMPLATE_COLUMNS: [
    'level',
    'kategori_kapal',
    'tipe',
    'pertanyaan',
    'opsi_a',
    'opsi_b',
    'opsi_c',
    'opsi_d',
    'kunci_jawaban',
    'bobot',
  ] as const,
} as const;

export const CBT_AUDIT_ACTIONS = {
  ASSESSMENT_CREATED: 'assessment.created',
  ASSESSMENT_UPDATED: 'assessment.updated',
  QUESTIONS_IMPORTED: 'assessment.questions_imported',
  ATTEMPT_STARTED: 'attempt.started',
  ATTEMPT_SUBMITTED: 'attempt.submitted',
  ATTEMPT_EXPIRED: 'attempt.expired',
  ESSAY_GRADED: 'essay.graded',
  ESSAY_OVERDUE: 'essay.overdue',
  SUBMIT_RESULT_PURGED: 'attempt.submit_result_purged',
  PROGRESS_UPDATED: 'progress.updated',
} as const;
