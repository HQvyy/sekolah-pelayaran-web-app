# Prompt Codex Bertahap — Frontend

> **Tujuan:** Prompt khusus untuk developer frontend pada proyek Web Apps E-Learning Sekolah Pelaut Indonesia. Tempel **satu tahap per permintaan** ke Codex. Jangan meminta Codex menjalankan seluruh tahap sekaligus.
>
> **Repository:** Satu repository bersama dengan folder `frontend/`, `backend/`, dan `docs/`. Kerjakan hanya `frontend/` serta dokumen UI/API yang memang perlu diperbarui. Jangan mengubah kode backend.
>
> **Dokumen sumber wajib:** `docs/prd.md`, `docs/architecture.md`, dan `docs/api-specification.md`. Jika PRD memiliki nama/lokasi berbeda, temukan file PRD yang tersedia dan catat lokasi sebenarnya. Jangan mengarang isi dokumen yang tidak ditemukan.

## Aturan tetap untuk semua tahap

```text
Anda adalah senior frontend engineer dan UI implementation lead untuk proyek Web Apps E-Learning Sekolah Pelaut Indonesia.

SUMBER KEBENARAN DAN SCOPE
1. PRD adalah sumber kebutuhan produk utama. architecture.md menjelaskan pembagian sistem. api-specification.md adalah kontrak integrasi frontend-backend.
2. Ikuti stack: React + TypeScript + Vite, SPA responsif, Bahasa Indonesia, REST API dengan prefix /api/v1.
3. Implementasikan hanya tahap yang diminta. Jangan membangun seluruh aplikasi sekaligus dan jangan menambahkan fitur di luar MVP/PRD.
4. Jika dokumen saling bertentangan atau keputusan ditandai [PERLU KONFIRMASI], jangan menebak. Catat pertanyaan/opsi, gunakan UI/configuration yang tidak mengunci keputusan, atau tandai bagian yang terblokir. Jangan menganggap usulan di api-specification.md sebagai keputusan bisnis final.
5. `docs/api-specification.md` adalah kontrak integrasi. Jangan mengarang endpoint, payload, response field, role, status, atau error code. Jika kebutuhan UI belum didukung API, dokumentasikan gap dan gunakan mock lokal hanya untuk pengembangan/testing yang diberi label jelas; jangan berpura-pura backend sudah menyediakan data tersebut.
6. Frontend tidak mengakses PostgreSQL secara langsung dan tidak menyimpan secret provider. Jangan pernah menerima atau menyimpan answer key CBT, menentukan nilai akhir/lulus, menetapkan sisa waktu resmi, mengesahkan absensi, atau menentukan permission sebagai sumber kebenaran. Semua hal tersebut berasal dari backend.
7. Route guard/menu berdasarkan role hanya untuk UX. Jangan menganggapnya sebagai keamanan; backend tetap wajib mengotorisasi semua request.
8. Gunakan TypeScript yang ketat, komponen reusable, pemisahan fitur/domain, dan UI konsisten. Jangan menambahkan dependency besar tanpa alasan. Pertahankan struktur yang sudah ada.
9. Semua teks UI utama berbahasa Indonesia. Desain responsif untuk desktop dan browser mobile, dengan loading, empty, success, error, disabled, dan confirmation state yang jelas. Gunakan aksesibilitas minimum: label form, keyboard navigation, fokus terlihat, kontras yang layak, dan pesan error yang terbaca.
10. Jangan membuat data pengguna, materi, soal, nilai, tiket, atau sertifikat palsu untuk production. Fixture/mocks hanya untuk testing/development dan harus dipisahkan dari build production.
11. Jangan mengubah API spec atau backend code. Jika perlu perubahan kontrak, catat usulan di laporan dan koordinasikan dengan developer backend sebelum mengimplementasikan integrasi final.
12. Di akhir tahap, laporkan ringkasan, file dibuat/diubah, halaman/route selesai, endpoint yang dipakai, asumsi/gap API, hasil lint/typecheck/test/build PASS/FAIL, dan blocker. STOP setelah tahap itu.
```

---

## PROMPT FRONTEND 0 — Audit repository, PRD, API, dan rencana UI (TANPA MEMBANGUN SEMUA HALAMAN)

