# Architecture — E-Learning Sekolah Pelayaran Indonesia

- **Status:** Draft untuk review tim
- **Versi acuan produk:** PRD v1.8
- **Bahasa utama:** Bahasa Indonesia
- **Dokumen terkait:** `prd.md`, `api-specification.md`

> Dokumen ini menerjemahkan keputusan yang sudah tertulis di PRD menjadi rancangan teknis awal. Hal yang belum diputuskan di PRD ditandai **[PERLU KONFIRMASI]** dan tidak boleh dianggap sebagai keputusan klien.

## 1. Tujuan dan prinsip

Aplikasi adalah web e-learning responsif untuk Sekolah Pelayaran Indonesia. Arsitektur memisahkan UI dari business logic agar frontend dan backend dapat dikerjakan paralel.

Prinsip utama:

1. PRD v1.8 adalah sumber kebutuhan produk utama.
2. Frontend dan backend berada dalam satu repository, tetapi merupakan dua aplikasi terpisah.
3. Backend adalah sumber kebenaran untuk autentikasi, izin akses, timer CBT, penilaian, progres, absensi, penerbitan sertifikat, dan seluruh validasi business rule.
4. PostgreSQL menjadi database utama. Frontend tidak pernah mengakses database secara langsung.
5. Integrasi frontend–backend menggunakan REST API berprefix `/api/v1`.
6. Jangan menambahkan fitur di luar PRD tanpa persetujuan/Change Request.
7. Gunakan data sintetis hanya untuk development dan testing; jangan mengisi data produksi palsu.

## 2. Stack yang ditetapkan PRD

| Bagian | Teknologi | Ketentuan |
|---|---|---|
| Frontend | React + TypeScript + Vite | SPA responsif, mendukung desktop dan browser mobile |
| Backend | NestJS + TypeScript | REST API, validasi dan business logic di server |
| Database | PostgreSQL | Skema relasional dan constraint untuk menjaga konsistensi |
| Video | Bunny Stream | Video tidak di-stream dari server aplikasi; akses melalui integrasi/token yang aman |
| Live Lesson | Layanan eksternal, misalnya Zoom/Google Meet | Pilihan layanan/paket mengikuti PKS; peserta masuk dari tombol aplikasi, bukan menerima tautan langsung |
| Email | Email service | Digunakan untuk OTP, reset password, dan notifikasi yang disyaratkan PRD |
| API docs | Swagger/OpenAPI dan Postman Collection | Outline disiapkan awal, dokumentasi lengkap diperbarui selama implementasi |
| Hosting | VPS/server mitra Kodeintekno | Domain production, provider email, paket Live Lesson, dan beberapa detail deployment masih perlu konfirmasi |

**Belum ditetapkan oleh PRD:** ORM, library frontend routing/state management, strategi monorepo tooling, provider email spesifik, dan mekanisme transport token. Tim boleh mengusulkan pilihan implementasi, tetapi mencatatnya dalam keputusan teknis sebelum dipakai oleh kedua sisi.

## 3. Struktur repository

Gunakan satu repository Git dengan dua aplikasi terpisah:

```text
sekolah-pelayaran/
├── frontend/                 # React + TypeScript + Vite
│   ├── public/
│   └── src/
│       ├── app/              # bootstrap, providers, konfigurasi aplikasi
│       ├── routes/           # routing dan route guards berbasis UX
│       ├── layouts/          # layout umum dan dashboard per role
│       ├── components/       # komponen UI reusable
│       ├── features/         # fitur berdasarkan domain produk
│       ├── services/         # HTTP client dan API modules
│       ├── hooks/
│       ├── types/            # tipe bersama sisi frontend
│       └── lib/
├── backend/                  # NestJS + TypeScript
│   ├── src/
│   │   ├── main.ts
│   │   ├── app.module.ts
│   │   ├── common/            # guards, decorators, filters, pipes
│   │   ├── config/
│   │   ├── database/          # provider/repository database
│   │   ├── modules/
│   │   │   ├── auth/
│   │   │   ├── users/
│   │   │   ├── cohorts/
│   │   │   ├── enrollments/
│   │   │   ├── ship-categories/
│   │   │   ├── courses/
│   │   │   ├── chapters/
│   │   │   ├── materials/
│   │   │   ├── videos/
│   │   │   ├── live-lessons/
│   │   │   ├── assessments/
│   │   │   ├── progress/
│   │   │   ├── ratings/
│   │   │   ├── certificates/
│   │   │   ├── tickets/
│   │   │   ├── notifications/
│   │   │   └── audit-logs/
│   │   └── health/            # health/readiness endpoints
│   └── test/
├── docs/
│   ├── prd.md
│   ├── architecture.md
│   └── api-specification.md
├── .gitignore
└── README.md
```

