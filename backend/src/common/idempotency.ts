import { createHash } from 'node:crypto';

// Idempotency untuk endpoint non-idempoten secara alami (keputusan dikunci
// docs/backend-implementation-plan.md §6.1 butir 1): PUT .../answers/{questionId},
// POST /tickets, POST /certificates.
//
// Aturan:
//  - key sama + payload sama  → kembalikan hasil permintaan pertama (replay).
//  - key sama + payload beda  → 409 Conflict (key dipakai ulang dengan isi lain).
//  - tanpa key                 → perilaku normal (tanpa replay).
//
// Hanya hash payload yang disimpan — bukan isi mentah — agar tabel tidak
// menyimpan duplikat data pengguna dan tidak ada kebocoran lewat log.
export function payloadHash(payload: Record<string, unknown>): string {
  const canonical = JSON.stringify(payload, Object.keys(payload).sort());
  return createHash('sha256').update(canonical).digest('hex');
}

export interface IdempotencyMatch<T> {
  /** Baris hasil percobaan pertama yang harus di-replay. */
  replay: T | null;
  /** Key dipakai ulang dengan payload berbeda → pemanggil melempar 409. */
  conflict: boolean;
}

// Bandingkan key+payload yang tersimpan terhadap permintaan saat ini.
export function checkIdempotency<T extends { idempotencyKey: string | null; idempotencyPayload: string | null }>(
  stored: T | null,
  key: string | undefined,
  payload: Record<string, unknown>,
): IdempotencyMatch<T> {
  if (!key) return { replay: null, conflict: false };
  if (!stored || stored.idempotencyKey !== key) {
    return { replay: null, conflict: false };
  }
  if (stored.idempotencyPayload !== payloadHash(payload)) {
    return { replay: null, conflict: true };
  }
  return { replay: stored, conflict: false };
}
