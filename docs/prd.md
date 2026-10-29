# PRODUCT REQUIREMENTS DOCUMENT (PRD)
## Web Apps — Sekolah Pelayaran Indonesia

**Versi:** 1.8 — Draft (tindak lanjut review eksternal: jadwal realistis, 2FA semua peran, enrollment, CBT lengkap, disclaimer STCW; tanggal selesai mengikat 19 Februari 2027)
**Status:** Draft untuk review dan validasi
**Perusahaan pengembang:** PT Kodeintekno Cipta Solusi
**Stakeholder utama:** Pak Mulya / Pak Mulyana
**Target mulai proyek:** 19 Oktober 2026
**Target penyelesaian:** 19 Februari 2027
**Platform:** Responsive Web Application
**Arsitektur komunikasi:** REST API
**Stack front-end:** React + TypeScript (SPA, dibangun dengan Vite)
**Stack back-end:** NestJS (TypeScript)
**Database:** PostgreSQL
**Alasan pemilihan:** satu bahasa (TypeScript) untuk front-end dan back-end sehingga Rafi (Backend) dan Khenzo (Front-End) memakai kontrak tipe yang sama; React SPA ringan dan hosting statisnya murah; NestJS memberi struktur modular untuk 4 peran, kontrol akses berbasis peran (RBAC), dan audit; PostgreSQL andal untuk relasi hierarki Kategori → Kursus → Bab → Materi, hasil assessment, dan kebutuhan audit/retensi; PostgreSQL dijalankan dan di-backup pada VPS server mitra (lihat §6.1 butir 7, §5.4).
**Lokasi pilot / fokus khusus:** Pembelajaran siswa maritim — lokasi fisik pilot ditetapkan kemudian (TBD); tidak memengaruhi desain sistem.
**Dasar dokumen:** Scope Confirmation No. PPA/MLY-SC/VIII/2026 dan Proposal Project Awal No. PPA/MLY-EL/VIII/2026, kode MLY-E01
**Sumber acuan tim & jadwal:** Workbook `Maritim Team & Timeline.xlsx` — 4 sheet: `Executive Summary`, `Breaf & Team`, `Project Timeline` (WBS 0.1–5.4, Gantt M1–M21), `Deliverable & Scope Log` (DLV-01–DLV-12)
**Rincian tahapan pekerjaan:** `detail_fase_pekerjaan_SPI.md` (Fase 1–5, M1–M21) — bila bertentangan dengan workbook soal tanggal atau PIC, §10 PRD ini yang berlaku

---

# 1. Ringkasan Produk

## 1.1 Latar Belakang

Web Apps — Sekolah Pelayaran Indonesia merupakan platform pembelajaran digital yang dikembangkan untuk mendukung pendidikan awal taruna di bidang maritim.

Platform ini dirancang untuk mengintegrasikan materi pembelajaran berdasarkan klasifikasi jenis kapal, pembelajaran bersama mentor secara real-time, evaluasi kompetensi berstandar maritim internasional (acuan STCW / Maritime Trainer), video pembelajaran, serta pemantauan perkembangan belajar dalam satu sistem.

Aplikasi dikembangkan sebagai sistem proprietary (custom) yang kepemilikannya diatur dalam MOU/kontrak kerja resmi, sehingga pengelolaan sistem dapat disesuaikan dengan kebutuhan institusi tanpa beban biaya lisensi berulang per pengguna dari platform e-learning umum. Kode sumber, domain, merek, dan infrastruktur diatur dalam MOU; sedangkan seluruh konten pembelajaran (materi kurikulum, bank soal, dan video pembelajaran) adalah milik klien (Pak Mulya) — tim pengembang hanya mengelola dan menampilkannya sesuai hak akses.

## 1.2 Permasalahan

Kebutuhan utama yang hendak diselesaikan adalah:

1. Materi pembelajaran maritim perlu disusun berdasarkan kategori dan struktur pembelajaran yang jelas.
2. Taruna membutuhkan fasilitas untuk belajar mandiri sekaligus mengikuti pembelajaran bersama mentor.
3. Proses evaluasi kompetensi perlu mempunyai struktur berjenjang dan pencatatan hasil.
4. Mentor dan admin membutuhkan sarana untuk memantau kegiatan serta perkembangan pembelajaran. Superadmin membutuhkan kendali penuh atas akun dan hak akses.
5. Pengelolaan video pembelajaran dan laporan kendala pengguna perlu terintegrasi dalam sistem.
6. Aplikasi membutuhkan mekanisme keamanan akun dan pengelolaan hak akses yang sesuai dengan peran pengguna.

## 1.3 Tujuan Produk

Produk ini bertujuan untuk:

- Menyediakan platform e-learning khusus pendidikan maritim.
- Mengelola materi berdasarkan klasifikasi jenis kapal.
- Mendukung interaksi pembelajaran antara mentor dan taruna.
- Menyelenggarakan assessment lima level dan mencatat hasil evaluasi.
- Menyediakan dashboard untuk Superadmin, Admin, Mentor, dan Taruna.
- Mengintegrasikan video pembelajaran serta sistem pengaduan.
- Menjaga keamanan akun, data pembelajaran, dan akses sistem.
- Menyediakan sistem yang dapat dipelihara dan dikembangkan setelah peluncuran.

## 1.4 Indikator Keberhasilan

Produk dinyatakan memenuhi tujuan awal apabila:

- Seluruh peran pengguna (Superadmin, Admin, Mentor, Taruna) lolos matriks uji hak akses Fase 5: 100% endpoint terlindungi menolak akses tanpa token dan menolak lintas peran yang tidak berwenang.
- Minimal 95% taruna uji dapat menyelesaikan alur materi → assessment → lihat hasil tanpa bantuan dalam skenario UAT.
- Mentor dapat menjalankan fungsi pembelajaran dan memantau hasil belajar (termasuk antrian koreksi esai ≤7 hari).
- Admin dapat mengelola data operasional yang menjadi kewenangannya.
- 100% nilai tersimpan sama dengan hasil evaluasi pada uji sampling; tidak ada perubahan progres tanpa peristiwa yang sah.
- Video pembelajaran dan ticketing lolos skenario integrasi (play HLS + lifecycle tiket Open→Closed).
- Seluruh skenario security testing §11.4 lolos dan tidak ada bug kritis terbuka.
- Sistem memperoleh sign-off UAT dan siap digunakan di lingkungan produksi.

Target numerik final (concurrent users, p95, uptime) ditetapkan pada Fase 1 dan menjadi kriteria UAT (lihat §5.2).

---

# 2. Target Pengguna

Peran yang didukung: Superadmin, Admin, Mentor, dan Taruna (sesuai `detail_fase_pekerjaan_SPI.md` Fase 1–2). Superadmin memegang hak akses tertinggi, termasuk pengelolaan akun dan penyerahan hak akses utama saat handover (akun Superadmin, hosting, domain, akun Bunny Stream, akun email service, dan akun monitoring). "Support" bukan peran sistem tersendiri: yang dimaksud dengan label "Admin/Support" pada fitur ticketing adalah pengguna berperan Admin yang menangani tiket.

Bahasa antarmuka default adalah Bahasa Indonesia. Kebutuhan aksesibilitas minimum (kontras warna yang terbaca, navigasi keyboard, dan label yang ramah pembaca layar) diterapkan pada halaman utama; kebutuhan multi-bahasa atau aksesibilitas lanjutan di luar itu masuk Change Request.

## 2.1 Taruna

Taruna adalah pengguna utama yang mengikuti proses pembelajaran.

Kebutuhan:
- Registrasi dan login, serta mengamankan akun menggunakan 2FA via Email/OTP.
- Melihat materi berdasarkan jenis kapal.
- Mengakses video pembelajaran.
- Melihat jadwal dan mengikuti kelas mentor (termasuk absensi dan akses masuk sesi live).
- Mengikuti assessment lima level dalam format Computer Based Test (CBT).
- Melihat hasil ujian dan progres belajar.
- Memberikan rating pada kelas/mentor yang diikuti.
- Melihat feedback mentor dan sertifikat digital jika memenuhi persyaratan.
- Mengirim laporan melalui sistem ticketing.

## 2.2 Mentor

Mentor bertugas mendampingi proses pembelajaran dan memantau perkembangan taruna.

Kebutuhan:
- Registrasi dan login dengan 2FA via Email/OTP.
- Mengakses dashboard mentor.
- Membuat jadwal Live Lesson serta mengelola atau menjalankan kelas sesuai kewenangan.
- Melihat peserta dan jadwal kelas.
- Memantau progres taruna, memeriksa ujian esai, dan memantau hasil assessment.
- Memberikan feedback sesuai aturan sistem.
- Menangani aktivitas pembelajaran yang menjadi tanggung jawabnya.

## 2.3 Admin

Admin bertanggung jawab atas pengelolaan operasional aplikasi.

Kebutuhan:
- Mengakses dashboard administrasi.
- Mengelola akun pengguna dan status akun.
- Mengelola data jenis kapal dan struktur materi.
- Mengelola data pembelajaran sesuai hak akses.
- Menangani tiket pengaduan melalui dashboard khusus Admin/Support (status Open, In Progress, Resolved, Closed).
- Memantau aktivitas, hasil evaluasi, dan progres.
- Mengakses informasi operasional yang dibutuhkan untuk pengelolaan sistem.

Detail pembagian kewenangan Superadmin, Admin, Mentor, dan Taruna dikonfirmasi melalui validasi kebutuhan (Fase 1: business logic, ERD, flowchart, user journey).

---

# 3. Ruang Lingkup Produk

## 3.1 Fitur yang Termasuk

1. Autentikasi dan manajemen pengguna (registrasi, login, manajemen peran Superadmin/Admin/Mentor/Taruna).
2. Kontrol akses berbasis peran.
3. Autentikasi dua faktor via Email/OTP untuk seluruh peran (Superadmin, Admin, Mentor, Taruna).
4. Modul pembelajaran berdasarkan klasifikasi kapal.
5. Mentor Live Lesson (penjadwalan oleh Mentor/Admin; integrasi link sharing atau embedded video conference).
6. Assessment lima level (CBT: pilihan ganda dan esai, timer, auto-grading, penilaian manual).
7. Integrasi bank soal dan evaluasi maritim.
8. Pelacakan progres belajar (termasuk logika unlock materi/sertifikat berdasarkan kelulusan level).
9. Rating taruna terhadap kelas/mentor dan feedback.
10. Sertifikat digital.
11. Dashboard Superadmin, Admin, Mentor, dan Taruna.
12. Video pembelajaran (hierarki Kategori (jenis kapal) → Kursus → Bab → Materi Video; hosting Bunny Stream dengan token authentication).
13. Sistem pengaduan atau ticketing (dashboard khusus Admin/Support).
14. REST API antara front-end dan back-end (dokumentasi Swagger/Postman Collection).
15. Environment development/staging/produksi, repository Git, dan konfigurasi CI/CD dasar.
16. Deployment (migrasi staging ke production VPS, domain, SSL), konfigurasi produksi, dan SOP backup (skrip automated backup bulanan).
17. Pengujian (unit, API, integrasi, black-box, stress testing ringan, responsivitas mobile/tablet/desktop), UAT, dokumentasi, pelatihan, dan serah terima.