Catatan:
- Nama folder modul adalah usulan pengorganisasian, bukan keharusan NestJS. Modul dapat digabung atau dipecah saat desain teknis/ERD difinalkan, tanpa mengubah kontrak API yang telah disepakati.
- Jangan membuat backend kedua di frontend (misalnya server API tambahan di Vite).
- Jangan menyimpan rahasia di repository. Setiap aplikasi memiliki `.env.example` berisi nama variabel dan placeholder saja.
- Hindari menambahkan workspace/package manager khusus kecuali tim memang memerlukannya dan telah menyepakatinya.

## 4. Branch dan cara kerja tim

Saran workflow:

- `main`: branch integrasi yang selalu dapat dibangun dan diuji.
- `backend`: branch kerja backend.
- `frontend`: branch kerja frontend.
- Buat Pull Request ke `main`; hindari push langsung ke `main`.
- Sebelum mulai fitur, sepakati kontrak endpoint, DTO, status, dan perilaku error yang diperlukan kedua sisi.
- Perubahan `docs/api-specification.md` yang berdampak pada integrasi harus dikomunikasikan dan direview oleh kedua developer.
- Integrasikan fitur secara vertikal sedikit demi sedikit (misalnya login, lalu kursus), bukan menunggu semua backend/frontend selesai.

Branch bernama `backend` dan `frontend` adalah workflow yang disarankan. Jika repository sudah memiliki konvensi branch lain, pertahankan konvensi yang ada dan sepakati padanannya.

## 5. Batas tanggung jawab

### Frontend

- Menampilkan UI, form, loading/empty/error states, navigasi, dan responsivitas.
- Validasi sisi klien hanya untuk pengalaman pengguna; backend tetap memvalidasi semua input.
- Mengirim request sesuai kontrak REST API dan menampilkan hasilnya.
- Menyembunyikan menu/aksi yang tidak relevan dengan role untuk UX, tetapi tidak dianggap sebagai kontrol keamanan.
- Tidak memuat secret Bunny Stream, secret email provider, private key, atau kunci jawaban CBT.
- Tidak menentukan sendiri nilai akhir, kelulusan, sisa waktu CBT, kehadiran resmi, atau hak akses materi.

### Backend

- Mengautentikasi identitas dan menerapkan role/permission di setiap endpoint terlindungi.
- Memvalidasi DTO, ownership, enrollment, status data, dan aturan business logic.
- Menjadi sumber kebenaran untuk timer CBT, autosave, pengiriman jawaban, auto-grading, status penilaian esai, progres/unlock, attendance, ticket status, dan certificate number.
- Mengelola transaksi database, constraint, audit log, soft delete, dan pengiriman notifikasi.
- Menyediakan API docs dan contoh request/response yang sinkron dengan implementasi.

## 6. Role dan kontrol akses

Role yang ditetapkan PRD:

- **Superadmin** — kewenangan administratif tertinggi, termasuk forced logout dan permanent delete yang diaudit.
- **Admin** — pengelolaan pengguna dan operasional sesuai permission yang disetujui; verifikasi Taruna dan ticket support.
- **Mentor** — akses kelas/materi yang menjadi kewenangannya, Live Lesson, absensi, serta penilaian esai sesuai penugasan.
- **Taruna** — akses materi, kelas, CBT, progres, rating/feedback, sertifikat dan tiket sesuai enrollment dan aturan unlock.

Rincian permission per aksi harus disepakati pada Fase 1. Jika permission spesifik belum ditentukan, implementasikan prinsip least privilege dan tandai sebagai keputusan terbuka; jangan otomatis memberi semua Admin/Mentor akses penuh.

## 7. Domain dan modul utama

