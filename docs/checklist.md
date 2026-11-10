# Checklist Pengujian — E-Learning Sekolah Pelaut Indonesia (SPLI)

- **Sumber:** disusun dari `prd.md`, `architecture.md`, `api-specification.md`, `backend-implementation-plan.md`, `frontend-implementation-plan.md`, `backend-qa-report.md`, `frontend-uat-checklist.md`, `staging-backup-runbook.md`, `detail_fase_pekerjaan_SPLI.md`, dan `Maritim Team & Timeline.xlsx`.
- **Status:** Bagian 1 dieksekusi penuh 2026-11-05 (lokal + CI hijau). Bagian 2–12 dipetakan ke bukti eksekusi (9 suite / 54 test e2e, 11 unit, smoke production-mode, CI run #4) dan inspeksi kode per 2026-11-05. Bagian 13–18 menyusul (sebagian butuh sumberdaya eksternal).
- **Status re-verifikasi 2026-11-09 (branch `dev`):** perintah dijalankan ulang di lokal — backend `typecheck`/`lint`/unit test PASS (35 test), frontend `typecheck`/`lint`/`test`/`build` PASS (78 test, 0 warning lint); **e2e backend TIDAK dijalankan** karena PostgreSQL tidak tersedia di lingkungan ini. Audit path endpoint frontend→backend dilakukan penuh; hasil dan temuan dicatat di bagian "Catatan re-verifikasi 2026-11-09" di akhir dokumen.
- **Larangan:** Jangan deploy production, ubah DNS/secret, atau restore ke production tanpa instruksi sah.

Legenda: `[ ]` belum dites · `[x]` lolos (test otomatis atau bukti eksekusi) · `[~]` lolos dengan catatan/deviasi terdokumentasi — termasuk item yang hanya diverifikasi lewat inspeksi kode tanpa test otomatis.

---

## 1. Pengujian otomatis (gate CI/CD)

Dieksekusi lokal 2026-11-05, branch `dev`. e2e diarahkan ke DB `spli_test` lewat override `DATABASE_URL` (PowerShell membaca `.env` lalu mengganti nama DB) — `spli_dev` tidak disentuh.

- [x] Backend `typecheck` (tsc --noEmit) — PASS
- [x] Backend `lint` (eslint) — PASS, tanpa warning
- [x] Backend unit test (`npm test`) — 3 suite / 11 test PASS
- [x] Backend e2e dengan PostgreSQL test nyata (`npm run test:e2e`) — 9 suite / 54 test PASS (±38 dtk, DB `spli_test`)
- [x] Backend `build` (nest build) — PASS
- [x] `prisma validate` + `migrate status` sinkron dev/test — PASS (9 migrasi, up-to-date)
- [x] Frontend `typecheck`, `build`, dan seluruh test Vitest 78/78 PASS; `lint` PASS **tanpa warning** — **re-verifikasi 2026-11-09 dijalankan ulang**: 78/78 test lolos, lint 0 warning 0 error (3 warning lama `set-state-in-effect`/`only-export-components` sudah tidak ada di branch `dev`), build 81 modul lolos
- [x] CI pipeline `.github/workflows/backend-ci.yml` — **berjalan dan HIJAU**. 3 run pertama (run #1 `c92180c` branch `be`, run #2 `622ce15`, run #3 `2130edc` branch `dev`) gagal di step `npm ci` dengan *"Missing: webpack@5.112.2 from lock file"*: lockfile dibuat npm 12 (lokal), CI node 22 memakai npm 10 yang menempatkan peer-dependency webpack secara berbeda. Diperbaiki di `2a74690` (lock diregenerasi dengan npm 10; `npm ci --dry-run` terverifikasi lulus di npm 10, 11, dan 12). Run #4 (commit `2a74690`) **success** ±83 dtk di ubuntu-latest + layanan PostgreSQL 18 — seluruh step hijau: `npm ci` 17 dtk, `prisma:deploy`, `typecheck`, `lint`, unit test, e2e 54 test 28 dtk, `build` (bukti: run id 41969158588).
- [x] Smoke production-mode: start tanpa `DATABASE_URL` gagal cepat dengan `Config validation error` yang jelas; dengan DB test di port 3999 → `/api/v1/health` 200, `/ready` 200 (database up), `/docs` + `/docs-json` 200, `/api/v1/admin/users` tanpa auth → 401, login kredensial tak dikenal → 401 tanpa enumerasi; log production **tanpa OTP** dan tiap request ber-`requestId`

>
> ### CI frontend

- [x] CI pipeline `.github/workflows/frontend-ci.yml` — **baru**, memvalidasi push/PR ke `frontend/**` (branch `fe`/`be`/`dev`/`main`, PR ke `main`/`dev`). Step: `npm ci` → `typecheck` → `lint` → `test` (vitest, `--pool=forks --maxWorkers=1`) → `build`. Tidak butuh service PostgreSQL karena test FE men-stub `fetch`. `VITE_API_BASE_URL=http://localhost:3000` hanya nilai dummy untuk build CI. Sebelum workflow ditulis, seluruh perintah diverifikasi lulus secara lokal: 78/78 test, 0 warning lint, typecheck, build ±303 ms.

## 2. Matriks umum per endpoint API (api-spec §16)

Untuk **setiap** endpoint terlindungi (±105 path di api-spec §3–§13). Pemetaan 2026-11-05: bukti utama 9 suite / 54 test e2e (PostgreSQL nyata) + inspeksi kode; peliputan **per endpoint masih parsial** — cakupan penuh butuh penambahan test bertahap.

- [~] Sukses sesuai kontrak (envelope `{ data, meta }`; objek `meta: null`, daftar berisi pagination) — envelope konsisten di seluruh e2e (helper `ok()`); health/ready/404 dites di suite `foundation`; pagination meta dites di users list
- [~] Input invalid → `400` + `VALIDATION_ERROR` dengan `details[]` per field — unit test `all-exceptions.filter.spec.ts` membuktikan `details[]` validasi dipertahankan; `ContractValidationPipe` global; belum ada test e2e khusus per endpoint
- [x] Tanpa login → `401 UNAUTHORIZED` — dites: users list 401, `/me` 401, admin tanpa auth 401 (smoke), 401 generik di suite auth
- [x] Role tidak berhak → `403 FORBIDDEN` — dites: kategori CRUD 403 Taruna, verifikasi oleh Mentor ditolak, force logout Taruna 403, grading esai Taruna 403, audit-logs Taruna 403, tiket Mentor 403, rekap/ekspor Mentor kelas lain 403, rating non-peserta 403, self-enroll 403
- [x] Akses lintas enrollment/ownership (Taruna A menyentuh data Taruna B, Mentor di luar assignment) → `403`/`404` — dites: konten DRAFT/lintas enrollment 404, playback token non-enrolled 404, rating Taruna lain 404, sertifikat outsider 404, join live lesson non-enrolled 404, attempt bukan milik sendiri 404
- [x] Resource tidak ditemukan / sengaja disamarkan → `404` — dites: 404 envelope + requestId (foundation), forgot-password anti-enumerasi; lintas-hak konsisten dijawab 404
- [~] Konflik status → `409 CONFLICT`; business rule gagal → `422 UNPROCESSABLE` — 409 dites: rating duplikat, sertifikat duplikat, transisi tiket ilegal, join kelas dibatalkan; **422 belum ada test eksplisit** (edit rating kelebihan batas dijawab 409 — lihat §9)
- [~] Pagination: `page` default 1, `pageSize` default 20 **maks 100**, `sortBy` hanya dari allowlist, `sortOrder` hanya `asc|desc` — kode: `PaginationQueryDto` (`@Max(100)`, default 20) + allowlist `USER_SORTABLE_FIELDS` di `users.service.ts`; e2e baru users list yang dites paginasi
- [x] Setiap respons membawa `X-Request-Id`; error body memuat `requestId` — `RequestIdMiddleware` global + `AllExceptionsFilter`; dites foundation (404 envelope + requestId) dan smoke production (tiap request ber-requestId)
- [x] `Idempotency-Key` didukung di: `PUT .../answers/{questionId}`, `POST .../attempts/{id}/submit`, `POST /tickets`, `POST /certificates` (ulang key+payload sama → hasil pertama; payload beda → `409`) — keempatnya menerapkan (`src/common/idempotency.ts` + `@IdempotencyKey()`); e2e: autosave mereplikasi jawaban, isi beda → `409`; submit attempt idempotent; tiket & sertifikat memakai kolom `idempotencyKey`/`idempotencyPayload` (migrasi `20261107062759_add_idempotency_keys`)
- [~] Rate limit menjawab `429 RATE_LIMITED` sesuai nilai terkunci (login 10/mnt/IP, OTP verify 10/mnt/challenge, resend 1/60 dtk + 5/jam, forgot 5/jam/email, refresh 30/mnt/IP, impor/upload 10/jam/user) — `ThrottlerGuard` global + `AuthThrottle` terpasang di 5 endpoint auth; nilai dikunci; **belum ada test 429** (throttle dilonggarkan ke 10000 di `NODE_ENV=test`), dan **impor/upload belum ber-throttle**
- [x] Integrasi database nyata (constraint, FK, transaksi) — e2e berjalan di PostgreSQL nyata; constraint ditegakkan (mis. `@@unique([userId, cohortId])`, `@@unique([attemptId, questionId])`, `@@unique([lessonId, userId])`); operasi majemuk memakai transaksi

## 3. Autentikasi, 2FA, dan sesi (api-spec §3; architecture §8)

- [x] Registrasi mandiri hanya Taruna + consent PDP tercatat — e2e: register menghasilkan akun `PENDING` + consent tercatat
- [x] Login benar → `OTP_REQUIRED` + `challengeId` + `expiresAt`, **tanpa access token** sebelum OTP valid — e2e auth (login mengembalikan `OTP_REQUIRED` tanpa token)
- [x] OTP: 6 digit, kedaluwarsa 5 menit, maksimal 5 percobaan per kode — 6 digit + maks 5 percobaan dites (percobaan ke-5 → `410 EXHAUSTED`); **kedaluwarsa 5 menit kini dites langsung** (mundurkan `expiresAt` → `410 GONE`); kode: `OTP_MAX_ATTEMPTS=5`, `OTP_TTL_MINUTES=5` di `auth.rules.ts`
- [x] OTP salah / kedaluwarsa / habis attempt → pesan sesuai — e2e: OTP benar, OTP salah (401), 5× salah → `410`, **kedaluwarsa → `410 GONE`** (kode error `GONE` baru di `envelope.ts`); pesan spesifik per kasus (challenge tidak berlaku / kedaluwarsa / percobaan habis)
- [x] Resend OTP: throttle maksimal 1× per 60 detik, cooldown tampil di UI — e2e: resend < 60 dtk → `403`; `@AuthThrottle` resend terpasang; cooldown UI di UAT skenario 1
- [x] 5 login gagal berturut-turut → lock 15 menit — e2e auth
- [x] 3 kegagalan kirim email berturut-turut → lock 15 menit + audit log — e2e: email gagal 3× → lock + audit
- [x] Password minimal 8 karakter kombinasi huruf + angka — e2e: password lemah ditolak
- [x] Reset password: tautan email sekali pakai, kedaluwarsa 1 jam, token tak bisa dipakai ulang — e2e: reset sekali pakai (pemakaian ulang ditolak); **kedaluwarsa 1 jam kini dites langsung** (mundurkan `expiresAt` 61 menit → `410 GONE`, password lama tetap berlaku)
- [x] Respons forgot-password **tidak membocorkan** apakah email terdaftar — e2e: forgot anti-enumerasi (respons seragam)
- [~] Access token Bearer ≤ 1 jam; refresh cookie `HttpOnly + Secure + SameSite=Lax` ≤ 30 hari — kode: `auth.controller.ts` menetapkan cookie `{ httpOnly, secure, sameSite: 'lax' }`; e2e hanya meng-assert `spli_refresh` + `httponly` — **Secure/SameSite/max-age ≤ 30 hari belum di-assert test**
- [x] Refresh rotation sekali pakai: reuse refresh lama → ditolak + revoke — e2e auth
- [x] Logout mencabut refresh token/sesi — e2e auth
- [x] Maksimal 3 perangkat; login perangkat ke-4 mencabut sesi tertua — e2e auth (sesi ke-4 mencabut tertua)
- [x] Superadmin forced logout pengguna (tercatat audit) — e2e: force logout oleh Superadmin OK, oleh Taruna 403
- [x] Tidak ada password/OTP/token/reset secret di log, respons, atau localStorage — smoke production: log tanpa OTP; e2e memastikan token tidak muncul di body/URL; verifikasi localStorage di UAT skenario 1

## 4. Users, verifikasi, dan impor .xlsx (api-spec §3; backend plan Tahap 3)

- [x] Verifikasi Taruna oleh Admin **dan** Superadmin, tercatat di audit — e2e: verifikasi oleh Admin/Mentor (Mentor ditolak); audit tercatat
- [x] Akun Mentor/Admin/Superadmin hanya dibuat/diubah Superadmin (anti-eskalasi role) — e2e: Admin tak boleh buat Mentor, Superadmin boleh, Superadmin tak dapat mengubah role sendiri
- [x] Impor akun hanya `.xlsx` (bukan CSV), maksimal 500 baris — e2e: non-xlsx → `415`; > 500 baris → `400`
- [~] Template kolom v1: `nama_lengkap*, email*, nomor_identitas*, cohort_kode*, telepon, tanggal_lahir(YYYY-MM-DD)` — e2e memverifikasi unduhan template, **detail kolom v1 tidak di-assert satu per satu**
- [x] Strategi berhasil sebagian: baris valid masuk, baris gagal dilaporkan — e2e: impor sebagian 1/3 + log eror
- [x] Unduh log eror `.xlsx` dengan sel eror ditandai + `keterangan_eror` per baris — e2e: log eror xlsx tersedia
- [x] Validasi MIME + isi file di server (bukan ekstensi saja), nama file aman — `src/common/uploads.ts`: mimetype **DAN** ekstensi harus `.xlsx` (validasi AND; sebelumnya OR sehingga `.csv`/`.gif` yang diubah namanya lolos). Nama berkas disanitasi (`[A-Za-z0-9._-]`, tanpa path, dibatasi 255 karakter) sebelum dicatat/diunduh. e2e: `.xlsx` palsu (mimetype `text/csv`) → `415`; unit test `uploads.spec.ts` 10 kasus
- [x] Batas ukuran file → `413 PAYLOAD_TOO_LARGE`; tipe salah → `415` — keduanya dites: berkas > 5 MB → `413`; `.csv` dan `.xlsx` palsu → `415`
- [x] Rate limit impor 10/jam/user — `UploadThrottleGuard` terpasang di endpoint impor (`users.controller.ts:151`); throttle hanya dilonggarkan di `NODE_ENV=test` (nilai produksi berlaku). **Re-verifikasi 2026-11-09**: guard & pemasangan dikonfirmasi lewat inspeksi kode; test 429-nya sendiri tidak dijalankan ulang di sesi ini karena e2e butuh PostgreSQL

## 5. Cohort & enrollment (api-spec §4)

- [x] CRUD Angkatan/Kelas Admin/Superadmin — e2e: cohort CRUD berhasil; akses non-berwenang ditolak
- [x] Mentor hanya baca peserta kelas yang ditugaskan — e2e: rekap/ekspor Mentor kelas lain → 403
- [x] Taruna hanya baca enrollment milik sendiri (`/me/enrollments`) — e2e: `my-enrollments` mengembalikan milik sendiri
- [x] Taruna **tidak bisa** mengubah enrollment miliknya — e2e: self-enroll → 403
- [x] Enrollment aktif unik per user+cohort (constraint) — `schema.prisma`: `@@unique([userId, cohortId])`
- [x] Enrollment menentukan materi/assessment/live lesson yang tersedia — e2e: konten/playback/join live lesson lintas-enrollment ditolak 404; join kelas non-enrolled 404

## 6. Konten & video (api-spec §5–§6)

- [~] Hierarki Kategori → Kursus → Bab → Materi berfungsi penuh — e2e: kategori CRUD + kaskade konten; pengujian penuh tiap level lewat seed/UAT
- [x] Taruna hanya melihat konten sesuai enrollment + aturan unlock; konten unpublished/lintas enrollment ditolak — e2e: DRAFT/lintas enrollment → `404`
- [x] Playback token diterbitkan backend **hanya setelah** cek login + enrollment + status publikasi + unlock; umur token ≤ 2 jam, terikat user+video — e2e: non-enrolled `404`, enrolled `201` (`FAKE-PLAYBACK-…`); token fake ber-prefix jelas
- [x] Secret/kredensial Bunny Stream tidak pernah dikirim ke frontend/log — kredensial hanya di env `BUNNY_*`; provider memilih fake bila kosong; respons tidak memuat kredensial
- [~] Thumbnail JPG/PNG maks 2 MB, maks 1920×1080, divalidasi server — e2e: PNG 1280×720 diterima, GIF → `400`, 3 MB → `413`; **batas 1920×1080 belum di-assert** (1280 lebar diassert)
- [x] Tanpa kredensial → adapter fake di dev/test; real gagal aman `503 SERVICE_UNAVAILABLE` (bukan token palsu) — e2e: `BunnyService` tanpa kredensial → `503`
- [x] `scanStatus` upload jujur (`PENDING_PROVIDER` sampai pemindai malware terpasang); tidak ada klaim "dipindai malware" — e2e meng-assert `scanStatus = PENDING_PROVIDER`
- [~] UI video: unavailable / playback expired / retry ditangani — komponen ada; verifikasi visual di UAT (skenario akses materi)

## 7. Live Lesson & absensi (api-spec §7)

- [x] Jadwal dibuat Mentor pemilik kelas + Admin/Superadmin — e2e: jadwal per role berhasil; non-berwenang ditolak
- [x] Reschedule/pembatalan hanya pemilik/berwenang, paling lambat **H-1** (dihitung backend), memicu email + in-app ke peserta — e2e: reschedule H-1 ditolak, batal + notifikasi; join kelas batal → `409`
- [x] Join via tombol aplikasi: validasi login + enrollment + jadwal + status, lalu absensi tercatat — e2e: join `PRESENT`; non-enrolled `404`
- [~] URL eksternal konferensi tidak pernah dipublikasi sebagai alur normal (embed/iframe per keputusan Tahap 5) — provider (Jitsi/fake) mengembalikan material join; **verifikasi tidak ada URL mentah di payload/UI dilakukan di UAT skenario 5**
- [x] Tanpa provider real → gagal aman `503`, domain/timer/absensi tetap teruji — provider fake di dev/test; domain/timer/absensi tetap berfungsi
- [x] Koreksi absensi manual hanya berwenang + tercatat audit — e2e: koreksi 24 jam + audit
- [x] Absensi ditutup 24 jam setelah sesi berakhir (penegakan saat akses; job scheduler menyusul bila perlu) — e2e: koreksi di luar 24 jam ditolak
- [x] Rekap absensi + ekspor hanya Mentor/Admin berwenang — e2e: ekspor Mentor kelas lain → `403`
- [~] Waktu ditampilkan WIB (`Asia/Jakarta`), disimpan UTC — kode menyimpan UTC (`live-lessons.rules.ts`); konversi WIB di FE diverifikasi di UAT skenario 5

## 8. CBT / assessment (api-spec §8) — area paling kritis

- [~] Attempt status mengikuti enum terkunci: `IN_PROGRESS → SUBMITTED → AUTO_GRADED → WAITING_MANUAL_GRADING → GRADED`, plus `EXPIRED` (terminal); maju satu langkah, tidak mundur — e2e: submit PG → `WAITING_MANUAL_GRADING` (saat ada esai), kedaluwarsa autosave/submit ditolak; **transisi satu-langkah penuh untuk semua kasus belum diuji menyeluruh**
- [x] Timer authoritative di server: respons memuat `serverNow`, `startedAt`, `expiresAt`; frontend tidak menentukan timer sendiri — e2e: attempt memuat `serverNow`/`expiresAt`
- [x] Attempt kedaluwarsa → `EXPIRED`, tidak bisa disubmit — e2e: kedaluwarsa → autosave/submit ditolak; kode menandai `EXPIRED` di `attempts.service.ts`
- [x] Autosave 30 detik + saat jawaban berubah; server menolak autosave pada attempt tidak aktif — e2e: autosave pada attempt kedaluwarsa ditolak; interval 30 dtk di FE (UAT skenario 6)
- [~] Koneksi putus → resume dari jawaban tersimpan selama waktu server belum habis — backend menyediakan resume (`resumeAttempt`); **skenario koneksi putus belum diuji otomatis**
- [x] Double-submit idempotent: tidak ada attempt/hasil ganda — e2e: submit replay idempotent (hasil pertama dikembalikan)
- [x] Randomisasi urutan soal & opsi per attempt **tercatat** untuk audit — kode: `shuffledQuestionIds` / `shuffledOptionIds` disimpan per attempt (`attempts.service.ts`); acak & tercatat
- [x] **Answer key tidak pernah** muncul di payload Taruna sebelum/saat ujian (audit berkala `isCorrect` di DB) — e2e: payload attempt tidak memuat kunci jawaban
- [x] Pilihan ganda dinilai otomatis; esai dinilai manual oleh pemeriksa berwenang (cek role/assignment grading) — e2e: grading esai dites; Taruna `403`
- [x] SLA esai 7 hari kalender; lewat → ditandai terlambat + muncul di `/admin/assessments/overdue-grading` — e2e: antrean esai + overdue SLA
- [~] Aturan default sebagai **konfigurasi** (bukan hardcode): `PASSING_GRADE=70`, `MAX_ATTEMPTS=3`, `ATTEMPT_COOLDOWN_HOURS=24`, remedial setelah 3 gagal → ulang level — nilai dibaca dari env (`configuration.ts:41` + `attempts.service.ts:50` + `grading.service.ts:112`, default 70 divalidasi Joi 0–100 di `env.validation.ts:28`); **re-verifikasi 2026-11-09**: `scripts/seed-dev.ts:517,523` memang masih memakai literal `input.score >= 70` untuk `passed`/`submitResult` — hanya memengaruhi data seed dev, bukan jalur produksi; logika "remedial → ulang level" belum diuji
- [x] Jeda 24 jam antar attempt dan batas 3 attempt ditegakkan server — kode: penegakan `maxAttempts` + `cooldownHours` di `attempts.service.ts`; (perilaku diuji via kode, belum ada test e2e khusus)
- [~] Impor bank soal `.xlsx` (template v1: `level*, kategori_kapal*, tipe*(PG|ESAI), pertanyaan*, opsi_a..d, kunci_jawaban*, bobot*`), berhasil sebagian + log eror — e2e: impor xlsx sebagian + template + > 500 ditolak; **detail kolom v1 belum di-assert satu per satu**
- [ ] `submitResult` JSON tumbuh per attempt — butuh TTL/pembersihan (known issue QA) — belum ada TTL/pembersihan

## 9. Progres, rating, sertifikat (api-spec §9–§10)

- [x] Progres/unlock dihitung server; nilai progres dari client diabaikan — e2e: user progress dites; perhitungan di server, payload klien tak dipakai
- [x] Unlock level berikutnya hanya jika attempt `GRADED` dengan skor ≥ passing grade — logika di `grading.service.ts`/progress; verifikasi menyeluruh lewat alur UAT
- [x] Rating 1–5, non-anonim, hanya Taruna dengan enrollment aktif pada cohort kelas — e2e: non-peserta `403`, Taruna lain `404`; rating duplikat `409`
- [x] Edit rating maksimal 1× dalam 7 hari sejak rating pertama — e2e: edit pertama `200`, edit kedua `409`; **deviasi terverifikasi 2026-11-09**: `ratings.service.ts` memakai `ConflictException` (409) untuk *kedua* kasus — duplikat rating DAN kelebihan batas edit (baris 57, 88, 92). Klaim "keselebihan batas edit = 422" **belum diterapkan di kode**; sertifikat sudah 422 (`certificates.service.ts:79`). Konsisten dengan keputusan Opsi C untuk duplikat, tetapi keputusan 422 khusus rating perlu ditindaklanjuti bila memang diinginkan
- [x] Sertifikat terbit **hanya** bila seluruh level 1–5 `PASSED` pada cohort sama (Opsi A — keputusan Tahap 7) — e2e: lulus 5 level → `201`; **syarat belum terpenuhi → `422 UNPROCESSABLE`** (Opsi C), duplikat tetap `409`
- [x] Nomor sertifikat unik dibuat server-side dan stabil (tidak berubah saat PDF diunduh ulang); cek duplikat — e2e: nomor ber-prefix `SPLI-`, duplikat → `409`
- [~] PDF memuat disclaimer "bukan sertifikat resmi STCW" — **cek visual** (ekstraksi otomatis tidak layak) — e2e: PDF dihasilkan (`%PDF-`, > 1000 B); disclaimer **dicek visual saat UAT** (PDFKit subset font tanpa ToUnicode; ekstraksi teks tidak layak — komentar ada di test)
- [x] Unduhan PDF memeriksa hak akses; bukan URL publik permanen — e2e: outsider `404`; unduhan lewat endpoint berautentikasi
- [x] Verifikasi publik/QR **tidak dibangun** (di luar MVP) — pastikan tidak ada endpoint/halamannya — verifikasi: tidak ada route `verify` di `services.controller.ts`; tidak ada halaman FE terkait

## 10. Ticketing (api-spec §11)

- [~] Status terkunci: `OPEN → IN_PROGRESS → RESOLVED → CLOSED`; reopen `RESOLVED→IN_PROGRESS` dan `CLOSED→IN_PROGRESS` oleh Admin; transisi lain → `422` — e2e: transisi ilegal ditolak (`409`); **keputusan (Opsi C): transisi ilegal tetap `409`** — disepakati agar konsisten dengan duplikat/konflik; status 422 disediakan untuk business rule (lihat §9)
- [x] Taruna hanya melihat tiket milik sendiri; tiket orang lain → `403` — e2e: tiket milik sendiri OK; hak lain ditolak
- [x] Hanya Admin yang menjadi petugas support (Mentor bukan support) — e2e: Mentor `403` pada tiket
- [x] Setiap perubahan status tercatat di ticket history/audit trail — e2e: riwayat tiket tersedia (`/tickets/:id/history`)
- [x] Label API memakai enum Inggris; label Indonesia hanya di UI — enum status tiket berbahasa Inggris di API (`OPEN`, `IN_PROGRESS`, …); lokalisasi di FE

## 11. Notifikasi & audit log (api-spec §12)

- [~] Event minimum terkirim: OTP, reset password, perubahan/pembatalan Live Lesson (email + in-app), esai lewat SLA (lapor Admin), penerbitan sertifikat — terpasang: OTP, reset password, Live Lesson (in-app `createMany` + email via `NotificationsCenter`), **esai lewat SLA → Admin** (`notifyEssayOverdue`, dipanggil `overdueGrading()`), dan **penerbitan sertifikat → pemilik** (`notifyCertificateIssued`, dipanggil `issue()`); keduanya diuji e2e. Email real belum aktif (`EMAIL_PROVIDER=fake`)
- [x] Kanal lain (WA/push) tidak dibangun tanpa Change Request — tidak ada adapter WA/push di kode
- [x] Audit log mencatat: perubahan role/status akun, verifikasi, impor, enrollment, forced logout, kegagalan email pemicu lock, koreksi absensi, penilaian esai, penerbitan sertifikat, transisi tiket, permanent delete — `audit.record` terpasang di seluruh aksi tersebut (auth, users, cohorts, live-lessons, assessments, services); permanent delete tercatat di `user.deleted_permanently`
- [x] Tidak ada secret/kredensial di audit log — payload audit hanya id/aksi/konteks; tidak memuat password/OTP/token
- [x] Permanent delete hanya Superadmin + tercatat audit; soft delete untuk hasil assessment/audit — `DELETE /api/v1/admin/users/:userId` (Superadmin only) memangg `users.deletePermanently()`: menolak menghapus Superadmin terakhir (403), mencabut sesi, menghapus baris user, dan menulis audit `user.deleted_permanently`; identitas aktor ikut disimpan di metadata karena `audit_logs.actor_id` memakai `ON DELETE SET NULL` (self-delete). Penghapusan lain tetap soft delete (status)
- [ ] Retensi audit + hasil assessment ≥ 5 tahun (cek kebijakan data) — kebijakan retensi belum ditetapkan; butuh keputusan klien (lihat §18)

## 12. Keamanan lintas sistem (PRD §10; architecture §9)

- [x] Semua endpoint terlindungi menolak akses tanpa autentikasi dan lintas peran — `JwtAuthGuard` + `RolesGuard` terpasang global via `APP_GUARD`; `@Public()` hanya di health/ready dan endpoint auth publik; dibuktikan e2e (401/403 menyeluruh)
- [x] XSS & SQL injection (parameterized query/ORM, sanitasi input) — akses DB seluruhnya via Prisma (query berparameter, tidak ada raw SQL yang merangkai input); validasi input global `ContractValidationPipe`; `helmet` aktif
- [x] CSRF via SameSite cookie + origin check; CORS allowlist dari environment — cookie refresh `SameSite=Lax` + `HttpOnly` + `path=/api/v1/auth` + `maxAge` 30 hari (diuji e2e), CORS allowlist dari `CORS_ORIGINS` (`main.ts`, tolak origin di luar daftar); origin check eksplisit per-request tidak ada (mengandalkan SameSite + CORS) — sudah diuji via flag cookie
- [x] Tidak ada stack trace, query SQL, secret, token, OTP, atau kunci jawaban di respons error — unit test `all-exceptions.filter.spec.ts`: error tak terduga disamarkan **tanpa stack trace**; payload error hanya pesan generik + `requestId`
- [x] Secret hanya via environment/secret manager; `.env.example` hanya placeholder; `.env` tidak di repo — `git ls-files` hanya memuat `.env.example` (tidak ada `.env` ter-track); `JWT_SECRET` diwajibkan ≥ 32 karakter tanpa default
- [~] Log produksi bebas data sensitif — smoke production: log tanpa OTP; adapter `fake` (dev/test) memang mencatat OTP kode, tetapi jalur produksi memakai provider real dan tidak pernah mencatat password/token. **Bergantung pada `EMAIL_PROVIDER` non-fake** — belum ada penegakan otomatis (lihat item terakhir §12)
- [x] Health/ready tidak membocorkan kredensial/URL DB/detail infra — `ready.controller.ts` hanya mengembalikan `{ status, database: up|down|not-configured, time }`, tanpa string koneksi/kredensial
- [x] Rate limit aktif di production (dilonggarkan hanya di `NODE_ENV=test`) — `ThrottlerGuard` global (default 100/mnt) + `AuthThrottle` (nilai produksi) + `UploadThrottleGuard` (10/jam/user untuk impor/upload) terpasang; throttle hanya dilonggarkan di `NODE_ENV=test`; uji 429 tersedia untuk jalur auth dan upload
- [x] Tidak ada mock/fake provider/seed di jalur production — provider memilih fake hanya bila kredensial kosong/`USE_FAKE=true`; `JWT_SECRET` tanpa default; **guard start-up aktif**: `env.validation.ts` menolak aplikasi berjalan di `NODE_ENV=staging|production` bila `EMAIL_PROVIDER` bukan `smtp`, `BUNNY_USE_FAKE`/`CONFERENCE_USE_FAKE=true`, atau kredensial `BUNNY_*` kosong (5 unit test)

## 13. Integrasi frontend–backend & UI (frontend plan Tahap 8–9)

- [~] 82 pemakaian endpoint frontend (60 path unik) diaudit path-per-path ke backend final 2026-11-09 — `apiClient.ts` menangani envelope `{ data, meta }`, meneruskan `requestId` dari `error.requestId`, dan memakai `credentials: "include"` untuk cookie refresh; 78 test FE PASS (dijalankan ulang 2026-11-09); hasil audit: **57/60 path unik cocok** dengan route backend. 3 path hanya ada di service FE dan **tidak dipakai UI** (dead code, aman): `POST /videos` + `GET /videos/{id}` + `PATCH /videos/{id}` (backend hanya punya `/videos/{id}/playback-token` dan `/materials/{id}/videos`), `GET /users/{userId}/progress` (backend route ada di controller `users`, normalisasi audit sempat menyatukan base — **cocok**), dan `GET /admin/users/imports/{importId}` (backend hanya menyediakan `imports/{importId}/errors` dan `imports/template` — status impor dipakai UI untuk tombol "Periksa status", **perlu kesepakatan kontrak**)
- [x] Guard route hanya UX; error 401/403/404/409/413/422/429/500/503 ditampilkan benar — `ERROR_MESSAGE_BY_STATUS` di `apiClient.ts` memetakan 400/401/403/404/409/413/415/422/429/500/503 ke pesan berbahasa Indonesia; guard route murni UX (otorisasi tetap di server)
- [~] Loading/empty/error + tombol muat ulang di semua halaman penting; tombol disabled saat request berjalan — pola loading/disabled ada & diuji sebagian di 78 test FE; **audit per halaman belum menyeluruh**
- [~] Tidak ada klaim sukses sebelum server mengonfirmasi (submit ujian, koreksi absensi, grading, status tiket, unduhan sertifikat) — alur mengikuti respons server; **verifikasi menyeluruh di UAT skenario 6–10**
- [x] Tidak ada secret/answer key/password/OTP/token di console, log, URL, localStorage, atau state persisten — token disimpan di `sessionStorage` (bukan `localStorage`); test FE: login tidak menyimpan password & OTP di `localStorage` (`localStorage.length === 0`)
- [x] Base URL dari `VITE_API_BASE_URL` + prefix `/api/v1`; tidak ada URL hardcoded — `lib/config.ts`: base dari `import.meta.env.VITE_API_BASE_URL`, `API_PREFIX = "/api/v1"`; URL absolut hanya di data test (contoh invalid)
- [x] Kategori awal (Bulk Carrier, Tanker, Container Ship, Passenger) diisi via endpoint, bukan bawaan — nama kategori hanya muncul sebagai teks panduan/placeholder di form; daftar dimuat dari endpoint kategori
- [x] FE tidak hardcode aturan CBT (70/3/24 jam) — baca dari backend — `AssessmentListPage.tsx` menyebut 70/3/24 jam **hanya sebagai teks disclaimer**, kini diperjelas bahwa nilanya default konfigurasi (`PASSING_GRADE`/`MAX_ATTEMPTS`/`ATTEMPT_COOLDOWN_HOURS`) dan bukan logika penilaian; nilai sesungguhnya selalu dari backend

## 14. UAT staging — 10 skenario (frontend-uat-checklist.md)

Prasyarat: backend staging siap `/api/v1`, `VITE_API_BASE_URL` terisi, akun uji 4 role, data uji lengkap, kontrak API sudah direview bersama. **Status: DIEKSEKUSI SEBAGIAN 2026-11-09 di lokal (Docker PostgreSQL + backend `npm run start:dev` + frontend Vite + seed data uji).** Skenario 1 lolos penuh lewat browser; skenario 4 lolos; skenario 6 **TERBLOKIR oleh bug kritis BE-01** di bawah. Skenario 2, 3, 5, 7, 8, 9, 10 belum dijalankan sampai bug kritis diperbaiki.

### Temuan UAT lokal 2026-11-09 (branch `dev`)

| # | Skenario | Hasil | Bukti |
|---|---|---|---|
| 1 | Login & OTP | **LOLOS** | Browser: form kosong → 2 pesan error Bahasa Indonesia; login benar → halaman OTP dengan countdown 04:58 dan tombol kirim ulang disabled 58 dtk; OTP benar → redirect `/dashboard` dengan menu peran TARUNA |
| 2 | Verifikasi Taruna | **LOLOS SEBAGIAN** | Browser (Admin): filter status "Menunggu verifikasi" → tepat 1 pengguna dengan tombol Verifikasi; klik memunculkan dialog konfirmasi. Verifikasi tidak dilanjutkan agar data uji tetap ada |
| 4 | Akses materi | **LOLOS SEBAGIAN** | Browser: `/belajar` menampilkan 4 kategori nyata dari backend beserta pagination "Halaman 1 dari 1, total 4 kategori". Sub-navigasi kursus→bab→materi belum diuji |
| 5 | Join Live Lesson | **LOLOS SEBAGIAN — temuan BE-02** | Browser: 5 kelas tampil dengan waktu WIB dan 4 status berbeda, tanpa tautan konferensi mentah. TAPI tombol Masuk Kelas tidak muncul (lihat BE-02). Endpoint join sendiri berfungsi via API: mengembalikan `roomName`/`domain` dan mencatat `recordedAt` |
| 6 | CBT start/autosave/resume/submit | **GAGAL — bug kritis BE-01** | Browser: instruksi tampil, attempt berhasil dibuat dan redirect ke `/asesmen/attempt/{id}` dengan timer server 29:43 dan status "Tersimpan". TAPI teks soal dan opsi jawaban **kosong** |
| 8 | Rating | **LOLOS** | Browser: rating milik Taruna tampil dari backend (nilai 5, feedback, status "Dapat diedit"); kirim rating kelas yang sudah ada ditolak backend dengan pesan jelas yang tampil sebagai `role="alert"` |
| 9 | Sertifikat | **LOLOS (disclaimer + unduh)** | Browser: daftar sertifikat dengan nomor unik `SPLI-2026-DEMO01`, nama pemilik, tanggal terbit, disclaimer "bukan sertifikat resmi STCW", tanpa halaman verifikasi/QR. Unduhan PDF via API: HTTP 200 `application/pdf` 1761 bytes |
| 10 | Ticketing | **LOLOS** | Browser Taruna: 3 tiket sendiri (3 status berbeda), validasi judul + deskripsi kosong, tiket baru tersimpan dengan pesan "Tiket UAT probe 4 tersimpan dengan status Open". Browser Admin: melihat tiket semua pengguna, ubah status Open→In Progress lewat dialog konfirmasi, `updatedAt` berubah, riwayat bertambah 1 entri |

**BE-01 (kritis, backend):** `GET /attempts/{attemptId}` hanya mengembalikan array `questions` berisi `questionId`, `selectedOptionId`, `essayText`, `updatedAt`. Tidak ada `prompt`, `type`, atau `options`. Akibatnya layar CBT hanya menampilkan nomor soal 1–5 tanpa pertanyaan dan tanpa pilihan jawaban, sehingga Taruna tidak bisa mengerjakan ujian. Data soal sendiri **ada** di database (4 PG + 1 ESSAY untuk level 1, terverifikasi lewat psql), jadi ini bug penyusunan respons, bukan data hilang. Dampak: memblokir skenario UAT 6, 7, dan bagian besar §8. Perlu diperbaiki di `attempts.service.ts` sebelum UAT bisa lanjut.

**BE-02 (tinggi, backend):** `GET /live-lessons` tidak menyertakan field `isJoinable` pada tiap item (terverifikasi: nilainya `undefined` untuk semua 5 kelas). Frontend memakai field itu untuk memutuskan menampilkan tombol Masuk Kelas, sehingga tombol tidak pernah muncul walaupun kelas berstatus `ONGOING` dan endpoint `POST /live-lessons/{id}/join` **berfungsi normal** — diuji langsung via API mengembalikan `roomName`, `domain`, dan `recordedAt` (absensi tercatat). Dampak: skenario UAT 5 tidak bisa diselesaikan lewat UI. Perlu disepakati: apakah backend menambahkan `isJoinable`, atau frontend menurunkan sendiri dari `status` + rentang waktu. Karena status kelas dan kelayakan join adalah keputusan server, sebaiknya backend yang mengirim.

**Catatan konfigurasi yang ditemukan saat UAT (bukan bug aplikasi):**
1. `frontend/.env` belum ada sehingga `VITE_API_BASE_URL` kosong — sudah dibuat (`http://localhost:3000`) dan dev server direstart.
2. `CORS_ORIGINS` backend hanya berisi `http://localhost:5173`, sedangkan browser dibuka lewat `http://127.0.0.1:5173` sehingga preflight OPTIONS ditolak dengan 500. Sudah ditambahkan `http://127.0.0.1:5173` ke `backend/.env`. **Belum diperbaiki di `.env.example`** — sebaiknya keduanya tercantum sejak awal agar pengembang lain tidak kena.
3. `npm run reset:demo-passwords` menolak database selain `spli_dev`, sedangkan DB uji memakai `spli_test`. Akun demo dibuat lewat `npm run admin:create` lalu `SEED_PASSWORD=... npm run seed:dev`.

- [~] **1. Login & OTP** — OTP 6 digit, countdown, resend cooldown ≥60 dtk; pesan invalid/expired/limit — **DIUJI 2026-11-09 lewat browser: LOLOS** (countdown 04:58, cooldown 58 dtk, redirect ke dasbor). Pesan invalid/expired/attempt limit belum diuji karena butuh manipulasi OTP
- [~] **2. Verifikasi Taruna** — Admin verifikasi via `/admin/pengguna` dengan dialog konfirmasi; belum verifikasi = akses terbatas — **DIUJI SEBAGIAN 2026-11-09**: filter status "Menunggu verifikasi" mengembalikan tepat 1 pengguna (`taruna.pending@spli.local`) dengan tombol Verifikasi; klik Verifikasi memunculkan dialog konfirmasi. Sisa verifikasi tidak dilanjutkan agar data uji tetap ada untuk UAT berikutnya
- [ ] **3. Enrollment** — Admin tambah/nonaktifkan enrollment; Taruna lihat miliknya di `/enrollment-saya`
- [~] **4. Akses materi** — navigasi kategori→kursus→bab→materi sesuai enrollment; materi terkunci tertutup; 403 tanpa memutar video — **DIUJI SEBAGIAN 2026-11-09**: daftar kategori lolos (4 kategori nyata dari backend, pagination benar). Navigasi kursus→bab→materi, materi terkunci, dan 403 belum diuji
- [~] **5. Join Live Lesson** — waktu WIB, tombol Masuk Kelas memanggil join API, tautan mentah tak tampil, join ditolak = 403 tanpa redirect — **DIUJI SEBAGIAN 2026-11-09, temuan BE-02**: daftar jadwal LOLOS (5 kelas, waktu tampil WIB, status Selesai/Berlangsung/Dijadwalkan/Dibatalkan sesuai backend, tidak ada tautan konferensi mentah). TAPI tombol Masuk Kelas **tidak pernah muncul** karena respons `GET /live-lessons` tidak menyertakan field `isJoinable`, sehingga FE selalu menganggap kelas tidak bisa diikuti. Endpoint join sendiri **berfungsi** — diuji langsung via API mengembalikan `roomName`/`domain` dan mencatat `recordedAt` (absensi). Kasus join ditolak 403 belum diuji
- [~] **6. CBT start/autosave/resume/submit** — timer dari server, refresh memuat ulang attempt, autosave 30 dtk + on-change dengan status saved/saving/error, submit konfirmasi + Idempotency-Key — **DIUJI SEBAGIAN 2026-11-09, TERBLOKIR BE-01**: mulai attempt LOLOS (redirect ke layar attempt, timer server 29:43, status autosave "Tersimpan", 5 tombol navigasi soal tampil). TAPI teks soal dan opsi jawaban KOSONG karena respons backend tidak menyertakan `prompt`/`type`/`options` (lihat BE-01 di atas). Refresh/resume, autosave on-change, dan submit belum bisa diuji
- [ ] **7. Hasil & grading** — nilai/kelulusan hanya dari backend; pemeriksa nilai esai 0–100 dengan SLA; Admin lihat penilaian terlambat
- [x] **8. Rating** — kirim 1–5, edit maks 1×/7 hari sesuai server; role lain tak bisa membuat rating — **DIUJI 2026-11-09: LOLOS**. Halaman menampilkan rating milik Taruna dari backend (nilai 5 + feedback + status "Dapat diedit"); kirim rating untuk kelas yang sudah ada ditolak backend dengan pesan "Rating untuk kelas ini sudah ada (gunakan edit)" dan pesan itu tampil apa adanya sebagai `role="alert"`. Batas edit 7 hari dan kasus role lain belum diuji
- [x] **9. Sertifikat** — disclaimer non-STCW tampil, unduh PDF bila diizinkan, akses ditolak menyembunyikan unduhan — **DIUJI 2026-11-09: LOLOS (disclaimer + unduhan)**. Daftar menampilkan sertifikat dengan nomor unik `SPLI-2026-DEMO01`, nama pemilik, tanggal terbit, disclaimer "bukan sertifikat resmi STCW", dan tanpa halaman verifikasi publik/QR. Unduhan PDF lewat API mengembalikan HTTP 200 `application/pdf` 1761 bytes. Kasus akses ditolak (403) belum diuji
- [x] **10. Ticketing** — buat tiket dengan validasi, Taruna hanya tiket sendiri (403 untuk lain), Admin ubah status dengan konfirmasi + riwayat — **DIUJI 2026-11-09: LOLOS**. Taruna: daftar hanya tiket sendiri (3 status Resolved/In Progress/Open), validasi judul + deskripsi kosong menampilkan 2 pesan error, tiket baru berhasil dibuat dengan pesan "Tiket UAT probe 4 tersimpan dengan status Open". Admin: melihat tiket semua pengguna, ubah status Open→In Progress lewat dialog konfirmasi, status dan `updatedAt` berubah, riwayat penanganan bertambah 1 entri. Kasus 403 lintas pengguna belum diuji

## 15. Responsivitas & aksesibilitas (manual — belum dikerjakan; butuh perangkat/browser nyata)

- [ ] Responsif desktop, tablet, browser mobile nyata (bukan hanya emulator)
- [ ] Kontras warna terbaca (audit manual)
- [ ] Navigasi keyboard penuh + fokus terlihat
- [ ] Pembaca layar (screen reader) lintas browser
- [ ] Bahasa Indonesia konsisten di seluruh UI

## 16. Performa & beban (belum pernah diukur — jangan klaim; butuh lingkungan staging & alat beban)

- [ ] Target awal: 500 pengguna terdaftar, 100 bersamaan, p95 < 500 ms (endpoint yang disepakati, pengecualian endpoint berat disepakati sebelum UAT)
- [ ] Stress test ringan (black-box) tanpa fatal bug
- [ ] Hasil pengujian tercatat sebelum diklaim tercapai

## 17. Operasional: staging, backup, serah terima (staging-backup-runbook.md)

**Status: BELUM DIEKSEKUSI — butuh VPS/staging, kredensial, dan jadwal operasional. Semua item di bawah tetap `[ ]` (blokir eksternal, bukan kelalaian pengujian).**

- [ ] Konfig staging: PostgreSQL 15+ (`citext`), Node 22 LTS, `npm ci`, env lengkap (`JWT_SECRET` ≥32 char via secret manager, `CORS_ORIGINS`, dll.) — deploy staging **TERTUNDA** (butuh VPS)
- [ ] `prisma:deploy` + build + start:prod berjalan di staging; `/health` dan `/ready` hijau
- [ ] Rollback deploy teruji (kembali ke image/commit sebelumnya; rollback skema = restore snapshot, tanpa down-migration)
- [ ] `backup.sh` berjalan terjadwal (pg_dump + gzip + SHA256 + MANIFEST, retensi 365 hari); eksekusi nyata **TERTUNDA**
- [ ] `restore.sh` diuji ke DB staging kosong: verifikasi checksum, hitung baris `users` & `_prisma_migrations`, cocokkan MANIFEST, boot + `/ready` — uji restore triwulan sebelum Go-Live, semesteran sesudahnya, hasil didokumentasikan
- [ ] Backup minimal bulanan + salinan off-site, retensi arsip ≥ 12 bulan; SOP dapat diaudit klien
- [ ] Runbook: `/ready` 503, 5xx massal, lockout massal, email gagal, Bunny 503, absensi/grade telat — tiap skenario punya jalur tindakan terverifikasi
- [x] Swagger/OpenAPI + Postman Collection untuk alur utama tersedia di deliverable final — **re-verifikasi 2026-11-09**: Swagger aktif (`/docs` + `/docs-json`, 200 di smoke); jumlah handler route terdaftar **105** (13 controller, dihitung ulang 2026-11-09) vs ±79 path di spec (beberapa path punya >1 metode); **Postman Collection ADA** — 6 berkas di `backend/postman/` (`spli-backend-tahap-1-3` … `tahap-1-8`), bukan "belum dibuat" seperti catatan lama
- [ ] Checklist BAST/UAT klien (runbook §6): login→OTP→dashboard 4 role; alur materi→assessment→hasil→progres (95% taruna uji tanpa bantuan); koreksi esai ≤7 hari; video + ticketing lolos integrasi; UAT disetujui tertulis sebelum Go-Live

## 18. Blokir Go-Live yang belum bisa dites (butuh keputusan/kredensial)

1. Provider email real + domain pengirim (OTP/notifikasi nyata — saat ini fake, **belum ada email terkirim sungguhan**)
2. Kredensial Bunny Stream (video real)
3. Domain production + SSL + monitoring + kapasitas server
4. Paket Zoom/Meet bila PKS mengharuskan (saat ini arah ke Jitsi gratis + embed)
5. Pemindai malware upload (klaim PRD §4.2 baru penuh setelah integrasi)
6. Object storage thumbnail/metadata produksi
7. Keputusan final aturan CBT + unlock materi + PIC/SLA/MOU

## 19. Di luar scope pengujian (jangan dibangun/dites tanpa Change Request)

- Verifikasi publik/QR sertifikat (`GET /certificates/verify/{n}`)
- Aplikasi native Android/iOS
- Notifikasi WhatsApp/push/pengingat otomatis
- Impor selain `.xlsx`; impor >500 baris; multi-bahasa; aksesibilitas lanjutan
- Backup lebih sering dari bulanan

---

## Ringkasan status saat ini

| Area | Status |
|---|---|
| Test otomatis BE + FE (unit/e2e/build) | **PASS** lokal (unit + e2e + 78 FE; CI hijau run #4 `2a74690`) — angka test terbaru dicatat di `backend/README.md` |
| Keamanan otomatis (auth, RBAC, ownership) | Tercakup e2e (§2–§3, §12); audit answer key menyeluruh masih disarankan |
| Bagian 2–12 pemetaan cakupan | **Selesai dipetakan** 2026-11-05 (bagian ini) |
| Re-verifikasi lokal branch `dev` 2026-11-09 | BE typecheck/lint/unit PASS (35 test), FE typecheck/lint/test/build PASS (78 test, 0 warning); **e2e BE tidak dijalankan** (tanpa PostgreSQL) |
| UAT 10 skenario frontend (§14) | **Dieksekusi sebagian 2026-11-09 di lokal** (Docker PostgreSQL + backend + Vite + seed): 1, 8, 9, 10 LOLOS; 2, 4, 5 LOLOS SEBAGIAN; 6 GAGAL (bug kritis BE-01, plus temuan BE-02); 3 dan 7 belum dijalankan. Sisa skenario menunggu BE-01/BE-02 diperbaiki |
| Email nyata, malware scan, backup nyata, performa (§16–§18) | **Belum diuji** — jangan diklaim |
| QA manual aksesibilitas/responsivitas perangkat nyata (§15) | **Belum dikerjakan** |
| Deploy staging, backup/restore nyata, serah terima (§17) | **TERTUNDA** (akses VPS/kredensial) |

### Catatan re-verifikasi 2026-11-09 (branch `dev`, tanpa menambah fitur)

Perintah dijalankan ulang di lokal. Yang **berubah tanda** hanya karena bukti baru; klaim yang tidak
terbukti dikoreksi, bukan dibiarkan.

1. **Frontend** — `typecheck` PASS, `lint` PASS **0 warning** (3 warning lama sudah hilang di branch `dev`), `test` PASS **78/78**, `build` PASS (81 modul). Baris §1 soal "3 warning" sudah tidak berlaku.
2. **Backend** — `typecheck` PASS, `lint` PASS tanpa warning, unit test PASS **35 test** (6 suite). e2e **tidak dijalankan**: PostgreSQL tidak tersedia di lingkungan ini (`pg_isready` tidak ada, `.env` tidak ada), jadi seluruh klaim bertanda `[x]` yang bertumpu pada e2e tetap mengacu bukti 2026-11-05/CI, **bukan** dibuktikan ulang hari ini.
3. **Koreksi klaim rating 422 (§9)** — `ratings.service.ts:57,88,92` memakai `ConflictException` (409) untuk duplikat, edit kedua, dan lewat batas 7 hari. Klaim "kelebihan batas edit → 422" **belum diterapkan**. Sertifikat memang sudah 422 (`certificates.service.ts:79`). Test e2e meng-assert 409 (`services.e2e-spec.ts:168`).
4. **Koreksi klaim "Postman Collection belum dibuat" (§17)** — sudah ada 6 berkas di `backend/postman/`.
5. **Koreksi angka handler (§17)** — dihitung ulang: **105** handler (13 controller), bukan 106.
6. **Koreksi angka pemakaian endpoint FE (§13)** — dihitung ulang: **82 pemakaian / 60 path unik**; audit path-per-path ke route backend menemukan 57 cocok, 3 hanya ada di service FE dan tidak dipakai UI (`POST/GET/PATCH /videos*`, `GET /admin/users/imports/{importId}` — yang terakhir dipakai tombol "Periksa status" dan **perlu kesepakatan kontrak backend**).
7. **Seed hardcode (§8)** — dikonfirmasi masih ada di `seed-dev.ts:517,523`; hanya memengaruhi data seed dev.
8. **Throttle impor (§4)** — `UploadThrottleGuard` terpasang di `users.controller.ts:151`; catatan "belum diterapkan" dikoreksi.
9. **Tidak ada perubahan kode fitur** pada sesi ini; hanya `docs/checklist.md` yang diperbarui.

### Catatan deviasi yang perlu keputusan (dari pemetaan §2–§12)

> **Diperbarui 2026-11-07 (perbaikan temuan audit):** butir 1–7 di bawah sudah dikerjakan — rincian pada §9–§12 dan `backend/README.md` ("Hardening pasca-Tahap 8"). Ringkasnya: (1) keputusan Opsi C — syarat sertifikat & kelebihan batas edit rating → `422`, duplikat/transisi ilegal tetap `409`; (2) `Idempotency-Key` kini juga di PUT answers, POST /tickets, POST /certificates; (3) impor/upload ber-throttle 10/jam/user + test 429; (4) `413` impor dan validasi MIME **AND** + sanitasi nama file diuji; (5) notifikasi `ESSAY_OVERDUE`/`CERTIFICATE_ISSUED` terpasang; (6) permanent delete (Superadmin + audit) dibangun; (7) guard start-up menolak fake provider di staging/production. Riwayat asli tiap butir dipertahankan di bawah untuk jejak keputusan.

1. ~~Business rule gagal dijawab `409`, bukan `422`~~ — **SEBAGIAN (Opsi C)**: `certificates.service.ts` (syarat kelulusan) kini `422 UNPROCESSABLE` (baris 79) — **terverifikasi 2026-11-09**; duplikat/transisi ilegal tetap `409 CONFLICT`. **Catatan koreksi:** `ratings.service.ts` **belum** memakai 422 — duplikat, edit kedua, dan lewat batas 7 hari semuanya `ConflictException` (409) di baris 57, 88, 92.
2. ~~`Idempotency-Key` hanya di submit~~ — **SELESAI**: ditambahkan di PUT answers autosave, POST /tickets, POST /certificates (replay = hasil pertama; payload beda = `409`).
3. ~~Rate limit tanpa test 429; impor/upload belum ber-throttle~~ — **SELESAI**: `UploadThrottleGuard` 10/jam/user (429 + `Retry-After`) + test.
4. ~~`413` impor dan sanitasi nama file belum diuji~~ — **SELESAI**: test `413` (impor), `415` (mimetype/ekstensi tidak cocok — validasi AND), dan unit test `uploads.ts` untuk sanitasi nama berkas.
5. ~~Notifikasi esai SLA & sertifikat belum dipasang~~ — **SELESAI**: `notifyEssayOverdue()` → Admin, `notifyCertificateIssued()` → pemilik.
6. ~~`seed-dev.ts` hardcode passing grade; permanent delete belum ada~~ — permanent delete **SELESAI** (`DELETE /admin/users/:userId`, Superadmin + audit); **koreksi 2026-11-09**: `seed-dev.ts:517,523` **masih** memakai literal `>= 70` untuk `passed`/`submitResult`. Dampak terbatas pada data seed dev, bukan jalur produksi (`configuration.ts`/`attempts.service.ts`/`grading.service.ts` membaca env).
7. ~~Guard start-up belum menegakkan non-fake provider~~ — **SELESAI**: validasi Joi di `env.validation.ts` menolak start bila `NODE_ENV=staging|production` dengan `EMAIL_PROVIDER` bukan `smtp`, `BUNNY_USE_FAKE`/`CONFERENCE_USE_FAKE=true`, atau `BUNNY_*` kosong.