## 3.2 Di Luar Ruang Lingkup

- Aplikasi native Android dan iOS.
- Penyusunan materi kurikulum oleh tim pengembang.
- Pembuatan isi bank soal oleh tim pengembang.
- Pengembangan fitur baru yang belum disepakati dalam scope proyek.
- Pengembangan sistem live streaming mandiri dari nol apabila belum termasuk dalam kesepakatan teknis.
- Integrasi layanan pihak ketiga yang belum disetujui klien.

Permintaan di luar ruang lingkup harus melalui proses Change Request dan persetujuan pihak terkait.

---

# 4. Kebutuhan Fungsional

## 4.1 Autentikasi dan Manajemen Pengguna

**ID:** FR-AUTH

### Deskripsi

Sistem harus menyediakan mekanisme autentikasi untuk mengidentifikasi pengguna dan membatasi akses berdasarkan peran.

### Kebutuhan

- FR-AUTH-01: Pengguna dapat registrasi dan login menggunakan kredensial yang valid. Registrasi mandiri hanya untuk Taruna; akun Mentor, Admin, dan Superadmin dibuat oleh Superadmin/Admin (tidak dapat registrasi mandiri). Akun Taruna hasil registrasi berstatus nonaktif sampai diverifikasi Admin (verifikasi identitas taruna) atau diimpor massal oleh Admin via berkas CSV/Excel (maksimal 500 baris per impor, divalidasi server-side; baris gagal dilaporkan tanpa menggagalkan seluruh impor). Layar registrasi wajib menampilkan persetujuan pemrosesan data pribadi (consent) sesuai UU PDP; tanpa persetujuan, registrasi tidak dapat dilanjutkan.
- FR-AUTH-02: Sistem memvalidasi kredensial melalui back-end.
- FR-AUTH-03: Sistem membedakan peran Superadmin, Admin, Mentor, dan Taruna. Setiap Taruna terdaftar tergabung dalam satu Angkatan/Kelas (enrollment); materi, assessment, dan kelas Live Lesson yang "tersedia baginya" ditentukan oleh keanggotaan Angkatan/Kelas tersebut.
- FR-AUTH-04: Pengguna hanya dapat mengakses endpoint sesuai hak aksesnya.
- FR-AUTH-05: Sistem menyediakan mekanisme logout dan invalidasi sesi atau token sesuai rancangan autentikasi. Access token kedaluwarsa maksimal 1 jam; refresh token kedaluwarsa maksimal 30 hari, dipakai satu kali (rotasi) dan dicabut saat logout. Pengguna dapat memakai maksimal 3 perangkat bersamaan; login perangkat ke-4 mencabut sesi terlama. Superadmin dapat mencabut paksa (forced logout) sesi pengguna mana pun.
- FR-AUTH-06: Sistem menangani kredensial salah tanpa membocorkan informasi sensitif. Password minimal 8 karakter dengan kombinasi huruf dan angka. Akun dikunci sementara 15 menit setelah 5 kali percobaan login gagal berturut-turut. Alur lupa password memakai tautan reset via email yang kedaluwarsa 1 jam dan hanya berlaku satu kali pakai.
- FR-AUTH-07: Sistem menyediakan mekanisme pemulihan akun sesuai kebijakan yang disepakati.
- FR-AUTH-08: Sistem menyediakan 2FA via Email/OTP untuk seluruh peran (Superadmin, Admin, Mentor, Taruna) tanpa pengecualian. Kode OTP 6 digit kedaluwarsa 5 menit, maksimal 5 kali percobaan per kode, kirim ulang (resend) dibatasi 1 kali per 60 detik. Bila email gagal terkirim 3 kali berturut-turut, akun dikunci sementara 15 menit dan kejadian dicatat di audit log.
- FR-AUTH-09: Sistem membatasi percobaan autentikasi untuk mengurangi risiko penyalahgunaan.
- FR-AUTH-10: Perubahan peran dan status akun harus dilakukan oleh pihak yang berwenang.

### Kriteria Penerimaan

- Pengguna dengan kredensial valid dapat registrasi (Taruna) dan login; akun Mentor/Admin/Superadmin dibuat oleh pihak berwenang.
- Kredensial tidak valid ditolak.
- Pengguna yang belum menyelesaikan 2FA wajib tidak memperoleh akses penuh.
- Pengguna tidak dapat mengakses endpoint khusus peran lain tanpa izin.
- Token atau sesi yang tidak valid tidak dapat digunakan untuk mengakses data terlindungi.

**Keputusan yang masih diperlukan:** mekanisme pemulihan akun selain reset via email. Metode 2FA ditetapkan via Email/OTP sesuai `detail_fase_pekerjaan_SPI.md` Fase 2; parameter sesi, password, dan OTP ditetapkan pada FR-AUTH-05, FR-AUTH-06, dan FR-AUTH-08.

## 4.2 Modul Pembelajaran Berdasarkan Jenis Kapal

**ID:** FR-LEARN

### Deskripsi

Sistem mengelompokkan materi berdasarkan jenis kapal untuk memudahkan taruna menemukan materi yang relevan.

### Kebutuhan

- FR-LEARN-01: Sistem menyimpan kategori kapal.
- FR-LEARN-02: Kategori awal mencakup Bulk Carrier, Tanker, Container Ship, Passenger Ship, dan kategori tambahan yang disetujui. Pengelolaan master data memakai operasi CRUD.
- FR-LEARN-03: Setiap kategori kapal dapat mempunyai beberapa kursus; setiap kursus mempunyai beberapa bab; setiap bab mempunyai beberapa materi video. Hierarki ini berlaku sebagai Kategori (jenis kapal) → Kursus → Bab → Materi Video untuk konten video.
- FR-LEARN-04: Materi memiliki informasi dasar seperti judul, deskripsi, status, dan urutan.
- FR-LEARN-05: Taruna dapat melihat materi yang boleh diakses.
- FR-LEARN-06: Superadmin, Admin, atau peran berwenang lainnya dapat mengelola kategori dan materi.
- FR-LEARN-07: Sistem dapat mencatat progres penyelesaian materi jika fitur tersebut ditetapkan dalam aturan pembelajaran.

### Kriteria Penerimaan

- Materi ditampilkan berdasarkan kategori yang benar.
- Materi yang tidak tersedia atau tidak dapat diakses tidak ditampilkan sebagai materi aktif.
- Perubahan data materi tersimpan dan ditampilkan secara konsisten.
- Pengguna yang tidak berwenang tidak dapat mengubah materi.

## 4.3 Mentor Live Lesson

**ID:** FR-LIVE

### Deskripsi

Fitur untuk mendukung pembelajaran langsung antara mentor dan taruna melalui jadwal kelas dan layanan komunikasi real-time atau live stream.

Penjadwalan Live Lesson dilakukan oleh Mentor/Admin. Media pertemuan memakai layanan video conference eksternal (opsi: Zoom/Meet, tergantung kesepakatan spesifik PKS), tetapi taruna wajib masuk sesi melalui tombol "Masuk Kelas" di aplikasi — tautan eksternal langsung tidak dibagikan — sehingga sistem mencatat kehadiran dan absensi tetap akurat. Taruna mendapatkan tampilan absensi dan akses masuk sesi live.

### Kebutuhan

- FR-LIVE-01: Sistem menyimpan informasi kelas dan jadwal. Perubahan jadwal (reschedule/pembatalan) hanya dapat dilakukan oleh Mentor/Admin pemilik kelas, paling lambat H-1 sebelum sesi, dan memicu pemberitahuan email + notifikasi dalam aplikasi (in-app) ke peserta terdaftar.
- FR-LIVE-02: Kelas dapat dikaitkan dengan mentor dan kategori pembelajaran.
- FR-LIVE-03: Taruna dapat melihat kelas yang tersedia baginya.
- FR-LIVE-04: Mentor dapat mengelola kelas sesuai kewenangannya; penjadwalan Live Lesson dilakukan oleh Mentor/Admin.
- FR-LIVE-05: Sistem menyediakan informasi waktu, status, tautan kelas, serta absensi dan akses masuk sesi live bagi taruna bila diperlukan. Taruna masuk sesi melalui tombol "Masuk Kelas" di aplikasi (tautan eksternal langsung tidak dibagikan); kehadiran tercatat otomatis saat tombol ditekan. Mentor dapat mengoreksi manual; rekap kehadiran per kelas dapat dilihat Mentor/Admin dan diekspor; absensi ditutup otomatis 24 jam setelah sesi berakhir.
- FR-LIVE-06: Akses kelas dibatasi berdasarkan hak akses dan ketentuan partisipasi.
- FR-LIVE-07: Sistem menangani perubahan jadwal dan status kelas.

### Kriteria Penerimaan

- Jadwal kelas yang tersimpan ditampilkan dengan benar.
- Pengguna yang tidak berwenang tidak dapat mengelola kelas.
- Tautan kelas atau layanan streaming dapat diakses sesuai status dan aturan kelas.
- Absensi sesi live tercatat untuk peserta yang hadir.

**Catatan:** kebutuhan rekaman dan kapasitas peserta harus dipastikan sebelum implementasi. Opsi teknologi mengikuti `detail_fase_pekerjaan_SPI.md` Fase 2: link sharing atau embedded video conference (WebRTC/Zoom/Google Meet API, tergantung kesepakatan spesifik PKS).

## 4.4 Assessment Lima Level

**ID:** FR-ASSESS

### Deskripsi

Sistem menyediakan ujian berjenjang lima level dalam format Computer Based Test (CBT) untuk membantu mengevaluasi kompetensi taruna.

### Kebutuhan