```text
Jalankan aturan tetap frontend.

Sebelum coding fitur, periksa file yang benar-benar tersedia:
- docs/prd.md atau lokasi PRD yang ada
- docs/architecture.md
- docs/api-specification.md
- folder frontend yang ada, package.json/lockfile, router, komponen, style system, tests, dan konfigurasi
- desain/prototype Figma atau referensi UI yang memang tersedia di workspace

Jangan menganggap desain atau file yang tidak ditemukan sebagai tersedia. Buat audit singkat dan rencana implementasi frontend dengan:
1. Daftar role dan navigasi yang dibutuhkan: Superadmin, Admin, Mentor, Taruna.
2. Daftar halaman berdasarkan kebutuhan PRD dan prioritas MVP.
3. Rancangan route map, layout umum, pola form/table/dialog, serta loading/empty/error state.
4. Strategi API client, tipe request/response dari api-specification.md, auth/session state, error handling, dan route guards UX.
5. Daftar gap API atau keputusan [PERLU KONFIRMASI] yang berdampak pada UI.
6. Urutan implementasi dalam vertical slices supaya bisa diintegrasikan dengan backend sedikit demi sedikit.

Jangan membuat semua halaman, jangan membuat mock data seolah-olah data sungguhan, jangan mengubah kontrak API. Jika belum ada desain visual yang disetujui, usulkan sistem UI awal yang bersih, profesional, mudah digunakan, berbahasa Indonesia, dan responsif; tandai sebagai draft. Simpan rencana di docs/frontend-implementation-plan.md bila sesuai. STOP setelah audit.
```

## PROMPT FRONTEND 1 — Fondasi React, routing, layout, dan UI system

```text
Jalankan aturan tetap frontend. Implementasikan hanya fondasi aplikasi.

- Jika belum ada, inisialisasi React + TypeScript + Vite di folder frontend/ tanpa mengganggu backend/ dan docs/.
- Siapkan struktur fitur yang mudah dirawat sesuai docs/architecture.md: app, routes, layouts, components, features, services, hooks, types, lib.
- Pilih router dan strategi styling yang sesuai dengan dependency yang sudah ada. Jika belum ada pilihan, usulkan satu opsi sederhana dan catat di docs/frontend-implementation-plan.md; jangan menambah library berat tanpa alasan.
- Buat shell layout responsif, tipografi/spacing/color tokens, komponen dasar form/button/card/table/badge/dialog/loading/empty/error, dan navigasi yang bisa menyesuaikan role.
- Sediakan halaman 404 dan error boundary/fallback yang wajar.
- Konfigurasikan environment variable untuk base URL API; jangan hardcode URL production atau secret. Sediakan `.env.example` dengan placeholder.
- Tambahkan README untuk setup, dev, lint, typecheck, test, build. Pastikan API client dapat mengirim JSON dan menangani format error yang tercantum di api-specification.md.
- Jangan membangun semua dashboard dan fitur domain pada tahap ini. Gunakan data statis hanya untuk preview komponen dan beri label sebagai placeholder; jangan masukkan ke data production.

Jalankan lint, typecheck, test, build yang tersedia. Laporkan hasil dan STOP.
```

## PROMPT FRONTEND 2 — Login, registrasi Taruna, OTP, reset password, dan session UX

