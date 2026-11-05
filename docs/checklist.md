# Checklist Pengujian — E-Learning Sekolah Pelaut Indonesia (SPLI)

- **Sumber:** disusun dari `prd.md`, `architecture.md`, `api-specification.md`, `backend-implementation-plan.md`, `frontend-implementation-plan.md`, `backend-qa-report.md`, `frontend-uat-checklist.md`, `staging-backup-runbook.md`, `detail_fase_pekerjaan_SPLI.md`, dan `Maritim Team & Timeline.xlsx`.
- **Status:** Daftar kerja pengujian (belum dieksekusi penuh). Item yang sudah terverifikasi menurut QA report Tahap 8–9 diberi catatan status.
- **Larangan:** Jangan deploy production, ubah DNS/secret, atau restore ke production tanpa instruksi sah.

Legenda: `[ ]` belum dites · `[x]` lolos · `[~]` lolos dengan catatan/deviasi terdokumentasi.

---

## 1. Pengujian otomatis (gate CI/CD)

- [ ] Backend `typecheck` (tsc --noEmit) — *status terakhir: PASS (QA Tahap 8)*
- [ ] Backend `lint` (eslint) — *status terakhir: PASS*
- [ ] Backend unit test (`npm test`) — *status terakhir: 3 suite / 11 test PASS*
- [ ] Backend e2e dengan PostgreSQL test nyata (`npm run test:e2e`) — *status terakhir: 9 suite / 54 test PASS*
- [ ] Backend `build` (nest build) — *status terakhir: PASS*
- [ ] `prisma validate` + `migrate status` sinkron dev/test — *status terakhir: PASS (8–9 migrasi)*
- [ ] Frontend `typecheck`, `lint`, `build`, dan seluruh test Vitest (services 11, CBT 10, routes 16, auth 11, accounts 7, learning 9, live 10, apiClient 3, components 1) — *status terakhir: PASS*
- [ ] CI pipeline `.github/workflows/backend-ci.yml` benar-benar berjalan di GitHub Actions (saat ini file ada tapi **belum pernah berjalan**)
- [ ] Smoke production-mode: start tanpa `DATABASE_URL` gagal dengan pesan validasi jelas; dengan DB → `/health` ok, `/ready` up, Swagger terisi, endpoint terlindungi 401 — *status terakhir: PASS lokal*

## 2. Matriks umum per endpoint API (api-spec §16)

Untuk **setiap** endpoint terlindungi (±105 path di api-spec §3–§13):

- [ ] Sukses sesuai kontrak (envelope `{ data, meta }`; objek `meta: null`, daftar berisi pagination)
- [ ] Input invalid → `400` + `VALIDATION_ERROR` dengan `details[]` per field
- [ ] Tanpa login → `401 UNAUTHORIZED`
- [ ] Role tidak berhak → `403 FORBIDDEN`
- [ ] Akses lintas enrollment/ownership (Taruna A menyentuh data Taruna B, Mentor di luar assignment) → `403`/`404`
- [ ] Resource tidak ditemukan / sengaja disamarkan → `404`
- [ ] Konflik status → `409 CONFLICT`; business rule gagal → `422 UNPROCESSABLE`
- [ ] Pagination: `page` default 1, `pageSize` default 20 **maks 100**, `sortBy` hanya dari allowlist, `sortOrder` hanya `asc|desc`
- [ ] Setiap respons membawa `X-Request-Id`; error body memuat `requestId`
- [ ] `Idempotency-Key` didukung di: `PUT .../answers/{questionId}`, `POST .../attempts/{id}/submit`, `POST /tickets`, `POST /certificates` (ulang key+payload sama → hasil pertama; payload beda → `409`)
- [ ] Rate limit menjawab `429 RATE_LIMITED` sesuai nilai terkunci (login 10/mnt/IP, OTP verify 10/mnt/challenge, resend 1/60 dtk + 5/jam, forgot 5/jam/email, refresh 30/mnt/IP, impor/upload 10/jam/user)
- [ ] Integrasi database nyata (constraint, FK, transaksi)

## 3. Autentikasi, 2FA, dan sesi (api-spec §3; architecture §8)

