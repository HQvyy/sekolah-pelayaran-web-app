# REST API Specification — E-Learning Sekolah Pelayaran Indonesia

- **Status:** Draft kontrak API untuk memulai implementasi
- **Versi acuan produk:** PRD ringkas (menggantikan PRD lengkap v1.8; riwayat lengkap tersedia di histori git)
- **Base path:** `/api/v1`
- **Format:** JSON, kecuali upload file dan unduhan PDF/CSV/XLSX
- **Zona waktu tampilan:** `Asia/Jakarta`; timestamp API disarankan ISO 8601 UTC
- **Dokumen terkait:** `prd.md`, `architecture.md`

> Tabel endpoint di bawah adalah rancangan REST berdasarkan kebutuhan fungsional PRD ringkas — PRD tidak mencantumkan daftar endpoint, sehingga seluruh tabel adalah **usulan teknis** dan harus direview sebelum dianggap kontrak final. Implementasikan endpoint sesuai tahap; jangan membangun seluruh API sekaligus. Seluruh path di bawah memakai base `/api/v1` (misalnya `POST /auth/register` berarti `POST /api/v1/auth/register`).

## 1. Konvensi umum

### 1.1 Base URL

- Development: ditentukan dari environment lokal tim.
- Staging/production: ditetapkan setelah domain disepakati.
- Semua endpoint versi pertama berada di `/api/v1`.

Contoh: `GET /api/v1/courses`.

### 1.2 Header

Request JSON:

```http
Content-Type: application/json
Accept: application/json
Authorization: Bearer <access_token>
```

`Authorization` diperlukan untuk endpoint terlindungi. Cara transport token final **[PERLU KONFIRMASI]**; contoh Bearer di dokumen ini adalah kontrak sementara. Jika tim memilih cookie-based session/refresh, dokumentasi security dan CSRF harus diperbarui bersama, bukan diterapkan berbeda antara frontend dan backend.

Untuk endpoint idempotent seperti autosave/submit attempt atau operasi yang berpotensi terkirim ulang, gunakan `Idempotency-Key` bila sesuai dan didukung endpoint. Detail wajib ditetapkan per endpoint saat implementasi.

### 1.3 Format sukses standar

Contoh respons objek:

```json
{
  "data": {
    "id": "uuid",
    "title": "Contoh"
  },
  "meta": null
}
```

Contoh respons daftar:

```json
{
  "data": [],
  "meta": {
    "page": 1,
    "pageSize": 20,
    "totalItems": 0,
    "totalPages": 0
  }
}
```

Kontrak `data/meta` ini adalah **usulan format konsisten**, bukan kutipan literal dari PRD. Tim harus menyepakatinya sebelum endpoint pertama diimplementasikan. Endpoint download file boleh merespons stream file dengan header `Content-Type` dan `Content-Disposition` yang sesuai.

