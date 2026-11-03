# Rencana Implementasi Frontend (FRONTEND 0, Audit)

**Status:** Draft audit, belum ada implementasi halaman.
**Tanggal:** 2026-11-02
**Branch kerja:** `fe`
**Sumber acuan:** `docs/prd.md`, `docs/architecture.md`, `docs/api-specification.md`, `docs/detail_fase_pekerjaan_SPLI.md`, `PROMPT_CODEX_FRONTEND.md`

## Hasil audit file

1. Dokumen produk tersedia: `docs/prd.md` (PRD ringkas), `docs/architecture.md`, `docs/api-specification.md`, `docs/detail_fase_pekerjaan_SPLI.md`.
2. Folder `frontend/` belum ada di workspace, sehingga belum ada `package.json`, lockfile, router, komponen, style system, test, maupun konfigurasi Vite/TypeScript.
3. Desain Figma atau prototipe visual yang disetujui tidak ditemukan di workspace. Penyebutan Figma hanya ada sebagai rencana di dokumen fase dan prompt, bukan sebagai file yang bisa dipakai. File `docs/Maritim Team & Timeline.xlsx` adalah workbook tim dan timeline, bukan sumber desain UI.
4. Kontrak API di `docs/api-specification.md` dinyatakan sebagai usulan teknis, bukan kontrak final. Frontend tidak boleh menganggap seluruh tabel endpoint sebagai keputusan final sebelum review bersama backend.
5. Keputusan yang sudah dikunci dan berdampak ke frontend: access token via header Bearer, refresh token via cookie HttpOnly, ORM Prisma untuk backend, impor berkas wajib `.xlsx` maksimal 500 baris dengan strategi berhasil sebagian plus unduh log eror.
6. Tidak ada mock data, halaman, route, atau API client yang dibuat pada tahap ini.

## 1. Role dan navigasi yang dibutuhkan

Role mengikuti PRD: Superadmin, Admin, Mentor, Taruna. Route guard dan menu per role hanya untuk UX, bukan keamanan.

1. Publik: login, registrasi Taruna, verifikasi OTP 2FA, lupa password, reset password, halaman 404, halaman akses ditolak.
2. Taruna: dashboard Taruna, pembelajaran Kategori Kapal ke Kursus ke Bab ke Materi atau Video, jadwal Live Lesson dan tombol Masuk Kelas, CBT dan hasil milik sendiri, progres sendiri, rating atau feedback milik sendiri, sertifikat milik sendiri, tiket milik sendiri, notifikasi, profil atau sesi.
3. Mentor: dashboard Mentor, jadwal atau kelas yang ditugaskan, peserta kelas, progres dan hasil peserta yang berwenang diakses, antrean koreksi esai, koreksi absensi manual, feedback yang relevan.
4. Admin: dashboard operasional, pengguna dan verifikasi Taruna, impor `.xlsx` dan template, Angkatan atau Kelas dan enrollment, konten kategori atau kursus atau bab atau materi atau video, Live Lesson, assessment dan bank soal, esai melewati SLA, rating, sertifikat, ticketing support, audit log, notifikasi.
5. Superadmin: ringkasan Admin ditambah pengelolaan akun atau hak akses utama, forced logout sesi, dan penghapusan permanen yang diaudit.

## 2. Daftar halaman berdasarkan PRD dan prioritas MVP

Prioritas mengikuti MVP PRD: auth dan 2FA, enrollment, materi dan video, Live Lesson, CBT lima level, rating dan sertifikat, dashboard empat role, video Bunny Stream, ticketing, lalu integrasi akhir.