- [ ] Registrasi mandiri hanya Taruna + consent PDP tercatat
- [ ] Login benar → `OTP_REQUIRED` + `challengeId` + `expiresAt`, **tanpa access token** sebelum OTP valid
- [ ] OTP: 6 digit, kedaluwarsa 5 menit, maksimal 5 percobaan per kode
- [ ] OTP salah / kedaluwarsa / habis attempt → pesan sesuai (UAT skenario 1)
- [ ] Resend OTP: throttle maksimal 1× per 60 detik, cooldown tampil di UI
- [ ] 5 login gagal berturut-turut → lock 15 menit
- [ ] 3 kegagalan kirim email berturut-turut → lock 15 menit + audit log
- [ ] Password minimal 8 karakter kombinasi huruf + angka
- [ ] Reset password: tautan email sekali pakai, kedaluwarsa 1 jam, token tak bisa dipakai ulang
- [ ] Respons forgot-password **tidak membocorkan** apakah email terdaftar
- [ ] Access token Bearer ≤ 1 jam; refresh cookie `HttpOnly + Secure + SameSite=Lax` ≤ 30 hari
- [ ] Refresh rotation sekali pakai: reuse refresh lama → ditolak + revoke
- [ ] Logout mencabut refresh token/sesi
- [ ] Maksimal 3 perangkat; login perangkat ke-4 mencabut sesi tertua
- [ ] Superadmin forced logout pengguna (tercatat audit)
- [ ] Tidak ada password/OTP/token/reset secret di log, respons, atau localStorage

## 4. Users, verifikasi, dan impor .xlsx (api-spec §3; backend plan Tahap 3)

- [ ] Verifikasi Taruna oleh Admin **dan** Superadmin, tercatat di audit
- [ ] Akun Mentor/Admin/Superadmin hanya dibuat/diubah Superadmin (anti-eskalasi role)
- [ ] Impor akun hanya `.xlsx` (bukan CSV), maksimal 500 baris
- [ ] Template kolom v1: `nama_lengkap*, email*, nomor_identitas*, cohort_kode*, telepon, tanggal_lahir(YYYY-MM-DD)`
- [ ] Strategi berhasil sebagian: baris valid masuk, baris gagal dilaporkan
- [ ] Unduh log eror `.xlsx` dengan sel eror ditandai + `keterangan_eror` per baris
- [ ] Validasi MIME + isi file di server (bukan ekstensi saja), nama file aman
- [ ] Batas ukuran file → `413 PAYLOAD_TOO_LARGE`; tipe salah → `415`
- [ ] Rate limit impor 10/jam/user

## 5. Cohort & enrollment (api-spec §4)

- [ ] CRUD Angkatan/Kelas Admin/Superadmin
- [ ] Mentor hanya baca peserta kelas yang ditugaskan
- [ ] Taruna hanya baca enrollment milik sendiri (`/me/enrollments`)
- [ ] Taruna **tidak bisa** mengubah enrollment miliknya
- [ ] Enrollment aktif unik per user+cohort (constraint)
- [ ] Enrollment menentukan materi/assessment/live lesson yang tersedia

## 6. Konten & video (api-spec §5–§6)

- [ ] Hierarki Kategori → Kursus → Bab → Materi berfungsi penuh
- [ ] Taruna hanya melihat konten sesuai enrollment + aturan unlock; konten unpublished/lintas enrollment ditolak
- [ ] Playback token diterbitkan backend **hanya setelah** cek login + enrollment + status publikasi + unlock; umur token ≤ 2 jam, terikat user+video
- [ ] Secret/kredensial Bunny Stream tidak pernah dikirim ke frontend/log
- [ ] Thumbnail JPG/PNG maks 2 MB, maks 1920×1080, divalidasi server
- [ ] Tanpa kredensial → adapter fake di dev/test; real gagal aman `503 SERVICE_UNAVAILABLE` (bukan token palsu)
- [ ] `scanStatus` upload jujur (`PENDING_PROVIDER` sampai pemindai malware terpasang); tidak ada klaim "dipindai malware"
- [ ] UI video: unavailable / playback expired / retry ditangani

## 7. Live Lesson & absensi (api-spec §7)