```text
Implementasikan hanya alur autentikasi frontend sesuai PRD dan docs/api-specification.md.

Halaman/alur:
- Login.
- Registrasi Taruna dengan persetujuan pemrosesan data pribadi sesuai copy/ketentuan yang tersedia di PRD.
- Verifikasi OTP email 6 digit, countdown/indikator waktu, resend dengan cooldown minimal 60 detik, pesan invalid/expired/attempt limit, dan loading state.
- Forgot/reset password.
- State sesi kedaluwarsa, logout, dan akses yang ditolak.

Aturan:
- Registrasi publik hanya untuk Taruna; jangan tampilkan pilihan signup Admin/Mentor/Superadmin.
- Ikuti endpoint, payload, response, dan error dari api-specification.md. Jika API belum ada, buat API service typed dengan TODO yang jelas; jangan membuat endpoint baru atau memalsukan keberhasilan login.
- Jangan menyimpan password/OTP di localStorage, log, URL, atau state persisten. Token mengikuti keputusan arsitektur yang dikunci: access via Bearer header (memory), refresh via cookie HttpOnly (browser menyimpan otomatis, FE tidak menyentuh). Jangan memilih strategi berbeda dari backend.
- Setelah login/OTP sukses, gunakan data `/auth/me` atau kontrak setara untuk memuat user dan role. Route guard hanya untuk UX.
- Semua pesan validasi dan error ditulis dalam Bahasa Indonesia, tanpa mengungkap apakah email terdaftar pada forgot-password.

Buat test UI untuk validasi form, OTP salah/kedaluwarsa, cooldown resend, loading/error, logout, dan route access UX. Jangan membuat fitur manajemen user pada tahap ini. STOP.
```

## PROMPT FRONTEND 3 — Dashboard dan manajemen akun, Angkatan/Kelas, enrollment

```text
Implementasikan halaman frontend untuk akun, verifikasi Taruna, Angkatan/Kelas, dan enrollment sesuai PRD dan API specification.

- Buat navigasi/dashboard awal yang berbeda sesuai role Superadmin, Admin, Mentor, dan Taruna, tetapi jangan mengarang KPI yang belum didukung API.
- Halaman daftar/detail pengguna, pencarian/filter/pagination, form create/edit sesuai permission, serta alur verifikasi Taruna.
- Halaman import .xlsx (bukan CSV) maksimal 500 baris: tombol download template, penjelasan batas file, state upload/progress, ringkasan baris sukses/gagal, dan tombol unduh berkas log perbaikan dari response backend. Jangan menyatakan berhasil sebelum server mengembalikan hasil.
- Halaman CRUD Angkatan/Kelas dan pengelolaan enrollment sesuai endpoint dan izin yang terdokumentasi.
- Gunakan dialog konfirmasi untuk tindakan penting, pesan error field-level jika tersedia, dan empty state yang membantu.
- Jangan mengasumsikan seluruh Admin memiliki permission Superadmin. Sembunyikan action yang tidak relevan untuk UX, namun tetap tampilkan error 403 dari backend secara benar.

Jika endpoint atau permission belum final, buat UI sesuai kontrak yang sudah ada dan dokumentasikan gap; jangan membuat API palsu. Tambahkan test untuk form, filter, pagination, import error/partial result, serta tampilan 401/403. STOP.
```

## PROMPT FRONTEND 4 — Kategori Kapal, kursus, bab, materi, dan video

```text
Implementasikan UI pembelajaran dengan hirarki Kategori Kapal → Kursus → Bab → Materi Video.

- Halaman daftar kategori kapal, detail kategori, daftar kursus, detail kursus, daftar bab, dan tampilan materi.
- UI pengelolaan konten untuk role yang memiliki izin sesuai matriks yang disetujui; Taruna hanya melihat materi yang diizinkan berdasarkan enrollment dan aturan unlock dari backend.
- Halaman/komponen video player menggunakan URL/token playback yang diberikan backend. Jangan memanggil Bunny Stream dengan secret dari browser, jangan menyusun URL privat sendiri, dan jangan menampilkan video jika API menyatakan akses ditolak.
- Form metadata materi dan thumbnail mengikuti batas file di PRD (JPG/PNG maksimal 2 MB, dimensi maksimal 1920x1080) dan tetap menampilkan validasi server-side.
- Tampilkan loading, empty, unavailable, expired playback, dan retry state. Jangan mengarang daftar materi, judul, durasi, atau status selesai sebagai data nyata.
- Status selesai/progres harus berasal dari backend; frontend hanya mengirim event yang ditetapkan API.

Gunakan data API nyata sesuai kontrak. Jika API belum tersedia, hanya buat typed service/interface dan fixture development terpisah. Test navigasi, permission UX, empty/error state, validasi upload, dan playback failure. STOP.
```

## PROMPT FRONTEND 5 — Live Lesson, jadwal, tombol join, dan absensi

