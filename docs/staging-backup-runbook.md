# Staging, Backup & Serah Terima — Backend SPLI (Tahap 9)

- **Status:** SOP + checklist (sebagian terverifikasi lokal; sisanya butuh
  akses staging/VPS yang belum tersedia — lihat status tiap butir).
- **Acuan:** PRD ringkas §5/§10–§11, `docs/backend-qa-report.md`.
- **Larangan:** JANGAN deploy ke production, JANGAN ubah DNS/secret, JANGAN
  restore ke production tanpa instruksi eksplisit dan akses sah.

## 1. Konfigurasi staging

| Item | Nilai staging |
|---|---|
| OS/DB | Linux + PostgreSQL 15+ (ekstensi `citext` aktif) |
| Node | 22 LTS, `npm ci` dari `backend/package-lock.json` |
| Env | `NODE_ENV=staging`, `PORT`, `API_PREFIX=api/v1`, `DATABASE_URL` (secret manager), `CORS_ORIGINS` (domain staging), `JWT_SECRET` ≥32 char (secret manager), `EMAIL_PROVIDER`/`BUNNY_USE_FAKE`/`CONFERENCE_USE_FAKE` sesuai kredensial, `SWAGGER_ENABLED=true` (staging) |
| Start | `npm run prisma:deploy && npm run build && npm run start:prod` |
| Health | `GET /api/v1/health` (liveness), `GET /api/v1/ready` (readiness + DB) |
| Rollback deploy | Kembalikan ke image/commit sebelumnya + `prisma migrate deploy` hanya maju; rollback skema = restore snapshot terakhir terverifikasi (tidak ada down-migration otomatis) |
| Rollback migrasi | Tidak ada `migrate dev` di staging/prod; setiap perubahan skema lewat file migrasi berversion yang direview (Tahap 1–8: 9 migrasi, sinkron dev+test) |

Status: **terverifikasi lokal** (build + boot production-mode + health/ready
+ 79 path Swagger — Tahap 8). Deploy ke staging: **TERTUNDA** (butuh VPS).

## 2. Pipeline CI/CD dasar

- Workflow: `.github/workflows/backend-ci.yml` (push `be`/`dev`/`main`,
  PR ke `main`): Postgres 18 service → `prisma:deploy` → typecheck →
  lint → unit → e2e → build.
- Secrets (`DATABASE_URL` prod, `JWT_SECRET`, SMTP/Bunny) disimpan di
  **secret manager/CI variables** — tidak di repo (`.env.example` hanya
  placeholder; `.env` di-gitignore).
- Status: **file tersedia, BELUM berjalan** (butuh GitHub Actions aktif +
  runner). Verifikasi: sintaks YAML valid; langkah sama dengan yang PASS lokal.

## 3. Backup database + metadata (PRD §5/§10)

- Skrip: `backend/scripts/backup.sh` (pg_dump custom+plain, gzip, SHA256,
  MANIFEST, retensi 365 hari) dan `backend/scripts/restore.sh` (tolak target
  berbau production, verifikasi checksum, verifikasi hitung baris).
- Kebijakan: minimal **bulanan**, salinan utama VPS mitra + salinan off-site,
  retensi arsip **minimal 12 bulan**.
- **Risiko tercatat PRD:** backup bulanan berpotensi kehilangan ±30 hari
  data. Backup harian = **Change Request** bila tidak disepakati.
- Uji restore: **triwulanan sebelum Go-Live, semesteran sesudahnya**,
  didokumentasikan hasilnya.
- Status: skrip tersedia + sintaks terverifikasi (`bash -n`); eksekusi
  backup/restore sungguhan **TERTUNDA** (butuh server staging + cron).

## 4. SOP restore (non-production)

1. Ambil arsip bulan berjalan dari VPS mitra; verifikasi SHA256 (gagal =
   berhenti, laporkan PMO).
2. Siapkan database staging kosong; jalankan `restore.sh` dengan
   `DATABASE_URL` staging + `BACKUP_FILE` arsip.
3. Verifikasi: hitung baris tabel inti (`users`, `_prisma_migrations`),
   cocokkan MANIFEST (stamp, retensi), boot backend staging, cek `/ready`.
4. Catat hasil (tanggal, arsip, verifikasi) untuk audit triwulanan.
5. DILARANG restore ke production / aksi destruktif tanpa instruksi sah.

## 5. Runbook operasi

| Kejadian | Tindakan |
|---|---|
| `/ready` 503 | Cek DATABASE_URL/secret, koneksi DB, `citext`; baca log tanpa secret |
| 5xx massal | Cek log `requestId`, rollback ke commit/image sehat terakhir |
| Lockout massal | Cek `failedLoginCount`/`failedEmailCount`; audit `ACCOUNT_LOCKED` |
| Email gagal | Cek `EMAIL_PROVIDER` + kredensial; fake tidak mengirim nyata |
| Bunny 503 | Cek `BUNNY_USE_FAKE`/kredensial; fake = token `FAKE-` |
| Absensi/grade telat | Cek audit log + antrean (`overdue-grading`) |

## 6. Checklist UAT (untuk klien + PMO)

- [ ] Login → OTP → dashboard per peran (4 role).
- [ ] Materi → assessment → hasil → progres (95% taruna uji tanpa bantuan).
- [ ] Koreksi esai ≤7 hari atau tanda terlambat + laporan Admin.
- [ ] Video + ticketing lolos integrasi; tidak ada bug kritis.
- [ ] UAT disetujui tertulis (BAST) sebelum Go-Live (maks 5 hari kerja respons).
- [ ] Isi teks PDF sertifikat (nama + disclaimer non-STCW) dicek visual.
- [ ] Domain, SSL, monitoring, paket infra dipilih (sebelum Fase 4 produk).

## 7. Konfigurasi yang masih butuh kredensial/provider (blocker Go-Live)

1. Provider email real + domain pengirim (OTP/notifikasi nyata).
2. Kredensial Bunny Stream (library + API key) bila video real dipakai.
3. Domain production + SSL + monitoring + kapasitas server.
4. Paket Zoom/Meet bila PKS mengharuskan (selain Jitsi gratis).
5. Pemindai malware upload (klaim PRD §4.2).
6. Object storage thumbnail/metadata produksi.
7. Keputusan final aturan CBT + unlock materi + PIC/SLA/MOU.

## 8. Known issues (jujur, dari Tahap 1–8)

1. Tag Swagger "Services" (label grup default) — kosmetik, bukan bug.
2. Log eror impor in-memory (hilang saat restart).
3. `submitResult` JSON tumbuh — butuh TTL/pembersihan.
4. Penutupan absensi = penegakan saat akses (tanpa job scheduler).
5. Performa belum diukur; email/malware/backup belum teruji nyata.
