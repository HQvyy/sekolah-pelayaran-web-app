# Prompt Codex Bertahap — Backend

> **Tujuan:** Prompt khusus untuk developer backend pada proyek Web Apps E-Learning Sekolah Pelayaran Indonesia. Tempel **satu tahap per permintaan** ke Codex. Jangan meminta Codex menjalankan seluruh tahap sekaligus.
>
> **Repository:** Satu repository bersama dengan folder `backend/`, `frontend/`, dan `docs/`. Kerjakan hanya `backend/` serta dokumen API/arsitektur yang memang perlu diperbarui. Jangan mengubah kode frontend.
>
> **Dokumen sumber wajib:** `docs/prd.md`, `docs/architecture.md`, dan `docs/api-specification.md`. Jika PRD memiliki nama/lokasi berbeda, temukan file PRD yang tersedia dan catat lokasi sebenarnya. Jangan mengarang isi dokumen yang tidak ditemukan.

## Aturan tetap untuk semua tahap

```text
Anda adalah senior backend engineer untuk proyek Web Apps E-Learning Sekolah Pelayaran Indonesia.

SUMBER KEBENARAN DAN SCOPE
1. PRD adalah sumber kebutuhan produk utama. architecture.md menjelaskan pembagian sistem. api-specification.md adalah kontrak integrasi frontend-backend.
2. Ikuti stack: NestJS + TypeScript, PostgreSQL, REST API dengan prefix /api/v1, Swagger/OpenAPI, dan Postman Collection.
3. Implementasikan hanya tahap yang diminta. Jangan membangun semua modul sekaligus dan jangan menambahkan fitur di luar MVP/PRD.
4. Jika dokumen saling bertentangan atau keputusan ditandai [PERLU KONFIRMASI], jangan menebak. Catat pertanyaan/opsi, gunakan adapter/interface atau tandai pekerjaan yang terblokir. Jangan menganggap usulan di api-specification.md sebagai keputusan bisnis final.
5. Kontrak endpoint, format response/error, DTO, status, dan aturan akses harus sinkron dengan docs/api-specification.md. Jangan mengubah kontrak diam-diam. Jika perubahan benar-benar diperlukan, jelaskan alasan, usulkan perubahan dokumen terlebih dahulu, dan minta persetujuan sebelum mengubah endpoint yang dipakai frontend.
6. Backend adalah sumber kebenaran untuk autentikasi, authorization, enrollment, timer CBT, nilai, progres/unlock, absensi, ticket status, dan penerbitan sertifikat. Jangan percaya role, nilai, sisa waktu, ownership, atau status yang dikirim client tanpa verifikasi server.
7. Semua endpoint terlindungi wajib memeriksa autentikasi, role/permission, ownership, assignment, dan enrollment yang relevan. Jangan mengandalkan route guard frontend.
8. Jangan menyimpan secret, password, OTP, token, private key, atau kredensial nyata di repository/log. Sediakan .env.example hanya dengan placeholder. Jangan membuat akun atau konten palsu untuk production.
9. Gunakan timestamp database/API dalam UTC dan perlakukan zona waktu tampilan sebagai Asia/Jakarta. Validasi input di server; gunakan transaksi dan constraint DB saat konsistensi data memerlukannya.
10. Tulis automated tests untuk business rules, authorization, validasi, dan kasus gagal yang relevan. Jalankan lint, typecheck, test, dan build yang tersedia. Jangan mengklaim perintah berhasil jika belum dijalankan.
11. Pertahankan struktur/kode yang sudah ada. Jangan menghapus atau melakukan scaffolding ulang tanpa alasan yang jelas.
12. Di akhir tahap, laporkan: ringkasan implementasi, file dibuat/diubah, keputusan/asumsi, endpoint yang tersedia, hasil command/test PASS/FAIL, risiko atau blocker, serta tahap berikutnya. STOP setelah menyelesaikan tahap tersebut.
```

---

## PROMPT BACKEND 0 — Audit dokumen dan rencana kerja (TANPA IMPLEMENTASI FITUR)

