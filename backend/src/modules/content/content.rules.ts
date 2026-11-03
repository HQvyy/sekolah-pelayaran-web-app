// Batas upload konten (PRD §4.2). Malware scanning BELUM terintegrasi —
// backend TIDAK mengklaim pemeriksaan tersedia (scanStatus: PENDING_PROVIDER).
// Lihat docs/backend-implementation-plan.md §6.1 butir 10.
export const CONTENT_RULES = {
  THUMBNAIL_MAX_BYTES: 2 * 1024 * 1024,
  THUMBNAIL_MAX_WIDTH: 1920,
  THUMBNAIL_MAX_HEIGHT: 1080,
  THUMBNAIL_MIME_TYPES: ['image/jpeg', 'image/png'] as string[],
  PLAYBACK_TOKEN_TTL_SECONDS: 2 * 60 * 60,
  SCAN_STATUS: 'PENDING_PROVIDER',
} as const;
