# PRD Ringkas — Web Apps Sekolah Pelaut Indonesia

**Versi:** Ringkasan PRD v1.8 (Draft untuk review dan validasi)  
**Klien/stakeholder:** Pak Mulya / Pak Mulyana  
**Pengembang:** PT Kodeintekno Cipta Solusi  
**Target proyek:** 19 Oktober 2026–19 Februari 2027  
**Platform:** Responsive Web Application  
**Stack:** React + TypeScript + Vite (front-end), NestJS + TypeScript (back-end), PostgreSQL (database), REST API.

> Dokumen ini merangkum kebutuhan utama tanpa menggantikan PRD lengkap, MOU/kontrak, spesifikasi teknis, atau keputusan yang masih perlu disepakati.

## 1. Ringkasan Produk dan Tujuan

Web Apps Sekolah Pelaut Indonesia adalah platform e-learning untuk pendidikan awal taruna maritim. Sistem menggabungkan materi berdasarkan jenis kapal, video pembelajaran, kelas langsung bersama mentor, ujian kompetensi lima level, pemantauan progres, sertifikat digital, dan layanan pengaduan.

Tujuan utama:
- Menyusun materi secara terstruktur berdasarkan **Kategori Kapal → Kursus → Bab → Materi Video**.
- Mendukung belajar mandiri dan kelas bersama mentor.
- Menyelenggarakan CBT lima level dan mencatat hasil serta progres taruna.
- Menyediakan dashboard sesuai peran, rating/feedback, sertifikat, dan ticketing.
- Menjaga keamanan akun, data pribadi, hasil ujian, dan hak akses.

### Kriteria keberhasilan
- Seluruh endpoint terlindungi menolak akses tanpa autentikasi dan akses lintas peran yang tidak berwenang.
- Minimal 95% taruna uji dapat menyelesaikan alur materi → assessment → hasil tanpa bantuan saat UAT.
- Nilai tersimpan sesuai hasil evaluasi; progres hanya berubah melalui proses yang sah.
- Koreksi esai diselesaikan maksimal 7 hari kalender atau ditandai terlambat dan dilaporkan ke Admin.
- Video dan ticketing lulus pengujian integrasi; tidak ada bug kritis terbuka; UAT disetujui sebelum Go-Live.

## 2. Pengguna dan Hak Akses

- **Superadmin:** hak akses tertinggi; mengelola akun/hak akses utama dan menerima akses infrastruktur saat serah terima.
- **Admin:** mengelola akun dan status pengguna, kategori kapal, materi, operasional pembelajaran, serta tiket pengaduan.
- **Mentor:** mengelola jadwal/kelas sesuai kewenangan, melihat peserta dan progres, memantau assessment, menilai esai, serta memberi feedback.
- **Taruna:** belajar, menonton video, mengikuti kelas dan CBT, melihat nilai/progres/sertifikat, memberi rating, serta membuat tiket.

Antarmuka menggunakan Bahasa Indonesia dan harus responsif di desktop, tablet, dan browser mobile. Aksesibilitas minimum meliputi kontras yang terbaca, navigasi keyboard, dan label ramah pembaca layar. “Support” bukan peran tersendiri; petugas ticketing adalah Admin.

## 3. Ruang Lingkup Fitur

### 3.1 Fitur yang termasuk MVP
1. Registrasi/login, pengelolaan akun, RBAC, dan 2FA Email/OTP untuk **semua peran**.
2. Enrollment taruna ke Angkatan/Kelas; keanggotaan menentukan materi, assessment, dan Live Lesson yang tersedia.
3. Materi berdasarkan kategori jenis kapal, kursus, bab, dan video.
4. Live Lesson yang dijadwalkan Mentor/Admin menggunakan layanan eksternal (mis. Zoom/Meet sesuai PKS), dengan tombol **Masuk Kelas** di aplikasi dan pencatatan absensi.
5. CBT lima level: pilihan ganda dan esai, timer, autosave, auto-grading pilihan ganda, penilaian manual esai, hasil dan progres.
6. Rating taruna terhadap kelas/mentor, feedback, sertifikat PDF bernomor unik.
7. Dashboard Superadmin, Admin, Mentor, dan Taruna.
8. Video melalui Bunny Stream dengan token authentication.
9. Ticketing dengan status Open, In Progress, Resolved, Closed.
10. REST API dan dokumentasi Swagger/Postman Collection.
11. Environment development/staging/production, Git, CI/CD dasar, deployment VPS, domain, SSL, backup, pengujian, UAT, dokumentasi, pelatihan, dan serah terima.

