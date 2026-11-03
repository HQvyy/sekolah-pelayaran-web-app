# SPLI Backend — E-Learning Sekolah Pelaut Indonesia

REST API backend (NestJS + TypeScript + PostgreSQL). Prefix API: `/api/v1`.
Swagger: `/docs` (dapat dimatikan via `SWAGGER_ENABLED=false`).

## Prasyarat

- Node.js 22+ (teruji di Node 24), npm 10+
- PostgreSQL 15+ (wajib di staging/production; opsional di dev/test — lihat Status DB)

## Setup lokal

```bash
cd backend
cp .env.example .env        # lalu isi DATABASE_URL dkk. per environment
npm install
npx prisma generate
npx prisma migrate dev      # butuh DATABASE_URL valid
npm run start:dev           # http://localhost:3000/api/v1/health
```

## Status DB tanpa koneksi

Bila `DATABASE_URL` kosong (dev/test tanpa DB), aplikasi tetap boot:

- `GET /api/v1/health` → `{ data: { status: "ok", ... }, meta: null }`
- `GET /api/v1/ready` → `{ data: { status: "degraded", database: "not-configured", ... } }`
- Bila `DATABASE_URL` terisi tetapi DB tidak terjangkau → `503 SERVICE_UNAVAILABLE`
  tanpa detail koneksi di respons.

## Migration (Prisma code-first — keputusan dikunci)

- Skema: `prisma/schema.prisma`. Setiap perubahan skema lewat file migrasi
  berversion yang direview: `npm run prisma:migrate`.
- Deploy: `npm run prisma:deploy` (tidak ada `migrate dev` di staging/production).
- Rollback: memakai snapshot backup terakhir yang terverifikasi.
- Dilarang mengubah skema manual langsung di production.

## Seed

Tidak ada seed otomatis. Seed development (bila kelak diperlukan) wajib berada di
file terpisah yang eksplisit dijalankan manual dan **tidak pernah** berjalan
otomatis di production. Jangan menambahkan data dummy ke production.

## Perintah

| Perintah | Kegunaan |
|---|---|
| `npm run start:dev` | Jalankan watch mode |
| `npm run build` / `npm run start:prod` | Build + jalankan hasil build |
| `npm run lint` / `npm run lint:fix` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Unit test (`test/jest.unit.json`) |
| `npm run test:e2e` | E2E test (`test/jest.e2e.json`, butuh DB bila menguji DB) |
| `npm run prisma:validate` | Validasi skema Prisma tanpa DB |

## Konvensi kode Tahap 1

- Respons sukses: `{ data, meta: null }` (objek) atau
  `{ data: [], meta: { page, pageSize, totalItems, totalPages } }` (daftar).
- Error: `{ error: { code, message, details[], requestId } }` + `X-Request-Id`.
- `pageSize` maks 100; `sortBy` hanya dari allowlist per endpoint.
- Timestamp API: ISO 8601 UTC; tampilan WIB (Asia/Jakarta) di frontend.
- Logging tanpa body/query (tanpa password, OTP, token, data pribadi).
- Format respons + matriks permission + bentuk respons auth berstatus
  **FINAL sebagai kontrak kerja backend** (disahkan pemilik repo 2026-11-02;
  lihat `docs/backend-implementation-plan.md`).

## Auth Tahap 2 (ringkas)

- Role: `SUPERADMIN`, `ADMIN`, `MENTOR`, `TARUNA`. Registrasi mandiri hanya
  Taruna (consent PDP wajib); akun baru `PENDING_VERIFICATION`.
- Password: min 8 karakter + huruf + angka; hash argon2id. 5 gagal login
  beruntun → kunci 15 menit.
- Login benar → `{ data: { status: "OTP_REQUIRED", challengeId, expiresAt } }`.
  Access token (Bearer, ≤1 jam) hanya terbit setelah OTP valid.
- OTP: 6 digit, 5 menit, ≤5 percobaan, resend ≥60 detik. 3 gagal kirim email
  beruntun → kunci 15 menit + audit log.
