#!/usr/bin/env bash
# Backup database PostgreSQL + metadata/thumbnail backend.
# PRD §5/§10: minimal bulanan, salinan utama di VPS mitra + salinan off-site,
# retensi arsip minimal 12 bulan. Backup harian = Change Request.
# Risiko yang dicatat PRD: backup bulanan berpotensi kehilangan ±30 hari data.
#
# Cara pakai (di server staging/produksi, BUKAN di laptop dev):
#   DATABASE_URL="postgresql://..." BACKUP_DIR=/var/backups/spli ./scripts/backup.sh
# Hasil: spli-FULL-YYYYMMDDTHHMMSSZ.sql.gz + spli-FULL-...sha256 + manifest.
set -euo pipefail

: "${DATABASE_URL:?DATABASE_URL wajib diisi (connection string PostgreSQL).}"
# pg_dump/psql tidak menerima parameter query Prisma (?schema=...): strip.
DB_URL="${DATABASE_URL%%\?*}"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/spli}"
RETENTION_DAYS="${RETENTION_DAYS:-365}"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
DEST="$BACKUP_DIR/$STAMP"
mkdir -p "$DEST"

echo "[backup] $STAMP → $DEST"
pg_dump --no-owner --no-privileges --format=custom --file="$DEST/spli-FULL-$STAMP.dump" "$DB_URL"
pg_dump --no-owner --no-privileges --format=plain --file="$DEST/spli-FULL-$STAMP.sql" "$DB_URL"
gzip -9 "$DEST/spli-FULL-$STAMP.sql"
sha256sum "$DEST"/* > "$DEST/SHA256SUMS"
cat > "$DEST/MANIFEST.txt" <<EOF
stamp=$STAMP (UTC)
database=$(echo "$DATABASE_URL" | sed -E 's#.*@([^/]+)/([^?]+).*#\1/\2#')
retention_days=$RETENTION_DAYS
note=Backup bulanan minimal PRD; risiko kehilangan hingga ~30 hari.
EOF

echo "[backup] retensi: hapus arsip > $RETENTION_DAYS hari"
find "$BACKUP_DIR" -maxdepth 1 -type d -mtime +"$RETENTION_DAYS" -exec rm -rf {} + 2>/dev/null || true
echo "[backup] selesai. Salin $DEST ke VPS mitra + off-site (lihat SOP)."