### 3.2 Di luar ruang lingkup
- Aplikasi native Android/iOS.
- Pembuatan kurikulum dan isi bank soal oleh tim pengembang; konten disediakan klien.
- Sistem live streaming mandiri dari nol.
- Integrasi pihak ketiga atau fitur baru yang belum disepakati.
- Verifikasi publik/QR sertifikat, notifikasi WhatsApp/push/pengingat otomatis, impor bank soal selain CSV/Excel, impor akun lebih dari 500 baris, multi-bahasa, aksesibilitas lanjutan, serta backup lebih sering dari bulanan.

Fitur di luar ruang lingkup harus melalui **Change Request** dan persetujuan pihak terkait.

## 4. Kebutuhan Fungsional Utama

### 4.1 Autentikasi dan akun
- Registrasi mandiri hanya untuk Taruna; akun Taruna nonaktif sampai diverifikasi Admin. Akun Mentor/Admin/Superadmin dibuat oleh pihak berwenang.
- Registrasi Taruna memerlukan persetujuan pemrosesan data pribadi sesuai UU PDP. Admin dapat mengimpor akun melalui CSV/Excel maksimal 500 baris per berkas; baris gagal dilaporkan tanpa membatalkan seluruh impor.
- Password minimal 8 karakter, kombinasi huruf dan angka. Setelah 5 login gagal berturut-turut, akun dikunci 15 menit.
- Reset password melalui tautan email yang berlaku 1 jam dan sekali pakai.
- 2FA Email/OTP wajib untuk semua peran: OTP 6 digit berlaku 5 menit, maksimal 5 percobaan per kode, resend maksimal sekali per 60 detik. Kegagalan pengiriman email 3 kali berturut-turut memicu penguncian sementara 15 menit dan audit log.
- Access token maksimal 1 jam; refresh token maksimal 30 hari, sekali pakai/rotasi, dicabut saat logout. Maksimal 3 perangkat bersamaan; login perangkat ke-4 mencabut sesi terlama. Superadmin dapat memaksa logout pengguna.

### 4.2 Materi pembelajaran dan video
- Kategori awal: Bulk Carrier, Tanker, Container Ship, Passenger Ship, dan kategori tambahan yang disetujui.
- Admin/peran berwenang mengelola data kategori dan materi. Taruna hanya melihat materi yang tersedia untuk Angkatan/Kelasnya.
- Video di-host dan di-stream hanya melalui Bunny Stream (HLS adaptif); server aplikasi tidak mengalirkan file video secara langsung. Rahasia provider tidak boleh terekspos di API.
- Klien menyerahkan video mentah; tim/Admin mengunggahnya ke Bunny Stream lalu mengisi metadata dan thumbnail. Thumbnail JPG/PNG maksimal 2 MB dan 1920×1080; unggahan divalidasi di server dan dipindai malware.

### 4.3 Live Lesson
- Mentor/Admin membuat jadwal. Perubahan jadwal atau pembatalan hanya oleh Mentor/Admin pemilik kelas, paling lambat H-1, dengan pemberitahuan email dan in-app kepada peserta terdaftar.
- Tautan eksternal tidak dibagikan langsung kepada taruna. Taruna masuk lewat tombol **Masuk Kelas** agar kehadiran tercatat otomatis.
- Mentor dapat mengoreksi absensi secara manual; rekap dapat dilihat/diekspor oleh Mentor/Admin. Absensi ditutup otomatis 24 jam setelah sesi berakhir.
- Layanan konferensi dan paket berbayar mengikuti kesepakatan PKS.

### 4.4 CBT dan progres
- Mendukung Level 1–5, soal pilihan ganda dan esai, bank soal berdasarkan level/kategori kapal, timer yang dihitung server, serta autosave jawaban setiap 30 detik.
- Jika koneksi terputus, taruna dapat melanjutkan dari jawaban tersimpan terakhir selama timer belum habis. Pengiriman ganda ditangani secara idempoten; urutan soal dan pilihan diacak serta dicatat untuk audit. Kunci jawaban tidak boleh terekspos sebelum/saat ujian.
- Pilihan ganda dinilai otomatis; esai dinilai manual oleh pemeriksa berwenang maksimal 7 hari kalender. Jika terlambat, status ditandai dan dilaporkan ke Admin.
- Aturan default (perlu konfirmasi klien pada Fase 1): passing grade 70, maksimal 3 percobaan, jeda minimal 24 jam, dan remedial berupa pengulangan level dari awal setelah gagal 3 kali.
- Klien menyediakan bank soal; Admin mengimpor CSV/Excel dengan validasi per baris.
- Kelulusan mengatur progres serta pembukaan level/materi/sertifikat sesuai business logic yang disepakati.