- [ ] Jadwal dibuat Mentor pemilik kelas + Admin/Superadmin
- [ ] Reschedule/pembatalan hanya pemilik/berwenang, paling lambat **H-1** (dihitung backend), memicu email + in-app ke peserta
- [ ] Join via tombol aplikasi: validasi login + enrollment + jadwal + status, lalu absensi tercatat
- [ ] URL eksternal konferensi tidak pernah dipublikasi sebagai alur normal (embed/iframe per keputusan Tahap 5)
- [ ] Tanpa provider real → gagal aman `503`, domain/timer/absensi tetap teruji
- [ ] Koreksi absensi manual hanya berwenang + tercatat audit
- [ ] Absensi ditutup 24 jam setelah sesi berakhir (penegakan saat akses; job scheduler menyusul bila perlu)
- [ ] Rekap absensi + ekspor hanya Mentor/Admin berwenang
- [ ] Waktu ditampilkan WIB (`Asia/Jakarta`), disimpan UTC

## 8. CBT / assessment (api-spec §8) — area paling kritis

- [ ] Attempt status mengikuti enum terkunci: `IN_PROGRESS → SUBMITTED → AUTO_GRADED → WAITING_MANUAL_GRADING → GRADED`, plus `EXPIRED` (terminal); maju satu langkah, tidak mundur
- [ ] Timer authoritative di server: respons memuat `serverNow`, `startedAt`, `expiresAt`; frontend tidak menentukan timer sendiri
- [ ] Attempt kedaluwarsa → `EXPIRED`, tidak bisa disubmit
- [ ] Autosave 30 detik + saat jawaban berubah; server menolak autosave pada attempt tidak aktif
- [ ] Koneksi putus → resume dari jawaban tersimpan selama waktu server belum habis
- [ ] Double-submit idempotent: tidak ada attempt/hasil ganda
- [ ] Randomisasi urutan soal & opsi per attempt **tercatat** untuk audit
- [ ] **Answer key tidak pernah** muncul di payload Taruna sebelum/saat ujian (audit berkala `isCorrect` di DB)
- [ ] Pilihan ganda dinilai otomatis; esai dinilai manual oleh pemeriksa berwenang (cek role/assignment grading)
- [ ] SLA esai 7 hari kalender; lewat → ditandai terlambat + muncul di `/admin/assessments/overdue-grading`
- [ ] Aturan default sebagai **konfigurasi** (bukan hardcode): `PASSING_GRADE=70`, `MAX_ATTEMPTS=3`, `ATTEMPT_COOLDOWN_HOURS=24`, remedial setelah 3 gagal → ulang level
- [ ] Jeda 24 jam antar attempt dan batas 3 attempt ditegakkan server
- [ ] Impor bank soal `.xlsx` (template v1: `level*, kategori_kapal*, tipe*(PG|ESAI), pertanyaan*, opsi_a..d, kunci_jawaban*, bobot*`), berhasil sebagian + log eror
- [ ] `submitResult` JSON tumbuh per attempt — butuh TTL/pembersihan (known issue QA)

## 9. Progres, rating, sertifikat (api-spec §9–§10)

- [ ] Progres/unlock dihitung server; nilai progres dari client diabaikan
- [ ] Unlock level berikutnya hanya jika attempt `GRADED` dengan skor ≥ passing grade
- [ ] Rating 1–5, non-anonim, hanya Taruna dengan enrollment aktif pada cohort kelas
- [ ] Edit rating maksimal 1× dalam 7 hari sejak rating pertama; kelebihan → `422`
- [ ] Sertifikat terbit **hanya** bila seluruh level 1–5 `PASSED` pada cohort sama (Opsi A — keputusan Tahap 7)
- [ ] Nomor sertifikat unik dibuat server-side dan stabil (tidak berubah saat PDF diunduh ulang); cek duplikat
- [ ] PDF memuat disclaimer "bukan sertifikat resmi STCW" — **cek visual** (ekstraksi otomatis tidak layak)
- [ ] Unduhan PDF memeriksa hak akses; bukan URL publik permanen
- [ ] Verifikasi publik/QR **tidak dibangun** (di luar MVP) — pastikan tidak ada endpoint/halamannya

## 10. Ticketing (api-spec §11)

