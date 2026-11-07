// Batas impor .xlsx Taruna (keputusan dikunci — jangan diubah tanpa persetujuan).
// Strategi: BERHASIL SEBAGIAN — baris valid masuk, baris gagal dilaporkan
// tanpa menggagalkan seluruh impor (bukan atomik penuh). Tiap baris valid
// ditulis dalam transaksinya sendiri agar satu baris gagal tidak me-rollback
// baris lain. Lihat docs/backend-implementation-plan.md §6.1 butir 1 & 9.
export const IMPORT_RULES = {
  MAX_ROWS: 500,
  MAX_FILE_BYTES: 5 * 1024 * 1024,
  MINE_TYPES: [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ] as string[],
  // Template kolom v1 (FINAL sebagai kontrak kerja — disahkan 2026-11-02).
  TEMPLATE_COLUMNS: [
    'nama_lengkap',
    'email',
    'nomor_identitas',
    'cohort_kode',
    'telepon',
    'tanggal_lahir',
  ] as const,
} as const;

// Aksi audit Tahap 3.
export const USER_AUDIT_ACTIONS = {
  USER_VERIFIED: 'user.verified',
  USER_STATUS_CHANGED: 'user.status_changed',
  USER_ROLE_CHANGED: 'user.role_changed',
  // Penghapusan permanen (hard delete) oleh Superadmin — PRD §9.
  USER_DELETED_PERMANENTLY: 'user.deleted_permanently',
  USER_CREATED_BY_ADMIN: 'user.created_by_admin',
  TARUNA_IMPORTED: 'user.taruna_imported',
  COHORT_CREATED: 'cohort.created',
  COHORT_UPDATED: 'cohort.updated',
  COHORT_DEACTIVATED: 'cohort.deactivated',
  ENROLLMENT_CREATED: 'enrollment.created',
  ENROLLMENT_DEACTIVATED: 'enrollment.deactivated',
} as const;
