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

Akun admin pertama dibuat manual lewat `scripts/create-admin.ts` (default role
`SUPERADMIN`, status `ACTIVE`, password di-hash argon2id):

```bash
npm run admin:create -- --email admin@spli.local --password 'Password123'
# atau lewat env: ADMIN_EMAIL=... ADMIN_PASSWORD=... npm run admin:create
```

Script ini idempoten (upsert by email) dan menolak password < 8 karakter atau
tanpa huruf/angka. Di dev dengan `EMAIL_PROVIDER=fake`, kode OTP login tercetak
di log backend (`[fake-email] OTP ...`); di production kode tidak pernah dicatat.

Data demo untuk pengujian UI (kategori, kursus, materi/video, angkatan,
enrollment, kelas live, CBT 5 level, attempt, sertifikat, rating, tiket,
dan notifikasi) dibuat oleh script terpisah yang juga dijalankan manual:

```bash
npm run seed:dev -- --password 'DemoSpli2026'
# atau lewat env: SEED_PASSWORD=... npm run seed:dev
```

Akun demo yang dibuat (password sama dengan `--password`):
`mentor@spli.local`, `taruna@spli.local` (data lengkap), `taruna2@spli.local`
(fresh), dan `taruna.pending@spli.local` (untuk uji verifikasi admin).
Script bersifat idempoten: aman dijalankan ulang, tidak menghapus data pengguna
lain, dan tidak pernah dijalankan otomatis.

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

## Rating/Sertifikat/Tiket Tahap 7 (ringkas)

- Rating 1–5 non-anonim per kelas (lesson) + mentor; syarat: enrollment aktif
  pada cohort lesson. Satu rating per (user, lesson); edit maksimal 1× dalam
  7 hari sejak rating pertama (dihitung backend, 409 bila melanggar).
  `POST /ratings`, `PATCH /ratings/:id`, `GET /me/ratings`,
  `GET /classes/:classId/ratings` (Mentor kelasnya/Admin).
- Sertifikat: syarat Opsi A (keputusan Tahap 7) — seluruh level 1–5 `PASSED`
  pada cohort yang sama; selainnya 409. Nomor unik server-side
  (`SPLI-TAHUN-XXXXXX`, retry anti-duplikat); terbit sekali per (user, cohort).
  PDF mencantumkan disclaimer **bukan sertifikat resmi STCW**; tanpa QR/
  verifikasi publik (di luar MVP). Unduh: pemilik + Admin/Superadmin
  (`GET /certificates/:id/pdf`); Mentor ditolak. Nomor tidak dibuat ulang
  saat unduh. `POST /certificates` (Admin), `GET /me/certificates`.
- Tiket: `OPEN → IN_PROGRESS → RESOLVED → CLOSED` (+ buka ulang Admin
  `RESOLVED/CLOSED → IN_PROGRESS`); transisi lain 422/409. Taruna: milik
  sendiri (lintas pemilik disamarkan 404); ubah detail hanya saat OPEN.
  Admin/Superadmin: support + ubah status. Mentor: tanpa akses (403).
  Setiap perubahan tercatat di riwayat (actor, waktu, dari→ke, komentar).
- Audit: rating, sertifikat, tiket (buat/ubah/status).
- Keterbatasan verifikasi: isi teks PDF (nama + disclaimer) diverifikasi
  visual saat UAT — ekstraksi teks otomatis tidak layak (PDFKit subset font
  tanpa ToUnicode). Test memastikan PDF valid + milik benar + terproteksi.
- Postman: `postman/spli-backend-tahap-1-7.postman_collection.json`.
  Swagger: `/docs` (+ tag ratings, certificates, tickets).

## QA Tahap 8 (tanpa fitur baru — audit + pelengkap kontrak)

- Endpoint pelengkap kontrak: `GET /admin/audit-logs` (read-only,
  Admin/Superadmin), `GET /users/:userId/progress` (Admin/Mentor),
  `GET /ship-categories/:id` (ikut aturan publikasi).
- Deviasi kontrak yang disengaja + didokumentasikan (bukan bug):
  - Status impor dikembalikan langsung di respons POST (tanpa endpoint
    `GET .../imports/{id}` terpisah); berkas log via `.../errors`.
  - Video dikelola di bawah materi (`/materials/:id/videos`), bukan CRUD
    `/videos` terpisah; playback via `POST /videos/:id/playback-token`.
  - `PATCH /admin/users/:id` umum diganti `/status` + `/role` spesifik
    (least privilege granular).
  - `POST /materials/:id/complete` belum ada (pelacakan penyelesaian materi
    menunggu keputusan unlock; sertifikat Opsi A tidak membutuhkannya).
  - Verifikasi publik/QR sertifikat tidak dibangun (di luar MVP).