```text
Jalankan aturan tetap backend.

Sebelum coding, audit repository dan dokumen yang benar-benar tersedia:
- docs/prd.md atau lokasi PRD yang tersedia
- docs/architecture.md
- docs/api-specification.md
- package.json, lockfile, struktur folder, konfigurasi, migration/schema, test, CI, dan README yang sudah ada

Jangan menganggap file telah dibaca jika tidak ditemukan. Laporkan nama/path dokumen yang ditemukan dan yang hilang. Cocokkan kebutuhan PRD dengan api-specification.md. Buat daftar endpoint dan domain yang sudah ada, belum ada, atau tidak konsisten. Identifikasi kontrak yang masih berupa usulan dan keputusan [PERLU KONFIRMASI], termasuk ORM/migration tool, transport token, provider email, provider Live Lesson, aturan CBT final, permission rinci, dan verifikasi publik/QR sertifikat.

Buat atau perbarui hanya dokumen perencanaan backend jika diperlukan, misalnya docs/backend-implementation-plan.md, yang berisi:
1. Urutan implementasi backend per tahap.
2. Modul dan dependency antar-modul.
3. Rancangan model data awal/ERD yang ditandai draft bila belum disetujui.
4. Matriks endpoint–role–ownership.
5. Strategi migration, validation, error handling, audit log, testing, dan API documentation.
6. Daftar keputusan terbuka serta dampak jika belum dijawab.

Jangan menulis kode fitur, jangan menginstal banyak dependency, jangan mengubah kontrak API. STOP dan laporkan hasil audit serta rencana bertahap.
```

## PROMPT BACKEND 1 — Fondasi NestJS, konfigurasi, database, dan kontrak API

```text
Jalankan aturan tetap backend. Implementasikan hanya fondasi teknis.

- Jika belum ada, inisialisasi aplikasi NestJS + TypeScript di folder backend/ tanpa mengganggu frontend/ dan docs/.
- Konfigurasikan environment validation, global validation pipe, exception filter/format error yang konsisten dengan docs/api-specification.md, logging yang tidak membocorkan data sensitif, CORS untuk origin yang ditentukan melalui environment, health/readiness endpoint, dan Swagger/OpenAPI.
- Siapkan PostgreSQL dan pilih ORM/migration tool yang sesuai dengan kondisi repository. Jika belum dipilih, usulkan satu pilihan dan catat di docs/architecture.md sebelum dipakai; jangan mengganti pilihan yang sudah berjalan tanpa alasan.
- Tambahkan .env.example berisi placeholder, .gitignore, README backend untuk setup lokal, migration, test, lint, typecheck, dan build.
- Siapkan pola module/controller/service/DTO/repository yang konsisten. Implementasikan envelope response/error dan pagination sesuai kontrak yang disepakati; jangan membungkus response dua kali.
- Tambahkan test untuk health endpoint, validasi config, format error, dan koneksi database bila environment test tersedia.
- Jangan menambahkan data dummy ke production. Jika seed development diperlukan, pisahkan jelas dan pastikan tidak berjalan otomatis di production.

Jangan implementasikan seluruh endpoint domain pada tahap ini. Jika format response di API specification masih berupa usulan belum disetujui, tandai secara eksplisit dan jangan mengubahnya diam-diam. Jalankan semua pemeriksaan yang tersedia dan STOP.
```

## PROMPT BACKEND 2 — Authentication, 2FA, session, dan authorization

```text
Implementasikan hanya autentikasi dan fondasi kontrol akses sesuai PRD serta api-specification.md.

Kebutuhan:
- Role tepat: SUPERADMIN, ADMIN, MENTOR, TARUNA.
- Registrasi mandiri hanya untuk Taruna, termasuk consent pemrosesan data pribadi sesuai PRD; akun role lain dibuat oleh pihak berwenang.
- Password minimal 8 karakter dan mengandung huruf serta angka; simpan hanya password hash dengan algoritme yang sesuai praktik aman.
- Lima kegagalan login berturut-turut mengunci akun 15 menit.
- 2FA email OTP untuk semua role: 6 digit, berlaku 5 menit, maksimal 5 percobaan per kode, resend paling cepat setiap 60 detik.
- Jika email gagal terkirim 3 kali berturut-turut, lakukan penguncian sementara 15 menit dan catat audit log sesuai definisi PRD.
- Reset password menggunakan token/tautan sekali pakai dengan masa berlaku 1 jam; respons forgot-password tidak boleh mengungkap apakah email terdaftar.
- Access token maksimal 1 jam; refresh token maksimal 30 hari, rotasi, dan revoke saat logout.
- Maksimal 3 perangkat/sesi aktif; sesi ke-4 mencabut sesi terlama. Superadmin dapat force logout.
- Jangan menganggap login selesai sebelum OTP tervalidasi. Terapkan rate limiting pada login, OTP, resend, dan reset.

Penting: mekanisme transport token (Bearer vs cookie) masih perlu konfirmasi di dokumen arsitektur/API. Sebelum mengimplementasikan refresh/session, periksa keputusan yang sudah disetujui. Jika belum ada, usulkan pilihan dengan trade-off dan catat sebagai blocker/keputusan terbuka; jangan membuat frontend dan backend menggunakan mekanisme berbeda. Untuk provider email yang belum tersedia, gunakan interface/adapter dan fake provider hanya pada test. Jangan mengklaim email terkirim sungguhan jika provider belum terkonfigurasi.

Terapkan guard/decorator dan authorization server-side. Buat test untuk role, OTP kedaluwarsa/salah/percobaan habis, throttle resend, lockout, refresh rotation/reuse, logout, session limit, dan reset token. Jangan membuat password default hardcoded atau akun production otomatis. STOP setelah test dan laporan.
```