### 1.4 Format error standar

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Data yang dikirim tidak valid.",
    "details": [
      {
        "field": "email",
        "code": "INVALID_FORMAT",
        "message": "Format email tidak valid."
      }
    ],
    "requestId": "req_..."
  }
}
```

`details` boleh kosong atau dihilangkan jika tidak relevan. Jangan mengirim stack trace, query SQL, secret, token, password, OTP, atau kunci jawaban.

### 1.5 HTTP status

| Status | Pemakaian |
|---|---|
| `200 OK` | Request berhasil dan memiliki respons |
| `201 Created` | Resource berhasil dibuat |
| `202 Accepted` | Proses diterima untuk diproses asynchronous jika diperlukan |
| `204 No Content` | Berhasil tanpa body |
| `400 Bad Request` | Format/parameter request tidak valid |
| `401 Unauthorized` | Belum terautentikasi, token invalid/kedaluwarsa, atau 2FA belum selesai |
| `403 Forbidden` | Identitas valid tetapi tidak memiliki izin |
| `404 Not Found` | Resource tidak ditemukan atau sengaja disamarkan sesuai kebijakan keamanan |
| `409 Conflict` | Konflik status, duplicate submit, enrollment, atau perubahan yang tidak diperbolehkan |
| `413 Payload Too Large` | Ukuran upload melebihi batas |
| `415 Unsupported Media Type` | Tipe file/media tidak didukung |
| `422 Unprocessable Entity` | Business rule gagal setelah request terstruktur valid |
| `429 Too Many Requests` | Rate limit, OTP resend/login throttle |
| `500 Internal Server Error` | Kesalahan tak terduga tanpa detail internal |
| `503 Service Unavailable` | Ketergantungan layanan sementara tidak tersedia |

### 1.6 Pagination, filter, dan sorting

Untuk daftar yang berpotensi panjang, usulkan query parameter:

- `page` (default 1), `pageSize` (default 20; batas maksimum ditetapkan backend).
- `search` untuk pencarian teks bila relevan.
- `sortBy` dan `sortOrder=asc|desc` hanya untuk field yang diizinkan.
- Filter domain seperti `status`, `cohortId`, `courseId`, `level`, `from`, `to` sesuai endpoint.

Backend harus memvalidasi nilai filter dan membatasi page size. Jangan menerima nama kolom sorting bebas dari client.

## 2. Role dan akses ringkas

Role dari PRD: `SUPERADMIN`, `ADMIN`, `MENTOR`, `TARUNA`.

| Domain | Superadmin | Admin | Mentor | Taruna |
|---|---|---|---|---|
| Manajemen user/role/sesi | Ya, termasuk forced logout dan permanent delete yang diaudit | Sesuai permission yang disetujui | Tidak, kecuali kebutuhan khusus yang disetujui | Profil sendiri sesuai kebijakan |
| Angkatan/enrollment | Kelola | Kelola | Baca peserta kelas yang ditugaskan | Baca enrollment sendiri |
| Kategori/kursus/bab/materi | Kelola | Kelola | Sesuai assignment/permission | Baca materi yang tersedia bagi enrollment |
| Live Lesson | Administratif sesuai permission | Kelola | Kelola kelas sendiri/yang ditugaskan | Lihat/join kelas yang tersedia |
| Assessment/soal | Administratif sesuai permission | Kelola sesuai permission | Kelola/menilai sesuai assignment | Mengerjakan attempt sendiri |
| Hasil dan progres | Lihat sesuai permission | Lihat sesuai permission | Lihat peserta yang ditugaskan | Hasil/progres sendiri |
| Rating/feedback | Lihat/moderasi sesuai kebijakan | Lihat/moderasi sesuai kebijakan | Lihat feedback yang relevan | Buat/edit rating sesuai aturan |
| Sertifikat | Kelola sesuai permission | Kelola sesuai permission | Sesuai permission | Lihat/unduh milik sendiri |
| Ticketing | Administratif | Support/kelola | Hanya jika disetujui | Buat dan lihat tiket sendiri |

Matriks ini adalah baseline untuk diskusi; permission rinci masih harus disetujui pada Fase 1. Backend wajib memeriksa role, ownership, assignment, dan enrollment di setiap request, bukan hanya role global.

## 3. Authentication & account management

Endpoint berikut merupakan rancangan kontrak untuk kebutuhan autentikasi dan akun (§4.1 PRD ringkas). Beberapa nama endpoint tidak dicantumkan eksplisit pada daftar endpoint PRD dan karenanya merupakan usulan.

| Method & path | Tujuan | Akses |
|---|---|---|
| `POST /auth/register` | Registrasi mandiri Taruna, termasuk consent | Publik; Taruna saja |
| `POST /auth/login` | Memvalidasi kredensial dan memulai proses 2FA | Publik |
| `POST /auth/2fa/verify` | Memverifikasi OTP dan menyelesaikan login | Login pending |
| `POST /auth/2fa/resend` | Mengirim ulang OTP dengan throttle | Login pending |
| `POST /auth/refresh` | Rotasi refresh token | Refresh credential valid |
| `POST /auth/logout` | Logout dan mencabut refresh token/sesi | Pengguna login |
| `POST /auth/password/forgot` | Meminta email reset password | Publik; respons tidak membocorkan apakah email terdaftar |
| `POST /auth/password/reset` | Reset password menggunakan token sekali pakai | Token reset valid |
| `GET /auth/me` | Mengambil profil dan role pengguna aktif | Pengguna login |
| `GET /admin/users` | Daftar/pencarian pengguna | Superadmin/Admin sesuai permission |
| `POST /admin/users` | Membuat akun non-Taruna atau akun melalui alur admin | Superadmin/Admin sesuai permission |
| `GET /admin/users/{userId}` | Detail pengguna | Superadmin/Admin sesuai permission |
| `PATCH /admin/users/{userId}` | Mengubah data/status/role sesuai izin | Superadmin/Admin sesuai permission |
| `POST /admin/users/{userId}/verify` | Verifikasi akun Taruna | Admin/Superadmin |
| `POST /admin/users/import` | Impor Taruna CSV/Excel, maksimal 500 baris per file | Admin/Superadmin |
| `GET /admin/users/imports/{importId}` | Status dan ringkasan baris berhasil/gagal | Admin/Superadmin |
| `GET /admin/users/{userId}/sessions` | Daftar sesi/perangkat | Superadmin atau pemilik sesi sesuai kebijakan |
| `DELETE /admin/users/{userId}/sessions/{sessionId}` | Forced logout/revoke session | Superadmin |

### Authentication rules

- Registrasi mandiri hanya untuk Taruna; akun baru perlu verifikasi Admin sebelum memperoleh akses penuh.
- Registrasi wajib mencatat persetujuan pemrosesan data pribadi.
- Login yang lolos password belum memberi akses penuh sebelum OTP valid.
- Password minimum 8 karakter dengan kombinasi huruf dan angka.
- 5 login gagal berturut-turut: lock 15 menit.
- OTP: 6 digit, berlaku 5 menit, maksimal 5 percobaan per kode, resend maksimal sekali per 60 detik.
- 3 kegagalan email berturut-turut: lock 15 menit dan audit log.
- Access token maksimal 1 jam; refresh token maksimal 30 hari, rotasi satu kali pakai, dicabut saat logout.
- Maksimal 3 perangkat aktif; perangkat ke-4 mencabut sesi tertua. Superadmin dapat forced logout.
- Reset password melalui tautan email sekali pakai yang kedaluwarsa setelah 1 jam.
- Jangan mencatat password, OTP, reset token, access token, atau refresh token ke log.

## 4. Angkatan, kelas, dan enrollment

| Method & path | Tujuan | Akses |
|---|---|---|
| `GET /cohorts` | Daftar Angkatan/Kelas | Admin/Superadmin; Mentor/Taruna sesuai scope |
| `POST /cohorts` | Membuat Angkatan/Kelas | Admin/Superadmin |
| `GET /cohorts/{cohortId}` | Detail Angkatan/Kelas | Pengguna yang berwenang |
| `PATCH /cohorts/{cohortId}` | Mengubah Angkatan/Kelas | Admin/Superadmin |
| `DELETE /cohorts/{cohortId}` | Nonaktifkan/hapus sesuai relasi dan kebijakan | Admin/Superadmin; soft delete jika diperlukan |
| `GET /cohorts/{cohortId}/enrollments` | Daftar Taruna dalam kelas | Admin/Superadmin dan Mentor sesuai assignment |
| `POST /cohorts/{cohortId}/enrollments` | Menambahkan Taruna | Admin/Superadmin |
| `DELETE /cohorts/{cohortId}/enrollments/{enrollmentId}` | Menonaktifkan enrollment | Admin/Superadmin |
| `GET /me/enrollments` | Enrollment milik Taruna aktif | Taruna |

Enrollment menentukan materi, assessment, dan Live Lesson yang tersedia bagi Taruna. Endpoint tidak boleh mengizinkan Taruna mengubah enrollment miliknya sendiri.

## 5. Learning content

Hierarki konten video: **kategori jenis kapal → kursus → bab → materi video**.

| Method & path | Tujuan | Akses |
|---|---|---|
| `GET /ship-categories` | Daftar kategori kapal | Pengguna login sesuai scope; publik hanya jika diputuskan |
| `POST /ship-categories` | Membuat kategori | Admin/Superadmin atau permission yang disetujui |
| `GET /ship-categories/{id}` | Detail kategori | Sesuai scope |
| `PATCH /ship-categories/{id}` | Mengubah kategori | Admin/Superadmin atau permission yang disetujui |
| `DELETE /ship-categories/{id}` | Nonaktifkan kategori | Admin/Superadmin atau permission yang disetujui |
| `GET /courses` | Daftar kursus dengan filter kategori/enrollment | Pengguna login sesuai scope |
| `POST /courses` | Membuat kursus | Role berwenang |
| `GET /courses/{id}` | Detail kursus | Pengguna yang memiliki akses |
| `PATCH /courses/{id}` | Mengubah kursus | Role berwenang |
| `DELETE /courses/{id}` | Nonaktifkan kursus | Role berwenang |
| `GET /courses/{courseId}/chapters` | Daftar bab | Pengguna yang memiliki akses |
| `POST /courses/{courseId}/chapters` | Membuat bab | Role berwenang |
| `PATCH /chapters/{chapterId}` | Mengubah bab | Role berwenang |
| `DELETE /chapters/{chapterId}` | Nonaktifkan bab | Role berwenang |
| `GET /chapters/{chapterId}/materials` | Daftar materi | Pengguna yang memiliki akses |
| `POST /chapters/{chapterId}/materials` | Membuat materi | Role berwenang |
| `GET /materials/{materialId}` | Detail materi | Pengguna yang memiliki akses |
| `PATCH /materials/{materialId}` | Mengubah materi | Role berwenang |
| `DELETE /materials/{materialId}` | Nonaktifkan materi | Role berwenang |
| `POST /materials/{materialId}/complete` | Mencatat penyelesaian materi jika aturan progres menggunakannya | Taruna pemilik progres |

**Catatan:** permission final untuk membuat/mengubah konten perlu disepakati. Backend harus memvalidasi enrollment dan aturan unlock sebelum memberikan detail atau akses video.

## 6. Video / Bunny Stream

Tabel berikut adalah usulan endpoint video berdasarkan kebutuhan §4.2 dan §4.6 PRD ringkas; nama request/response detail perlu difinalkan pada implementasi.

| Method & path | Tujuan | Akses |
|---|---|---|
| `POST /videos` | Membuat metadata video dan memulai alur upload/integrasi provider | Admin/role pengelola yang disetujui |
| `GET /videos` | Daftar metadata video | Role berwenang; Taruna hanya yang tersedia baginya |
| `GET /videos/{id}` | Detail metadata video | Pengguna yang memiliki akses |
| `PATCH /videos/{id}` | Memperbarui metadata video | Role pengelola yang disetujui |
| `POST /videos/{id}/playback-token` | Meminta token/otorisasi playback yang terbatas | Taruna/pengguna yang memiliki akses |

Ketentuan:
- Video disimpan/di-stream melalui Bunny Stream, bukan dari server aplikasi.
- Secret provider dan kredensial tidak boleh dikirim ke frontend.
- Backend harus memeriksa akses materi, enrollment, status video, dan aturan unlock sebelum mengeluarkan token playback.
- Validasi upload harus mengikuti PRD, termasuk tipe file, ukuran, thumbnail JPG/PNG maksimal 2 MB dan resolusi maksimum 1920×1080 bila berlaku, serta pemeriksaan malware.
- Metode upload final (upload langsung, upload melalui URL bertanda tangan, atau alur provider lain) ditentukan pada spesifikasi teknis Bunny Stream.

## 7. Live Lesson dan absensi

| Method & path | Tujuan | Akses |
|---|---|---|
| `GET /live-lessons` | Daftar kelas live yang tersedia, filter tanggal/status/cohort | Pengguna login sesuai enrollment/assignment |
| `POST /live-lessons` | Membuat jadwal kelas | Mentor/Admin sesuai permission |
| `GET /live-lessons/{id}` | Detail jadwal | Peserta terdaftar dan role berwenang |
| `PATCH /live-lessons/{id}` | Mengubah jadwal/detail | Mentor/Admin pemilik/berwenang; reschedule sesuai batas H-1 |
| `POST /live-lessons/{id}/cancel` | Membatalkan kelas | Mentor/Admin pemilik/berwenang; sesuai aturan reschedule |
| `POST /live-lessons/{id}/join` | Validasi akses dan memulai alur masuk kelas; mencatat kehadiran | Taruna terdaftar dan kelas dapat diikuti |
| `GET /live-lessons/{id}/attendance` | Rekap absensi | Mentor/Admin berwenang |
| `PATCH /live-lessons/{id}/attendance/{participantId}` | Koreksi absensi manual | Mentor/Admin berwenang; audit perubahan |
| `GET /live-lessons/{id}/attendance/export` | Ekspor rekap absensi | Mentor/Admin berwenang |
| `GET /me/live-lessons` | Kelas milik Taruna | Taruna |

Ketentuan:
- Taruna harus masuk melalui tombol aplikasi. API join memeriksa kelayakan lalu memberi respons/redirect yang aman ke layanan eksternal; jangan menjadikan URL eksternal yang dibagikan langsung sebagai alur normal.
- Absensi otomatis dicatat ketika tombol join digunakan sesuai aturan PRD; sistem tidak boleh mengklaim mendeteksi kehadiran fisik jika provider tidak memberikan sinyal tersebut.
- Mentor dapat mengoreksi kehadiran secara manual; perubahan dicatat di audit log.
- Absensi ditutup 24 jam setelah sesi berakhir.
- Reschedule/pembatalan hanya oleh Mentor/Admin pemilik/berwenang paling lambat H-1, dan memicu email + in-app notification kepada peserta.
- Provider/paket dan detail deep-linking/embedded flow mengikuti PKS dan masih perlu konfirmasi.

## 8. CBT / assessments

| Method & path | Tujuan | Akses |
|---|---|---|
| `GET /assessments` | Daftar assessment yang tersedia berdasarkan enrollment/level | Taruna sesuai akses; role pengelola sesuai permission |
| `POST /assessments` | Membuat assessment | Role berwenang |
| `GET /assessments/{id}` | Metadata assessment tanpa membocorkan answer key | Pengguna berwenang |
| `PATCH /assessments/{id}` | Mengubah konfigurasi assessment | Role berwenang; batasi perubahan bila attempt sudah berjalan |
| `GET /assessments/{id}/questions` | Bank soal/daftar soal untuk pengelola | Role pengelola berwenang; answer key hanya sesuai permission |
| `POST /assessments/{id}/questions` | Menambah soal | Role pengelola berwenang |
| `PATCH /questions/{questionId}` | Mengubah soal | Role pengelola berwenang |
| `DELETE /questions/{questionId}` | Menonaktifkan soal | Role pengelola berwenang |
| `POST /assessments/{id}/attempts` | Memulai attempt; server menentukan waktu mulai/berakhir dan randomisasi | Taruna yang berhak |
| `GET /attempts/{attemptId}` | Melanjutkan attempt; kirim jawaban tersimpan dan waktu server tersisa, tanpa answer key | Pemilik attempt; role berwenang sesuai permission |
| `PUT /attempts/{attemptId}/answers/{questionId}` | Autosave jawaban satu soal | Pemilik attempt selama attempt aktif |
| `POST /attempts/{attemptId}/submit` | Submit final secara idempotent | Pemilik attempt selama aturan mengizinkan |
| `GET /attempts/{attemptId}/result` | Hasil attempt yang sudah boleh dilihat | Pemilik attempt/role berwenang |
| `GET /mentor/essay-grading` | Daftar esai yang perlu dinilai | Mentor/pemeriksa berwenang |
| `POST /attempts/{attemptId}/answers/{answerId}/grade` | Memberi nilai/feedback esai | Mentor/pemeriksa berwenang |
| `GET /admin/assessments/overdue-grading` | Daftar esai melewati SLA 7 hari | Admin |

### CBT contract rules

- Attempt memiliki status server-side yang eksplisit, misalnya `IN_PROGRESS`, `SUBMITTED`, `AUTO_GRADED`, `WAITING_MANUAL_GRADING`, `GRADED`, `EXPIRED`. Daftar final status ditetapkan di implementasi dan didokumentasikan.
- Respons start/resume mengembalikan `serverNow`, `startedAt`, `expiresAt`, dan status attempt. Frontend tidak boleh menentukan timer final sendiri.
- Autosave target 30 detik dan juga dapat terjadi saat jawaban berubah; server tetap memvalidasi attempt masih aktif.
- Submit harus idempotent. Permintaan ulang tidak boleh membuat attempt atau hasil ganda.
- Pengacakan urutan soal dan opsi dicatat per attempt sehingga attempt dapat diaudit.
- Jawaban benar tidak boleh dikirim dalam payload Taruna sebelum kebijakan hasil mengizinkannya.
- Pilihan ganda dinilai otomatis; esai dinilai manual oleh mentor/pemeriksa berwenang.
- SLA penilaian esai maksimal 7 hari kalender sejak submit; jika lewat, ditandai terlambat dan dilaporkan ke Admin.
- Default PRD yang perlu konfirmasi: passing grade 70, maksimal 3 attempt, jeda 24 jam, remedial mengulang level.
- Bank soal disediakan klien; dukung impor CSV/Excel sesuai template yang disepakati, jangan membuat isi bank soal atas nama klien.

## 9. Progress, unlock, rating, dan feedback

| Method & path | Tujuan | Akses |
|---|---|---|
| `GET /me/progress` | Progres pembelajaran/assessment Taruna aktif | Taruna |
| `GET /users/{userId}/progress` | Progres Taruna | Admin/Superadmin dan Mentor sesuai assignment/permission |
| `GET /me/ratings` | Rating/feedback milik Taruna | Taruna |
| `POST /ratings` | Membuat rating kelas/mentor 1–5 dan feedback | Taruna yang berhak berdasarkan partisipasi/aturan final |
| `PATCH /ratings/{ratingId}` | Edit rating jika memenuhi jendela edit | Pemilik rating; maksimal sekali dalam 7 hari dari rating pertama sesuai PRD |
| `GET /classes/{classId}/ratings` | Melihat rating yang relevan | Mentor/Admin sesuai permission; kebijakan detail identitas tetap mengikuti PRD bahwa rating tidak anonim |

- Rating bernilai 1–5 dan tidak anonim.
- Rating dapat diedit satu kali dalam 7 hari setelah rating pertama.
- Progress/unlock dihitung backend dari status materi, hasil assessment, dan aturan yang disetujui; jangan mempercayai nilai progress yang dikirim frontend.
- Kriteria persis kapan Taruna boleh memberi rating dan aturan unlock perlu dikonfirmasi pada Fase 1.

## 10. Sertifikat

| Method & path | Tujuan | Akses |
|---|---|---|
| `GET /me/certificates` | Daftar sertifikat Taruna | Taruna |
| `GET /certificates/{certificateId}` | Detail sertifikat | Pemilik dan role berwenang |
| `GET /certificates/{certificateId}/pdf` | Mengunduh PDF sertifikat | Pemilik dan role berwenang |
| `POST /certificates` | Penerbitan sertifikat berdasarkan aturan kelulusan/unlock | Role/sistem berwenang; server memvalidasi syarat |
| `GET /certificates/verify/{certificateNumber}` | Verifikasi publik | **Hanya jika fitur verifikasi publik disetujui** |

Ketentuan:
- Sertifikat berupa PDF dengan nomor unik.
- Sertifikat adalah sertifikat program internal dan harus mencantumkan disclaimer bahwa sertifikat ini bukan sertifikat resmi STCW.
- Nomor dibuat server-side dan disimpan; jangan membuat nomor baru saat PDF dirender/diunduh.
- Verifikasi publik dan QR belum diputuskan; endpoint verifikasi publik tidak perlu dibangun sebelum persetujuan.
- Syarat kelulusan/unlock harus menggunakan aturan backend yang telah dikonfirmasi.

## 11. Ticketing / helpdesk

| Method & path | Tujuan | Akses |
|---|---|---|
| `GET /tickets` | Daftar tiket dengan filter status/pemilik | Taruna: tiket sendiri; Admin/Support: sesuai permission |
| `POST /tickets` | Membuat tiket | Pengguna login; Taruna membuat tiket sendiri |
| `GET /tickets/{id}` | Detail tiket dan riwayat | Pemilik tiket atau Admin/Support berwenang |
| `PATCH /tickets/{id}` | Mengubah judul/deskripsi/metadata jika diizinkan | Pemilik sebelum batas tertentu atau Admin sesuai kebijakan final |
| `PATCH /tickets/{id}/status` | Mengubah status tiket | Admin/Support berwenang; transisi status divalidasi |
| `GET /tickets/{id}/history` | Riwayat penanganan tiket | Pemilik atau Admin/Support berwenang |

Status yang ditetapkan PRD: `OPEN`, `IN_PROGRESS`, `RESOLVED`, `CLOSED` (label UI Indonesia boleh ditampilkan sebagai Open, In Progress, Resolved, Closed sesuai keputusan produk). Setiap perubahan status/penanganan harus dicatat di ticket history/audit trail. Aturan transisi dan siapa yang dapat menutup/membuka ulang tiket perlu disepakati.

## 12. Notifications dan audit logs

| Method & path | Tujuan | Akses |
|---|---|---|
| `GET /me/notifications` | Daftar notifikasi in-app | Pengguna login |
| `PATCH /me/notifications/{id}/read` | Tandai notifikasi sudah dibaca | Pemilik notifikasi |
| `POST /me/notifications/read-all` | Tandai seluruh notifikasi sebagai dibaca | Pengguna login |
| `GET /admin/audit-logs` | Cari log aktivitas penting | Superadmin/Admin sesuai permission |

Event minimum yang perlu memicu notifikasi sesuai PRD meliputi perubahan jadwal/pembatalan Live Lesson dan pemberitahuan penting yang disepakati. Email OTP/reset password adalah alur autentikasi. Event notifikasi tambahan perlu diputuskan.

Audit log minimal mencatat perubahan role/status akun, forced logout, kegagalan pengiriman email sesuai aturan lock, perubahan absensi manual, tindakan administratif penting, permanent delete, dan aktivitas penilaian/sertifikat yang perlu diaudit. Jangan menyimpan secret atau kredensial di audit log.

## 13. Health dan operasional

| Method & path | Tujuan | Akses |
|---|---|---|
| `GET /health` | Liveness check aplikasi | Internal/monitoring; data minimal |
| `GET /ready` | Readiness termasuk koneksi dependency yang relevan | Internal/monitoring; jangan membocorkan detail sensitif |

Endpoint operasional ini adalah usulan teknis. Respons production tidak boleh menampilkan credentials, URL database, stack trace, atau detail infrastruktur sensitif.

## 14. Upload dan file response

- Gunakan multipart/form-data hanya pada endpoint upload yang disepakati.
- Validasi MIME type dan isi file di server; jangan hanya mengandalkan nama ekstensi.
- Terapkan batas ukuran, autentikasi, permission, malware scanning, dan nama file yang aman.
- CSV/Excel import maksimal 500 baris untuk impor pengguna sesuai PRD; respons harus merangkum baris berhasil dan gagal, dengan error per baris tanpa membocorkan data pribadi berlebihan.
- PDF sertifikat/ekspor absensi harus menggunakan `Content-Type` yang tepat dan nama file aman.
- URL download harus memeriksa hak akses; jangan gunakan URL publik permanen untuk data privat.

## 15. Contoh request/response

### 15.1 Login — usulan

Request:

```json
{
  "email": "taruna@example.com",
  "password": "contohPassword123"
}
```

Respons sebelum 2FA selesai (contoh kontrak sementara):

```json
{
  "data": {
    "status": "OTP_REQUIRED",
    "challengeId": "uuid",
    "expiresAt": "2026-10-29T07:05:00Z"
  },
  "meta": null
}
```

Jangan mengembalikan access token penuh sebelum OTP valid. Nama field/struktur final disepakati sebelum implementasi.

### 15.2 Memulai attempt CBT — usulan

Respons:

```json
{
  "data": {
    "attemptId": "uuid",
    "status": "IN_PROGRESS",
    "serverNow": "2026-10-29T07:00:00Z",
    "startedAt": "2026-10-29T07:00:00Z",
    "expiresAt": "2026-10-29T07:45:00Z",
    "questions": []
  },
  "meta": null
}
```

`questions` hanya berisi prompt soal dan opsi yang boleh dilihat Taruna; tidak boleh mengandung answer key, bobot tersembunyi yang mengungkap jawaban, atau data internal pemeriksaan.

### 15.3 Error validasi — usulan

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Periksa kembali data yang dikirim.",
    "details": [
      {
        "field": "title",
        "code": "REQUIRED",
        "message": "Judul wajib diisi."
      }
    ],
    "requestId": "req_example"
  }
}
```