### 4.5 Rating, feedback, sertifikat
- Taruna memberi rating kelas/mentor skala 1–5; rating tidak anonim dan dapat diubah satu kali dalam 7 hari setelah pemberian pertama.
- Sertifikat berupa PDF bernomor unik, diterbitkan hanya jika syarat kelulusan terpenuhi. Sertifikat adalah **sertifikat internal program Sekolah Pelaut Indonesia, bukan sertifikat resmi STCW**.
- Keputusan apakah sertifikat membutuhkan halaman verifikasi publik/QR dibuat sebelum Fase 3; QR/halaman verifikasi tidak termasuk MVP.

### 4.6 Dashboard dan ticketing
- **Taruna:** materi, progres, assessment/nilai, jadwal, video, sertifikat, status tiket.
- **Mentor:** kelas/jadwal/peserta, progres dan hasil yang berwenang diakses, antrean koreksi esai, feedback.
- **Admin:** akun, kategori/materi, ringkasan pembelajaran/assessment, aktivitas operasional, ticketing.
- **Superadmin:** seluruh ringkasan Admin serta pengelolaan akun/hak akses utama.
- Tiket menyimpan judul, deskripsi, kategori, pelapor, waktu, status, dan riwayat perubahan. Pelapor hanya melihat tiket miliknya; perubahan status hanya oleh pihak berwenang.

## 5. Kebutuhan Nonfungsional

### Keamanan dan privasi
- HTTPS/SSL untuk produksi; password di-hash; validasi input di back-end; proteksi XSS/SQL injection; prinsip least privilege; kredensial layanan disimpan aman dan tidak di repository.
- Data pribadi diproses seperlunya dengan persetujuan dan mengikuti UU PDP. Data sensitif dibatasi berdasarkan peran; aktivitas penting, perubahan hak akses, dan pengelolaan nilai diaudit.
- Audit log dan hasil assessment disimpan minimal 5 tahun. Penghapusan menggunakan soft delete; penghapusan permanen hanya oleh Superadmin dan tercatat di audit log, dengan tetap memperhatikan permintaan penghapusan data pribadi yang disetujui.

### Performa dan kompatibilitas
- Target awal untuk divalidasi pada Fase 1: 500 pengguna terdaftar, 100 pengguna bersamaan, dan p95 endpoint biasa di bawah 500 ms. Angka final menjadi kriteria UAT, bukan SLA yang sudah disepakati.
- API memakai JSON, data besar mendukung pagination, dan waktu disimpan dalam ISO 8601 UTC serta ditampilkan/dioperasikan dalam WIB (UTC+7).

### Backup dan pemeliharaan
- Backup otomatis minimal bulanan untuk snapshot database PostgreSQL dan metadata/thumbnail; video mengikuti retensi Bunny Stream. Salinan utama di server mitra Kodeintekno dan salinan off-site; retensi arsip minimal 12 bulan.
- SOP backup harus terdokumentasi dan dapat diaudit. Restore diuji minimal sekali per kuartal sebelum Go-Live dan sekali per semester setelah Go-Live.
- Risiko backup bulanan: data yang hilang dapat mencapai 30 hari. Backup harian hanya jika disetujui lewat Change Request.
- Maintenance satu tahun setelah Go-Live untuk bug fixing dan revisi minor sesuai MOU/SLA. Definisi bug, revisi minor, dan waktu respons dukungan harus ditegaskan dalam kontrak.

## 6. Arsitektur dan Data

**Komponen:** React + TypeScript/Vite (front-end, Khenzo); NestJS/TypeScript REST API (back-end, Rafi); PostgreSQL; Bunny Stream untuk video; Zoom/Meet atau layanan eksternal sesuai PKS untuk Live Lesson; Email Service untuk OTP/notifikasi; VPS produksi mitra Kodeintekno, Git, CI/CD dasar, SSL, logging, monitoring/error tracking, dan automated backup.

API harus menerapkan autentikasi/otorisasi, validasi dan aturan bisnis di back-end, respons/error konsisten tanpa stack trace/rahasia, serta dokumentasi yang diperbarui. ERD, flowchart, user journey, dan kontrak API awal disusun pada Fase 1; dokumentasi final berupa Swagger/Postman Collection.

