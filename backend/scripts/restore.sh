#!/usr/bin/env bash
# Restore backup ke environment NON-PRODUCTION (staging/dev) + verifikasi.
# DILARANG dipakai ke production tanpa instruksi eksplisit dan akses sah.
# SOP lengkap: docs/staging-backup-runbook.md §4.
set -euo pipefail

: "${DATABASE_URL:?DATABASE_URL target NON-PRODUCTION wajib diisi.}"
: "${BACKUP_FILE:?BACKUP_FILE wajib diisi (path .dump hasil backup.sh).}"
# pg_dump/psql/pg_restore tidak menerima parameter query Prisma: strip.
DB_URL="${DATABASE_URL%%\?*}"

case "$DATABASE_URL" in
  *prod*|*production*)
    echo "DITOLAK: target terlihat seperti production. Batalkan." >&2
    exit 1
    ;;
esac

echo "[restore] verifikasi checksum..."
sha256sum -c "$(dirname "$BACKUP_FILE")/SHA256SUMS" --status \
  || { echo "checksum GAGAL — jangan lanjutkan." >&2; exit 1; }

echo "[restore] $BACKUP_FILE → target non-production"
pg_restore --no-owner --no-privileges --clean --if-exists --dbname="$DB_URL" "$BACKUP_FILE"

echo "[restore] verifikasi hasil:"
psql "$DB_URL" -t -c "SELECT 'users=' || COUNT(*) FROM users;"
psql "$DB_URL" -t -c "SELECT 'migrations=' || COUNT(*) FROM _prisma_migrations WHERE finished_at IS NOT NULL;"
echo "[restore] selesai. Bandingkan MANIFEST.txt + laporkan ke PMO."
