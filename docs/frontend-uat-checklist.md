# Checklist UAT Frontend, Staging

Tanggal: 2026-11-03
Scope: staging atau UAT, bukan production. Jangan deploy production atau ubah domain atau secret
tanpa instruksi eksplisit.

## Prasyarat staging

1. Backend staging siap dengan prefix `/api/v1`.
2. `VITE_API_BASE_URL` staging terisi tanpa prefix `/api/v1`.
3. Akun uji empat role: Taruna, Mentor, Admin, Superadmin.
4. Data uji: Angkatan atau Kelas, enrollment Taruna, kategori, kursus, bab, materi, jadwal live,
   assessment, tiket, dan sertifikat bila syarat terpenuhi.
5. Kontrak API usulan sudah direview bersama backend sebelum UAT final.

## Skenario UAT

1. Login dan OTP
   - Login benar meminta OTP 6 digit, countdown tampil, dan resend cooldown minimal 60 detik.
   - OTP salah menampilkan pesan invalid, OTP kedaluwarsa menampilkan pesan expired, dan attempt
     limit menampilkan pesan batas.
   - Bukti otomatis: `src/test/auth.test.tsx` 11 lolos.

2. Verifikasi Taruna
   - Admin membuka `/admin/pengguna`, filter status menunggu verifikasi, membuka detail, lalu
     verifikasi dengan dialog konfirmasi.
   - Taruna belum verifikasi tidak mendapat akses penuh sesuai respons backend.
   - Bukti otomatis: `src/test/accounts.test.tsx` 7 lolos.

3. Enrollment
   - Admin membuka `/admin/angkatan/:cohortId`, menambah enrollment, lalu menonaktifkan bila perlu.
   - Taruna membuka `/enrollment-saya` dan melihat enrollment milik sendiri.
   - Bukti otomatis: `src/test/accounts.test.tsx` 7 lolos.

4. Akses materi
   - Taruna membuka `/belajar`, kategori, kursus, bab, lalu materi sesuai enrollment.
   - Materi terkunci menampilkan pesan aturan backend dan tidak bisa dibuka.
   - Akses ditolak backend menampilkan 403 tanpa memutar video.
   - Bukti otomatis: `src/test/learning.test.tsx` 9 lolos.

5. Join Live Lesson
   - Taruna membuka `/kelas-live`, waktu tampil WIB, membuka detail, lalu menekan Masuk Kelas.
   - Join memanggil `POST /live-lessons/{id}/join`; tautan mentah tidak ditampilkan di daftar.
   - Join ditolak menampilkan pesan 403 dan tidak redirect.
   - Bukti otomatis: `src/test/live.test.tsx` 10 lolos.

6. CBT start, autosave, resume, dan submit
   - Taruna membuka `/asesmen`, instruksi, konfirmasi mulai, lalu attempt dimulai dari server.
   - Timer dari `serverNow` dan `expiresAt`; refresh memuat ulang dari `GET /attempts/{attemptId}`.
   - Autosave tiap 30 detik dan saat jawaban berubah, status saved, saving, atau error tampil.
   - Submit memakai konfirmasi dan `Idempotency-Key`; hasil hanya dari server.
   - Bukti otomatis: `src/test/cbt.test.tsx` 10 lolos.

7. Hasil dan grading
   - Taruna membuka `/asesmen/attempt/:attemptId/hasil`; nilai dan kelulusan hanya dari backend.
   - Pemeriksa membuka `/mentor/koreksi-esai`, memberi nilai 0 sampai 100 dengan deadline SLA.
   - Admin membuka `/admin/penilaian-terlambat` untuk esai melewati SLA.
   - Bukti otomatis: `src/test/cbt.test.tsx` 10 lolos.

8. Rating
   - Taruna membuka `/rating`, mengirim rating 1 sampai 5, lalu edit maksimal satu kali dalam 7 hari
     bila server mengizinkan.
   - Peran lain tidak membuat rating di halaman Taruna.
   - Bukti otomatis: `src/test/services.test.tsx` 11 lolos.

9. Sertifikat
   - Taruna membuka `/sertifikat`, melihat disclaimer internal bukan STCW, membuka detail, lalu
     unduh PDF bila diizinkan.
   - Akses ditolak menyembunyikan unduhan.
   - Bukti otomatis: `src/test/services.test.tsx` 11 lolos.

10. Ticketing
    - Pengguna membuat tiket di `/tiket/baru` dengan validasi judul dan deskripsi.
    - Taruna hanya melihat tiket milik sendiri; tiket pengguna lain menampilkan 403.
    - Admin mengubah status dengan konfirmasi dan riwayat tercatat.
    - Bukti otomatis: `src/test/services.test.tsx` 11 lolos.

