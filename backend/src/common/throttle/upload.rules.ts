// Batas impor/unggahan (docs/backend-implementation-plan.md §6.1 butir 1):
// 10 permintaan per jam PER PENGGUNA (bukan per IP). Dikunci sebagai kontrak
// kerja — ubah hanya dengan persetujuan.
//
// Batas ini berlaku untuk endpoint yang mem-parses berkas dari pengguna:
// impor Taruna .xlsx, impor bank soal .xlsx, dan unggah thumbnail. Karena
// `req.user` baru tersedia setelah JwtAuthGuard, batas per-pengguna tidak bisa
// dihitung oleh ThrottlerGuard global (yang jalan lebih dulu); guard khusus
// pada route menanganinya (lihat upload-throttle.guard.ts).
export const UPLOAD_THROTTLE_RULES = {
  LIMIT: 10,
  TTL_MS: 3_600_000,
} as const;