- FR-ASSESS-01: Sistem mendukung struktur assessment Level 1 hingga Level 5.
- FR-ASSESS-02: Assessment dapat dikaitkan dengan materi atau kompetensi tertentu, dengan skema bank soal berbasis level dan kategori kapal.
- FR-ASSESS-03: Sistem menyimpan soal pilihan ganda dan esai, pilihan jawaban pilihan ganda, dan kunci jawaban secara aman.
- FR-ASSESS-04: Taruna yang tergabung dalam Angkatan/Kelas yang berhak dapat mengerjakan assessment yang tersedia baginya, dengan timer waktu pengerjaan yang dihitung di server. Jawaban tersimpan otomatis (autosave) setiap 30 detik; bila koneksi putus, taruna dapat melanjutkan dari jawaban tersimpan terakhir selama timer server belum habis; pengiriman ganda (double submit) ditolak idempoten.
- FR-ASSESS-05: Sistem memvalidasi jawaban yang dikirim.
- FR-ASSESS-06: Sistem menghitung hasil sesuai aturan penilaian: penilaian otomatis (auto-grading) untuk pilihan ganda dan form input nilai manual oleh mentor/pemeriksa untuk esai. Batas waktu penilaian esai maksimal 7 hari kalender sejak percobaan disubmit; bila terlewati, status esai ditandai "terlambat dinilai" dan dilaporkan ke Admin. Urutan soal dan pilihan jawaban diacak per percobaan; pengacakan dicatat agar hasil dapat diaudit.
- FR-ASSESS-07: Sistem menyimpan percobaan, jawaban, nilai, dan waktu pengerjaan sesuai kebutuhan.
- FR-ASSESS-08: Sistem mencatat progres pada setiap level.
- FR-ASSESS-09: Sistem menerapkan syarat kelulusan atau pembukaan level berikutnya berdasarkan aturan yang disepakati, termasuk logika unlock materi/sertifikat berdasarkan kelulusan level. Aturan default per level: passing grade 70, maksimal 3 kali percobaan, jeda minimal 24 jam antar percobaan; taruna yang gagal 3 kali wajib remedial berupa pengulangan level dari awal dan hasilnya dilaporkan ke Mentor; klien mengonfirmasi atau mengubah angka ini pada Fase 1.
- FR-ASSESS-10: Sistem menyediakan ringkasan hasil kepada taruna dan pengguna berwenang.
- FR-ASSESS-11: Bank soal disediakan oleh klien dan dimasukkan ke sistem melalui impor berkas CSV/Excel oleh Admin (format kolom dan contoh berkas ditetapkan pada Fase 1; baris gagal divalidasi dan dilaporkan tanpa menggagalkan seluruh impor) atau mekanisme lain yang disepakati.

### Kriteria Penerimaan

- Assessment yang tidak tersedia atau tidak memenuhi syarat tidak dapat dikerjakan.
- Jawaban yang diterima divalidasi dan dinilai sesuai aturan.
- Nilai pilihan ganda dihitung otomatis; nilai esai berasal dari input manual pemeriksa yang berwenang.
- Nilai yang tersimpan konsisten dengan hasil evaluasi.
- Progres level tidak berubah secara tidak sah.
- Kunci jawaban tidak terekspos kepada pengguna melalui API sebelum atau selama pengerjaan.
- Percobaan pengerjaan tidak menghasilkan data duplikat yang tidak diinginkan.

**Keputusan yang masih diperlukan:** konfirmasi atau perubahan angka default pada FR-ASSESS-09, urutan level, dan pengacakan soal. Format soal (pilihan ganda dan esai), timer, auto-grading, dan penilaian manual mengikuti `detail_fase_pekerjaan_SPI.md` Fase 3.

## 4.5 Rating, Feedback, dan Sertifikat Digital

**ID:** FR-REVIEW

### Kebutuhan

- FR-REVIEW-01: Sistem menyediakan mekanisme pemberian rating oleh taruna terhadap kelas/mentor yang diikuti. Rating memakai skala 1–5, tidak anonim (tertera nama taruna), dan dapat diubah satu kali dalam 7 hari setelah pemberian pertama.
- FR-REVIEW-02: Sistem menyimpan feedback mentor atau peserta sesuai alur yang disepakati.
- FR-REVIEW-03: Sistem menghubungkan rating dan feedback dengan kelas atau aktivitas yang relevan.
- FR-REVIEW-04: Sistem dapat menampilkan ringkasan rating yang sah.
- FR-REVIEW-05: Sistem menerbitkan sertifikat digital dalam format PDF apabila persyaratan kelulusan level terpenuhi (termasuk logika unlock sertifikat berdasarkan kelulusan). Setiap sertifikat memiliki nomor unik; sertifikat ini adalah sertifikat internal kelulusan program Sekolah Pelayaran Indonesia dan bukan sertifikat resmi STCW — klausul ini tercantum pada dokumen sertifikat. Klien memutuskan sebelum Fase 3 apakah diperlukan halaman verifikasi publik (misalnya kode QR) atau cukup PDF tanpa verifikasi publik.
- FR-REVIEW-06: Data sertifikat harus mengacu pada pengguna dan hasil yang benar.
- FR-REVIEW-07: Sistem mencegah penerbitan sertifikat berulang yang tidak sesuai aturan.

### Kriteria Penerimaan

- Rating hanya dapat diberikan oleh taruna terhadap kelas/mentor yang diikutinya.
- Rating dan feedback hanya dapat dibuat atau diubah oleh pengguna yang berwenang.
- Sertifikat tidak dapat diterbitkan sebelum persyaratan kelulusan level terpenuhi.
- Data sertifikat konsisten dengan data pengguna dan hasil evaluasi.

## 4.6 Dashboard

**ID:** FR-DASH

### Dashboard Taruna

Menampilkan:
- Ringkasan materi yang tersedia.
- Progres pembelajaran.
- Status dan hasil assessment.
- Jadwal kelas.
- Akses video pembelajaran.
- Informasi sertifikat.
- Status pengaduan.

### Dashboard Mentor

Menampilkan:
- Ringkasan kelas dan jadwal.
- Informasi taruna yang terkait dengan kelas.
- Ringkasan hasil assessment yang boleh diakses.
- Antrian koreksi esai: daftar jawaban esai menunggu penilaian beserta form input nilai manual; esai yang melewati batas 7 hari ditandai "terlambat dinilai".
- Aktivitas feedback dan pembelajaran.
- Informasi operasional sesuai kewenangan.

### Dashboard Admin

Menampilkan:
- Ringkasan jumlah dan status pengguna.
- Pengelolaan kategori serta materi.
- Ringkasan pembelajaran dan assessment.
- Informasi ticketing (dashboard khusus Admin/Support: Open, In Progress, Resolved, Closed).
- Ringkasan aktivitas operasional.

### Dashboard Superadmin

Menampilkan seluruh ringkasan dashboard Admin, ditambah pengelolaan akun/hak akses utama yang diserahterimakan saat handover (akun Superadmin, hosting, domain, akun Bunny Stream, akun email service, dan akun monitoring).

### Kriteria Penerimaan

- Setiap dashboard hanya menampilkan informasi yang relevan dengan peran pengguna.
- Ringkasan data sesuai dengan data sumber.
- Pengguna tidak dapat mengakses ringkasan atau detail yang dilarang oleh kebijakan hak akses.
- Pengelolaan akun Superadmin hanya dapat diakses oleh peran Superadmin.

## 4.7 Video Pembelajaran

**ID:** FR-VIDEO

Struktur kurikulum video mengikuti hierarki Kategori (jenis kapal) → Kursus → Bab → Materi Video sesuai `detail_fase_pekerjaan_SPI.md` Fase 3; kategori pada hierarki ini identik dengan kategori jenis kapal pada FR-LEARN. Penyimpanan dan pemutaran file video memakai Bunny Stream (definisi lengkap: §6.1 butir 4; penanggung biaya: §10.6). Pemutar front-end memakai token authentication Bunny Stream.

### Kebutuhan

- FR-VIDEO-01: Sistem menyimpan metadata video (termasuk thumbnail) dan referensi video Bunny Stream. Alur unggah: klien menyerahkan berkas video mentah; tim/Admin mengunggah berkas ke Bunny Stream melalui dashboard dan mengisi metadata + thumbnail pada materi terkait. Thumbnail dibatasi maksimal 2 MB dengan format JPG/PNG dan dimensi maksimal 1920×1080; berkas yang diunggah divalidasi server-side (tipe MIME dan ukuran) dan dipindai antivirus/malware sebelum disimpan.
- FR-VIDEO-02: Video dikaitkan dalam hierarki Kategori (jenis kapal) → Kursus → Bab → Materi Video.
- FR-VIDEO-03: Taruna dapat membuka video yang berhak diaksesnya melalui pemutar dengan token authentication (HLS adaptif Bunny Stream).
- FR-VIDEO-04: Sistem menangani video yang tidak tersedia atau gagal dimuat.
- FR-VIDEO-05: Integrasi memakai Bunny Stream sebagai satu-satunya penyedia hosting dan streaming video (lihat §6.1 butir 4).

### Kriteria Penerimaan

- Video yang valid dapat ditampilkan pada halaman materi.
- Video yang tidak tersedia menghasilkan kondisi error yang jelas.
- Tautan dan kredensial rahasia penyedia tidak terekspos melalui respons API.
- Video tidak dialirkan langsung dari server aplikasi (streaming berasal dari Bunny Stream).

## 4.8 Sistem Pengaduan atau Ticketing

**ID:** FR-TICKET

### Kebutuhan

- FR-TICKET-01: Taruna/pengguna dapat membuat tiket melalui form pelaporan kendala/pertanyaan.
- FR-TICKET-02: Tiket menyimpan judul, deskripsi, kategori, pelapor, waktu pembuatan, dan status.
- FR-TICKET-03: Sistem menyediakan status tiket Open, In Progress, Resolved, dan Closed.
- FR-TICKET-04: Admin/Support melihat dan menangani tiket melalui dashboard khusus Admin/Support untuk merespons dan melacak status tiket.
- FR-TICKET-05: Sistem menyimpan riwayat perubahan status.
- FR-TICKET-06: Pelapor dapat melihat status tiket miliknya.
- FR-TICKET-07: Pengguna tidak dapat melihat atau mengubah tiket pengguna lain tanpa kewenangan.
- FR-TICKET-08: Sistem dapat menampilkan informasi penyelesaian tiket.

### Kriteria Penerimaan

- Tiket baru tersimpan dan memiliki identitas unik.
- Perubahan status hanya dapat dilakukan oleh pihak berwenang.
- Pelapor hanya dapat mengakses tiket yang menjadi haknya.
- Riwayat status tersimpan secara konsisten.

---

# 5. Kebutuhan Nonfungsional

## 5.1 Keamanan