1. Fondasi: layout publik, layout aplikasi login, 404, error boundary, komponen dasar.
2. Auth: login, registrasi Taruna plus consent PDP, verifikasi OTP, kirim ulang OTP, lupa password, reset password, sesi kedaluwarsa, logout.
3. Akun dan enrollment: daftar atau detail pengguna, verifikasi Taruna, impor `.xlsx` plus template plus ringkasan sukses atau gagal, CRUD Angkatan atau Kelas, enrollment.
4. Pembelajaran: daftar kategori kapal, detail kategori, daftar kursus, detail kursus, daftar bab, detail materi, halaman video dengan status akses, unavailable, playback expired, dan retry.
5. Live Lesson: daftar dan detail jadwal, buat atau ubah atau batal untuk role berwenang, jadwal Taruna, tombol join, rekap absensi, koreksi absensi.
6. CBT: daftar assessment, instruksi, konfirmasi mulai, attempt, navigasi soal, autosave, submit, hasil, status penilaian esai, grading esai untuk pemeriksa berwenang.
7. Progres dan layanan: progres Taruna, rating atau feedback, daftar atau detail atau unduh sertifikat PDF, tiket dan komentar atau riwayat dan status.
8. Operasional: notifikasi in-app, audit log untuk role berwenang, pengaturan env dan dokumentasi.

## 3. Route map, layout, pola UI, dan state

Route berikut adalah usulan frontend, bukan kontrak backend:

1. Publik: `/login`, `/register`, `/auth/verify-otp`, `/forgot-password`, `/reset-password`, `/403`, `/404`.
2. Umum login: `/dashboard` sebagai pengarah per role, `/notifikasi`, `/profil`, `/tiket`, `/tiket/:id`.
3. Taruna: `/dashboard/taruna`, `/belajar`, `/belajar/kategori/:id`, `/belajar/kursus/:id`, `/belajar/bab/:id`, `/belajar/materi/:id`, `/kelas-live`, `/kelas-live/:id`, `/asesmen`, `/asesmen/:id`, `/asesmen/attempt/:attemptId`, `/progres`, `/rating`, `/sertifikat`.
4. Mentor: `/dashboard/mentor`, `/mentor/kelas-live`, `/mentor/absensi`, `/mentor/koreksi-esai`, `/mentor/peserta`.
5. Admin: `/dashboard/admin`, `/admin/pengguna`, `/admin/verifikasi`, `/admin/impor`, `/admin/angkatan`, `/admin/konten`, `/admin/kelas-live`, `/admin/asesmen`, `/admin/penilaian-terlambat`, `/admin/sertifikat`, `/admin/tiket`, `/admin/audit-log`.
6. Superadmin: `/dashboard/superadmin`, `/superadmin/akses`, `/superadmin/sesi`.

Layout umum:

1. Layout publik untuk auth dan error, satu kolom, fokus ke form dan pesan.
2. Layout aplikasi login dengan header, navigasi samping responsif, konten utama, dan area notifikasi.
3. Dashboard per role memakai layout yang sama tetapi menu dan kartu berbeda sesuai kewenangan UX.
4. Responsif untuk desktop dan browser mobile, sidebar menjadi drawer di layar kecil.

Pola UI:

1. Form: label eksplisit, validasi inline Bahasa Indonesia, password tanpa logging, konfirmasi untuk tindakan penting, status loading dan disabled saat submit.
2. Tabel: pencarian, filter, sorting dari field yang diizinkan backend, pagination, aksi per baris sesuai role UX, empty state yang menjelaskan langkah berikut.
3. Dialog: konfirmasi mulai CBT, submit ujian, batal kelas, hapus atau nonaktifkan data, perubahan status tiket.
4. Status global: loading atau skeleton, empty, success, error validasi, 401 sesi habis, 403 akses ditolak, 404 tidak ditemukan, 409 konflik, 429 rate limit, 500 gangguan server.
5. Aksesibilitas minimum: label form, navigasi keyboard, fokus terlihat, kontras layak, pesan error terbaca.

## 4. Strategi API client, tipe, auth, error, dan guard UX

