# QA Backend — E-Learning Sekolah Pelaut Indonesia (Tahap 8)

- **Tanggal:** 2026-11-03
- **Branch:** `be` (working tree bersih saat audit; commit QA menyusul)
- **Scope:** Tahap 1–7 + 3 endpoint pelengkap kontrak. Tanpa fitur baru.
- **Keputusan.params:** semua pengujian memakai PostgreSQL 18 lokal
  (`spli_dev`/`spli_test`), Node 24, Prisma 6.19.3.

## 1. Ringkasan endpoint selesai vs belum

Selesai (±120 baris route, 79 path Swagger): health/ready, auth penuh
(register, login→OTP, verify, resend, refresh rotasi, logout, forgot/reset,
me, force logout), users (daftar, detail, buat non-Taruna, verifikasi,
status, role, impor .xlsx + template + log eror, sesi), cohorts/enrollments
+ `me/enrollments`, konten penuh (kategori/kursus/bab/materi/video +
thumbnail + playback token), live lesson (jadwal, H-1, join, absensi,
koreksi, ekspor, notifikasi in-app), CBT penuh (assessment, bank soal +
impor, attempt, autosave, submit idempotent, grading esai, antrean, overdue,
progres), rating, sertifikat PDF, tiket + riwayat, audit-logs, user progress,
category detail.

Belum / disengaja tidak dibangun:
| Item | Status |
|---|---|
| `GET /certificates/verify/{n}` (verifikasi publik/QR) | Di luar MVP — tidak dibangun (keputusan) |
| `GET .../imports/{id}` (status impor terpisah) | Respons POST sudah memuat semua; deviasi terdokumentasi |
| CRUD `/videos` terpisah | Video di bawah materi (desain); deviasi terdokumentasi |
| `PATCH /admin/users/{id}` umum | Diganti `/status` + `/role` (lebih aman); deviasi terdokumentasi |
| `POST /materials/:id/complete` | Menunggu keputusan unlock materi; Opsi A tidak butuh |
| Scheduler penutup absensi otomatis | Penegakan saat akses (koreksi ditolak >24 jam); job menyusul bila perlu |

## 2. Hasil test (PASS semua)

- `typecheck` (tsc --noEmit): PASS
- `lint` (eslint): PASS
- Unit (`npm test`): 3 suite, 11 test — PASS (envelope, env incl. JWT_SECRET,
  prisma ping)
- E2E (`npm run test:e2e`, DB test nyata): 9 suite, **54 test — PASS**
  (fondasi 4, auth 18, users/cohorts 9, konten 5, live lesson 6, CBT 6,
  services 4, QA pelengkap 2)
- `build` (nest build): PASS
- `prisma validate` + `migrate status`: PASS, dev+test sinkron (8 migrasi)
- Smoke production-mode (`NODE_ENV=production`, build nyata):
  - Tanpa DATABASE_URL → gagal start dengan pesan validasi jelas: PASS
  - Dengan DB → `/health` ok, `/ready` ready/up, `/docs-json` 79 path,
    endpoint auth tanpa token 401: PASS

## 3. Masalah keamanan tersisa (tidak ada kritis terbuka)

1. Kunci jawaban PG tersimpan di DB (`isCorrect`) — aman karena tidak pernah
   dikirim ke Taruna (hanya endpoint pengelola); disarankan audit berkala.
2. `submitResult` JSON tumbuh per attempt — pertimbangkan TTL/pembersihan.
3. Log eror impor + error log bank soal di memori (hilang saat restart) —
   batasan didokumentasikan; blob storage menunggu keputusan infra.
4. File thumbnail = path internal; object storage produksi belum diputuskan.
5. Isi teks PDF sertifikat perlu cek visual UAT (ekstraksi otomatis tak layak).
6. Rate limit dilonggarkan di `NODE_ENV=test` — produksi tetap aktif; belum
   ada test beban/CI.
7. Penutupan absensi = penegakan saat akses; job scheduler menyusul bila perlu.

## 4. Blocker integrasi frontend (untuk Khenzo/FE)

1. Envelope FINAL: sukses `{ data, meta }`, error `{ error: {...} }` +
   `X-Request-Id` — FE menyesuaikan.
2. Login → `{ status: "OTP_REQUIRED", challengeId, expiresAt }`, tanpa token
   sebelum OTP valid. Refresh via cookie `spli_refresh` (HttpOnly).
3. Kategori awal (Bulk Carrier dkk.) diisi via endpoint, bukan bawaan.
4. Thumbnail/bank soal template diunduh via endpoint template masing-masing.
5. Aturan lulus CBT (70/3/24 jam) = konfigurasi sementara — jangan hardcode
   di FE; baca dari hasil/progres backend.
6. Sertifikat terbit bila 5 level PASSED (Opsi A); FE tidak menentukan sendiri.
7. Verifikasi publik/QR tidak ada — jangan buat UI-nya.
8. Target performa belum diukur — bukan SLA.

## 5. Pernyataan yang TIDAK diklaim

Performa (p95 <500 ms), pengiriman email nyata, pemeriksaan malware, backup
teruji, dan kepatuhan penuh — semuanya BELUM diukur/diuji dan tidak diklaim.