- Semua komunikasi produksi harus menggunakan HTTPS (instalasi SSL Certificate saat Fase 5).
- Password harus disimpan menggunakan algoritma hashing yang sesuai.
- Akses API harus memerlukan autentikasi sesuai kebutuhan endpoint.
- Validasi input dilakukan di sisi back-end (sanitasi input sebagai proteksi XSS & SQL Injection).
- Sistem menerapkan prinsip least privilege.
- Kunci jawaban dan informasi sensitif tidak boleh terekspos ke front-end.
- Sistem harus membatasi akses terhadap data pribadi dan data pembelajaran sesuai UU PDP: data dikumpulkan seperlunya atas persetujuan, subjek data berhak mengakses dan meminta penghapusan, dan insiden kebocoran dilaporkan sesuai ketentuan yang berlaku.
- Aktivitas penting seperti perubahan peran dan pengelolaan nilai perlu mempunyai audit trail sesuai kebutuhan.
- Audit log dan hasil assessment disimpan minimal 5 tahun (mengikuti masa retensi dokumen pendidikan); data hasil dan audit tidak dihapus permanen (soft delete) kecuali atas permintaan penghapusan data pribadi yang disetujui. Penghapusan permanen hanya dapat dilakukan oleh Superadmin dan tercatat di audit log.
- Rahasia aplikasi dan kredensial layanan pihak ketiga harus disimpan di konfigurasi aman, bukan di repository.
- Dependensi dan konfigurasi produksi perlu diperiksa sebelum deployment.
- Pengamanan database dan code refactoring/code optimization dilakukan pada Fase 4–5 sebelum Go-Live.

## 5.2 Performa

Target awal (dikonfirmasi ulang pada Fase 1 berdasarkan estimasi jumlah taruna):

Rekomendasi awal untuk divalidasi:
- Kapasitas awal: 500 pengguna terdaftar dengan 100 pengguna bersamaan (concurrent).
- Respons endpoint biasa ditargetkan memiliki waktu respons persentil ke-95 di bawah 500 ms pada kondisi pengujian yang disepakati.
- Endpoint laporan atau proses berat boleh memiliki target terpisah.
- Query database perlu dioptimalkan untuk menghindari pengambilan data berlebihan.
- Daftar data yang berpotensi besar harus mendukung pagination.
- Pemutaran video tidak boleh membebani server aplikasi dengan mengalirkan file secara langsung (streaming berasal dari Bunny Stream).

Angka tersebut merupakan usulan awal, bukan SLA yang sudah disetujui. Angka final (concurrent users, p95, uptime) ditetapkan pada Fase 1 dan menjadi kriteria UAT.

## 5.3 Kompatibilitas

- Aplikasi dapat digunakan melalui browser desktop dan mobile.
- Layout harus responsif (diverifikasi pada Mobile Browser, Tablet, dan Desktop saat Fase 5).
- API menggunakan format JSON untuk pertukaran data, kecuali integrasi tertentu membutuhkan format lain.
- Format waktu, zona waktu, dan representasi tanggal harus konsisten: penyimpanan memakai ISO 8601 UTC; tampilan dan operasional memakai WIB (UTC+7).

## 5.4 Backup dan Pemulihan

- Backup data rutin dilakukan minimal 1 (satu) kali setiap bulan oleh Kodeintekno (keputusan: tetap bulanan), dijalankan melalui skrip automated backup sesuai SOP keamanan PKS. Cakupan: snapshot penuh database PostgreSQL + berkas metadata/thumbnail; berkas video menjadi tanggung jawab retensi Bunny Stream. Lokasi: server mitra Kodeintekno (salinan utama) + salinan off-site; retensi arsip minimal 12 bulan.
- SOP backup harus terdokumentasi dan dapat diaudit klien.
- Tim harus menentukan prosedur pemulihan dan penanggung jawab eksekusi restore.
- Keberhasilan backup perlu diverifikasi.
- Uji pemulihan (restore) dilakukan minimal 1 kali per kuartal sebelum Go-Live dan 1 kali per semester setelah Go-Live; hasil uji didokumentasikan sebagai syarat penerimaan SOP backup.
- Risiko yang disadari: dengan backup bulanan, kehilangan data maksimal 30 hari bila kegagalan terjadi sesaat sebelum jadwal backup berikutnya. Frekuensi yang lebih tinggi (misalnya harian untuk database) dapat diusulkan via Change Request bila klien menghendaki.

## 5.5 Pemeliharaan

Masa pemeliharaan yang tercantum dalam scope adalah satu tahun pasca Go-Live (diperpanjang dari proposal awal 6 bulan), untuk bug fixing dan revisi minor sesuai ketentuan kontrak.

Definisi bug, revisi minor, waktu respons dukungan, dan pengecualian layanan harus mengikuti MOU atau SLA resmi.

---

# 6. Rancangan Arsitektur Sistem

## 6.1 Komponen Utama

1. **Front-End Web App:** React + TypeScript (SPA, Vite) — antarmuka pengguna yang dikembangkan oleh Khenzo.
2. **Back-End REST API:** NestJS (TypeScript) — logika bisnis, autentikasi, validasi, dan akses data yang dikembangkan oleh Rafi.
3. **Database:** PostgreSQL — penyimpanan pengguna, peran, materi, kursus/bab/video, kelas, assessment, hasil, progres, tiket, dan sertifikat.
4. **Video Hosting Provider:** Bunny Stream — transcoding otomatis, HLS adaptif, CDN global, player bawaan, dan token authentication (token bertanda tangan bermasa berlaku sebagai proteksi tautan HLS); tarif berbasis GB tersimpan + GB terkirim; penanggung biaya pada §10.6.
5. **External Live Lesson Service:** media video conference eksternal (Zoom/Meet, kesepakatan PKS); penjadwalan oleh Mentor/Admin; taruna join via tombol di aplikasi (lihat FR-LIVE-05).
6. **Email Service:** layanan pengiriman email untuk kode 2FA via Email/OTP kepada seluruh pengguna.
7. **Production Infrastructure:** VPS production pada server mitra Kodeintekno, repository Git dengan konfigurasi CI/CD dasar, database server, domain, SSL, logging, dan automated backup.
8. **Monitoring & Error Tracking:** log aplikasi terpusat, pelacakan error production (misalnya Sentry atau setara), dan peringatan (alert) untuk kegagalan kritis (downtime, gagal backup, lonjakan error 5xx).

Arsitektur dasar (ERD, flowchart, user journey Superadmin/Admin/Mentor/Taruna) ditetapkan pada Fase 1 sebelum pengembangan. Migrasi database memakai migrasi berversion (versioned migrations) dengan seed data untuk dev/staging; promosi staging ke production mensyaratkan BAST lolos dan tidak ada bug kritis; rollback memakai snapshot backup terakhir yang terverifikasi.

## 6.2 Prinsip REST API

- Endpoint mengikuti resource yang jelas.
- Request dan response menggunakan struktur konsisten.
- HTTP status code digunakan sesuai kondisi.
- Validasi dan aturan bisnis dilakukan di back-end.
- Autentikasi dan otorisasi diterapkan pada setiap endpoint terlindungi.
- Dokumentasi API tersedia dan diperbarui ketika kontrak berubah (outline API pada Fase 1; dokumentasi final berupa Swagger/Postman Collection pada Fase 4).
- Error response tidak memuat stack trace atau rahasia sistem.
- Pagination, filter, dan pengurutan digunakan jika diperlukan.
- Versi API dapat diperkenalkan jika diperlukan untuk menjaga kompatibilitas.

## 6.3 Contoh Kelompok Endpoint

Daftar berikut adalah usulan awal untuk diskusi teknis, bukan kontrak API final.