## PROMPT BACKEND 3 — Pengguna, verifikasi Taruna, Angkatan/Kelas, dan enrollment

```text
Implementasikan hanya domain users, verifikasi akun, import, cohorts/classes, dan enrollments sesuai PRD serta kontrak API.

- Endpoint daftar/detail/pencarian/filter pengguna dengan pagination dan field pribadi seminimal mungkin.
- Admin/Superadmin memverifikasi pendaftaran Taruna sesuai matriks permission yang telah disepakati.
- Manajemen akun Mentor/Admin/Superadmin hanya untuk pihak berwenang; cegah privilege escalation dan perubahan role oleh pengguna yang tidak berhak.
- Impor CSV/XLSX Taruna maksimal 500 baris per file, validasi tipe/ukuran file, validasi setiap baris, penanganan duplikasi, serta laporan hasil per baris. Gunakan transaksi/batch yang aman dan jelaskan apakah proses parsial atau atomik sesuai kontrak yang disetujui.
- CRUD Angkatan/Kelas dan enrollment Taruna. Enrollment harus dipakai sebagai dasar otorisasi akses ke materi, kelas, Live Lesson, dan assessment.
- Audit log untuk perubahan status akun, role, verifikasi, import, dan enrollment.

Jangan menebak permission rinci yang belum diputuskan. Gunakan least privilege dan tandai permission yang perlu konfirmasi. Tambahkan test untuk akses lintas role, enrollment pengguna lain, import di atas 500 baris, baris invalid/duplikat, dan perubahan role/status. Update Swagger/Postman. STOP.
```

## PROMPT BACKEND 4 — Kategori Kapal, kursus, bab, materi, dan Bunny Stream

```text
Implementasikan hanya struktur konten pembelajaran dan metadata video.

Hirarki: Kategori Kapal → Kursus → Bab → Materi Video. Kategori awal yang disebut PRD meliputi Bulk Carrier, Tanker, Container Ship, dan Passenger Ship; data master tambahan hanya dimasukkan bila disediakan/disetujui klien.

Implementasikan CRUD, status publikasi, urutan tampilan, validasi relasi, dan kontrol akses sesuai permission yang disetujui. Taruna hanya dapat membaca materi yang tersedia untuk enrollment-nya dan sesuai aturan unlock.

Integrasi video:
- Bunny Stream adalah penyedia media. Backend menyimpan metadata dan referensi video, bukan menyalurkan video mentah melalui server aplikasi.
- Secret API/provider tidak boleh dikirim ke frontend atau masuk log.
- Validasi thumbnail JPG/PNG maksimal 2 MB dan dimensi maksimal 1920x1080 sesuai PRD; validasi file upload lain sesuai spesifikasi dan jangan mengklaim pemeriksaan malware tersedia bila belum terintegrasi.
- Buat adapter untuk Bunny Stream dan fake adapter untuk test. Playback token/URL harus dibuat melalui backend dengan izin pengguna, enrollment, dan status materi yang valid.
- Jangan mengarang token atau URL yang terlihat seperti token sungguhan. Jika kredensial belum ada, respons integrasi harus gagal secara aman dan terdokumentasi.

Buat test permission, konten unpublished, akses materi lintas enrollment, validasi file, dan provider gagal. Dokumentasikan konfigurasi yang dibutuhkan di .env.example dan README. STOP.
```

## PROMPT BACKEND 5 — Live Lesson, join, notifikasi, dan absensi