Entitas inti database: Users, Roles/Permissions, Cohorts/Angkatan, Enrollments, User 2FA, Ship Categories, Courses, Chapters, Learning Materials/Videos, Live Lessons/Participants/Attendance, Assessments, Questions/Answer Options, Attempts/Answers, Manual Grades/Results, Learning Progress, Ratings/Feedback, Certificates, Tickets/Ticket History, dan Audit Logs.

## 7. User Flow Utama

1. **Registrasi/login:** Taruna mendaftar, menyetujui pemrosesan data, diverifikasi Admin, menyelesaikan 2FA; sistem mengarahkan pengguna ke dashboard sesuai peran.
2. **Belajar:** Taruna memilih kategori kapal → kursus → bab → materi/video. Progres dicatat sesuai aturan yang diaktifkan.
3. **Assessment:** Sistem memeriksa kelayakan; timer dimulai; jawaban disimpan dan dikirim; pilihan ganda dinilai otomatis, esai masuk antrean koreksi; hasil/progres dan kelayakan level berikutnya diperbarui.
4. **Live Lesson:** Mentor/Admin menjadwalkan kelas; taruna melihat jadwal dan masuk lewat aplikasi; absensi dicatat; Mentor memantau kelas dan koreksi esai.
5. **Pengaduan:** Pengguna membuat tiket; Admin meninjau dan memperbarui status hingga selesai; pelapor memantau statusnya.

## 8. Tim dan Tanggung Jawab

| Peran | PIC | Tanggung jawab utama |
|---|---|---|
| Project Manager / Support | Kak Irwan (perlu klarifikasi terhadap workbook) | Koordinasi, kebutuhan, hambatan, UAT, dan serah terima |
| Front-End + UI/UX | Khenzo | Antarmuka, prototipe, integrasi API dari sisi UI |
| Backend + QA | Rafi | Arsitektur backend/database, REST API, autentikasi, pengujian backend dan end-to-end |
| Klien/reviewer | Pak Mulya bersama PMO | Validasi kebutuhan, konten, BAST, UAT, dan penerimaan |

Rafi dan Khenzo berkolaborasi pada integrasi. Pengujian sebaiknya mendapat review silang dengan PM/Support sejauh sumber daya memungkinkan. PIC teknis pada sebagian aktivitas WBS masih kosong. Perbedaan nama PM pada workbook (Kak Irwan vs Kak Yudi/Kak Adi & Yudi) perlu diklarifikasi.

## 9. Jadwal dan Milestone

| Fase | Rentang target | Fokus |
|---|---|---|
| 0. Pra-proyek | 19–30 Okt 2026 | MOU, DP, kick-off |
| 1. UI/UX & spesifikasi | 2–27 Nov 2026 | Kebutuhan, arsitektur, database, prototipe, BAST-1 |
| 2. Core Web App & Live Lesson | 30 Nov 2026–8 Jan 2027 | Setup, auth + 2FA, modul kapal, Live Lesson, BAST-2 |
| 3. Assessment & video | 11–29 Jan 2027 | CBT 5 level, bank soal, rating, sertifikat, dashboard, video |
| 4. Ticketing & integrasi | 1–8 Feb 2027 | Ticketing, produksi, refactoring/API hardening, BAST-3/4 |
| 5. QA, UAT & Go-Live | 9–19 Feb 2027 | QA, UAT, deployment, training, handover, BAST akhir |

Tanggal selesai **19 Februari 2027 tetap menjadi target mengikat**; label M1–M21 pada workbook adalah urutan kerja, bukan minggu kalender. Jika MOU/DP/kick-off terlambat, jadwal perlu direvisi oleh PMO; pemangkasan scope MVP dipakai agar jadwal tetap realistis. Materi dan bank soal dari klien, keputusan layanan/paket, dan respons BAST/UAT merupakan dependensi penting.

### Nilai proyek dan pembayaran
- Nilai pengembangan: **Rp15.000.000**.
- Milestone 1 — DP: 30%.
- Milestone 2 — persetujuan Fase 1: 20%.
- Milestone 3 — verifikasi Fase 2: 25%.
- Milestone 4 — verifikasi Fase 3–4: 15%.
- Milestone 5 — serah terima akhir dan training: 10%.
- Verifikasi BAST maksimal 5 hari kerja setelah deliverable disetujui.

### Biaya infrastruktur dan layanan pihak ketiga
- Paket infrastruktur tahunan: Ekonomis Rp1.500.000; Standar Rp3.000.000; Premium Rp5.000.000. Klien memilih sebelum Fase 4.
- Klien menanggung biaya Bunny Stream, layanan video conference berbayar, dan email service, baik melalui paket infrastruktur maupun tagihan terpisah sesuai MOU.