1. Base URL dari environment, contoh `VITE_API_BASE_URL`, dengan prefix `/api/v1`. Jangan hardcode URL production atau secret.
2. API client terpusat untuk JSON, pagination, upload multipart khusus endpoint yang disepakati, dan unduhan PDF atau `.xlsx`.
3. Access token hanya di memori dan dikirim via header Bearer. Refresh token via cookie HttpOnly yang dikelola browser, frontend tidak menyimpan atau membaca refresh token. Jangan menyimpan password, OTP, atau token di localStorage, log, URL, atau state persisten.
4. Session state dari endpoint profil setelah login atau OTP valid, mengacu ke kontrak setara `/auth/me` di api-specification. Guard route hanya UX, backend tetap otorisasi semua request.
5. Tipe request atau response mengikuti `docs/api-specification.md`. Selama kontrak belum final, buat typed service dengan `TODO` yang jelas dan jangan membuat endpoint, field, role, status, atau error code baru.
6. Error memakai format usulan `error.code`, `error.message`, `error.details`, `error.requestId` bila backend mengirimkannya. Petakan ke pesan Bahasa Indonesia tanpa membocorkan data sensitif. Respons lupa password tidak boleh menyimpulkan apakah email terdaftar.
7. Timer CBT, hasil akhir, kelulusan, progres resmi, absensi resmi, dan permission resmi selalu dari backend. Frontend hanya menampilkan `serverNow`, `startedAt`, `expiresAt`, status attempt, dan instruksi server.
8. Waktu API diperlakukan UTC ISO 8601 dan ditampilkan ke pengguna dalam `Asia/Jakarta`.
9. Untuk operasi yang dapat terkirim ulang seperti autosave atau submit, gunakan `Idempotency-Key` hanya bila endpoint backend mendukungnya.
10. Impor `.xlsx`: sediakan tombol download template, jelaskan batas 500 baris, tampilkan progress, tampilkan ringkasan baris sukses atau gagal dari server, sediakan unduhan log perbaikan. Jangan menyatakan sukses sebelum server menjawab.

## 5. Gap API dan keputusan [PERLU KONFIRMASI] yang berdampak ke UI

1. Format respons standar `data` atau `meta`, format error, pagination, dan sorting: masih usulan. UI butuh keputusan final sebelum integrasi endpoint pertama.
2. Permission rinci per role dan per resource: matriks api-spec masih baseline diskusi. UI hanya menyembunyikan aksi untuk UX dan harus menampilkan error 403 secara benar.
3. Nama dan status final attempt CBT serta transisi status tiket: daftar status di spec masih contoh. UI tidak boleh mengunci alur sebelum final.
4. Alur upload Bunny Stream dan bentuk token playback: detail request atau response `playback-token` belum final. UI tidak boleh memanggil provider langsung atau menyusun URL privat.
5. Provider Live Lesson, paket, dan mekanisme join: belum diputuskan sesuai PKS. UI memakai tombol join generik dan tidak mengunci ke Zoom atau Meet.
6. Aturan assessment default: passing grade 70, maksimal 3 attempt, jeda 24 jam, remedial: masih perlu konfirmasi klien. UI tidak boleh menampilkannya sebagai aturan final, gunakan label sedang dikonfirmasi bila perlu placeholder.
7. Kriteria unlock progres atau sertifikat, kriteria boleh memberi rating, dan jendela edit rating: sebagian perlu konfirmasi Fase 1. UI menampilkan status dan batas waktu dari server bila tersedia.
8. Verifikasi publik atau QR sertifikat: tidak termasuk MVP. Jangan membangun halaman verifikasi publik sebelum disetujui.
9. Template kolom `.xlsx` untuk akun dan bank soal: format `.xlsx` sudah dikunci, kolom final menunggu Fase 1. UI upload harus menunggu template final dari kesepakatan.
10. Provider email, domain pengirim, domain production, monitoring, SLA bug, pemulihan akun selain email, notifikasi tambahan, target performa final: belum diputuskan dan berdampak ke copy UI, QA, dan UAT.
11. Seluruh tabel endpoint api-spec adalah usulan teknis. Frontend membutuhkan review kontrak bersama backend sebelum integrasi final dan tidak mengubah spec sendiri.

