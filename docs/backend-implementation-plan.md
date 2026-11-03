# Backend Implementation Plan — E-Learning Sekolah Pelaut Indonesia

- **Status:** Draft perencanaan — hasil PROMPT BACKEND 0 + persiapan Tahap 5 (disahkan pemilik repo 2026-11-02/03; tanpa implementasi fitur domain; non-teknis diparkir)
- **Pengesahan pemilik repo (2026-11-02, mengikat untuk Tahap 2):**
  1. Envelope respons `data/meta` + error `{ error: { code, message, details, requestId } }` (§6.1 butir 1) dinyatakan **FINAL sebagai kontrak kerja backend**; FE menyesuaikan.
  2. Bentuk respons auth Tahap 2 mengikuti usulan api-spec §15.1: login mengembalikan `{ data: { status: "OTP_REQUIRED", challengeId, expiresAt } }`, **tanpa access token sebelum OTP valid**.
  3. Matriks endpoint–role–ownership §4 dinyatakan **acuan mengikat** (Taruna = milik sendiri, Mentor = dalam assignment, Admin = operasional, Superadmin = forced logout + permanent delete beraudit).
- **Pengesahan pemilik repo untuk Tahap 3 (2026-11-02, mengikat):**
  1. Template kolom impor `.xlsx` v1 FINAL sebagai kontrak kerja (akun: `nama_lengkap*, email*, nomor_identitas*, cohort_kode*, telepon, tanggal_lahir(YYYY-MM-DD)`; bank soal: `level*(1–5), kategori_kapal*, tipe*(PG|ESAI), pertanyaan*, opsi_a..opsi_d, kunci_jawaban*, bobot*`); perubahan kolom = revisi template berversion.
  2. Verifikasi Taruna oleh **Admin dan Superadmin** (tercatat di audit).
  3. Akun Mentor/Admin/Superadmin hanya dibuat/diubah oleh **Superadmin** (anti-escalation).
- **Pengesahan pemilik repo untuk Tahap 5 (2026-11-03, mengikat):**
  1. Provider konferensi: **yang termudah + murah/gratis** (prioritas: Jitsi Meet self-host/gratis → fallback Google Meet/Zoom bila PKS mengharuskan); metode join **embed di aplikasi** (iframe), bukan link eksternal.
  2. Jadwal dibuat oleh **Mentor pemilik kelas + Admin/Superadmin**; reschedule/pembatalan mengikuti H-1 PRD.
  3. Notifikasi perubahan jadwal via **email + in-app saja**; kanal lain (WA/push) = Change Request.
- **Pengesahan pemilik repo untuk Tahap 7 (2026-11-03, mengikat):**
  1. Syarat terbit sertifikat **Opsi A**: seluruh level 1–5 berstatus `PASSED` pada progres Taruna (untuk cohort yang sama). Tanpa syarat penyelesaian materi tambahan.
  2. Verifikasi publik/QR tetap **tidak dibangun** (di luar MVP).
- **Acuan produk:** `docs/prd.md` (PRD ringkas, menggantikan PRD lengkap v1.8)
- **Acuan teknis:** `docs/architecture.md`, `docs/api-specification.md`, `docs/detail_fase_pekerjaan_SPLI.md`
- **Scope kerja backend:** hanya folder `backend/` + dokumen API/arsitektur yang memang perlu diperbarui. Jangan ubah `frontend/`.
- **Keputusan yang dikunci (langsung pakai, jangan diusulkan ulang):**
  - Transport token: access via `Authorization: Bearer`, refresh di cookie `HttpOnly + Secure + SameSite=Lax`; CORS allowlist dari environment; CSRF via SameSite + origin check.
  - ORM: Prisma (PostgreSQL), code-first di `backend/prisma/schema.prisma`, migrasi via `prisma migrate`.
  - Format impor: **.xlsx saja (bukan CSV)**, maksimal 500 baris/berkas, strategi **berhasil sebagian + unduh log eror** (.xlsx sel eror ditandai + keterangan per baris), tiap halaman upload wajib ada tombol **Download Template**.

## 0. Hasil audit ringkas

### 0.1 Dokumen dan repository — ditemukan vs hilang