- [ ] Status terkunci: `OPEN → IN_PROGRESS → RESOLVED → CLOSED`; reopen `RESOLVED→IN_PROGRESS` dan `CLOSED→IN_PROGRESS` oleh Admin; transisi lain → `422`
- [ ] Taruna hanya melihat tiket milik sendiri; tiket orang lain → `403`
- [ ] Hanya Admin yang menjadi petugas support (Mentor bukan support)
- [ ] Setiap perubahan status tercatat di ticket history/audit trail
- [ ] Label API memakai enum Inggris; label Indonesia hanya di UI

## 11. Notifikasi & audit log (api-spec §12)

- [ ] Event minimum terkirim: OTP, reset password, perubahan/pembatalan Live Lesson (email + in-app), esai lewat SLA (lapor Admin), penerbitan sertifikat
- [ ] Kanal lain (WA/push) tidak dibangun tanpa Change Request
- [ ] Audit log mencatat: perubahan role/status akun, verifikasi, impor, enrollment, forced logout, kegagalan email pemicu lock, koreksi absensi, penilaian esai, penerbitan sertifikat, transisi tiket, permanent delete
- [ ] Tidak ada secret/kredensial di audit log
- [ ] Permanent delete hanya Superadmin + tercatat audit; soft delete untuk hasil assessment/audit
- [ ] Retensi audit + hasil assessment ≥ 5 tahun (cek kebijakan data)

## 12. Keamanan lintas sistem (PRD §10; architecture §9)

- [ ] Semua endpoint terlindungi menolak akses tanpa autentikasi dan lintas peran
- [ ] XSS & SQL injection (parameterized query/ORM, sanitasi input)
- [ ] CSRF via SameSite cookie + origin check; CORS allowlist dari environment
- [ ] Tidak ada stack trace, query SQL, secret, token, OTP, atau kunci jawaban di respons error
- [ ] Secret hanya via environment/secret manager; `.env.example` hanya placeholder; `.env` tidak di repo
- [ ] Log produksi bebas data sensitif
- [ ] Health/ready tidak membocorkan kredensial/URL DB/detail infra
- [ ] Rate limit aktif di production (dilonggarkan hanya di `NODE_ENV=test`)
- [ ] Tidak ada mock/fake provider/seed di jalur production

## 13. Integrasi frontend–backend & UI (frontend plan Tahap 8–9)

- [ ] 72 pemakaian endpoint usulan konsisten dengan kontrak backend final (envelope `data/meta`, `X-Request-Id`, cookie `spli_refresh`)
- [ ] Guard route hanya UX; error 401/403/404/409/413/422/429/500/503 ditampilkan benar
- [ ] Loading/empty/error + tombol muat ulang di semua halaman penting; tombol disabled saat request berjalan
- [ ] Tidak ada klaim sukses sebelum server mengonfirmasi (submit ujian, koreksi absensi, grading, status tiket, unduhan sertifikat)
- [ ] Tidak ada secret/answer key/password/OTP/token di console, log, URL, localStorage, atau state persisten
- [ ] Base URL dari `VITE_API_BASE_URL` + prefix `/api/v1`; tidak ada URL hardcoded
- [ ] Kategori awal (Bulk Carrier, Tanker, Container Ship, Passenger) diisi via endpoint, bukan bawaan
- [ ] FE tidak hardcode aturan CBT (70/3/24 jam) — baca dari backend

## 14. UAT staging — 10 skenario (frontend-uat-checklist.md)

Prasyarat: backend staging siap `/api/v1`, `VITE_API_BASE_URL` terisi, akun uji 4 role, data uji lengkap, kontrak API sudah direview bersama.