**Authentication**
- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/2fa/verify` (Email/OTP untuk seluruh peran (Superadmin, Admin, Mentor, Taruna))
- `POST /api/v1/auth/logout`
- `POST /api/v1/auth/refresh` jika menggunakan refresh token

**Users**
- `GET /api/v1/users/me`
- `GET /api/v1/users`
- `POST /api/v1/users`
- `PATCH /api/v1/users/{id}`

**Ship Categories, Courses, Chapters, dan Learning Materials**
- `GET /api/v1/ship-categories`
- `POST /api/v1/ship-categories`
- `GET /api/v1/ship-categories/{id}`
- `PATCH /api/v1/ship-categories/{id}` (CRUD master data klasifikasi kapal)
- `GET /api/v1/ship-categories/{id}/courses`
- `POST /api/v1/ship-categories/{id}/courses`
- `GET /api/v1/courses/{id}/chapters`
- `POST /api/v1/courses/{id}/chapters`
- `GET /api/v1/ship-categories/{id}/materials`
- `GET /api/v1/materials/{id}`
- `POST /api/v1/materials`
- `PATCH /api/v1/materials/{id}`

**Live Lessons dan Absensi**
- `GET /api/v1/live-lessons`
- `GET /api/v1/live-lessons/{id}`
- `POST /api/v1/live-lessons`
- `PATCH /api/v1/live-lessons/{id}`
- `GET /api/v1/live-lessons/{id}/attendance`
- `POST /api/v1/live-lessons/{id}/attendance`

**Assessments dan Penilaian Manual**
- `GET /api/v1/assessments`
- `GET /api/v1/assessments/{id}`
- `POST /api/v1/assessments/{id}/attempts`
- `POST /api/v1/attempts/{id}/answers`
- `POST /api/v1/attempts/{id}/submit`
- `GET /api/v1/attempts/{id}/result`
- `POST /api/v1/attempts/{id}/manual-grades` (nilai esai oleh pemeriksa berwenang)

**Progress, Certificates, dan Ratings**
- `GET /api/v1/progress/me`
- `GET /api/v1/certificates`
- `GET /api/v1/certificates/{id}`
- `POST /api/v1/live-lessons/{id}/ratings` (rating taruna terhadap kelas/mentor)
- `GET /api/v1/live-lessons/{id}/ratings`

**Video**
- `GET /api/v1/materials/{id}/videos`
- `POST /api/v1/materials/{id}/videos` (metadata dan thumbnail; berkas video tersimpan di penyedia hosting)
- `PATCH /api/v1/videos/{id}`

**Ticketing**
- `GET /api/v1/tickets`
- `POST /api/v1/tickets`
- `GET /api/v1/tickets/{id}`
- `PATCH /api/v1/tickets/{id}/status`

Akses setiap endpoint, metode autentikasi, validasi, dan bentuk respons harus ditetapkan dalam API specification.

---

# 7. Rancangan Awal Data

Entitas berikut merupakan kandidat untuk model database. Struktur dan relasi final harus ditentukan melalui perancangan teknis.

| Entitas | Fungsi |
|---|---|
| Users | Data akun pengguna (Superadmin, Admin, Mentor, Taruna) |
| Cohorts (Angkatan/Kelas) | Kelompok taruna; penentu materi, assessment, dan kelas yang tersedia |
| Enrollments | Keanggotaan Taruna dalam Angkatan/Kelas |
| Peran / Permissions | Peran dan kewenangan |
| User 2FA | Pengaturan dan status autentikasi dua faktor via Email/OTP |
| Ship Categories | Kategori jenis kapal (master data CRUD) |
| Courses | Kursus dalam kategori jenis kapal |
| Chapters | Bab dalam kursus |
| Learning Materials | Data materi pembelajaran |
| Material Videos | Metadata video (termasuk thumbnail) dan referensi hosting pada materi |
| Live Lessons | Jadwal dan informasi kelas |
| Lesson Participants | Hubungan kelas dengan peserta (termasuk absensi) |
| Assessments | Definisi ujian dan level |
| Questions | Data soal pilihan ganda dan esai |
| Answer Options | Pilihan jawaban pilihan ganda |
| Assessment Attempts | Percobaan pengerjaan (termasuk timer) |
| Submitted Answers | Jawaban yang dikirim peserta |
| Manual Grades | Nilai esai dari pemeriksa berwenang |
| Assessment Results | Hasil dan nilai (auto-grading + manual) |
| Learning Progress | Progres pembelajaran |
| Ratings / Feedback | Penilaian dan feedback |
| Certificates | Data sertifikat digital |
| Tickets | Data tiket pengaduan |
| Ticket History | Riwayat penanganan tiket |
| Audit Logs | Catatan aktivitas penting |

Aturan penting:
- Password tidak disimpan sebagai teks biasa (hashing satu arah; parameter pada FR-AUTH-06).
- Kunci jawaban tidak boleh dikirim dalam payload soal yang diterima taruna.
- Relasi data harus menjaga konsistensi pengguna, materi, kelas, dan hasil ujian.
- Data hasil assessment dan audit memakai soft delete; penghapusan permanen hanya oleh Superadmin dan tercatat di audit log. Retensi minimal 5 tahun (lihat §5.1); permintaan penghapusan data pribadi mengikuti UU PDP.
- Data pribadi hanya dikumpulkan sejauh diperlukan oleh produk.

---

# 8. User Flow Utama

## 8.1 Registrasi dan Login

1. Pengguna membuka halaman registrasi/login.
2. Pengguna mengirim kredensial (registrasi mandiri khusus Taruna; login untuk akun terdaftar).
3. Back-end memvalidasi kredensial; registrasi Taruna menampilkan layar persetujuan data pribadi (consent) dan akun berstatus nonaktif sampai diverifikasi Admin.
4. Jika 2FA diwajibkan (seluruh peran), sistem mengirim kode Email/OTP dan pengguna menyelesaikan verifikasi tambahan.
5. Sistem memberikan akses sesuai mekanisme autentikasi.
6. Front-end mengarahkan pengguna ke halaman sesuai peran.

## 8.2 Belajar Materi

1. Taruna membuka dashboard.
2. Taruna memilih kategori kapal, lalu kursus dan bab.
3. Sistem menampilkan materi yang tersedia.
4. Taruna membuka materi.
5. Taruna mempelajari teks atau video (streaming HLS adaptif dari Bunny Stream, diproteksi token authentication).
6. Sistem mencatat progres jika fitur pelacakan materi telah diaktifkan.

## 8.3 Mengikuti Assessment

1. Taruna membuka daftar assessment.
2. Sistem memeriksa kelayakan dan persyaratan level.
3. Taruna memulai percobaan CBT (timer berjalan).
4. Taruna mengirim jawaban pilihan ganda dan/atau esai.
5. Back-end memvalidasi dan menyimpan jawaban.
6. Taruna menyelesaikan ujian.
7. Sistem menghitung nilai pilihan ganda secara otomatis; jawaban esai masuk antrian koreksi di dashboard Mentor dan menunggu penilaian manual pemeriksa berwenang.
8. Hasil ditampilkan sesuai kebijakan evaluasi.
9. Sistem memeriksa kelayakan level berikutnya serta unlock materi dan sertifikat.
10. Taruna memberikan rating terhadap kelas/mentor yang diikuti.

## 8.4 Mengelola Kelas Live (Mentor/Admin)

1. Mentor/Admin membuat jadwal Live Lesson.
2. Sistem menyimpan tautan atau konfigurasi video conference eksternal; taruna masuk sesi hanya melalui tombol "Masuk Kelas" di aplikasi.
3. Taruna melihat jadwal dan masuk ke sesi live melalui aplikasi; absensi tercatat otomatis.
4. Mentor memeriksa progres dan hasil; penilaian esai dikerjakan melalui antrian koreksi di dashboard Mentor (lihat §8.3 langkah 7).

## 8.5 Pengaduan

1. Pengguna membuat tiket.
2. Sistem menyimpan laporan dengan status awal.
3. Petugas berwenang meninjau tiket.
4. Status dan catatan penanganan diperbarui.
5. Pengguna melihat perkembangan tiket.
6. Tiket ditutup setelah diselesaikan sesuai prosedur.

---

# 9. Pembagian Tanggung Jawab Tim

Struktur tim mengikuti sheet `Breaf & Team` pada workbook. Penugasan per aktivitas WBS mengikuti kolom PIC pada sheet `Project Timeline`.

## 9.1 Struktur Tim (sesuai `Breaf & Team`)

| Peran | Penanggung Jawab |
|---|---|
| PM | Kak Irwan |
| Front-End | Khenzo |
| UIX Design | Khenzo |
| Backend | Rafi |
| QA | Rafi |
| Support | Kak Irwan |

Catatan: Khenzo merangkap Front-End dan UIX Design. Rafi merangkap Backend dan QA; fungsi pengujian diusahakan tetap dipisahkan dari pekerjaan implementasi sejauh sumber daya tim memungkinkan (misalnya review silang dengan PM/Support sebelum BAST tiap fase). Peran reviewer "System Architect", "DevOps Engineer", dan "Legal" pada checklist DLV bukan struktur tersendiri: System Architect dijalankan oleh Rafi (Backend), DevOps oleh Rafi bersama PM/Support sesuai penugasan infrastruktur, dan Legal oleh PMO bersama penasihat hukum klien/perusahaan.

## 9.2 Pembagian Aktivitas

| Aktivitas | Rafi (Backend + QA) | Khenzo (Front-End + UIX) | PM / Support (Kak Irwan) |
|---|---|---|---|
| Kebutuhan produk | Berkontribusi | Berkontribusi | Koordinasi (PMO) |
| Arsitektur back-end & desain database | Penanggung jawab | Memberi masukan kebutuhan UI | Memantau |
| REST API | Penanggung jawab | Konsumen API | Memantau |
| Autentikasi dan otorisasi (termasuk 2FA seluruh peran) | Penanggung jawab | Integrasi UI | Memantau |
| Implementasi UI / UIX | Menyediakan kontrak API | Penanggung jawab | Memantau |
| Integrasi front-end/back-end | Kolaborasi | Kolaborasi | Mengatasi hambatan |
| Pengujian unit back-end & QA end-to-end | Penanggung jawab (QA) | Mendukung sisi UI | Mengatur (PMO) |
| Pengujian UI | Membantu bila diperlukan | Penanggung jawab implementasi | Memantau |
| Pengujian integrasi | Kolaborasi | Kolaborasi | Mengatur |
| UAT dengan klien (Pak Mulya) | Dukungan teknis | Dukungan teknis | Koordinasi |
| Deployment, server produksi & SOP backup | Sesuai penugasan DevOps/Back-End | Sesuai penugasan infrastruktur | Koordinasi |

## 9.3 PIC per WBS (sesuai kolom PIC `Project Timeline`)

PIC berikut dicatat apa adanya dari workbook. Sel yang masih kosong / `[Isi Nama PIC]` dibiarkan untuk sementara dan dilengkapi kemudian; pekerjaan tetap mengacu pada struktur tim §9.1.

| Kode WBS | Aktivitas | PIC tercatat |
|---|---|---|
| 0.1 | Finalisasi & penandatanganan MOU | Kak Yudi |
| 0.2 | Pencairan Milestone 1 (DP) | Pak Mulya (Klien/Finance) |
| 0.3 | Kick-off meeting resmi | Kak Adi & Yudi |
| 1.1–2.4, 3.1–3.4, 4.1–4.2, 5.1, 5.3 | Pekerjaan teknis Fase 1–5 | Dibiarkan kosong untuk sementara (mengacu struktur §9.1) |
| 1.4, 2.5, 4.3, 5.2, 5.4 | BAST / verifikasi / UAT / serah terima akhir | Pak Mulya (bersama PMO) |

Perbedaan pencatatan nama PM antara sheet `Breaf & Team` (Kak Irwan) dan sheet `Project Timeline` (Kak Yudi / Kak Adi & Yudi) dicatat apa adanya untuk sementara dan diklarifikasi kemudian.

---

# 10. Roadmap Pengembangan

Acuan jadwal: tanggal mulai dan selesai yang mengikat adalah 19 Oktober 2026–19 Februari 2027 (±17–18 minggu kalender). Karena rentang ini lebih pendek dari 21 label minggu (M1–M21) pada workbook, PRD memakai penomoran fase tunggal berikut dan label M1–M21 workbook dipetakan sebagai urutan kerja, bukan minggu kalender. Keputusan: tanggal 19 Februari 2027 tetap; agar muat, scope MVP dipangkas pada §10.5 (fitur di luar MVP masuk Change Request / fase lanjutan pasca Go-Live). Rincian WBS memuat 23 aktivitas (kode 0.1–5.4); angka "20 tugas" pada sheet `Executive Summary` adalah hitungan ringkasan versi lama dan tidak dipakai — yang berlaku adalah 23 aktivitas pada tabel §10.2.

## 10.1 Ringkasan Fase (tunggal, mengikat)

| Fase | Fokus Utama | Target Mulai | Target Selesai |
|---|---|---|---|
| Fase 0: Pra-Proyek & Inisiasi | MOU, DP, kick-off | 2026-10-19 | 2026-10-30 |
| Fase 1: UI/UX & Spesifikasi | Kebutuhan, arsitektur, database, prototipe, BAST-1 (Milestone 2) | 2026-11-02 | 2026-11-27 |
| Fase 2: Core Webapps & Live Lesson | Setup, registrasi/login + 2FA, modul kapal, Live Lesson (join via aplikasi), BAST-2 (Milestone 3) | 2026-11-30 | 2027-01-08 |
| Fase 3: Assessment & Video | CBT 5 level, bank soal, rating, sertifikat internal, dashboard, video Bunny Stream | 2027-01-11 | 2027-01-29 |
| Fase 4: Ticketing & Integrasi | Ticketing, integrasi produksi, refactoring + API hardening, BAST-3/4 (Milestone 4) | 2027-02-01 | 2027-02-08 |
| Fase 5: QA, UAT & Go-Live | QA end-to-end (buffer 5 hari kerja), UAT, deployment, training, serah terima, BAST akhir (Milestone 5) | 2027-02-09 | 2027-02-19 |

Catatan kalender: Natal/Tahun Baru jatuh di Fase 2; Imlek dan awal Ramadan (≈8 Feb 2027) jatuh di Fase 4–5. Kapasitas tim pada pekan-pekan tersebut diasumsikan menurun; buffer BAST 5 hari kerja per fase sudah termasuk dalam rentang tanggal di atas. Keterlambatan MOU/DP/kick-off (per 29 Okt 2026: MOU 50%, DP dan kick-off belum jalan) menggeser seluruh tanggal secara day-for-day; PMO menerbitkan jadwal revisi bila kick-off lewat 30 Okt 2026.

## 10.2 Rincian WBS (sesuai `Project Timeline`)

| Kode | Tahapan & Aktivitas | Deliverable | Minggu | Status tercatat |
|---|---|---|---|---|
| 0.1 | Finalisasi & penandatanganan MOU / kontrak kerja resmi (klausul IP, source code, security, hosting) | Dokumen MOU final ditandatangani | M1 | In Progress (50%) |
| 0.2 | Pencairan Milestone 1 — uang muka / DP | Bukti bayar DP & invoice lunas | M1 | Not Started |
| 0.3 | Kick-off meeting resmi (PMO Kodeintekno, tim internal, & Pak Mulya) | Berita acara kick-off & jalur komunikasi | M1 | Not Started |
| 1.1 | Requirements gathering & diskusi spesifikasi kurikulum / modul kadet taruna dan business logic (kurikulum kapal, spesifikasi 5 level ujian, alur kelas) — materi disiapkan Klien | Dokumen kebutuhan fungsional & kurikulum | M1–M2 | Not Started |
| 1.2 | Perancangan arsitektur sistem (REST API NestJS + PostgreSQL, front-end React) & skema database, termasuk spesifikasi jaminan keamanan; keluaran meliputi ERD, flowchart, user journey (Superadmin, Admin, Mentor, Taruna), dan outline dokumentasi API | Dokumen spesifikasi teknis & REST API | M2–M3 | Not Started |
| 1.3 | Wireframe (low fidelity: dashboard, kelas, modul video, ujian) & prototype desain UI/UX interaktif high fidelity (Superadmin, Admin, Mentor, Taruna; Figma/Adobe XD) menyesuaikan identitas Sekolah Pelayaran Indonesia, responsive desktop & mobile browser; design review & approval tertulis oleh klien | Prototype desain UI/UX | M2–M4 | Not Started |
| 1.4 | Review, verifikasi & persetujuan deliverable Fase 1 (acuan Milestone 2 — 20%) | BAST Fase 1 | M4 | Not Started |
| 2.1 | Setup environment server, database server PostgreSQL, repository Git, konfigurasi dasar struktur front-end React / back-end NestJS, dan konfigurasi CI/CD dasar (server mitra Kodeintekno) | Repositori back-end & front-end; environment dev & staging siap | M5 | Not Started |
| 2.2 | Sistem registrasi, login, manajemen peran (Superadmin, Admin, Mentor, Taruna) & autentikasi 2FA via Email/OTP (wajib untuk seluruh peran) | Modul auth & keamanan 2FA aktif | M5–M7 | Not Started |
| 2.3 | Modul pembelajaran berbasis klasifikasi jenis kapal (Bulk Carrier, Tanker, Container, Passenger, dll.) — CRUD master data | Modul materi per klasifikasi kapal | M7–M9 | Not Started |
| 2.4 | Fitur Mentor Live Lesson: penjadwalan oleh Mentor/Admin; media eksternal (Zoom/Meet, kesepakatan PKS); taruna join via tombol di aplikasi (tautan langsung tidak dibagikan); absensi otomatis + akses masuk sesi live bagi taruna | Fitur Live Lesson terintegrasi | M9–M11 | Not Started |
| 2.5 | Dokumentasi implementasi REST API Fase 2 & verifikasi deliverable (acuan Milestone 3 — 25%) | BAST Fase 2 & pencairan | M11 | Not Started |
| 3.1 | Sistem pengujian berjenjang Assessment 5 Level (CBT: pilihan ganda, esai, timer) & pelacakan progres kompetensi taruna; auto-grading pilihan ganda, input nilai manual esai, logika unlock materi/sertifikat | Modul ujian Level 1–5 | M12–M14 | Not Started |
| 3.2 | Integrasi bank soal & evaluasi berstandar maritim internasional (acuan STCW / Maritime Trainer; skema bank soal berbasis level dan kategori kapal; input soal oleh Klien) | Fitur kuis & evaluasi standar maritim | M13–M15 | Not Started |
| 3.3 | Rating system (taruna memberi rating pada kelas/mentor), feedback mentor, sertifikat digital & dashboard Superadmin/Admin/Mentor/Taruna (rekap nilai & sertifikat kelulusan) | Dashboard lengkap | M14–M16 | Not Started |
| 3.4 | Modul video pembelajaran terintegrasi pada platform: struktur Kategori (jenis kapal) → Kursus → Bab → Materi Video; alur unggah (klien serahkan berkas mentah, tim/Admin unggah ke Bunny Stream via dashboard) + form metadata dan thumbnail | Struktur modul video siap integrasi | M15–M16 | Not Started |
| 4.1 | Sistem pengaduan / ticketing pengguna: form pelaporan taruna; dashboard khusus Admin/Support untuk merespons dan melacak status (Open, In Progress, Resolved, Closed) — penambahan sesuai Scope Confirmation | Fitur ticketing / helpdesk aktif | M17–M18 | Not Started |
| 4.2 | Integrasi Bunny Stream (lihat §6.1 butir 4) & konfigurasi server produksi; Klien diinformasikan mengenai mitra 3rd party | Integrasi hosting video & server selesai | M18–M19 | Not Started |
| 4.3 | Review & verifikasi deliverable Fase 3 & Fase 4 (acuan Milestone 4 — 15%); code optimization (refactoring) dan API hardening sebelum verifikasi | BAST Fase 3–4 | M19 | Not Started |
| 5.1 | End-to-end QA testing (black-box testing, stress testing ringan, pengecekan responsivitas Mobile Browser/Tablet/Desktop), bug fixing & security hardening aplikasi & database sesuai standar keamanan lampiran MOU | Laporan QA & jaminan keamanan sistem | M20 | Not Started |
| 5.2 | UAT bersama Pak Mulya (Superadmin/Admin Klien, perwakilan Mentor & Taruna) & perbaikan minor — bug fixing hasil UAT, pencatatan minor revisions (ketepatan waktu bergantung respons UAT Klien) | Dokumen sign-off UAT | M20–M21 | Not Started |
| 5.3 | Deployment ke production server (migrasi aplikasi & database dari staging ke production VPS pada server mitra Kodeintekno), konfigurasi nama domain utama, SSL & skrip automated backup bulanan sesuai SOP keamanan PKS | Platform Go-Live & SOP backup | M21 | Not Started |
| 5.4 | Pelatihan penggunaan (Superadmin, Admin, Mentor, Taruna), penyerahan hak akses utama (Superadmin, hosting, domain, akun Bunny Stream, akun email service, akun monitoring) dan dokumen/source code terkait & pencairan Milestone 5 (10%) | BAST akhir & training; masuk masa maintenance 1 tahun | M21 | Not Started |

Setiap fase harus mempunyai:
- PIC yang jelas (lihat §9.3; sel yang kosong dibiarkan untuk sementara).
- Target mulai dan selesai (lihat tabel §10.1–§10.2).
- Dependensi yang teridentifikasi (materi/soal dari Klien; respons BAST/UAT maksimal 5 hari kerja setelah disetujui — buffer sudah termasuk dalam tanggal §10.1; pilihan paket infra sebelum Fase 4; libur Natal/Tahun Baru, Imlek, awal Ramadan menurunkan kapasitas — lihat §10.1).
- Deliverable yang dapat diperiksa (kolom Deliverable di atas; verifikasi memakai checklist DLV-01–DLV-12 pada §15).
- Kriteria penerimaan.
- Persetujuan stakeholder bila diperlukan (BAST tiap akhir fase; sign-off UAT sebelum Go-Live).

Status tercatat saat penyelarasan: WBS 0.1 In Progress (50%), seluruh aktivitas lain Not Started.

## 10.3 Skema Milestone Pembayaran (sesuai `Deliverable & Scope Log`)

Total nilai pengembangan: Rp 15.000.000, ditagihkan berbasis Milestone 5 tahap mengikuti BAST tiap akhir fase:

| Milestone | Tahap | Porsi |
|---|---|---|
| Milestone 1 | DP / uang muka (bersamaan/segera setelah MOU) | 30% |
| Milestone 2 | Desain — persetujuan deliverable Fase 1 (WBS 1.4) | 20% |
| Milestone 3 | Core — verifikasi deliverable Fase 2 (WBS 2.5) | 25% |
| Milestone 4 | Lanjutan — verifikasi deliverable Fase 3 & 4 (WBS 4.3) | 15% |
| Milestone 5 | Handover — serah terima akhir & training (WBS 5.4) | 10% |

Penagihan mengikuti BAST; verifikasi BAST maksimal 5 hari kerja setelah deliverable disetujui. Form verifikasi milestone disiapkan Finance & PMO.

## 10.4 Biaya Infrastruktur (sesuai `Deliverable & Scope Log`)

Biaya infrastruktur tahunan dirinci atas 5 komponen dengan 3 opsi paket:

| Paket | Nilai |
|---|---|
| Ekonomis | Rp 1.500.000 |
| Standar | Rp 3.000.000 |
| Premium | Rp 5.000.000 |

Klien memilih opsi paket sesuai skala taruna; pilihan paket dikonfirmasi sebelum Fase 4 (WBS 4.2 — integrasi hosting video & server produksi).

## 10.5 Pemangkasan Scope MVP (keputusan: tanggal tetap, scope dipangkas)

Agar muat dalam 19 Okt 2026–19 Feb 2027, fitur berikut keluar dari MVP dan masuk Change Request / fase lanjutan pasca Go-Live bila klien menghendaki:

- Verifikasi publik sertifikat (QR/halaman verifikasi) — MVP hanya PDF bernomor unik (lihat FR-REVIEW-05).
- Notifikasi tambahan di luar OTP dan email reschedule (WhatsApp, push, pengingat H-1 otomatis) — MVP hanya OTP + email reschedule (lihat FR-LIVE-01, §13 butir 10).
- Impor bank soal selain CSV/Excel dan impor massal akun di atas 500 baris per berkas — MVP hanya CSV/Excel sesuai FR-AUTH-01 dan FR-ASSESS-11.
- Multi-bahasa dan aksesibilitas lanjutan — MVP hanya Bahasa Indonesia + aksesibilitas minimum (lihat §2).
- Kenaikan frekuensi backup di atas bulanan — MVP bulanan dengan risiko yang dinyatakan pada §5.4; harian via Change Request.

Struktur hierarki Kursus/Bab, 5 level assessment, rating, ticketing, dan dashboard keempat peran tetap dalam MVP.

## 10.6 Biaya Operasional Pihak Ketiga (penanggung)

Di luar nilai pengembangan Rp 15.000.000 dan paket infra §10.4, biaya berlangganan berikut ditanggung klien (masuk opsi paket infra atau ditagih terpisah sesuai MOU):

- Langganan Bunny Stream sesuai pemakaian (lihat §4.7).
- Langganan layanan video conference eksternal untuk Live Lesson bila memakai paket berbayar (lihat FR-LIVE).
- Langganan email service untuk pengiriman OTP dan email reschedule (lihat §6.1 butir 6).

Perpanjangan maintenance 6 bulan → 1 tahun tercakup dalam nilai Rp 15.000.000 sepanjang definisi bug dan revisi minor mengikuti MOU/SLA resmi (lihat §5.5); pekerjaan di luar definisi tersebut masuk Change Request berbayar.

---

# 11. Pengujian dan Kriteria Penerimaan

## 11.1 Unit Testing

Back-end diuji secara terpisah untuk memastikan:
- Validasi request.
- Aturan bisnis.
- Perhitungan nilai (termasuk auto-grading pilihan ganda dan input nilai manual esai).
- Hak akses (Superadmin, Admin, Mentor, Taruna).
- Operasi database (termasuk CRUD master data kapal dan hierarki Kursus/Bab/Video).
- Penanganan error.
- Penerbitan sertifikat dan perubahan progres (termasuk logika unlock).

## 11.2 API Testing

Pengujian mencakup:
- Respons sukses dan gagal.
- Autentikasi.
- Otorisasi.
- Validasi input.
- Data kosong atau tidak ditemukan.
- Konflik data dan permintaan berulang.
- Batasan akses antarperan.
- Konsistensi format respons.

## 11.3 Integration Testing

- Front-end dapat menggunakan API yang disepakati.
- Alur login hingga dashboard berjalan.
- Data materi dapat ditampilkan.
- Assessment dapat dikerjakan hingga hasil tersimpan.
- Progres dan sertifikat konsisten.
- Ticketing berjalan dari pembuatan hingga penyelesaian.

## 11.4 Security Testing

- Endpoint terlindungi tidak dapat diakses tanpa autentikasi.
- Pengguna tidak dapat meningkatkan hak akses sendiri.
- Data pengguna lain tidak dapat diakses tanpa izin.
- Data sensitif tidak bocor dalam respons atau log.
- Validasi input dan penanganan error berjalan dengan benar (sanitasi XSS & SQL Injection).
- Konfigurasi produksi tidak mengekspos kredensial rahasia.
- HTTPS aktif melalui SSL Certificate; database diamankan sebelum Go-Live.

## 11.5 Black-Box & Beban Ringan

- Black-box testing untuk memastikan tidak ada fatal bug.
- Stress testing ringan sesuai cakupan Fase 5.
- Pengecekan responsivitas UI pada Mobile Browser, Tablet, dan Desktop.

## 11.6 User Acceptance Test

UAT dilakukan bersama klien (Superadmin/Admin Klien, perwakilan Mentor & Taruna) berdasarkan skenario penggunaan nyata. Kendala dicatat sebagai minor revisions dan diperbaiki (bug fixing hasil UAT) sebelum Go-Live.

Go-Live hanya dilakukan setelah:
- Fitur dalam scope selesai dan diuji.
- Bug kritis diselesaikan.
- Persyaratan keamanan yang disepakati dipenuhi.
- Klien menyelesaikan verifikasi penerimaan.
- Dokumentasi dan prosedur operasional tersedia.
- Persetujuan deployment diperoleh.

---

# 12. Risiko dan Dependensi

| Risiko | Dampak | Mitigasi | Status di workbook |
|---|---|---|---|
| Materi dan bank soal terlambat diberikan (tanggung jawab Klien) | Pengujian dan pengembangan assessment tertunda (WBS 1.1, 3.2) | Tetapkan format serta tanggal penyerahan konten | Disorot di WBS 1.1 & 3.2 |
| Jadwal padat + start terlambat (keputusan: tanggal tetap, scope MVP dipangkas §10.5) | 21 label minggu dalam ±17–18 minggu kalender; MOU 50%, DP/kick-off belum jalan per 29 Okt 2026; libur Natal/Tahun Baru, Imlek, awal Ramadan | Tanggal §10.1 mengikat + buffer BAST termasuk; keterlambatan kick-off menggeser day-for-day via jadwal revisi PMO; scope di luar MVP masuk Change Request | Keputusan PRD v1.8 |
| Metode Live Lesson belum ditentukan | Arsitektur dan estimasi dapat berubah | Media eksternal (Zoom/Meet, PKS); taruna wajib join via tombol di aplikasi sehingga absensi tercatat sistem — tautan langsung tidak dibagikan (lihat FR-LIVE-05); keputusan paket layanan sebelum Fase 2 | Diputuskan pola join pada PRD v1.8 |
| Provider video & pilihan paket infra belum diputuskan | Integrasi dan biaya belum dapat dipastikan | ✓ Dikunci: Bunny Stream (lihat §6.1 butir 4); Klien mengonfirmasi paket biaya final sebelum Fase 4 | Diputuskan pada PRD v1.6 — konfirmasi biaya sebelum WBS 4.2 |
| Kontrak (MOU) belum final | Risiko perubahan tanggung jawab dan kepemilikan | Finalisasi MOU sebelum pekerjaan yang bergantung pada persetujuan | WBS 0.1 In Progress (50%); klausul MOU In Progress |
| Teknologi back-end belum ditetapkan | Setup dan desain teknis tertunda | ✓ Diputuskan: NestJS (TypeScript) + PostgreSQL; front-end React + TypeScript (SPA, Vite) — lihat header PRD dan §6.1; arsitektur final difinalkan WBS 1.2 | Diputuskan pada PRD v1.5 |
| Kontrak API tidak sinkron | Integrasi front-end dan back-end berulang kali gagal | Dokumentasikan API dan lakukan review bersama (WBS 1.2, 2.5) | Terbuka |
| PIC teknis belum lengkap (kolom PIC masih kosong) | Pekerjaan berpotensi tidak tertangani | Tetapkan PIC dan reviewer setiap deliverable bila sudah tersedia (lihat §9.3) | Dibiarkan kosong untuk sementara |
| Perbedaan nama PM antar sheet (Kak Irwan vs Kak Yudi / Kak Adi & Yudi) | Target koordinasi berisiko salah | Dicatat apa adanya untuk sementara; diklarifikasi kemudian bila diperlukan | Dibiarkan untuk sementara |
| Respons BAST/UAT Klien terlambat | Jadwal fase berikutnya bergeser (maks. 5 hari kerja per verifikasi; UAT bergantung respons Klien) | Jadwalkan tanggal BAST/UAT di awal tiap fase | Disorot di WBS 1.4, 2.5, 4.3, 5.2 |
| Backup tidak pernah diuji pemulihannya | Risiko kehilangan data | Uji restore berkala wajib: 1x/kuartal sebelum Go-Live, 1x/semester setelahnya; hasil didokumentasikan sebagai syarat penerimaan SOP backup (lihat §5.4) | Diatur pada PRD v1.5 |

---

# 13. Pertanyaan yang Harus Diputuskan

Sebelum PRD ini ditetapkan sebagai baseline final, tim perlu mengonfirmasi (di luar hal yang sudah dikunci workbook — ditandai ✓):

1. ✓ Stack dikunci: back-end NestJS (TypeScript), front-end React + TypeScript (SPA, Vite), database PostgreSQL — lihat header PRD dan §6.1; arsitektur final difinalkan pada WBS 1.2.
2. ✓ Metode login: registrasi mandiri khusus Taruna (verifikasi Admin + consent UU PDP + impor massal CSV/Excel), akun Mentor/Admin/Superadmin dibuat pihak berwenang; 2FA via Email/OTP untuk seluruh peran; parameter sesi, password, dan OTP ditetapkan pada FR-AUTH-01, FR-AUTH-05, FR-AUTH-06, dan FR-AUTH-08. Tersisa: mekanisme pemulihan akun selain reset via email.
3. ✓ Live Lesson: media eksternal (Zoom/Meet, kesepakatan PKS); taruna wajib join via tombol di aplikasi sehingga absensi tercatat — tautan langsung tidak dibagikan. Tersisa: paket layanan berbayar bila ada, diputuskan sebelum Fase 2.
4. Aturan assessment: default pada FR-ASSESS-09 (passing grade 70, maks 3 percobaan, jeda 24 jam, remedial pengulangan level) — klien mengonfirmasi/mengubah pada Fase 1. (✓ format: CBT pilihan ganda + esai + timer; auto-grading + penilaian manual; bank soal berbasis level dan kategori kapal)
5. Siapa yang dapat membuat dan mengubah materi, soal, jadwal, rating, serta sertifikat? (✓ rating oleh taruna terhadap kelas/mentor; penjadwalan Live Lesson oleh Mentor/Admin; esai diperiksa mentor/pemeriksa berwenang; business logic difinalkan pada Fase 1; "Support" = Admin yang menangani tiket)
6. Sertifikat: PDF dengan nomor unik (lihat FR-REVIEW-05). Tersisa: apakah perlu halaman verifikasi publik/QR — diputuskan sebelum Fase 3.
7. ✓ Penyedia hosting video dikunci: Bunny Stream (lihat §6.1 butir 4); konfirmasi paket biaya final sebelum Fase 4.
8. Kapasitas awal: 500 pengguna terdaftar, 100 bersamaan; p95 < 500 ms (lihat §5.2). Angka final ditetapkan Fase 1 dan menjadi kriteria UAT.
9. ✓ Retensi: audit log & hasil assessment minimal 5 tahun, soft delete, hapus permanen hanya oleh Superadmin; backup 1x/bulan + uji restore berkala; kepatuhan UU PDP (lihat §5.1, §5.4, §7).
10. Email untuk kode 2FA via Email/OTP sudah pasti dibutuhkan (didukung komponen Email Service pada §6.1). Yang masih terbuka: apakah diperlukan notifikasi tambahan (WhatsApp atau notifikasi lain) di luar OTP?
11. Bagaimana definisi bug kritis, revisi minor, dan SLA maintenance satu tahun? (✓ maintenance 1 tahun pasca Go-Live)
12. ✓ Baseline timeline: 19 Oktober 2026–19 Februari 2027 mengikat; label M1–M21 adalah urutan perencanaan WBS yang dipetakan ke rentang tersebut.
13. PIC deliverable mengikuti §9.1; sel yang masih kosong dibiarkan untuk sementara dan dilengkapi kemudian.
14. ✓ Bahasa default Bahasa Indonesia + aksesibilitas minimum (lihat §2); multi-bahasa/aksesibilitas lanjutan = Change Request.
15. Apa nama domain utama production yang dipakai pada WBS 5.3?

Jawaban terhadap pertanyaan tersebut menjadi bagian dari spesifikasi teknis dan keputusan produk yang disetujui.

---

# 14. Definisi Selesai (Definition of Done)

Sebuah fitur dinyatakan selesai apabila:

- Implementasi sesuai kebutuhan fungsional yang disetujui.
- Hak akses dan validasi berjalan dengan benar.
- Pengujian yang relevan telah dilakukan.
- Tidak ada bug kritis yang belum diselesaikan.
- API dan struktur data terdokumentasi.
- Integrasi front-end dan back-end telah diverifikasi.
- Perubahan kode telah ditinjau sesuai prosedur tim.
- Fitur dapat dijalankan pada lingkungan yang ditentukan.
- Kriteria penerimaan fitur terpenuhi.

Proyek secara keseluruhan dinyatakan selesai setelah fitur yang disepakati diterima, UAT disetujui, deployment berhasil, dokumentasi dan SOP diserahkan, serta pelatihan dan serah terima dilaksanakan sesuai kontrak.

---

# 15. Dokumen Pendukung & Checklist Deliverable

PRD ini digunakan bersama dokumen:
- Workbook `Maritim Team & Timeline.xlsx` (acuan utama tim & jadwal) — 4 sheet di atas.
- `detail_fase_pekerjaan_SPI.md` (rincian tahapan pekerjaan Fase 1–5, M1–M21).
- Dokumen Spesifikasi Teknis / PRD awal, ERD, flowchart, user journey, dan outline dokumentasi API (keluaran Fase 1).
- Scope Confirmation No. PPA/MLY-SC/VIII/2026.
- Proposal Project Awal No. PPA/MLY-EL/VIII/2026.
- MOU atau kontrak kerja resmi / PKS (memuat klausul ownership, IP, hak cipta, domain, source code, brand, force majeure, otoritas perubahan, mitra 3rd party termasuk Bunny Stream, jaminan keamanan aplikasi & database; kesepakatan spesifik PKS menjadi acuan opsi Live Lesson).
- UI/UX prototype (Figma/Adobe XD — low fidelity wireframe dan high fidelity mockup sesuai identitas Sekolah Pelayaran Indonesia, disetujui tertulis oleh klien).
- Technical Specification (arsitektur REST API, skema database, spesifikasi keamanan).
- Database Schema.
- REST API Specification (dokumentasi final berupa Swagger/Postman Collection pada Fase 4).
- Test Plan dan Test Report (termasuk laporan QA black-box & stress testing ringan serta security hardening Fase 5).
- UAT Sign-Off (berita acara UAT & serah terima; pencatatan minor revisions dan bug fixing hasil UAT).
- SOP Backup (skrip automated backup bulanan sesuai SOP keamanan PKS) dan dokumentasi operasional.
- BAST tiap akhir fase (Fase 1; Fase 2; Fase 3–4; BAST akhir & training Fase 5).
- Dokumen/source code terkait yang diserahkan bersama hak akses utama (Superadmin, hosting, domain, akun Bunny Stream, akun email service, akun monitoring) saat handover.

## 15.1 Checklist Deliverable (sesuai `Deliverable & Scope Log`, DLV-01–DLV-12)

| Kode | Deliverable | Target Fase | Reviewer | Status tercatat |
|---|---|---|---|---|
| DLV-01 | Modul klasifikasi kapal (Bulk Carrier, Tanker, Container, Passenger, dll.; CRUD master data) | Fase 2 | Pak Mulya & PMO | Pending |
| DLV-02 | Mentor Live Lesson (penjadwalan Mentor/Admin; media eksternal; join via tombol aplikasi; absensi otomatis + akses sesi live) | Fase 2 | Pak Mulya & PMO | Pending |
| DLV-03 | Assessment 5 Level CBT (pilihan ganda + esai + timer; auto-grading + penilaian manual; bank soal berbasis level & kategori kapal) + standar STCW + rating taruna ke kelas/mentor + sertifikat (logika unlock) + dashboard Superadmin/Admin/Mentor/Taruna | Fase 3 | Pak Mulya & PMO | Pending |
| DLV-04 | Modul video pembelajaran (hierarki Kategori (jenis kapal) → Kursus → Bab → Materi Video; metadata + thumbnail; Bunny Stream, lihat §6.1 butir 4) | Fase 3 & 4 | Pak Mulya & PMO | Pending |
| DLV-05 | Sistem ticketing / helpdesk (form taruna + dashboard Admin/Support: Open, In Progress, Resolved, Closed) | Fase 4 | Pak Mulya & PMO | Pending |
| DLV-06 | 2FA via Email/OTP (seluruh peran) + komunikasi REST API (outline Fase 1; Swagger/Postman Collection Fase 4) | Fase 2 | System Architect | Pending |
| DLV-07 | Dokumen spesifikasi teknis (arsitektur REST API + keamanan) | Fase 1 & 2 | System Architect | Pending |
| DLV-08 | Maintenance 1 tahun pasca Go-Live | Pasca Go-Live | PMO Kodeintekno | Pending |
| DLV-09 | SOP backup bulanan (dapat diaudit) | Fase 5 | DevOps Engineer | Pending |
| DLV-10 | Jaminan keamanan aplikasi & DB + daftar mitra server/hosting video (termasuk Bunny Stream) | Pra-proyek / MOU | PMO & Legal | In Review |
| DLV-11 | MOU final (ownership, IP, hak cipta, domain, source code, brand, force majeure, otoritas perubahan) | Pra-proyek | Pak Mulya & Legal | In Review |
| DLV-12 | Go-Live (migrasi staging → production VPS pada server mitra Kodeintekno, domain utama — lihat §13 butir 15, SSL) + training (Superadmin, Admin, Mentor, Taruna) + penyerahan hak akses utama (Superadmin, hosting, domain, akun Bunny Stream, akun email service, akun monitoring) dan dokumen/source code | Fase 5 | Pak Mulya & PMO | Pending |

**Catatan status:** PRD v1.8 menindaklanjuti review eksternal. Keputusan yang dikunci: jadwal penomoran fase tunggal dengan tanggal 19 Februari 2027 tetap (scope di luar MVP pada §10.5 masuk Change Request); 2FA wajib seluruh peran; registrasi mandiri khusus Taruna + enrollment Angkatan/Kelas + consent UU PDP + impor massal; CBT (timer server, autosave, pengacakan, SLA koreksi 7 hari, remedial, impor bank soal); join Live Lesson via tombol aplikasi; rating 1–5 tidak anonim; disclaimer non-STCW pada sertifikat; handover termasuk akun pihak ketiga; backup bulanan dengan risiko dinyatakan + lokasi/retensi; biaya pihak ketiga ditanggung klien (§10.6); reviewer DLV dipetakan ke struktur tim. Nama resmi "Sekolah Pelayaran Indonesia". Diselaraskan dengan `detail_fase_pekerjaan_SPI.md` dan workbook `Maritim Team & Timeline.xlsx`; sel PIC kosong dibiarkan untuk sementara. Keputusan teknis pada §13 yang belum bertanda ✓ dilengkapi kemudian (terutama sebelum/dalam Fase 1). Dokumen harus ditinjau bersama Project Manager, tim pengembang, dan klien sebelum dijadikan acuan implementasi final.

---

# Lampiran A — Riwayat Perubahan Dokumen

| Versi | Ringkasan perubahan |
|---|---|
| 1.1–1.2 | Penyelarasan awal ke workbook (struktur tim, roadmap 21 minggu, milestone, DLV-01–DLV-12); kunci tanggal 19 Feb 2027. |
| 1.3 | Adopsi `detail_fase_pekerjaan_SPI.md` (4 peran, registrasi, 2FA Email/OTP, CBT, hierarki video, HLS, Swagger/Postman, CI/CD). |
| 1.4 | Konsistensi nama, peran, dashboard, istilah; Email Service; VPS pada server mitra. |
| 1.5 | Kunci stack (NestJS + React + PostgreSQL); kebijakan sesi/token/password/OTP/upload/reschedule/absensi/remedial; UU PDP; retensi 5 tahun; uji restore; zona WIB; sertifikat PDF bernomor unik. |
| 1.6 | Front-end React saja (ganti Next.js); storage/streaming dikunci Bunny Stream. |
| 1.7 | Alur upload video (tim/Admin) dan koreksi esai (dashboard Mentor); klarifikasi 23 vs 20 aktivitas. |
| 1.8 | Tindak lanjut review eksternal (jadwal fase tunggal, MVP §10.5, biaya §10.6, 2FA semua peran, enrollment, CBT lengkap, disclaimer STCW, handover akun, backup + lokasi/retensi). |

# Lampiran B — Catatan Keuangan (rujukan, bukan bagian normatif PRD)

Nilai pengembangan Rp 15.000.000 dan skema milestone 5 tahap (30/20/25/15/10) dirinci pada §10.3; opsi paket infra (Ekonomis 1,5 jt / Standar 3 jt / Premium 5 jt) pada §10.4; penanggung biaya pihak ketiga pada §10.6. Angka-angka tersebut bersumber dari `Deliverable & Scope Log` workbook dan MOU; bila berbeda, dokumen kontrak yang berlaku.