## Perilaku API lambat atau putus

1. Semua halaman penting memakai loading, empty, error, dan tombol muat ulang.
2. Tombol penting disabled saat request berjalan dengan label memproses, menyimpan, mengirim,
   memverifikasi, atau memeriksa.
3. Submit ujian, koreksi absensi, penilaian esai, perubahan status tiket, dan unduhan sertifikat
   menunggu respons server. Tidak ada klaim sukses sebelum server mengonfirmasi.
4. Autosave CBT menampilkan error dan retry aman dengan `Idempotency-Key` bila backend mendukung.

## Bug yang diperbaiki pada tahap ini

1. Tidak ada bug kritis baru yang ditemukan dari pengujian otomatis tahap 9.
2. Tidak ada perbaikan scope di luar klasifikasi di bawah. Tidak ada enhancement yang dimasukkan
   sebagai perbaikan otomatis.

## Klasifikasi

1. Bug kritis: tidak ditemukan pada pengujian frontend tahap 9. Blocker UAT tetap menunggu backend
   dan keputusan kontrak.
2. Bug minor: 3 warning lint pola loading normal di `useAccountList.ts`, `UserPages.tsx`, dan
   `CategoryPages.tsx`. Tidak mengubah perilaku dan tidak menutupi error.
3. Enhancement atau Change Request: dasbor ringkasan KPI, notifikasi in-app, ekspor PDF atau XLSX
   final, template impor final, verifikasi publik sertifikat atau QR, dan perbaikan aksesibilitas
   lanjutan. Semua di luar MVP dan butuh persetujuan.

## Known issues

1. Worker Vitest kadang tidak stabil bila banyak file digabung; mitigasi dengan menjalankan test
   per file dan worker tunggal.
2. QA manual masih perlu untuk kontras, keyboard penuh, pembaca layar lintas browser, dan
   responsivitas perangkat nyata.
3. Semua kontrak API masih usulan dan butuh review bersama backend sebelum UAT final.
4. Bundle `frontend/dist` tetap di gitignore dan bukan artefak rilis.

## Endpoint yang perlu siap di staging

1. Auth: `POST /auth/register`, `POST /auth/login`, `POST /auth/2fa/verify`,
   `POST /auth/2fa/resend`, `POST /auth/refresh`, `POST /auth/logout`,
   `POST /auth/password/forgot`, `POST /auth/password/reset`, `GET /auth/me`.
2. Akun dan enrollment: `GET /admin/users`, `PATCH /admin/users/{userId}`,
   `POST /admin/users/{userId}/verify`, `POST /admin/users/import`,
   `GET /admin/users/imports/{importId}`, `GET /cohorts`, `POST /cohorts`,
   `GET /cohorts/{cohortId}`, `PATCH /cohorts/{cohortId}`, `DELETE /cohorts/{cohortId}`,
   `GET /cohorts/{cohortId}/enrollments`, `POST /cohorts/{cohortId}/enrollments`,
   `DELETE /cohorts/{cohortId}/enrollments/{enrollmentId}`, `GET /me/enrollments`.
3. Konten dan video: kategori, kursus, bab, materi, `POST /materials/{materialId}/complete`,
   `POST /videos`, `GET /videos`, `GET /videos/{id}`, `PATCH /videos/{id}`,
   `POST /videos/{id}/playback-token`.
4. Live lesson: `GET /live-lessons`, `POST /live-lessons`, `GET /live-lessons/{id}`,
   `PATCH /live-lessons/{id}`, `POST /live-lessons/{id}/cancel`, `POST /live-lessons/{id}/join`,
   `GET /live-lessons/{id}/attendance`,
   `PATCH /live-lessons/{id}/attendance/{participantId}`, `GET /me/live-lessons`.
5. CBT: `GET /assessments`, `GET /assessments/{id}`, `POST /assessments/{id}/attempts`,
   `GET /attempts/{attemptId}`, `PUT /attempts/{attemptId}/answers/{questionId}`,
   `POST /attempts/{attemptId}/submit`, `GET /attempts/{attemptId}/result`,
   `GET /mentor/essay-grading`, `POST /attempts/{attemptId}/answers/{answerId}/grade`,
   `GET /admin/assessments/overdue-grading`.
6. Layanan: `GET /me/progress`, `GET /users/{userId}/progress`, `GET /me/ratings`,
   `POST /ratings`, `PATCH /ratings/{ratingId}`, `GET /me/certificates`,
   `GET /certificates/{certificateId}`, `GET /certificates/{certificateId}/pdf`,
   `GET /tickets`, `POST /tickets`, `GET /tickets/{id}`, `PATCH /tickets/{id}/status`,
   `GET /tickets/{id}/history`.
