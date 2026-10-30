# DETAIL FASE PROYEK & TAHAPAN PEKERJAAN
**Proyek:** Web E-Learning "Sekolah Pelaut Indonesia" (SPLI)
**Total Durasi:** 19 Oktober 2026 – 19 Februari 2027 (±17–18 minggu kalender; label M1–M21 adalah urutan kerja, bukan minggu kalender)

> **Catatan keterkaitan dokumen:** acuan produk yang berlaku adalah `prd.md` (PRD ringkas). Jika ada perbedaan antara dokumen ini dan PRD, PRD yang berlaku.

---

## FASE 1: Requirements Gathering, Wireframing & UI/UX Design
**Durasi:** Minggu 1 - 4 
**Fokus:** Penyelarasan kebutuhan, perancangan arsitektur dasar, dan desain antarmuka.

### Tahapan Pekerjaan:
1. **Kick-off & Requirement Analysis**
   - Rapat *kick-off* dengan tim *Sekolah Pelaut Indonesia* (Klien).
   - Pengumpulan detail *business logic* (kurikulum kapal, spesifikasi 5 level ujian, dan alur kelas).
2. **System Architecture & Database Design**
   - Pembuatan Entity Relationship Diagram (ERD) dan skema *database*.
   - Pembuatan *Flowchart* dan *User Journey* (Superadmin, Admin, Mentor, Taruna).
   - Perancangan arsitektur *REST API* (Front-end & Back-end).
3. **Wireframing (Low Fidelity)**
   - Pembuatan sketsa tata letak halaman (Dashboard, Kelas, Modul Video, Ujian).
4. **UI/UX Design (High Fidelity)**
   - Pembuatan *mockup* interaktif menggunakan Figma/Adobe XD.
   - Penyesuaian tema visual, warna, dan tipografi sesuai identitas *Sekolah Pelaut Indonesia*.
5. **Design Review & Approval**
   - Presentasi purwarupa (prototype) desain kepada klien untuk mendapatkan persetujuan tertulis.

**Deliverables (Output):** Dokumen Spesifikasi Teknis (PRD awal), ERD, API *Documentation Outline*, dan *Prototype* UI/UX (Figma).

---

## FASE 2: Development Core Webapps, Arsitektur REST API & Modul Live Lesson
**Durasi:** Minggu 5 - 11
**Fokus:** Pembuatan fondasi sistem, autentikasi keamanan, dan fitur inti kelas tatap muka virtual.

### Tahapan Pekerjaan:
1. **Environment Setup**
   - Inisialisasi *repository* (Git), *environment development*, dan konfigurasi CI/CD dasar.
   - *Setup server database* dan kerangka kerja *Back-end* & *Front-end*.
2. **Auth, Roles & Security (RBAC & 2FA)**
   - Pengembangan fitur Registrasi & Login.
   - Implementasi Manajemen Peran (Superadmin, Admin, Mentor, Taruna).
   - Implementasi *Two-Factor Authentication* (2FA) via Email/OTP untuk **seluruh peran (Superadmin, Admin, Mentor, Taruna)** sesuai PRD.
3. **Modul Klasifikasi Kapal (Master Data)**
   - Pembuatan *CRUD (Create, Read, Update, Delete)* untuk master data klasifikasi kapal (Bulk Carrier, Tanker, Container Ship, Passenger, dll).
4. **Modul Live Lesson**
   - Pengembangan fitur penjadwalan *Live Lesson* oleh Mentor/Admin.
   - Integrasi media video conference eksternal (Zoom/Meet, sesuai kesepakatan PKS); taruna wajib masuk lewat tombol di aplikasi — tautan eksternal langsung tidak dibagikan — sesuai PRD.
   - Pembuatan tampilan absensi dan akses masuk sesi *Live* bagi Taruna.

**Deliverables (Output):** Repositori *Back-end* & *Front-end*, Sistem Login Berbasis Peran & 2FA berfungsi, Master Data Kapal, Fitur *Live Lesson*.

---

## FASE 3: Modul Assessment 5 Level, Integrasi Standar Maritim & Video
**Durasi:** Minggu 12 - 16
**Fokus:** Pengembangan sistem penilaian terstruktur, *dashboard* mentor, dan manajemen materi video.