| Item | Status |
|---|---|
| `docs/prd.md` (PRD ringkas pengganti v1.8) | Ditemukan, dibaca |
| `docs/architecture.md` (Draft untuk review tim) | Ditemukan, dibaca |
| `docs/api-specification.md` (Draft kontrak API) | Ditemukan, dibaca |
| `docs/detail_fase_pekerjaan_SPLI.md` | Ditemukan, dibaca |
| `docs/Maritim Team & Timeline.xlsx` | Ada, belum dibedah baris per baris pada tahap ini (nama PM berbeda vs PRD §8 — perlu klarifikasi PMO) |
| PRD lengkap v1.8 historis | Hanya di histori git (commit `780ae0f` ke bawah), bukan file aktif |
| `backend/` | **Kosong** — belum ada scaffold NestJS, `package.json`/lockfile, config, migration/schema, test, CI |
| `frontend/` | Kosong (di luar scope backend — tidak disentuh) |
| `.gitignore`, `README.md` (root maupun `backend/`) | Tidak ada |
| Swagger/OpenAPI, Postman Collection | Belum ada (wajar — dibuat mulai Tahap 1) |
| CI pipeline | Belum ada |

Branch aktif: `be` (bersih). Branch `fe`, `dev`, `main` ada di remote. Alur kerja sesuai architecture §4: PR ke `main`, tanpa push langsung.

### 0.2 Inventaris endpoint

- Seluruh tabel endpoint di `api-specification.md` (±105 baris endpoint di §3–§13: auth/admin-users, cohorts/enrollments, learning content, videos, live lessons, CBT, progress/ratings, certificates, tickets, notifications/audit, health) berstatus **belum ada** — belum ada yang diimplementasikan karena `backend/` masih kosong.
- Tidak ada endpoint menyimpang karena belum ada kode; inkonsistensi yang ada bersifat **antar-dokumen** (lihat §0.3) dan wajib ditutup sebelum endpoint terkait dipakai frontend.

### 0.3 Inkonsistensi antar-dokumen (jangan ditebak — ditutup via konfirmasi)

1. **CSV vs .xlsx (terkunci .xlsx, teks PRD belum selaras).** PRD §4.1 menyebut impor akun "CSV/Excel" dan §4.4 menyebut bank soal "CSV/Excel", sedangkan architecture §15 + api-spec §14 + commit `f51e145` mengunci **.xlsx saja**. Backend mengikuti keputusan terkunci; usulan: selaraskan redaksi PRD pada review Fase 1.
2. **PRD §3.2** menyebut di luar scope "impor bank soal selain CSV/Excel" — konsisten secara niat dengan kunci .xlsx, tetapi redaksinya perlu diselaraskan agar tidak terbaca seolah CSV didukung.
3. **Malware scanning.** PRD §4.2 mewajibkan unggahan "dipindai malware", tetapi belum ada layanan/pustaka pemindai yang diputuskan. Backend memakai adapter + gagal aman dan terdokumentasi sampai keputusan ada; jangan klaim pemeriksaan tersedia sebelum terintegrasi.
4. **Label "Admin/Support" di matriks api-spec §2/§11** vs PRD §2 "Support bukan peran tersendiri; petugas ticketing adalah Admin". Baca sebagai Admin yang bertugas support; permission rinci tetap menunggu Fase 1.
5. **Format respons `data/meta` + `error`, pagination, status attempt CBT, transisi tiket** — semuanya dinyatakan **usulan teknis** di api-spec (§1.3, §1.6, §8, §11, §17). Belum menjadi kontrak final; wajib disepakati sebelum endpoint pertama dipakai frontend (lihat §6 butir 1, 4).
6. **Aturan CBT default** (passing grade 70, maks 3 percobaan, jeda 24 jam, remedial) eksplisit **perlu konfirmasi** (PRD §4.4/§11, architecture §8, api-spec §8). Implementasi nanti memakai konfigurasi/dev-default yang ditandai, bukan hardcode final.
7. **Verifikasi publik/QR sertifikat** tidak termasuk MVP (PRD §4.5/§11); endpoint `GET /certificates/verify/{certificateNumber}` di api-spec §10 sudah diberi gate "hanya jika disetujui" — **jangan dibangun** sampai ada persetujuan + Change Request bila masuk scope.
8. **Provider email, paket Zoom/Meet + metode join, event notifikasi di luar OTP/email/in-app, target performa final + definisi p95, domain production/monitoring/SLA, template kolom impor final** — semuanya terbuka (PRD §11, architecture §16, api-spec §17).

