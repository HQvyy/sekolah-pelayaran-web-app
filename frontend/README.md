# Frontend Sekolah Pelaut Indonesia

React + TypeScript + Vite, SPA responsif berbahasa Indonesia. Tahap 1 fondasi, tahap 2 auth, tahap 3
dashboard dan akun, tahap 4 pembelajaran video, tahap 5 Live Lesson, tahap 6 CBT lima level, timer, jawaban, hasil, dan grading esai, tahap 7 progres, rating, sertifikat, dan ticketing.
jawaban, hasil, dan grading esai. Fitur lain dibangun bertahap setelah kontrak API final.

## Syarat

1. Node.js LTS dan npm.
2. Backend API `/api/v1` untuk auth, pengguna, cohorts, enrollment, konten, video, live lesson,
   assessment, attempt, autosave, submit, hasil, dan grading esai.

## Setup

```bash
cd frontend
cp .env.example .env
npm install
```

Isi `VITE_API_BASE_URL` tanpa prefix `/api/v1`. Contoh lokal:

```bash
VITE_API_BASE_URL=http://localhost:3000
```

Jangan memasukkan URL production, token, password, OTP, atau secret ke repository.

## Perintah

```bash
npm run dev
npm run lint
npm run typecheck
npm run test
npm run build
npm run preview
```

Uji file yang berat sebaiknya dijalankan per file dengan worker tunggal, contoh:

```bash
npm run test -- --run --pool=forks --maxWorkers=1 src/test/auth.test.tsx
npm run test -- --run --pool=forks --maxWorkers=1 src/test/accounts.test.tsx
npm run test -- --run --pool=forks --maxWorkers=1 src/test/learning.test.tsx
npm run test -- --run --pool=forks --maxWorkers=1 src/test/live.test.tsx
npm run test -- --run --pool=forks --maxWorkers=1 src/test/cbt.test.tsx
```

## CI

`.github/workflows/frontend-ci.yml` menjalankan `npm ci`, `typecheck`,
`lint`, `test`, dan `build` untuk setiap perubahan pada `frontend/**`
(push `fe`/`be`/`dev`/`main`, PR ke `main`/`dev`). Urutan step sama dengan
perintah lokal di atas, jadi kegagalan CI bisa direproduksi di komputer
yang sama.

## Struktur

```text
frontend/
├── public/
└── src/
    ├── app/         # bootstrap, provider sesi, error boundary, style global
    ├── routes/      # routing dan guard UX berbasis peran
    ├── layouts/     # layout publik dan aplikasi
    ├── components/  # komponen UI reusable
    ├── features/    # halaman per domain
    │   ├── auth/    # login, registrasi Taruna, OTP, lupa/reset, sesi
    │   ├── accounts/# dashboard peran, pengguna, impor, Angkatan, enrollment
    │   ├── learning/# kategori, kursus, bab, materi, video
    │   ├── live/    # jadwal, join, absensi
    │   ├── cbt/     # assessment, attempt, hasil, grading esai
   │   └── services/ # progres, rating, sertifikat, tiket
    ├── services/    # HTTP client dan API modules
    ├── hooks/
    ├── types/
    └── lib/
```

## Auth dan API client

1. Service auth typed ada di `src/features/auth/authService.ts`.
2. Service akun, Angkatan, dan enrollment ada di `src/features/accounts/accountService.ts`.
3. Service pembelajaran dan video ada di `src/features/learning/learningService.ts`.
4. Service live lesson ada di `src/features/live/liveService.ts`.
5. Service CBT ada di `src/features/cbt/cbtService.ts` dan mengikuti endpoint usulan
   `GET /assessments`, `GET /assessments/{id}`, `POST /assessments/{id}/attempts`,
   `GET /attempts/{attemptId}`, `PUT /attempts/{attemptId}/answers/{questionId}`,
   `POST /attempts/{attemptId}/submit`, `GET /attempts/{attemptId}/result`,
   `GET /mentor/essay-grading`, `POST /attempts/{attemptId}/answers/{answerId}/grade`, dan
   `GET /admin/assessments/overdue-grading`.
6. Kontrak tersebut masih usulan dan belum final. Jangan menambah endpoint, payload, respons, role,
   status, atau error code sebelum review bersama backend.
7. Access token hanya disimpan di memori React dan dikirim via header Bearer.
8. Refresh token via cookie HttpOnly milik browser. Frontend tidak membaca atau menyimpan refresh token.
9. Jangan menyimpan password atau OTP di localStorage, log, URL, atau state persisten.
10. Route guard dan menu peran hanya untuk UX. Backend tetap mengotorisasi semua request.
11. Waktu API diperlakukan UTC ISO 8601 dan ditampilkan sebagai WIB (`Asia/Jakarta`).

## Halaman tahap 6

1. Taruna: `/asesmen`, `/asesmen/:assessmentId`, `/asesmen/attempt/:attemptId`,
   `/asesmen/attempt/:attemptId/hasil`.
2. Pemeriksa: `/mentor/koreksi-esai`. Admin: `/admin/penilaian-terlambat`.
3. Timer dari timestamp dan status server, resume attempt dari server, autosave tiap 30 detik plus
   saat jawaban berubah memakai Idempotency-Key, retry aman tanpa duplikasi berbahaya.
4. Tidak ada answer key di payload client. Kelulusan, nilai akhir, attempt tersisa, remedial, dan
   unlock hanya dari backend. Angka passing grade 70, 3 attempt, jeda 24 jam, dan remedial tidak
   ditampilkan sebagai final.