1. **Identity & Access:** users, role, login, 2FA email OTP, reset password, sesi/refresh token, account status, import Taruna.
2. **Cohort & Enrollment:** Angkatan/Kelas dan hubungan Taruna; enrollment menentukan konten/ujian/live lesson yang tersedia.
3. **Learning Content:** kategori jenis kapal → kursus → bab → materi video.
4. **Video:** metadata dan thumbnail disimpan di aplikasi; media berada di Bunny Stream. Upload harus divalidasi, termasuk tipe/ukuran file dan pemeriksaan malware sesuai PRD.
5. **Live Lesson:** jadwal, mentor, peserta, perubahan jadwal, tombol masuk, absensi dan rekap.
6. **Assessment/CBT:** level 1–5, soal pilihan ganda/esai, attempt, timer server, autosave 30 detik, randomisasi yang tercatat, auto-grading, penilaian manual, dan SLA esai.
7. **Progress:** progres pembelajaran dan aturan membuka level/materi/sertifikat.
8. **Ratings & Feedback:** rating 1–5, tidak anonim; dapat diedit sekali dalam 7 hari sejak rating pertama sesuai PRD.
9. **Certificates:** PDF dengan nomor unik dan disclaimer bahwa sertifikat program ini bukan sertifikat resmi STCW. Verifikasi publik/QR masih perlu keputusan.
10. **Ticketing:** status Open, In Progress, Resolved, Closed beserta riwayat.
11. **Notifications:** email dan in-app untuk peristiwa yang disyaratkan PRD.
12. **Audit & Reporting:** log aktivitas penting dan pelaporan yang dibutuhkan Admin.

## 8. Aturan lintas sistem

### Waktu dan tanggal

- Simpan timestamp di database dalam UTC.
- Tampilkan waktu untuk pengguna dalam zona `Asia/Jakarta` (WIB, UTC+7).
- Aturan H-1 untuk reschedule dan batas 24 jam absensi dihitung oleh backend secara konsisten.

### Autentikasi

- 2FA email OTP wajib untuk seluruh role.
- Password minimal 8 karakter dan mengandung huruf serta angka.
- 5 login gagal berturut-turut: kunci sementara 15 menit.
- OTP 6 digit, kedaluwarsa 5 menit, maksimal 5 percobaan per kode, resend maksimal sekali setiap 60 detik.
- Jika email gagal terkirim 3 kali berturut-turut, kunci sementara 15 menit dan tulis audit log.
- Access token maksimal 1 jam; refresh token maksimal 30 hari, rotasi satu kali pakai dan dicabut saat logout.
- Maksimal 3 perangkat bersamaan; login perangkat ke-4 mencabut sesi terlama. Superadmin dapat forced logout.
- Reset password menggunakan tautan email sekali pakai yang kedaluwarsa setelah 1 jam.
- Mekanisme pemulihan akun selain reset email masih **[PERLU KONFIRMASI]**.

### CBT

- Timer authoritative berada di server; frontend hanya menampilkan sisa waktu berdasarkan timestamp/status dari server.
- Autosave target setiap 30 detik.
- Saat koneksi putus, jawaban tersimpan terakhir dapat dilanjutkan hanya selama waktu server belum habis.
- Pengiriman ganda harus idempotent.
- Kunci jawaban tidak pernah disertakan dalam payload soal untuk Taruna.
- Randomisasi soal dan pilihan jawaban per attempt harus dapat diaudit.
- Batas penilaian esai 7 hari kalender; keterlambatan ditandai dan dilaporkan kepada Admin.
- Passing grade 70, maksimal 3 percobaan, jeda 24 jam, dan remedial pengulangan level adalah default PRD yang masih harus dikonfirmasi klien sebelum dianggap final.

### Integrasi eksternal

- Bunny Stream dipakai untuk video. Secret/token dibuat di backend; jangan pernah menaruh secret di bundle frontend.
- Layanan Zoom/Meet dan paketnya **[PERLU KONFIRMASI sesuai PKS]**. Taruna masuk melalui tombol di aplikasi; jangan menampilkan/membagikan URL eksternal secara langsung sebagai pengganti alur aplikasi.
- Provider email spesifik **[PERLU KONFIRMASI]**.
- Notifikasi tambahan di luar email dan in-app **[PERLU KONFIRMASI]**.

## 9. Data, privasi, dan audit