- Refresh: cookie `spli_refresh` (HttpOnly + Secure + SameSite=Lax, ≤30 hari),
  rotasi sekali pakai; reuse = cabut semua sesi user. Maks 3 sesi aktif;
  ke-4 mencabut sesi terlama. Superadmin force logout via
  `DELETE /auth/sessions/:sessionId`.
- Reset: `POST /auth/password/forgot` selalu sukses (anti-enumerasi); token
  sekali pakai 1 jam; reset berhasil mencabut semua sesi.
- Email: interface `EmailService`; `EMAIL_PROVIDER=fake` untuk dev/test
  (tanpa pengiriman nyata). Provider real disuntik belakangan via environment.
- Endpoint auth: `register`, `login`, `2fa/verify`, `2fa/resend`, `refresh`,
  `logout`, `password/forgot`, `password/reset`, `me` — prefix `/api/v1/auth`.

## Users/Cohort Tahap 3 (ringkas)

- Daftar users: Admin/Superadmin, pagination + filter role/status/search,
  field minimal (tanpa password/hash). Taruna/Mentor ditolak (403).
- Verifikasi Taruna: Admin/Superadmin, `POST /admin/users/:id/verify`
  (`PENDING_VERIFICATION` → `ACTIVE`, selainnya 409); penolakan = `SUSPENDED`.
- Akun non-Taruna: hanya Superadmin yang membuat (`POST /admin/users`) dan
  mengubah role (`PATCH /admin/users/:id/role`); anti-escalation (tidak boleh
  ubah diri sendiri; Superadmin terakhir tidak bisa diturunkan). Status juga
  tidak boleh menonaktifkan diri sendiri.
- Impor `.xlsx` (bukan CSV): `POST /admin/users/import` (multipart `file`,
  ≤5 MB, ≤500 baris). Strategi **berhasil sebagian**: baris valid masuk
  (masing-masing transaksi sendiri) + auto-enroll ke `cohort_kode`; baris
  gagal dilaporkan per baris tanpa menggagalkan seluruh berkas.
- Template: `GET /admin/users/imports/template`. Log perbaikan:
  `GET /admin/users/imports/:importId/errors` (.xlsx sel eror merah +
  `keterangan_eror`; disimpan di memori — unduh segera, hilang saat restart).
- Cohort: CRUD Admin/Superadmin; nonaktifkan ditolak bila masih ada enrollment
  aktif. Enroll hanya Taruna ACTIVE (duplikat aktif 409; re-enroll mengaktifkan
  kembali). `GET /me/enrollments` milik Taruna sendiri.
- Audit: verifikasi, status, role, pembuatan akun, impor, cohort, enrollment.
- Postman: `postman/spli-backend-tahap-1-4.postman_collection.json`.
  Swagger: `/docs` (tag operational, auth, admin-users, cohorts, me, content).

## Konten + Video Tahap 4 (ringkas)

- Hirarki: Kategori Kapal → Kursus (terikat cohort) → Bab → Materi → Video.
  Kategori awal PRD (Bulk Carrier, Tanker, Container Ship, Passenger Ship)
  diisi via endpoint/seed, bukan hardcode.
- Kelola (CRUD, status DRAFT/PUBLISHED/ARCHIVED, sortOrder): Admin/Superadmin/
  Mentor. Taruna: baca hanya PUBLISHED + enrollment aktif pada cohort kursus;
  lintas enrollment disamarkan 404.
- Video: metadata di DB, berkas tidak lewat server. `POST /videos/:id/
  playback-token` mengecek enrollment + rantai publikasi + status READY;
  respons: `{ videoId, playbackToken, expiresAt, scanStatus }`.
- Bunny: adapter `BunnyService` + `FakeBunnyProvider` (dev/test,
  `BUNNY_USE_FAKE=true`); token fake berprefix `FAKE-` jelas bukan sungguhan.
  Tanpa kredensial + fake mati → 503 gagal aman (bukan token palsu).