### Tahapan Pekerjaan:
1. **Modul Assessment (Ujian 5 Level)**
   - Pembuatan skema Bank Soal berbasis level dan kategori kapal.
   - Pengembangan UI/UX *Computer Based Test* (CBT) untuk Taruna (pilihan ganda, esai, *timer* waktu).
   - Implementasi logika *auto-grading* (penilaian otomatis) untuk pilihan ganda dan form input nilai manual untuk esai.
   - Logika *unlock* materi/sertifikat berdasarkan kelulusan level.
2. **Dashboard Mentor & Rating System**
   - Pengembangan *Dashboard* Mentor untuk mengelola kelas, memantau *progress* Taruna, dan memeriksa ujian.
   - Implementasi sistem *Rating/Review* (Taruna dapat memberikan *rating* pada kelas/mentor).
3. **Modul Video Pembelajaran (Internal System)**
   - Pembuatan struktur manajemen kurikulum (Kategori -> Kursus -> Bab -> Materi Video).
   - Form unggah (upload) metadata video dan *thumbnail* (berkas video mentah dari klien diunggah tim/Admin ke Bunny Stream; lihat PRD).

**Deliverables (Output):** Modul Ujian (CBT) 5 Level selesai, Sistem *Rating* berjalan, *Dashboard* Mentor lengkap, Struktur Modul Video siap integrasi.

---

## FASE 4: Pengembangan Sistem Pengaduan (Ticketing) & Integrasi Pihak Ketiga
**Durasi:** Minggu 17 - 19
**Fokus:** Penyelesaian fitur *support*, integrasi infrastruktur eksternal, dan optimalisasi.

### Tahapan Pekerjaan:
1. **Sistem Pengaduan (Ticketing / Helpdesk)**
   - Pembuatan form pelaporan kendala/pertanyaan oleh Taruna.
   - Pembuatan *dashboard* khusus Admin/Support untuk merespons dan melacak status tiket (Open, In Progress, Resolved, Closed).
2. **Integrasi Pihak Ketiga (Hosting Video: Bunny Stream)**
   - Penghubungan *Back-end* dengan API Bunny Stream (transcoding otomatis, HLS adaptif, CDN, player bawaan, token authentication) sesuai PRD; konfirmasi paket biaya final sebelum Fase 4.
   - Pembuatan pemutar video (*Video Player*) di sisi *Front-end* dengan proteksi tautan (*secured stream/HLS*).
3. **Code Optimization & API Hardening**
   - Pembersihan kode (*code refactoring*).
   - Melengkapi dokumentasi akhir *REST API* (*Swagger/Postman Collection*).

**Deliverables (Output):** Fitur *Ticketing* Aktif, Pemutar Video Pembelajaran terintegrasi (*Streaming* pihak ketiga), Dokumentasi API Final.

---

## FASE 5: Testing, User Acceptance Test (UAT), Security Hardening & Deployment
**Durasi:** Minggu 20 - 21
**Fokus:** Pengujian kualitas, validasi klien, pengamanan level produksi, dan peluncuran.

### Tahapan Pekerjaan:
1. **Internal Quality Assurance (QA) & Testing**
   - *Black-box testing* dan *stress testing* ringan untuk memastikan tidak ada *fatal bug*.
   - Pengecekan responsivitas UI di berbagai perangkat (*Mobile Browser*, Tablet, Desktop).
2. **Security Hardening**
   - Instalasi *SSL Certificate* untuk HTTPS.
   - Pengamanan *database*, sanitasi input (*XSS & SQL Injection protection*).
   - *Setup* skrip *Automated Backup* bulanan sesuai SOP keamanan PKS.
3. **User Acceptance Test (UAT) bersama Klien**
   - Sesi pengujian bersama (Superadmin/Admin Klien, Perwakilan Mentor & Taruna).
   - Pencatatan laporan kendala dari klien (*minor revisions*).
   - *Bug Fixing* berdasarkan hasil UAT.
4. **Deployment & Go-Live**
   - Migrasi aplikasi dan *database* dari *server staging* ke *server production* (VPS).
   - Pengaturan nama domain utama (contoh: *sekolahpelaut.com*).
5. **Training & Handover (Serah Terima)**
   - Pelaksanaan sesi pelatihan (*Training*) penggunaan aplikasi kepada Klien.
   - Penyerahan hak akses utama (*Superadmin, Hosting, Domain, akun Bunny Stream, akun email service, akun monitoring*) dan dokumen/source code terkait.

**Deliverables (Output):** Platform *Go-Live* (Production), Berita Acara UAT & Serah Terima ditandatangani, Pelatihan Selesai, Proyek bergeser ke masa *Maintenance*.