- [ ] **1. Login & OTP** — OTP 6 digit, countdown, resend cooldown ≥60 dtk; pesan invalid/expired/limit
- [ ] **2. Verifikasi Taruna** — Admin verifikasi via `/admin/pengguna` dengan dialog konfirmasi; belum verifikasi = akses terbatas
- [ ] **3. Enrollment** — Admin tambah/nonaktifkan enrollment; Taruna lihat miliknya di `/enrollment-saya`
- [ ] **4. Akses materi** — navigasi kategori→kursus→bab→materi sesuai enrollment; materi terkunci tertutup; 403 tanpa memutar video
- [ ] **5. Join Live Lesson** — waktu WIB, tombol Masuk Kelas memanggil join API, tautan mentah tak tampil, join ditolak = 403 tanpa redirect
- [ ] **6. CBT start/autosave/resume/submit** — timer dari server, refresh memuat ulang attempt, autosave 30 dtk + on-change dengan status saved/saving/error, submit konfirmasi + Idempotency-Key
- [ ] **7. Hasil & grading** — nilai/kelulusan hanya dari backend; pemeriksa nilai esai 0–100 dengan SLA; Admin lihat penilaian terlambat
- [ ] **8. Rating** — kirim 1–5, edit maks 1×/7 hari sesuai server; role lain tak bisa membuat rating
- [ ] **9. Sertifikat** — disclaimer non-STCW tampil, unduh PDF bila diizinkan, akses ditolak menyembunyikan unduhan
- [ ] **10. Ticketing** — buat tiket dengan validasi, Taruna hanya tiket sendiri (403 untuk lain), Admin ubah status dengan konfirmasi + riwayat

## 15. Responsivitas & aksesibilitas (manual — belum dikerjakan)

- [ ] Responsif desktop, tablet, browser mobile nyata (bukan hanya emulator)
- [ ] Kontras warna terbaca (audit manual)
- [ ] Navigasi keyboard penuh + fokus terlihat
- [ ] Pembaca layar (screen reader) lintas browser
- [ ] Bahasa Indonesia konsisten di seluruh UI

## 16. Performa & beban (belum pernah diukur — jangan klaim)

- [ ] Target awal: 500 pengguna terdaftar, 100 bersamaan, p95 < 500 ms (endpoint yang disepakati, pengecualian endpoint berat disepakati sebelum UAT)
- [ ] Stress test ringan (black-box) tanpa fatal bug
- [ ] Hasil pengujian tercatat sebelum diklaim tercapai

## 17. Operasional: staging, backup, serah terima (staging-backup-runbook.md)

- [ ] Konfig staging: PostgreSQL 15+ (`citext`), Node 22 LTS, `npm ci`, env lengkap (`JWT_SECRET` ≥32 char via secret manager, `CORS_ORIGINS`, dll.) — deploy staging **TERTUNDA** (butuh VPS)
- [ ] `prisma:deploy` + build + start:prod berjalan di staging; `/health` dan `/ready` hijau
- [ ] Rollback deploy teruji (kembali ke image/commit sebelumnya; rollback skema = restore snapshot, tanpa down-migration)
- [ ] `backup.sh` berjalan terjadwal (pg_dump + gzip + SHA256 + MANIFEST, retensi 365 hari); eksekusi nyata **TERTUNDA**
- [ ] `restore.sh` diuji ke DB staging kosong: verifikasi checksum, hitung baris `users` & `_prisma_migrations`, cocokkan MANIFEST, boot + `/ready` — uji restore triwulan sebelum Go-Live, semesteran sesudahnya, hasil didokumentasikan
- [ ] Backup minimal bulanan + salinan off-site, retensi arsip ≥ 12 bulan; SOP dapat diaudit klien
- [ ] Runbook: `/ready` 503, 5xx massal, lockout massal, email gagal, Bunny 503, absensi/grade telat — tiap skenario punya jalur tindakan terverifikasi
- [ ] Swagger/OpenAPI 79 path + Postman Collection untuk alur utama tersedia di deliverable final
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

## Ringkasan status saat ini (dari QA Tahap 8–9)

| Area | Status |
|---|---|
| Test otomatis BE + FE (unit/e2e/build) | PASS — perlu dipertahankan di CI yang benar-benar berjalan |
| Keamanan otomatis (auth, RBAC, ownership) | Sebagian besar tercakup e2e; audit answer key berkala disarankan |
| UAT 10 skenario frontend | Checklist siap; butuh staging + kontrak final |
| Email nyata, malware scan, backup nyata, performa | **Belum diuji** — jangan diklaim |
| QA manual aksesibilitas/responsivitas perangkat nyata | **Belum dikerjakan** |
| Deploy staging + CI GitHub Actions | **TERTUNDA** (akses VPS/runner) |