- Thumbnail: `POST /materials/:id/thumbnail` — JPG/PNG ≤2 MB, ≤1920×1080
  (validasi dimensi tanpa dependensi native). `scanStatus: PENDING_PROVIDER` —
  backend TIDAK mengklaim pemeriksaan malware tersedia.
- Thumbnail disimpan sebagai path internal (`thumbnails/...`); file fisik +
  object storage menunggu keputusan infra (bukan klaim produksi).

## Live Lesson Tahap 5 (ringkas)

- Jadwal oleh Mentor pemilik kelas + Admin/Superadmin (keputusan Tahap 5).
  Reschedule/pembatalan paling lambat H-1 (403 bila lewat); tanpa bypass.
- Taruna masuk via `POST /live-lessons/:id/join` (login + enrollment + jadwal
  + status valid); kehadiran PRESENT + peserta tercatat otomatis; materi
  embed Jitsi (`{ roomName, domain, displayName }`) — bukan URL mentah publik.
- Provider: Jitsi Meet gratis + embed (keputusan Tahap 5); interface
  `ConferenceProvider` + fake dev/test (`CONFERENCE_USE_FAKE=true`); Zoom/Meet
  berbayar menyusul bila PKS mengharuskan.
- Absensi: koreksi manual mentor beraudit dalam 24 jam setelah sesi berakhir
  (403 bila lewat); rekap + ekspor `.xlsx`; tutup otomatis 24 jam (PRD §4.3).
- Notifikasi perubahan/pembatalan: in-app (selalu) + email via adapter
  (tanpa klaim terkirim bila provider fake). `GET /me/notifications`,
  `PATCH /me/notifications/:id/read`, `POST /me/notifications/read-all`.
- Timestamp UTC; aturan tanggal backend konsisten; tampilan WIB di frontend.
- Postman: `postman/spli-backend-tahap-1-5.postman_collection.json`.
  Swagger: `/docs` (+ tag live-lessons, notifications).

## CBT Tahap 6 — slice satu level (ringkas)

- Assessment per cohort per level (unik), durasi menit, status publikasi.
  Aturan lulus (passing grade, maks attempt, jeda, remedial) = KONFIGURASI
  sementara via env (default 70/3/24 jam/3) — bukan hardcode final,
  menunggu konfirmasi klien. Perubahan nilai tidak mengubah kontrak.
- Bank soal: PG + esai (DB memakai `ESSAY`; template `.xlsx` memakai `ESAI`).
  Impor `.xlsx` ≤500 baris berhasil sebagian + log perbaikan; level baris
  harus sama dengan level assessment. Template:
  `GET /assessments/questions/import-template`.
- Attempt: timer server (`serverNow/startedAt/expiresAt`), randomisasi
  urutan soal+opsi tercatat untuk audit, tanpa answer key ke Taruna.
  Kelayakan: enrollment aktif + assessment PUBLISHED + batas attempt + jeda.
- Autosave per soal (last-write-wins); ditolak bila attempt final/kedaluwarsa.
  Submit idempotent via `idempotencyKey` (payload identik → hasil sama;
  attempt final → hasil tersimpan).
- PG auto-grade server; esai dinilai Mentor/Admin beraudit (siapa, kapan,
  skor ≤ bobot, feedback); finalisasi otomatis bila semua esai dinilai.
  Antrean: `GET /mentor/essay-grading`; overdue SLA 7 hari:
  `GET /admin/assessments/overdue-grading`.
- Progres (`PASSED/FAILED`, skor terbaik, jumlah attempt) dihitung backend
  dari attempt GRADED; tidak ada nilai dari client yang dipercaya.
  `GET /me/progress`.
- JANGAN menulis bank soal maritim — soal hanya dari impor klien/template.
- Postman: `postman/spli-backend-tahap-1-6.postman_collection.json`.
  Swagger: `/docs` (+ tag assessments).