## 10. Pengujian dan Definition of Done

Pengujian meliputi unit test backend (validasi, business logic, nilai, akses, database, progres/sertifikat), API test (autentikasi, otorisasi, input, error, akses lintas peran), integration test (login sampai dashboard, materi, CBT, progres, sertifikat, ticketing), security test (akses tanpa izin, kebocoran data, XSS/SQL injection, rahasia konfigurasi), black-box, stress test ringan, dan responsivitas mobile/tablet/desktop.

UAT dilakukan bersama klien, Admin/Superadmin, perwakilan Mentor dan Taruna. **Go-Live hanya setelah** fitur scope selesai, bug kritis ditutup, pengujian keamanan lolos, klien menyetujui UAT, dokumentasi/SOP tersedia, dan deployment disetujui.

Fitur dinyatakan selesai jika sesuai spesifikasi yang disetujui, validasi dan hak akses benar, pengujian lolos, tidak ada bug kritis, API/data terdokumentasi, integrasi terverifikasi, perubahan kode direview, dan kriteria penerimaan terpenuhi. Proyek selesai setelah UAT, deployment, dokumentasi, SOP, training, dan serah terima.

## 11. Keputusan yang Masih Terbuka

1. Mekanisme pemulihan akun selain reset password melalui email.
2. Paket/biaya layanan video conference eksternal untuk Live Lesson.
3. Konfirmasi aturan CBT default: passing grade 70, maksimal 3 percobaan, jeda 24 jam, dan remedial setelah gagal 3 kali.
4. Apakah sertifikat memerlukan verifikasi publik/QR (tidak termasuk MVP).
5. Angka final kapasitas, concurrent users, p95, dan uptime untuk UAT.
6. Apakah perlu notifikasi tambahan di luar OTP dan email/in-app untuk perubahan jadwal.
7. Definisi bug kritis, revisi minor, dan SLA maintenance dalam MOU/SLA.
8. PIC teknis yang masih kosong dan perbedaan nama PM pada workbook.
9. Nama domain utama produksi.
10. Business logic final: kewenangan membuat/mengubah materi, soal, jadwal, rating, sertifikat, serta aturan enrollment.

## 12. Risiko Utama dan Mitigasi

- **Materi/bank soal terlambat:** klien menetapkan format dan tenggat penyerahan.
- **Jadwal padat atau kick-off terlambat:** tanggal akhir tetap; PMO menerbitkan revisi jadwal bila perlu dan fitur non-MVP masuk Change Request.
- **Kontrak/MOU belum final:** selesaikan klausul kepemilikan, IP, source code, domain, merek, keamanan, dan tanggung jawab pihak ketiga.
- **Kontrak API tidak sinkron:** dokumentasikan kontrak API dan lakukan review bersama sebelum integrasi.
- **PIC dan reviewer belum lengkap:** tetapkan penanggung jawab setiap deliverable.
- **BAST/UAT terlambat:** jadwalkan verifikasi dan respons klien sejak awal fase.
- **Backup tidak dapat dipulihkan:** uji restore sesuai jadwal dan dokumentasikan hasilnya.

## 13. Kepemilikan dan Serah Terima

Kepemilikan kode sumber, domain, merek, dan infrastruktur diatur dalam MOU/kontrak. Seluruh konten pembelajaran—kurikulum, bank soal, dan video—merupakan milik klien; tim pengembang mengelola serta menampilkannya sesuai hak akses. Saat handover, tim menyerahkan source code/dokumen dan akses utama ke Superadmin, hosting, domain, Bunny Stream, email service, dan monitoring sesuai kontrak.

## 14. Deliverable Utama

- MOU final dan persetujuan kebutuhan.
- Dokumen spesifikasi teknis, ERD, flowchart, user journey, serta prototipe UI/UX yang disetujui.
- Modul klasifikasi kapal dan Live Lesson.
- CBT lima level, bank soal, rating, feedback, sertifikat, dashboard empat peran.
- Modul video Bunny Stream dan ticketing.
- REST API dan dokumentasi Swagger/Postman.
- Laporan QA/security test, UAT sign-off, deployment produksi + SSL, SOP backup, dokumentasi operasional, training, dan BAST akhir.
- Maintenance satu tahun pasca Go-Live.

**Catatan:** Status yang tercatat pada PRD v1.8: MOU masih In Progress (50%); DP dan kick-off belum berjalan per 29 Oktober 2026; aktivitas lain berstatus Not Started. Status ini perlu diperbarui saat dokumen digunakan.