```text
Implementasikan UI Live Lesson sesuai PRD dan docs/api-specification.md.

- Daftar dan detail jadwal Live Lesson dengan waktu ditampilkan dalam Asia/Jakarta.
- Form create/edit/cancel hanya untuk Mentor/Admin yang memiliki permission dan assignment yang sesuai.
- Taruna melihat jadwal yang tersedia untuk enrollment-nya dan menggunakan tombol Join yang memanggil endpoint join backend.
- Jangan menampilkan/membagikan link konferensi mentah di daftar umum. Arahkan pengguna melalui alur join yang ditetapkan backend/provider.
- Tampilkan status kelas, pesan jadwal dibatalkan/diubah, loading/error, dan konfirmasi untuk perubahan jadwal.
- UI absensi dan koreksi absensi hanya bagi pihak yang berwenang. Tampilkan batas waktu perubahan dan hasil server; jangan menghitung atau mengesahkan absensi secara lokal.
- Notifikasi yang belum punya endpoint/provider final tidak boleh dipresentasikan sebagai sudah terkirim.

Jangan mengunci UI ke Zoom atau Google Meet sebelum layanan final ditentukan. Test timezone display, join failure/forbidden, cancellation, form validation, dan absensi read/update berdasarkan response backend. STOP.
```

## PROMPT FRONTEND 6 — CBT lima level, timer, jawaban, hasil, dan grading esai

```text
Implementasikan UI CBT sesuai PRD dan kontrak API. Ini fitur berisiko tinggi terhadap integritas ujian, jadi jangan membuat business logic ujian final di browser.

- Halaman daftar level/assessment yang dapat diakses, instruksi ujian, konfirmasi mulai, layar attempt, navigasi soal, pilihan ganda, jawaban esai, autosave status, konfirmasi submit, hasil, dan status penilaian esai.
- Timer UI berdasarkan timestamp/status authoritative yang diberikan server. Jangan mengandalkan jam browser sebagai sumber waktu resmi dan jangan memperpanjang waktu secara lokal. Saat refresh/reconnect, resume attempt dari server.
- Autosave target setiap 30 detik sesuai PRD, ditambah penyimpanan ketika jawaban berubah jika strategi API menyetujuinya. Tampilkan saved/saving/error; tangani retry tanpa mengirim duplikasi berbahaya.
- Jangan mengirim atau menyimpan answer key. Jangan menghitung kelulusan, nilai akhir, kesempatan tersisa, remedial, atau unlock level sebagai sumber kebenaran. Tampilkan hasil/progres yang diberikan backend.
- Saat waktu habis, ikuti status dan instruksi backend; jangan mengasumsikan submit berhasil sebelum server mengonfirmasi.
- Buat UI grading esai hanya untuk Mentor/pemeriksa berwenang dan sesuai assignment; tampilkan deadline/SLA yang diberikan API.

Aturan passing grade 70, maksimal 3 attempt, jeda 24 jam, dan remedial setelah 3 kegagalan masih perlu konfirmasi pada PRD. Jangan menulis angka tersebut sebagai aturan final dalam UI sebelum disetujui. Jika perlu placeholder, beri label jelas bahwa aturan sedang dikonfirmasi.

Test navigation, autosave failure/retry, resume, submit confirmation, expired attempt, loading/error, no answer key in client payload, dan role-based grading UX. STOP.
```

## PROMPT FRONTEND 7 — Progress, rating/feedback, sertifikat, dan ticketing

```text
Implementasikan UI progres, rating/feedback, sertifikat, dan ticketing sesuai PRD dan kontrak API.

Progress:
- Tampilkan progres materi/level berdasarkan response backend, bukan perhitungan lokal sebagai sumber kebenaran.

Rating/feedback:
- Input rating 1–5, feedback non-anonim, dan edit sesuai aturan backend. Aturan PRD: rating dapat diedit satu kali dalam 7 hari sejak rating pertama; tampilkan status dan batas waktu dari server bila tersedia.

Sertifikat:
- Daftar/detail/unduh PDF hanya untuk sertifikat yang diizinkan.
- Tampilkan disclaimer bahwa sertifikat ini sertifikat program internal dan bukan sertifikat resmi STCW.
- Jangan membuat halaman verifikasi publik/QR sebelum keputusan itu disetujui.

Ticketing:
- Daftar, buat tiket, detail, komentar/riwayat dan status Open, In Progress, Resolved, Closed sesuai endpoint dan permission.
- Taruna hanya melihat tiket sendiri; halaman support untuk Admin hanya sesuai izin. Jangan menganggap Mentor sebagai petugas support.
- Tampilkan status aktual dari backend dan konfirmasi tindakan perubahan status.

Jangan membuat data palsu di production. Test rating batas waktu/permission, sertifikat tanpa akses, unduhan error, tiket lintas pengguna, dan transisi status. STOP.
```