## 1. Urutan implementasi backend per tahap

| Tahap | Scope | Ketergantungan | Deliverable utama |
|---|---|---|---|
| 1 — Fondasi | Scaffold NestJS+TS, env validation, global validation pipe, exception filter (format error per kontrak yang disepakati), logging tanpa data sensitif, CORS env-based, health/readiness, Swagger dasar, `.env.example`, README, pola module/controller/service/DTO/repository, envelope `data/meta` + pagination (setelah disepakati), test fondasi | Tidak ada (blokir semua tahap lain) | Backend dapat dibangun, diuji, didokumentasikan |
| 2 — Auth & 2FA | Registrasi Taruna + consent PDP, login → OTP, 2FA verify/resend, refresh rotasi/revoke, logout, session limit 3 + forced logout, lockout, reset password 1 jam, rate limiting, guard/decorator + authorization server-side, adapter email + fake untuk test | Tahap 1 | Fondasi akses seluruh domain |
| 3 — Users/Enrollment | CRUD/pencarian/pagination user (field minimal), verifikasi Taruna, manajemen akun non-Taruna anti-eskalasi, impor .xlsx + template + log eror, CRUD Angkatan/Kelas + enrollment, audit log | Tahap 1–2 | Enrollment sebagai basis otorisasi konten/kelas/assessment |
| 4 — Konten + video | Hierarki Kategori → Kursus → Bab → Materi, status publikasi + urutan + unlock berbasis enrollment, adapter Bunny Stream + fake, playback token via backend, validasi thumbnail 2 MB/1920×1080, secret tidak ke frontend/log | Tahap 1–3 | Materi terbaca sesuai enrollment |
| 5 — Live Lesson | Jadwal/peserta/status, aturan H-1 + notifikasi email/in-app, join via tombol (tanpa tautan mentah publik), absensi + koreksi beraudit + tutup 24 jam, interface provider konferensi | Tahap 1–3 | Kelas + absensi authoritative |
| 6 — CBT slice | Assessment 5 level, attempt/resume/autosave/submit idempotent, timer server, randomisasi tercatat, auto-grade PG, grading esai + SLA 7 hari, progres/unlock dihitung server, aturan default sebagai konfigurasi | Tahap 1–4 (enrollment + konten) | Satu slice CBT teruji end-to-end (bukan seluruh modul lanjutan sekaligus) |
| 7 — Rating/sertifikat/tiket | Rating 1–5 non-anonim + edit 1× dalam 7 hari, sertifikat PDF nomor unik + disclaimer non-STCW (tanpa verifikasi publik), tiket Open→In Progress→Resolved→Closed + riwayat | Tahap 1–3, 6 (syarat kelulusan) | Layanan pelengkap MVP |
| 8 — QA backend | Audit kontrak vs implementasi, Swagger/Postman lengkap, review keamanan, transaksi/constraint/indeks, aturan waktu UTC/WIB, hapus mock dari jalur production | Semua tahap implementasi | Laporan QA + daftar sisa |
| 9 — Staging/serah terima | Konfig staging, migrasi/start/health/rollback, CI dasar, SOP backup bulanan + off-site + retensi 12 bulan + uji restore, checklist UAT/runbook | Tahap 8 | Kesiapan operasional (tanpa deploy production tanpa instruksi sah) |

Aturan пропускna: tidak ada tahap yang membangun modul tahap lain; setiap tahap STOP dengan laporan + daftar keputusan terbuka yang masih memblokir.

## 2. Modul dan dependency antar-modul

Urutan bangun (panah = "bergantung pada"):

```text
config / database (Prisma) / health
  → auth (login, 2FA OTP, session/refresh, reset, guards, rate limit)
    → users (verifikasi, manajemen akun, impor .xlsx, audit log)
      → cohorts + enrollments
        → ship-categories / courses / chapters / materials
          → videos (metadata + playback-token via Bunny adapter)
        → live-lessons (jadwal, join, attendance)
        → assessments (bank soal, attempt, grading, progress/unlock)
          → ratings / certificates / tickets
notifications (email/in-app) + audit-logs: cross-cutting, dipakai tahap 2–7
```