## 6. Urutan vertical slices

1. Slice 0 fondasi: inisialisasi React TypeScript Vite di `frontend/`, struktur `app`, `routes`, `layouts`, `components`, `features`, `services`, `hooks`, `types`, `lib`, UI system draft, env example, README, 404 dan error boundary.
2. Slice 1 auth: login, registrasi Taruna, OTP dan resend cooldown, lupa atau reset password, `/auth/me`, logout, sesi kedaluwarsa, guard UX.
3. Slice 2 akun dan enrollment: pengguna, verifikasi Taruna, impor `.xlsx`, Angkatan atau Kelas, enrollment, filter dan pagination, 401 atau 403.
4. Slice 3 konten dan video: hierarki kategori ke kursus ke bab ke materi, metadata dan thumbnail, playback token, unavailable atau expired, validasi ukuran file dari server.
5. Slice 4 Live Lesson: jadwal, create atau edit atau cancel, join Taruna, absensi dan koreksi, tampilan waktu WIB, pembatalan atau perubahan jadwal.
6. Slice 5 CBT: attempt, autosave 30 detik, resume dari server, submit idempotent, hasil, grading esai, tanpa answer key di client.
7. Slice 6 progres dan layanan: progres dari backend, rating 1 sampai 5, sertifikat PDF dan disclaimer non STCW, ticketing dan riwayat status.
8. Slice 7 integrasi akhir: audit route empat role, audit kontrak API, aksesibilitas dan responsif, env production, lint typecheck test build, daftar endpoint terintegrasi dan gap.

## 7. Usulan sistem UI awal sebagai draft

1. Gaya bersih dan profesional untuk konteks pendidikan maritim, Bahasa Indonesia, hierarki jelas, ruang napas cukup.
2. Token dasar: warna primer, aksen, netral, status sukses atau peringatan atau error atau info, tipografi judul dan isi, skala spacing, radius, dan bayangan.
3. Komponen dasar: button, input, select, textarea, checkbox, radio, kartu, tabel, badge status, dialog, alert atau toast, skeleton, empty state, breadcrumb, tabs, stepper, upload file.
4. Status CBT khusus: indikator autosave tersimpan atau menyimpan atau gagal, timer dari server, dialog konfirmasi submit, status penilaian esai.
5. Semua placeholder visual diberi label draft dan tidak memakai data pengguna, soal, nilai, tiket, atau sertifikat palsu untuk production.

## 8. Catatan integrasi dan batasan

1. Frontend tidak mengakses PostgreSQL langsung dan tidak menyimpan secret provider.
2. Frontend tidak menerima atau menyimpan answer key CBT, tidak menentukan nilai akhir atau kelulusan, tidak menetapkan sisa waktu resmi, tidak mengesahkan absensi, dan tidak menjadi sumber kebenaran permission.
3. Usulan perubahan kontrak API dicatat di laporan tahap dan dikoordinasikan dengan backend, tidak langsung diimplementasikan sebagai integrasi final.
4. Fixture atau mock hanya untuk testing atau development, terpisah dari build production dan diberi label jelas.

## Keputusan router dan styling tahap 1

1. Router memakai react-router-dom versi 7 karena ringan, umum, dokumentasi jelas, dan sudah ditambahkan sebagai dependency frontend.
2. Styling memakai CSS bertoken di src/app/styles.css tanpa library tambahan agar tidak menambah dependency berat.
3. Keputusan ini dicatat di sini sesuai permintaan tahap 1.

## Definisi selesai tahap 0

Tahap 0 selesai karena audit dan rencana ini tersimpan, tanpa halaman baru, tanpa mock data produksi, dan tanpa perubahan kontrak API. Implementasi fondasi menunggu PROMPT FRONTEND 1.