## 16. OpenAPI, testing, dan versioning

- Backend NestJS menjadi sumber implementasi kontrak API.
- Dokumentasikan endpoint, DTO, status code, role/permission, contoh request/response, dan error di Swagger/OpenAPI.
- Sertakan Postman Collection untuk alur utama pada deliverable API final.
- Jangan membuat perubahan breaking pada response/DTO tanpa koordinasi dengan frontend dan pembaruan dokumen.
- Perubahan kontrak harus direview bersama; versi major berikutnya dapat memakai prefix baru jika diperlukan.
- Minimal test untuk endpoint: validasi sukses, input invalid, tidak login, role tidak berhak, akses lintas enrollment/ownership, resource tidak ditemukan, konflik status, dan integrasi database.
- CBT perlu test timer server, autosave, koneksi putus/resume, randomisasi audit, double-submit idempotent, answer-key leakage, penilaian manual, dan SLA esai.
- Auth perlu test OTP expired/invalid, resend throttling, lockout, refresh rotation/revocation, device limit, forced logout, dan reset link one-time.

## 17. Daftar keputusan yang wajib ditutup

1. Format respons standar (`data/meta`, `error`) dan format pagination.
2. Transport access/refresh token, cookie/CORS/CSRF.
3. Daftar permission final per role dan per resource.
4. Nama/status final untuk assessment attempt dan ticket transitions.
5. Format impor CSV/Excel, header kolom, dan cara mengunduh laporan error.
6. Alur upload Bunny Stream dan pembentukan token playback.
7. Layanan Zoom/Meet, paket, dan mekanisme join yang memenuhi aturan tidak membagikan tautan langsung.
8. Aturan assessment final: passing grade, maksimal attempt, jeda dan remedial.
9. Kriteria unlock progres dan sertifikat; verifikasi publik/QR.
10. Notifikasi selain email/in-app dan event yang wajib dikirim.
11. Batas pagination/rate limits, request ID, idempotency key, dan error codes final.
12. Target performa dan definisi p95 untuk UAT.

Sebelum endpoint digunakan oleh frontend, pastikan keputusan yang memengaruhi request/response telah ditinjau dan ditetapkan di dokumen ini.