```text
Implementasikan hanya Live Lesson dan absensi sesuai PRD.

- Jadwal Live Lesson, mentor/peserta, status, perubahan, pembatalan, kehadiran, dan rekap sesuai kontrak API.
- Jadwal hanya dapat dibuat/diubah/dibatalkan oleh Mentor/Admin yang memiliki izin dan assignment yang benar. Perubahan/pembatalan mengikuti aturan H-1 pada PRD; jangan mengizinkan bypass hanya karena request berasal dari frontend.
- Taruna masuk melalui endpoint join yang memvalidasi login, enrollment, jadwal, dan status kelas. Jangan mengembalikan link konferensi mentah secara umum atau membagikannya pada daftar publik; integrasi mengikuti PKS/provider yang disetujui.
- Absensi dicatat berdasarkan alur join yang telah disetujui; mentor berwenang dapat mengoreksi absensi dengan audit trail. Penutupan/perubahan absensi mengikuti batas 24 jam yang disebut PRD.
- Notifikasi email/in-app sesuai kebutuhan PRD. Provider eksternal belum dipastikan harus memakai adapter; jangan membuat notifikasi WhatsApp atau layanan tambahan tanpa persetujuan.
- Simpan timestamp UTC dan terapkan aturan tanggal menggunakan zona waktu Asia/Jakarta untuk tampilan.

Jika paket/provider konferensi belum disepakati, implementasikan domain dan interface provider tanpa mengunci layanan tertentu. Tambahkan test untuk akses non-enrolled, reschedule setelah batas, pembatalan, join tidak sah, koreksi absensi, dan batas 24 jam. STOP.
```

## PROMPT BACKEND 6 — CBT lima level, attempt, timer, grading, dan progres

```text
Implementasikan domain assessment/CBT secara bertahap dan aman. Baca semua aturan assessment pada PRD dan api-specification.md sebelum coding.

- Struktur assessment lima level dengan soal pilihan ganda dan esai; bank soal disediakan klien dan diimpor melalui format yang disetujui. Jangan menulis/mengarang bank soal maritim.
- API untuk daftar assessment yang dapat diakses, memulai attempt, resume attempt, autosave jawaban, submit, hasil, dan grading esai sesuai kontrak.
- Timer authoritative di server. Frontend hanya menerima status/timestamp/sisa waktu yang aman; backend menolak autosave/submit yang melewati deadline atau attempt yang statusnya sudah final.
- Autosave ditargetkan setiap 30 detik dari frontend, tetapi backend tetap memvalidasi payload, attempt ownership, status, deadline, dan urutan update.
- Submit harus idempotent/aman terhadap request ulang dan race condition. Randomisasi soal/opsi harus dicatat pada attempt, tanpa mengekspos answer key ke Taruna.
- Auto-grade pilihan ganda di server. Esai hanya dinilai oleh Mentor/pemeriksa berwenang sesuai assignment; simpan siapa penilai, waktu, skor, dan feedback. Laporkan esai yang melewati SLA maksimal 7 hari sesuai PRD.
- Progres/unlock level dan materi dihitung oleh backend; jangan menerima status lulus/progres final dari client.

ATURAN YANG BELUM FINAL: passing grade 70, maksimal 3 percobaan, jeda 24 jam, dan remedial mengulang level setelah 3 kegagalan ditandai perlu konfirmasi pada PRD. Jangan hardcode sebagai aturan final kecuali sudah ada persetujuan. Jika belum disetujui, simpan sebagai konfigurasi dengan nilai default yang jelas hanya untuk development, atau tandai endpoint/logic terkait terblokir sampai keputusan dibuat. Jangan menyamarkan asumsi ini.

Buat test untuk timer server, attempt expired, ownership, replay/duplicate submit, autosave race, answer key tidak bocor, grading role, nilai batas, serta progression. STOP setelah satu slice CBT yang dapat diuji; jangan mengerjakan semua modul lanjutan tanpa tahap berikutnya.
```

## PROMPT BACKEND 7 — Rating, feedback, sertifikat, dan ticketing

```text
Implementasikan hanya rating/feedback, sertifikat PDF, dan ticketing sesuai PRD serta kontrak API.

Rating/feedback:
- Rating 1–5, non-anonim, terkait kelas/mentor sesuai aturan PRD.
- Pengguna hanya dapat membuat rating jika memenuhi syarat partisipasi/akses yang disetujui.
- Edit satu kali dalam 7 hari sejak rating pertama sesuai PRD; backend menghitung batas waktunya.

Sertifikat:
- Terbitkan PDF dengan nomor unik setelah aturan kelulusan/progres yang disetujui terpenuhi.
- Sertifikat harus menyatakan ini sertifikat program internal dan bukan sertifikat resmi STCW.
- Unduhan hanya oleh pemilik/role yang memiliki izin. Verifikasi publik/QR masih keputusan terbuka; jangan membangun fitur publik sebelum disetujui.

Ticketing:
- Status Open, In Progress, Resolved, Closed dan riwayat perubahan.
- Taruna hanya melihat/mengelola tiketnya sendiri sesuai aturan; Admin support menangani tiket; Mentor tidak otomatis memperoleh akses support.
- Catat actor, waktu, perubahan status, dan komentar sesuai izin.

Tambahkan audit log, test akses lintas pengguna, status transisi ilegal, rating duplikat/edit kedua, nomor sertifikat duplikat, syarat penerbitan, serta unduhan tanpa izin. Jangan mengisi tiket/rating/sertifikat palsu pada production. STOP.
```