## Status FRONTEND 2, Auth

Tanggal: 2026-11-02. Scope hanya alur autentikasi, tanpa manajemen user.

1. Halaman selesai: `/login`, `/register`, `/auth/verify-otp`, `/forgot-password`,
   `/reset-password`, `/sesi-berakhir`, plus `RequireAuth`, `RequireRole`, tombol logout
   konfirmasi, dan session state challenge atau expired.
2. Endpoint dipakai sesuai usulan `docs/api-specification.md`: `POST /auth/register`,
   `POST /auth/login`, `POST /auth/2fa/verify`, `POST /auth/2fa/resend`, `POST /auth/refresh`,
   `POST /auth/logout`, `POST /auth/password/forgot`, `POST /auth/password/reset`,
   `GET /auth/me`. Kontrak masih usulan dan belum final.
3. Aturan dijaga: registrasi publik hanya Taruna, password atau OTP tidak disimpan di localStorage,
   log, URL, atau state persisten, access token di memori via Bearer, refresh token via cookie
   HttpOnly, guard hanya UX, dan pesan lupa password tidak membocorkan status email.
4. Gap: nama field dan struktur final login atau OTP, kode error final, permission rinci, template
   email, rate limit final, dan mekanisme pemulihan selain email masih menunggu backend dan
   keputusan produk.

## Status FRONTEND 3, Dashboard dan Akun

Tanggal: 2026-11-02. Scope hanya dashboard per role, pengguna, impor, Angkatan atau Kelas, dan
enrollment. Tidak ada fitur manajemen user di luar kontrak.

1. Halaman selesai: `/dashboard` berbeda untuk Taruna, Mentor, Admin, dan Superadmin tanpa KPI
   karangan; `/admin/pengguna`, `/admin/pengguna/:userId`, `/admin/impor`, `/admin/angkatan`,
   `/admin/angkatan/baru`, `/admin/angkatan/:cohortId`, `/admin/angkatan/:cohortId/ubah`, dan
   `/enrollment-saya`.
2. Endpoint dipakai sesuai usulan `docs/api-specification.md`: `GET /admin/users`,
   `PATCH /admin/users/{userId}`, `POST /admin/users/{userId}/verify`,
   `POST /admin/users/import`, `GET /admin/users/imports/{importId}`,
   `GET /cohorts`, `POST /cohorts`, `GET /cohorts/{cohortId}`, `PATCH /cohorts/{cohortId}`,
   `DELETE /cohorts/{cohortId}`, `GET /cohorts/{cohortId}/enrollments`,
   `POST /cohorts/{cohortId}/enrollments`,
   `DELETE /cohorts/{cohortId}/enrollments/{enrollmentId}`, `GET /me/enrollments`, plus URL template
   dan log impor sebagai TODO menunggu kontrak final.
3. Aturan dijaga: impor hanya `.xlsx` maksimal 500 baris, hasil sukses atau gagal dari server,
   verifikasi dan hapus memakai konfirmasi, error field-level bila tersedia, empty state membantu,
   aksi disembunyikan untuk UX tetapi error 403 backend ditampilkan apa adanya.
4. Gap: format respons dan pagination final, permission rinci Admin versus Superadmin, template kolom
   `.xlsx` final, URL template dan log final, kebijakan soft delete dan relasi cohort final,
   serta endpoint `POST /admin/users` dan sesi perangkat belum dipakai pada tahap ini.

## Status FRONTEND 4, Pembelajaran dan Video

Tanggal: 2026-11-02. Scope hanya hirarki Kategori Kapal ke kursus ke bab ke materi video, pengelolaan
konten sesuai izin, dan video player dari token backend.

1. Halaman selesai: `/belajar`, `/belajar/kategori/:categoryId`, `/belajar/kursus/:courseId`,
   `/belajar/bab/:chapterId`, `/belajar/materi/:materialId`, `/konten`,
   `/konten/kategori/baru`, `/konten/kategori/:categoryId/ubah`,
   `/konten/kategori/:categoryId/kursus/baru`, `/konten/kursus/:courseId/ubah`,
   dan `/konten/materi/:materialId/ubah`.
