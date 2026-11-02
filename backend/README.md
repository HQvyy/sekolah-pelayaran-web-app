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
- Postman: `postman/spli-backend-tahap-1-3.postman_collection.json`.
  Swagger: `/docs` (tag operational, auth, admin-users, cohorts, me).