- Password di-hash dengan algoritma password hashing yang sesuai; tidak pernah disimpan plaintext.
- Validasi semua input di server dan gunakan ORM/parameterized query.
- Terapkan proteksi XSS, SQL injection, CSRF sesuai mekanisme sesi, dan rate limiting pada endpoint sensitif.
- Jangan mengekspos stack trace atau detail internal ke client.
- Terapkan least privilege dan pemisahan secret antar environment.
- Registrasi Taruna memerlukan consent pemrosesan data pribadi sesuai UU PDP.
- Audit log dan hasil assessment disimpan minimal 5 tahun sesuai PRD; aturan retensi data lain mengikuti kebutuhan produk/UU PDP dan persetujuan klien.
- Soft delete untuk data hasil assessment/audit. Permanent delete hanya Superadmin dan harus tercatat di audit log.
- Penghapusan data pribadi harus mengikuti kebijakan UU PDP yang disepakati; jangan menyimpulkan bahwa retensi audit otomatis mengalahkan kewajiban hukum.

## 10. Environment dan deployment

Environment minimal:

- **Development:** dipakai developer; database dan akun pihak ketiga non-production bila tersedia.
- **Staging/UAT:** untuk integrasi dan acceptance test sebelum Go-Live.
- **Production:** server VPS mitra Kodeintekno, domain resmi dan HTTPS/SSL.

Aturan:
- Pisahkan environment variables dan kredensial tiap environment.
- Jangan menjalankan seed/reset destruktif di production.
- CI/CD dasar termasuk lint, typecheck, test dan build sebelum deploy.
- Backup database + metadata/thumbnail minimal bulanan, dengan salinan utama di VPS mitra dan salinan off-site; retensi arsip minimum 12 bulan sesuai PRD.
- Uji restore tiap kuartal sebelum Go-Live dan tiap semester setelahnya, dokumentasikan hasil.
- Video dikelola oleh Bunny Stream; backup aplikasi tidak boleh mengklaim membackup video dari Bunny kecuali mekanisme itu memang disepakati.
- Backup bulanan berpotensi kehilangan hingga 30 hari data. Backup harian merupakan Change Request bila tidak termasuk kesepakatan.
- Domain production, detail monitoring, kapasitas server, dan paket layanan eksternal harus dikonfirmasi.

## 11. Target performa awal

Target awal PRD, menunggu finalisasi pada Fase 1:

- 500 pengguna terdaftar.
- 100 pengguna bersamaan.
- p95 response time < 500 ms untuk API yang termasuk pengukuran.

Ruang lingkup endpoint, lingkungan uji, dan pengecualian endpoint berat (misalnya ekspor/PDF atau integrasi pihak ketiga) harus disepakati sebelum UAT. Jangan mengklaim target tercapai tanpa hasil pengujian yang tercatat.

## 12. Definition of Done teknis

Sebuah fitur siap diintegrasikan jika:

- sesuai PRD dan API specification yang disepakati;
- autentikasi, permission, ownership, dan enrollment diuji;
- input divalidasi server-side;
- skenario sukses, gagal, batas, dan akses terlarang diuji;
- perubahan schema/migration terdokumentasi dan aman;
- error response konsisten dan tidak membocorkan rahasia;
- lint, typecheck, unit/integration tests dan build yang relevan lolos;
- frontend dan backend diuji bersama untuk fitur terkait;
- API docs diperbarui.

Go-Live hanya setelah bug kritis selesai, keamanan yang disepakati terpenuhi, UAT disetujui, deployment dan dokumentasi siap, serta persetujuan deployment diterima.

## 13. Keputusan terbuka sebelum baseline final

1. Transport access/refresh token (misalnya Bearer access token + refresh token pada HttpOnly cookie) dan konfigurasi CORS/CSRF.
2. ORM dan strategi migration PostgreSQL.
3. Provider email dan konfigurasi domain pengirim.
4. Penyedia/paket layanan Zoom atau Google Meet dan metode join yang disepakati PKS.
5. Konfirmasi aturan assessment: passing grade, jumlah attempt, jeda, remedial.
6. Peran yang boleh membuat/mengubah materi, soal, jadwal, rating, sertifikat dan setiap status tiket.
7. Sertifikat: apakah perlu verifikasi publik dan QR.
8. Target performa final dan metode uji UAT.
9. Notifikasi tambahan di luar email/in-app.
10. Domain production, monitoring, serta batasan SLA bug kritis/minor.
11. Detail pengelolaan materi/bank soal dan format impor final dari klien.

Keputusan harus dicatat bersama dalam dokumen teknis/decision log sebelum memengaruhi kedua implementasi.