2. Endpoint dipakai sesuai usulan `docs/api-specification.md`: kategori, kursus, bab, materi,
   `POST /materials/{materialId}/complete`, `POST /videos`, `GET /videos`, `GET /videos/{id}`,
   `PATCH /videos/{id}`, dan `POST /videos/{id}/playback-token`. Tidak ada endpoint video lain yang
   dipakai dan tidak ada panggilan Bunny Stream dari browser.
3. Aturan dijaga: Taruna hanya melihat konten sesuai enrollment dan aturan unlock dari backend,
   status selesai dan progres dari server, frontend hanya mengirim event penyelesaian, video tidak
   ditampilkan bila akses ditolak, token expired atau unavailable menampilkan retry, dan metadata
   thumbnail mengikuti batas PRD dengan validasi server.
4. Gap: struktur field final, permission rinci pengelola konten, status video dan playback final,
   alur upload Bunny Stream final, template metadata final, aturan unlock dan progres final, serta
   batas file dan dimensi final di server. Tidak ada daftar materi, judul, durasi, atau status
   selesai yang dikarang sebagai data nyata.

## Status FRONTEND 5, Live Lesson

Tanggal: 2026-11-02. Scope hanya daftar dan detail jadwal, create atau edit atau cancel,
tombol join, serta absensi dan koreksi absensi. Tidak ada layanan konferensi final.

1. Halaman selesai: `/kelas-live`, `/kelas-live/baru`, `/kelas-live/:liveLessonId`,
   `/kelas-live/:liveLessonId/ubah`, dan `/kelas-live/:liveLessonId/absensi`.
2. Endpoint dipakai sesuai usulan `docs/api-specification.md`: `GET /live-lessons`,
   `POST /live-lessons`, `GET /live-lessons/{id}`, `PATCH /live-lessons/{id}`,
   `POST /live-lessons/{id}/cancel`, `POST /live-lessons/{id}/join`,
   `GET /live-lessons/{id}/attendance`, `PATCH /live-lessons/{id}/attendance/{participantId}`,
   dan `GET /me/live-lessons`. URL ekspor absensi masih TODO menunggu kontrak final.
3. Aturan dijaga: waktu ditampilkan WIB, form create atau edit atau cancel hanya untuk
   Mentor, Admin, atau Superadmin, Taruna memakai tombol join backend, tautan mentah tidak
   ditampilkan di daftar umum, status dibatalkan atau diubah ditampilkan jelas, perubahan memakai
   konfirmasi, absensi dan koreksi hanya untuk pihak berwenang, hasil dari server, dan tidak ada
   klaim notifikasi terkirim sebelum endpoint atau provider final.
4. Gap: status final, permission dan assignment final, aturan H-1 dan 24 jam di server, format
   respons join dan attendance final, URL ekspor final, provider Zoom atau Meet dan mekanisme join
   final, serta notifikasi tambahan. UI sengaja generik dan tidak mengunci ke Zoom atau Meet.

## Status FRONTEND 6, CBT

Tanggal: 2026-11-03. Scope hanya daftar dan instruksi assessment, konfirmasi mulai, layar attempt,
navigasi soal, pilihan ganda dan esai, autosave, konfirmasi submit, hasil, status penilaian esai,
serta grading esai dan esai melewati SLA.

1. Halaman selesai: `/asesmen`, `/asesmen/:assessmentId`, `/asesmen/attempt/:attemptId`,
   `/asesmen/attempt/:attemptId/hasil`, `/mentor/koreksi-esai`, dan
   `/admin/penilaian-terlambat`.