- Struktur modul mengikuti architecture §3 (`src/modules/<domain>`, `src/common`, `src/config`, `src/database`, `src/health`), nama folder boleh disesuaikan tanpa mengubah kontrak API.
- Integrasi eksternal (email, Bunny Stream, konferensi) selalu di balik **interface/adapter**; fake adapter hanya untuk dev/test dan tidak pernah dipakai di jalur production.

## 3. Rancangan model data awal (DRAFT — belum disetujui)

Entitas inti sesuai PRD §6 (relasi disederhanakan; tipe kolom final saat desain ERD Fase 1):

```text
User ──< Enrollment >── Cohort (Angkatan/Kelas)
User ──< Session/RefreshToken        (maks 3 aktif/user)
User ──< OtpChallenge                 (6 digit, exp 5 mnt, ≤5 percobaan)
User ──< PasswordResetToken           (sekali pakai, exp 1 jam)
User ──< AuditLog

ShipCategory ──< Course ──< Chapter ──< Material ──< Video (metadata; berkas di Bunny)
Cohort ──< LiveLesson ──< LessonParticipant ──< AttendanceRecord
Cohort ──< Assessment ──< Question ──< AnswerOption
Assessment ──< Attempt ──< Answer  (+ ManualGrade oleh pemeriksa berwenang)
User ──< LearningProgress             (dihitung server)
User ──< Rating  (1–5, edit 1×/7 hari)      User ──< Certificate (nomor unik, PDF)
User ──< Ticket ──< TicketHistory
User ──< Notification (in-app) + email terkirim via adapter
```

Konvensi data (mengikat sejak Tahap 1):
- Timestamp tersimpan **UTC** (ISO 8601 di API), aturan tanggal/H-1/24 jam dihitung backend dengan tampilan **Asia/Jakarta**.
- Password hanya sebagai hash; OTP/token/reset secret tidak disimpan plaintext dan tidak masuk log.
- Soft delete untuk hasil assessment/audit; permanent delete hanya Superadmin + tercatat di audit log.
- Audit log + hasil assessment disimpan minimal **5 tahun**; retensi data lain mengikuti UU PDP + persetujuan klien.
- Constraint minimum: unique (email; nomor sertifikat; enrollment aktif per user+cohort; sesi aktif), foreign key + indeks untuk query utama (enrollment, attempt aktif, grading tertunda, tiket per status/pemilik).
- Aturan CBT default (passing grade, maks attempt, jeda, remedial) disimpan sebagai **konfigurasi**, bukan konstanta final, sampai konfirmasi klien.

## 4. Matriks endpoint–role–ownership (baseline diskusi — permission rinci menunggu Fase 1)

Prinsip: setiap endpoint terlindungi memeriksa **autentikasi + role/permission + ownership/assignment + enrollment** di server. Taruna tidak pernah: mengubah enrollment sendiri, melihat materi/assessment/kelas di luar enrollment, melihat answer key, menentukan nilai/progres sendiri, atau mengakses tiket/sertifikat milik orang lain. Mentor
 hanya dalam assignment. Admin mengelola operasional sesuai permission yang disetujui; Superadmin memegang forced logout + permanent delete beraudit.