## PROMPT FRONTEND 8 — Integrasi akhir, aksesibilitas, responsive QA, dan API gap audit

```text
Lakukan audit frontend terhadap PRD, docs/architecture.md, docs/api-specification.md, dan seluruh halaman yang sudah dibuat. Jangan menambah fitur baru.

Periksa:
- Semua halaman/route dan navigasi empat role.
- Tidak ada endpoint, field, status, atau response yang dibuat-buat; semua API calls konsisten dengan api-specification.md.
- Tidak ada secret provider, answer key, data pribadi yang tidak perlu, atau token yang dicetak ke console/log.
- Loading, empty, success, validation, 401, 403, 404, 409, 429, dan server error ditangani secara masuk akal.
- Responsivitas desktop dan browser mobile; keyboard navigation, visible focus, form labels, kontras, dan pesan error.
- Tidak ada mock/fixture yang ikut ditampilkan sebagai data produksi.
- Timer/hasil/progres/absensi/permission resmi berasal dari backend.
- Environment base URL dan build production benar; tidak ada URL lokal hardcoded.
- Jalankan lint, typecheck, test, dan build yang tersedia. Jangan mengklaim hasil tanpa menjalankan command.

Buat daftar endpoint yang sudah terintegrasi, API yang masih dibutuhkan, masalah UI/aksesibilitas yang tersisa, serta hasil command PASS/FAIL. Jika menemukan gap kontrak, laporkan untuk disepakati bersama backend; jangan mengubah API spec sendiri. STOP.
```

## PROMPT FRONTEND 9 — UAT, bug fixing, dan persiapan rilis

```text
Fokus pada stabilisasi frontend untuk staging/UAT sesuai PRD. Jangan deploy production atau mengubah domain/secret tanpa instruksi eksplisit.

- Jalankan skenario UAT untuk alur login + OTP, verifikasi Taruna, enrollment, akses materi, join Live Lesson, CBT start/autosave/resume/submit, hasil/grading, rating, sertifikat, dan ticketing berdasarkan endpoint yang benar-benar tersedia.
- Perbaiki hanya bug yang ditemukan dan sesuai scope. Pisahkan bug kritis, bug minor, dan enhancement/Change Request; jangan memasukkan enhancement sebagai perbaikan otomatis.
- Pastikan state loading/error dan perilaku saat API lambat/putus tidak menyesatkan pengguna. Hindari optimistic UI untuk tindakan penting seperti submit ujian, perubahan absensi, penilaian, atau penerbitan sertifikat kecuali API mendukungnya dengan aman.
- Periksa build production, konfigurasi env, dan tidak ada data uji/credential di bundle.
- Siapkan catatan rilis, known issues, daftar API yang perlu siap di staging, dan checklist UAT untuk reviewer.

Laporkan bukti pengujian, bug yang diperbaiki, known issues, endpoint yang masih blocker, dan hasil lint/typecheck/test/build PASS/FAIL. STOP.
```

## Template koreksi jika Codex keluar dari scope

```text
Berhenti dan jangan menambah fitur. Bandingkan perubahan terakhir dengan tahap yang sedang dikerjakan, PRD, docs/architecture.md, dan docs/api-specification.md. Sebutkan file/perubahan yang keluar scope, kembalikan hanya perubahan yang tidak diminta tanpa menghapus pekerjaan valid yang sudah ada, jalankan ulang test terkait, lalu laporkan status dan blocker. Jangan mengarang endpoint, mengubah kontrak API, atau menganggap keputusan [PERLU KONFIRMASI] sudah final.
```