2. Endpoint dipakai sesuai usulan `docs/api-specification.md`: `GET /assessments`,
   `GET /assessments/{id}`, `POST /assessments/{id}/attempts`, `GET /attempts/{attemptId}`,
   `PUT /attempts/{attemptId}/answers/{questionId}`, `POST /attempts/{attemptId}/submit`,
   `GET /attempts/{attemptId}/result`, `GET /mentor/essay-grading`,
   `POST /attempts/{attemptId}/answers/{answerId}/grade`, dan
   `GET /admin/assessments/overdue-grading`. Tidak ada endpoint impor bank soal pada tahap ini.
3. Aturan dijaga: timer dari timestamp dan status server, resume dari server, autosave tiap 30
   detik plus saat jawaban berubah memakai Idempotency-Key, retry aman, tidak ada answer key di
   payload client, tidak ada perhitungan lulus atau nilai akhir lokal, dan angka passing grade 70,
   3 attempt, jeda 24 jam, serta remedial tidak ditampilkan sebagai final.
4. Gap: struktur field final, status attempt final, format autosave dan submit final, dukungan
   Idempotency-Key backend, batas attempt dan jeda final, kriteria unlock dan sertifikat final,
   deadline SLA final dari API, serta permission dan assignment grading final.

## Status FRONTEND 7, Progres Rating Sertifikat Ticketing

Tanggal: 2026-11-03. Scope hanya progres, rating atau feedback, sertifikat, dan ticketing sesuai
kontrak. Tidak ada halaman verifikasi publik atau QR dan tidak ada data palsu production.

1. Halaman selesai: `/progres`, `/rating`, `/sertifikat`, `/sertifikat/:certificateId`, `/tiket`,
   `/tiket/baru`, dan `/tiket/:ticketId`.
2. Endpoint dipakai sesuai usulan `docs/api-specification.md`: `GET /me/progress`,
   `GET /users/{userId}/progress`, `GET /me/ratings`, `POST /ratings`, `PATCH /ratings/{ratingId}`,
   `GET /me/certificates`, `GET /certificates/{certificateId}`,
   `GET /certificates/{certificateId}/pdf`, `GET /tickets`, `POST /tickets`,
   `GET /tickets/{id}`, `PATCH /tickets/{id}/status`, dan `GET /tickets/{id}/history`. Endpoint
   `POST /certificates`, verifikasi publik, dan unduhan template final tidak dipakai karena butuh
   keputusan.
3. Aturan dijaga: progres dari backend tanpa perhitungan lokal, rating 1 sampai 5 non-anonim dan
   edit mengikuti status server, sertifikat internal bukan STCW tanpa verifikasi publik atau QR,
   Taruna hanya melihat tiket sendiri, support hanya Admin, Mentor bukan petugas support, status
   aktual dari backend, dan perubahan status memakai konfirmasi.
4. Gap: format respons dan pagination final, kriteria boleh memberi rating final, jendela edit dan
   batas 7 hari dari server, syarat penerbitan sertifikat final, URL PDF final, transisi status
   tiket final, batas unduhan dan permission unduhan gagal final, serta endpoint progres Mentor
   atau Admin per assignment final.

## Status FRONTEND 8, Audit Integrasi Akhir

Tanggal: 2026-11-03. Audit tanpa menambah fitur baru. Tidak ada perubahan API spec.

1. Rute dan navigasi: 49 rute terdaftar termasuk publik, auth, dashboard, pembelajaran lima
   tingkat, konten kelola, live lesson dan absensi, CBT dan grading, progres, rating, sertifikat,
   tiket, enrollment, akun, angkatan, impor, 403, 404, dan fallback. Navigasi menyesuaikan empat
   role untuk UX; otorisasi resmi tetap di backend.
2. Endpoint terintegrasi: auth 9 endpoint, akun dan cohort atau enrollment 13 endpoint, konten dan
   video 18 endpoint, live lesson dan absensi 9 endpoint, CBT dan grading 10 endpoint, serta
   progres, rating, sertifikat, dan tiket 13 endpoint. Total 72 pemakaian endpoint usulan sesuai
   `docs/api-specification.md`. Tidak ada endpoint, field, status, atau respons yang dibuat-buat.