| Domain (api-spec) | SUPERADMIN | ADMIN | MENTOR | TARUNA | Kunci ownership/enrollment |
|---|---|---|---|---|---|
| Auth/session (`/auth/*`, `/admin/users/*/sessions`) | Forced logout, hapus permanen beraudit | Kelola sesuai permission | Profil/sesi sendiri | Profil/sesi sendiri | Login belum penuh sebelum OTP valid; refresh rotasi sekali pakai |
| Users/verifikasi/impor (`/admin/users*`) | Penuh beraudit | Verifikasi Taruna, impor .xlsx + template + log eror | — | Registrasi mandiri + consent; verifikasi oleh Admin | Cegah eskalasi role; impor: validasi per baris, maks 500, berhasil sebagian |
| Cohorts/enrollments (`/cohorts*`, `/me/enrollments`) | Kelola | Kelola | Baca peserta kelas yang ditugaskan | Baca milik sendiri | Enrollment dasar akses materi/assessment/live lesson; Taruna tidak ubah miliknya |
| Konten (`/ship-categories`, `/courses`, `/chapters`, `/materials`) | Kelola | Kelola | Sesuai assignment | Baca yang tersedia bagi enrollment + aturan unlock | Konten unpublished/lintas enrollment ditolak |
| Video (`/videos*`) | Kelola | Kelola/pengelola | Sesuai assignment | Minta playback token bila berhak | Token diterbitkan backend setelah cek enrollment/status/unlock; secret tidak ke client |
| Live Lesson (`/live-lessons*`, `/me/live-lessons`) | Administratif | Kelola | Kelola kelas sendiri (H-1, koreksi absensi beraudit, tutup 24 jam) | Lihat/join kelas yang tersedia via tombol | Join validasi login+enrollment+jadwal+status; URL eksternal tidak dipublikasi |
| CBT (`/assessments*`, `/attempts*`, `/mentor/essay-grading`, `/admin/assessments/overdue-grading`) | Administratif | Kelola sesuai permission | Kelola/menilai sesuai assignment; antrean esai + SLA 7 hari | Mulai/resume/autosave/submit/lihat hasil milik sendiri | Timer server; idempotent submit; tanpa answer key ke Taruna; ownership attempt |
| Progress/ratings (`/me/progress`, `/users/{id}/progress`, `/ratings*`, `/classes/{id}/ratings`) | Lihat sesuai permission | Lihat/moderasi sesuai kebijakan | Lihat yang ditugaskan/relevan | Progres sendiri; rating 1–5 non-anonim, edit 1×/7 hari | Progres/unlock dihitung server; kriteria rating menunggu konfirmasi |
| Sertifikat (`/me/certificates`, `/certificates*`) | Kelola sesuai permission | Kelola sesuai permission | Sesuai permission | Lihat/unduh milik sendiri | Terbit hanya bila syarat lulus terpenuhi; nomor unik server-side; disclaimer non-STCW; **tanpa verifikasi publik/QR** |
| Tiket (`/tickets*`) | Administratif | Support/kelola + transisi status | Hanya jika disetujui | Buat + lihat milik sendiri | Transisi status divalidasi + riwayat; aturan tutup/buka-ulang menunggu konfirmasi |
| Notifikasi/audit (`/me/notifications*`, `/admin/audit-logs`) | Audit penuh | Audit sesuai permission | Notifikasi miliknya | Notifikasi miliknya | Event minimum: perubahan/pembatalan Live Lesson; tanpa secret di log |
| Operasional (`/health`, `/ready`) | Monitoring | Monitoring | — | — | Respons minimal, tanpa kredensial/stack trace/detail infra |

## 5. Strategi teknis lintas tahap

- **Migrasi:** Prisma code-first; setiap perubahan skema lewat file migrasi berversion yang direview; larangan ubah skema manual di production; seed hanya dev/test dan tidak otomatis di production; rollback memakai snapshot backup terakhir yang terverifikasi.
- **Validasi:** global `ValidationPipe` (whitelist + transform), DTO per endpoint, validasi tipe/ukuran/isi file di server (batas .xlsx 500 baris; thumbnail 2 MB/1920×1080), MIME + isi bukan sekadar ekstensi, nama file aman, paginasi/sort/filter divalidasi (sort hanya field yang diizinkan).
- **Error handling:** format `error { code, message, details[], requestId }` + status HTTP sesuai api-spec §1.4–§1.5 **setelah format disepakati**; tanpa stack trace/SQL/secret/token/OTP/answer key; `requestId` per request; rate limit menjawab `429`.
- **Auth/session:** Bearer access ≤1 jam; refresh cookie HttpOnly+Secure+SameSite=Lax ≤30 hari, rotasi sekali pakai, revoke saat logout; maks 3 sesi, ke-4 mencabut tertua; lockout 5 gagal login / 3 gagal email = 15 menit + audit log; OTP 6 digit/5 menit/≤5 percobaan/resend ≥60 detik; reset sekali pakai 1 jam; respons forgot-password tidak membocorkan keterdaftar­an email.
- **Audit log (tanpa secret):** perubahan role/status akun, verifikasi, impor, enrollment, forced logout, kegagalan email pemicu lock, koreksi absensi, penilaian esai, penerbitan sertifikat, transisi tiket, permanent delete.
- **Testing per tahap:** unit (business rule, validasi, batas), API (sukses/invalid/tanpa login/role salah/lintas enrollment/ownership, 404 konflik status), integrasi DB, plus kasus khusus: OTP kedaluwarsa/salah/habis, throttle resend, lockout, refresh reuse, session limit, timer server + attempt kedaluwarsa, autosave race, double-submit idempotent, anti-bocor answer key, grading role, jendela edit rating, nomor sertifikat duplikat, transisi tiket ilegal.
- **Dokumentasi API:** NestJS sebagai sumber kontrak — Swagger/OpenAPI diperbarui tiap tahap + Postman Collection untuk alur utama pada deliverable final; perubahan kontrak diusulkan di dokumen dulu, disetujui, baru diimplementasikan.
- **Keamanan & config:** secret hanya via environment/secret manager; `.env.example` placeholder; CORS allowlist dari env; log tanpa data sensitif; production tanpa mock provider/seed/dev-default yang menyamar final.