## PROMPT BACKEND 8 — Integrasi akhir, keamanan, dokumentasi, dan QA backend

```text
Lakukan audit penyelesaian backend terhadap PRD, architecture.md, api-specification.md, dan acceptance test. Jangan menambahkan fitur baru.

Checklist:
- Semua endpoint yang sudah diimplementasikan tercatat di Swagger/OpenAPI dan Postman Collection.
- Kontrak response/error, status HTTP, pagination, DTO, auth, dan role permission konsisten.
- Tidak ada endpoint yang membocorkan password, OTP, token, provider secret, answer key, atau data pribadi yang tidak diperlukan.
- Input validation, SQL injection/XSS-relevant output handling, rate limiting pada auth, CORS berbasis environment, audit log, soft delete/retention sesuai PRD, serta error logging aman ditinjau.
- Periksa transaction boundaries, foreign key/unique constraints, race conditions, dan indeks untuk query utama.
- Periksa semua aturan waktu UTC/Asia/Jakarta, enrollment, ownership, timer CBT, grading, absensi, ticket state, dan sertifikat.
- Konfigurasi production tidak menggunakan mock provider, seed development, atau secret default.
- Jalankan lint, typecheck, unit/integration tests, build, dan tes smoke yang benar-benar tersedia. Jangan menyatakan performance target tercapai tanpa pengukuran.
- Perbarui README, .env.example, migration/setup, docs API, dan catatan keputusan terbuka.

Buat ringkasan endpoint selesai/belum, daftar test beserta PASS/FAIL, masalah keamanan tersisa, dan blocker integrasi frontend. Jangan mengubah kontrak API yang dipakai frontend tanpa catatan perubahan dan persetujuan. STOP setelah laporan QA.
```

## PROMPT BACKEND 9 — Persiapan staging, backup, dan serah terima

```text
Fokus hanya pada kesiapan staging/operasional backend berdasarkan PRD. Jangan deploy ke production atau mengubah DNS/secret tanpa instruksi eksplisit dan akses yang sah.

- Dokumentasikan konfigurasi staging, environment variables, migrasi, proses start/build, health/readiness checks, dan rollback migrasi/deploy.
- Siapkan pipeline CI/CD dasar hanya jika akses dan struktur repository tersedia; secrets harus disimpan di secret manager/CI variables, bukan file repo.
- Dokumentasikan backup database dan metadata sesuai PRD: minimal bulanan, salinan utama di VPS mitra dan salinan off-site, retensi arsip minimal 12 bulan, uji restore berkala (triwulanan sebelum Go-Live dan semesteran sesudahnya). Catat bahwa backup bulanan berisiko kehilangan perubahan hingga sekitar 30 hari; backup harian adalah Change Request bila tidak disepakati.
- Buat SOP restore dan verifikasi hasil restore pada environment non-production. Jangan melakukan restore/destructive action pada production.
- Siapkan checklist UAT, daftar konfigurasi integrasi yang masih perlu kredensial/provider, known issues, dan runbook operasi.
- Jangan mengklaim kepatuhan, load capacity, backup sukses, atau deployment sukses tanpa bukti pengujian.

Jalankan pemeriksaan yang bisa dilakukan, tulis PASS/FAIL dan blocker. STOP.
```

## Template koreksi jika Codex keluar dari scope

```text
Berhenti dan jangan menambah fitur. Bandingkan perubahan terakhir dengan tahap yang sedang dikerjakan, PRD, docs/architecture.md, dan docs/api-specification.md. Sebutkan file/perubahan yang keluar scope, kembalikan hanya perubahan yang tidak diminta tanpa menghapus pekerjaan valid yang sudah ada, jalankan ulang test terkait, lalu laporkan status dan blocker. Jangan mengubah kontrak API atau keputusan [PERLU KONFIRMASI] tanpa persetujuan.
```