3. Secret dan data sensitif: tidak ada secret provider, answer key, password, OTP, atau token di
   console, log, URL, localStorage, atau state persisten. Satu-satunya kata kunci sensitif adalah
   daftar pelindung `FORBIDDEN_ANSWER_KEYS` untuk menolak payload berisi kunci jawaban. Beban
   `frontend/dist` tetap di gitignore dan bukan artefak rilis.
4. State dan error: loading, empty, success, validasi field, 401 sesi berakhir, 403 akses ditolak,
   404 tidak ditemukan, 409 konflik, 413 berkas besar, 422 aturan sistem, 429 rate limit, 500 atau
   503 server error, dan retry ditangani di API client dan halaman. Timer CBT, hasil, progres,
   unlock, absensi, permission, dan status tiket selalu dari backend.
5. Responsif dan aksesibilitas: 189 atribut label, ARIA, alert, status, dan skip-link; fokus
   terlihat 3px; grid responsif desktop dan mobile; pesan error Bahasa Indonesia terbaca.
   Pengecekan kontras, keyboard penuh, dan pembaca layar lintas browser masih perlu QA manual dan
   UAT.
6. Mock dan fixture: tidak ada mock atau fixture produksi. Semua contoh hanya di file test dan
   label placeholder komponen.
7. Environment dan build: base URL dari `VITE_API_BASE_URL` plus prefix `/api/v1`; tidak ada URL
   lokal hardcoded di `src`. Contoh env hanya placeholder. Build production valid.
8. Hasil command: `npm run typecheck` PASS, `npm run lint` PASS dengan 0 error dan 3 warning pola
   loading normal, `npm run build` PASS dengan 81 modul, test PASS yaitu services 11, CBT 10,
   routes 16, auth 11, accounts 7, learning 9, live 10, apiClient 3, dan components 1.
9. API yang masih dibutuhkan atau belum final: format respons dan pagination final; permission dan
   assignment final; kode error final; template kolom `.xlsx`; URL template, log, PDF, ekspor,
   dan playback final; alur Bunny Stream final; provider Live Lesson dan PKS final; aturan CBT dan
   remedial final; kriteria unlock, progres, rating, dan sertifikat final; endpoint admin tambahan
   seperti buat user, sesi, audit log, notifikasi, penerbitan sertifikat manual, impor bank soal,
   dan progres per user; serta endpoint verifikasi publik sertifikat yang tidak termasuk MVP.

## Status FRONTEND 9, UAT dan Persiapan Rilis

Tanggal: 2026-11-03. Fokus stabilisasi staging atau UAT tanpa deploy production dan tanpa ubah
domain atau secret. Tidak ada bug kritis baru dan tidak ada enhancement yang dimasukkan sebagai
perbaikan otomatis.

1. Bukti pengujian: skenario UAT 10 alur di `docs/frontend-uat-checklist.md`, didukung test
   otomatis services 11, CBT 10, routes 16, auth 11, accounts 7, learning 9, live 10, apiClient 3,
   dan components 1.
2. Bug diperbaiki: tidak ada perbaikan kode pada tahap 9 karena tidak ditemukan bug kritis baru.
3. Known issues: worker Vitest kadang tidak stabil bila banyak file digabung, QA manual kontras,
   keyboard, pembaca layar, dan perangkat nyata masih perlu, kontrak API masih usulan, dan bundle
   `frontend/dist` tetap di gitignore.
4. Endpoint blocker staging: seluruh kontrak usulan butuh review backend, termasuk format final,
   permission dan assignment, kode error, template kolom, URL unduhan dan ekspor, alur Bunny Stream,
   provider Live Lesson dan PKS, aturan CBT dan remedial, kriteria unlock dan sertifikat, serta
   endpoint admin tambahan dan notifikasi.