## 6. Keputusan terbuka + dampak (pemilik: klien/PMO kecuali disebut)

Fokus putaran ini: **teknis dulu**. Butir non-teknis (#12) diparkir — tidak dikerjakan, hanya dicatat agar tidak hilang.

### 6.1 Blocker teknis — LENGKAP (keputusan final tim backend)

| # | Keputusan | Status → keputusan yang dipakai backend |
|---|---|---|
| 1 | Format respons `data/meta` + `error`, pagination, error codes, request ID, idempotency key, rate-limit values (api-spec §17.1/11) | **DIKUNCI sebagai kontrak kerja backend.** Adopsi format usulan api-spec §1.3–§1.6 apa adanya: sukses `{ data, meta }` (objek: `meta: null`; daftar: `meta: { page, pageSize, totalItems, totalPages }`); error `{ error: { code, message, details[], requestId } }`; status HTTP per tabel §1.5; pagination `page` default 1, `pageSize` default 20, **maks 100**, `sortBy` hanya dari allowlist per endpoint, `sortOrder` hanya `asc\|desc`. `requestId` wajib di setiap respons (header `X-Request-Id` + body error). Error codes awal yang dikunci: `VALIDATION_ERROR`, `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`, `CONFLICT`, `PAYLOAD_TOO_LARGE`, `UNSUPPORTED_MEDIA_TYPE`, `UNPROCESSABLE`, `RATE_LIMITED`, `INTERNAL_ERROR`, `SERVICE_UNAVAILABLE`. Rate limit awal (konfigurasi, dapat diubah tanpa ganti kontrak): login 10/menit/IP, OTP verify 10/menit/challenge, OTP resend 1/60 detik + 5/jam, forgot-password 5/jam/email, refresh 30/menit/IP, impor/upload 10/jam/user. `Idempotency-Key` **wajib didukung** pada `PUT .../answers/{questionId}`, `POST .../attempts/{id}/submit`, `POST /tickets`, `POST /certificates`; pengulangan key+payload identik mengembalikan hasil pertama, payload berbeda → `409 CONFLICT`. → usulan patch api-spec §17.1/11: ubah status "usulan" menjadi "keputusan backend, menunggu pengesahan FE". Tahap 1 tidak lagi terblokir. |
| 2 | Permission rinci per role per resource | **DIKUNCI sebagai matriks kerja backend** (least privilege; tabel §4 di atas menjadi acuan implementasi). Prinsip yang mengikat: Taruna = read milik sendiri + aksi milik sendiri; Mentor = hanya dalam assignment; Admin = operasional sesuai permission (termasuk verifikasi Taruna, kelola konten/cohort/tiket); Superadmin = semua Admin + forced logout + permanent delete beraudit. Setiap perubahan permission = perubahan dokumen + persetujuan, bukan perubahan diam-diam di kode. → usulan patch api-spec §2: tetapkan matriks sebagai baseline yang mengikat sampai revisi disetujui. |
| 3 | Status final attempt CBT + aturan transisi tiket + label status | **DIKUNCI sebagai enum kerja backend.** Attempt: `IN_PROGRESS → SUBMITTED → AUTO_GRADED → WAITING_MANUAL_GRADING → GRADED`, plus `EXPIRED` (terminal dari `IN_PROGRESS` saat deadline lewat). Aturan transisi: maju satu langkah, tidak boleh mundur; `EXPIRED` dan `GRADED` terminal; submit ulang pada attempt final bersifat idempotent (hasil sama). Tiket: `OPEN → IN_PROGRESS → RESOLVED → CLOSED`; boleh `RESOLVED → IN_PROGRESS` (buka ulang oleh Admin) dan `CLOSED → IN_PROGRESS` (buka ulang oleh Admin); transisi lain → `422 UNPROCESSABLE`. Label API memakai enum Inggris ini; label Indonesia hanya di UI. → usulan patch api-spec §8/§11: tetapkan enum ini sebagai kontrak (bukan usulan). |
| 4 | Aturan assessment final (passing grade, maks attempt, jeda, remedial) | **DIKUNCI sebagai konfigurasi bertanda sementara** (bukan hardcode final): `PASSING_GRADE=70`, `MAX_ATTEMPTS=3`, `ATTEMPT_COOLDOWN_HOURS=24`, `REMEDIAL_AFTER_FAILURES=3 → ulang level dari awal`. Semua dari environment dengan nilai default tersebut; setiap respons yang memakai nilai ini tidak mengklaimnya final. Perubahan oleh klien = ubah config tanpa ganti kontrak. → usulan patch api-spec §8.6: nyatakan ini nilai konfigurasi awal yang ditandai, menunggu konfirmasi klien. |
| 5 | Kriteria unlock progres/sertifikat + syarat boleh memberi rating | **DIKUNCI sebagai aturan sementara yang eksplisit.** Unlock level/materi berikutnya mensyaratkan attempt `GRADED` dengan skor ≥ `PASSING_GRADE` pada level berjalan; sertifikat terbit bila seluruh level 1–5 `GRADED` lulus. Rating boleh dibuat bila Taruna memiliki enrollment aktif pada cohort kelas tersebut; edit maksimal 1× dalam 7×24 jam sejak rating pertama (kelebihan → `422 UNPROCESSABLE`). Semua dihitung server; nilai dari client diabaikan. → usulan patch api-spec §9: tetapkan aturan ini sebagai kontrak sementara yang ditandai. |
| 6 | Alur upload Bunny Stream + pembentukan playback token | **DIKUNCI sebagai kontrak adapter backend.** Backend menyimpan metadata + referensi video; berkas tidak lewat server aplikasi. Kontrak internal adapter: `createVideoReference(input)`, `signPlayback(userId, videoId, enrollmentCheck)`; token playback berumur pendek (≤2 jam), terikat user+video, diterbitkan hanya setelah cek login + enrollment + status publikasi + unlock. Tanpa kredensial = adapter `FakeBunnyProvider` untuk dev/test dan respons integrasi real **gagal aman** (`503 SERVICE_UNAVAILABLE`, terdokumentasi) — bukan token palsu yang terlihat sungguhan. → usulan patch api-spec §6: tetapkan alur ini; detail URL provider menunggu kredensial tanpa mengubah kontrak. |
| 7 | Provider email + domain pengirim | **YA, BISA NANTI — tidak memblokir Tahap 1–2.** Backend membangun `EmailService` sebagai interface sejak Tahap 2 (`sendOtp`, `sendPasswordReset`, `sendScheduleChange`); implementasi real (`SmtpEmailProvider` atau provider API) disuntik via environment (`EMAIL_PROVIDER`, `EMAIL_FROM`, kredensial via secret manager). Selama provider belum ada, environment test/dev memakai `FakeEmailProvider` (OTP tercetak hanya di log test, tidak pernah di production) dan endpoint tetap berkontrak normal. Konsekuensi jujur: OTP/notifikasi **real tidak terkirim** sampai provider + domain + kredensial tersedia; lockout "3 kegagalan email berturut-turut" dihitung dari kegagalan adapter (termasuk unconfigured) dan diaudit. Syarat Go-Live: provider real wajib terpasang dan diuji kirim; jangan klaim terkirim sebelum itu. → usulan patch architecture §8/§10 + api-spec §3: nyatakan email sebagai adapter dengan pilihan provider yang disuntik belakangan. |
| 8 | Paket Zoom/Meet + metode join sesuai PKS | **YA, BISA NANTI — tidak memblokir Tahap 5.** Backend membangun `ConferenceProvider` interface (`createMeeting`, `getJoinMaterial`, `revokeAccess`) + `FakeConferenceProvider` untuk dev/test. `POST /live-lessons/{id}/join` selalu memvalidasi login + enrollment + jadwal + status, mencatat absensi, lalu mengembalikan materi join dari provider; URL eksternal **tidak pernah** dipublikasi sebagai alur normal. Tanpa PKS = join real gagal aman (`503`), domain + timer + absensi tetap teruji. → usulan patch api-spec §7: tetapkan pola ini; detail deep-link/kuota paket menunggu PKS tanpa mengubah kontrak. |
| 9 | Template kolom final impor .xlsx (akun + bank soal) | **DIKUNCI sebagai template awal versi 1 (ditandai draft).** Format + strategi sudah dikunci (.xlsx, ≤500 baris, berhasil sebagian + log eror .xlsx). Template akun v1: `nama_lengkap*, email*, nomor_identitas*, cohort_kode*, telepon, tanggal_lahir(YYYY-MM-DD)` (* = wajib). Template bank soal v1: `level*(1–5), kategori_kapal*, tipe*(PG|ESAI), pertanyaan*, opsi_a..opsi_d (wajib bila PG), kunci_jawaban* (PG saja), bobot*(default 1)`. Baris gagal: sel eror ditandai + kolom `keterangan_eror`; respons merangkum `berhasil/gagal` per baris tanpa data pribadi berlebihan. Template final menunggu klien; perubahan kolom = revisi template berversion + pengumuman, bukan perubahan diam-diam. → usulan patch api-spec §14 + §3/§8: tetapkan template v1 ini. |
| 10 | Layanan pemindai malware untuk upload | **DIKUNCI sebagai kebijakan gagal-aman.** Sampai layanan/pustaka diputuskan: backend tetap validasi tipe + ukuran + isi + nama aman, lalu menandai hasil dengan `scanStatus: PENDING_PROVIDER` (terlihat di respons yang relevan) dan **tidak mengklaim** "dipindai malware" di API/dokumen/user-facing. Begitu pemindai ada, ia dipasang sebagai adapter `MalwareScanner` tanpa mengubah kontrak — hanya nilai `scanStatus` yang berubah (`CLEAN/QUARANTINED`). Klaim PRD §4.2 dipenuhi penuh hanya setelah integrasi teruji. |
| 11 | Event notifikasi di luar OTP/email/in-app; kanal tambahan (WA/push) = Change Request | **DIKUNCI sebagai daftar event minimal.** Yang dibangun backend: OTP, reset password, perubahan/pembatalan Live Lesson (email + in-app), esai melewati SLA 7 hari (laporan ke Admin), penerbitan sertifikat. Event lain di luar daftar ini = keputusan baru + Change Request bila kanal baru. → usulan patch api-spec §12: tetapkan daftar event ini sebagai kontrak. |

### 6.2 Non-teknis — DIPARKIR (tidak dikerjakan putaran ini)

Butir #12 (target performa final + definisi p95/UAT; domain production; monitoring; SLA bug kritis/minor; paket infra; mekanisme pemulihan akun selain email; PIC teknis + nama PM; MOU/DP/kick-off; jadwal mengikat 19 Feb 2027; backup/retensi) tetap tercatat sebagai tanggungan PMO/klien pada Fase 1/4/5 dan serah terima. Backend memakai target awal PRD (500 terdaftar, 100 bersamaan, p95 < 500 ms) hanya sebagai angka pengembangan — bukan klaim SLA.

Risiko lintas tahap (non-teknis, dicatat tanpa dikerjakan): materi/bank soal klien terlambat, kick-off/MOU/DP menggeser jadwal, BAST/UAT >5 hari kerja, backup bulanan berisiko kehilangan ±30 hari data (harian = Change Request).