- Keamanan: tanpa secret hardcoded; password/OTP/token hanya sebagai hash;
  respons tanpa password/hash/kunci/secret; log tanpa body/sensitif;
  rate limit auth; CORS env; audit tanpa secret; 14 unique + 34 indeks;
  transaksi per baris impor + reset password; timestamp UTC, tampilan WIB.
- Produksi: tanpa mock/seed/secret default — `JWT_SECRET` wajib;
  `EMAIL_PROVIDER=fake` + `BUNNY_USE_FAKE=true` + `CONFERENCE_USE_FAKE=true`
  default aman untuk dev/test; tanpa kredensial → gagal aman 503.
- Target performa (500 pengguna, 100 bersamaan, p95 <500 ms) adalah angka
  pengembangan — BELUM diukur; bukan klaim tercapai.
- Postman: `postman/spli-backend-tahap-1-8.postman_collection.json`.
  Swagger `/docs` (79 path, semua tag domain; smoke test production-mode PASS).

## Hardening pasca-Tahap 8 (perbaikan temuan audit)

- **Kuota impor/upload:** `UploadThrottleGuard` (`src/common/throttle/`)
  membatasi impor Taruna, impor soal, dan upload thumbnail menjadi
  10 permintaan per jam per pengguna. Respons 429 + header `Retry-After`.
  Guard butuh identitas (401 bila token tidak valid). Penyimpanan
  in-memory per instance — saat menjalankan beberapa instance, kuota
  harus dipindahkan ke store bersama (mis. Redis).
- **Idempotency-Key** (header opsional) untuk operasi yang mudah terkirim
  dua kali akibat retry jaringan:
  - `PUT /attempts/:attemptId/answers/:questionId` (autosave jawaban)
  - `POST /tickets`
  - `POST /certificates`
  Kunci yang sama + payload sama → mengembalikan hasil percobaan pertama
  (replay). Kunci yang sama + **payload berbeda** → 409. Kunci dicatat
  pada baris data yang bersangkutan (`Answer`, `Ticket`, `Certificate`),
  bukan pada tabel terpisah. Lihat `src/common/idempotency.ts`.
- **Kode error seragam:** kegagalan aturan bisnis saat menerbitkan
  sertifikat (syarat kelulusan belum terpenuhi) memakai
  422 `UNPROCESSABLE_ENTITY`; konflik data (sertifikat sudah terbit,
  transisi status ilegal, batas edit rating, `Idempotency-Key` dipakai
  ulang dengan payload berbeda) tetap 409 `CONFLICT`.
- **Notifikasi:**
  - `ESSAY_OVERDUE` → seluruh Admin/Superadmin aktif saat penilaian esai
    melewati tenggat (`overdueGrading`).
  - `CERTIFICATE_ISSUED` → pemilik sertifikat saat sertifikat terbit.
- **Guard start-up produksi** (`src/config/env.validation.ts`): ketika
  `NODE_ENV=staging|production`, aplikasi menolak start bila
  `EMAIL_PROVIDER` bukan `smtp`, bila `BUNNY_USE_FAKE`/
  `CONFERENCE_USE_FAKE` bernilai `true`, atau bila kredensial
  `BUNNY_*` belum diisi. Dev/test tetap boleh memakai adapter palsu.
- **Hapus permanen user (Superadmin):** `DELETE /admin/users/:userId`
  menghapus user beserta sesinya dan menulis audit log
  `user.deleted_permanently` (metadata hanya email/role/status — tidak
  ada data sensitif). Superadmin terakhir tidak boleh dihapus (403).
  Pengguna non-Taruna lain dinonaktifkan lewat `PATCH .../status`;
  endpoint ini untuk kasus penghapusan data yang benar-benar diminta.
  Catatan: `audit_logs.actor_id` memakai `ON DELETE SET NULL`, jadi saat
  Superadmin menghapus dirinya sendiri kolom itu menjadi NULL — karena itu
  identitas aktor juga disalin ke `metadata.actorEmail`/`actorRole`.
- **Validasi tipe berkas (AND) + sanitasi nama berkas**
  (`src/common/uploads.ts`): impor Taruna dan impor soal menolak berkas
  yang **mimetype ATAU ekstensinya** bukan `.xlsx` (sebelumnya OR —
  berkas `.csv`/`.gif` yang diubah namanya bisa lolos). Nama berkas
  dibersihkan (hanya `[A-Za-z0-9._-]`, dibatasi panjang, tanpa path)
  sebelum dicatat/diunduh. Thumbnail tidak terpengaruh (nama berkas
  penyimpanan dibuat sendiri, tidak dari input pengguna).
- **Kode error `410 Gone`:** challenge OTP kedaluwarsa, token reset habis
  masa pakai, dan token sekali pakai kini memetakan ke kode error `GONE`
  (`src/common/envelope.ts`) — sebelumnya jatuh ke `VALIDATION_ERROR`
  yang menyesatkan bagi klien.
