// Helper bersama untuk berkas unggahan: nama berkas dibersihkan (hanya nama
// terakhir, tanpa karakter selain [A-Za-z0-9._-]) agar tak bisa dipakai untuk
// path traversal, dan pengecekan tipe berkas memakai AND (mimetype DAN
// ekstensi harus valid) — bukan OR, supaya berkas dengan mimetype dikirim asal
// tidak lolos.
//
// Catatan lintas platform: `path.basename` hanya mengenali pemisah milik
// platform yang sedang berjalan (win32 vs posix), sehingga nama berkas berisi
// pemisah platform LAIN tidak dibersihkan. Karena berkas bisa datang dari
// klien dengan OS apa pun, pemisah dikenali manual di sini.
const PATH_SEPARATORS = /[/\\]/g;
const SAFE_NAME = /[^A-Za-z0-9._-]/g;
const MAX_NAME_LENGTH = 255;

/**
 * Nama berkas aman: hanya segmen terakhir (setelah `/` atau `\`), tanpa
 * karakter selain [A-Za-z0-9._-], tidak dimulai dengan titik, dan dibatasi
 * panjangnya.
 */
export function sanitizeFileName(original: string): string {
  const raw = String(original ?? '');
  // Ambil segmen terakhir untuk kedua jenis pemisah path (lintas platform).
  const lastSegment = raw.split(PATH_SEPARATORS).pop() ?? '';
  const base = lastSegment.replace(SAFE_NAME, '_');
  const trimmed = base.replace(/^\.+/, '').slice(0, MAX_NAME_LENGTH);
  return trimmed.length > 0 ? trimmed : 'berkas.xlsx';
}

/**
 * Ekstensi huruf kecil (tanpa titik) — dipakai untuk validasi tipe berkas.
 */
export function fileExtension(original: string): string {
  const name = sanitizeFileName(original);
  const dot = name.lastIndexOf('.');
  // Tanpa titik, atau titik di posisi pertama (nama tersembunyi) → tanpa ekstensi.
  if (dot <= 0) return '';
  return name.slice(dot + 1).toLowerCase();
}

/**
 * Validasi tipe berkas: mimetype harus terdaftar DAN ekstensi harus sesuai.
 * Mengembalikan alasan kegagalan (null bila lolos) agar pesan 415 akurat.
 */
export function validateUploadType(
  file: { mimetype: string; originalname: string },
  allowedMimeTypes: readonly string[],
  allowedExtension: string,
): string | null {
  const mimeOk = allowedMimeTypes.includes(file.mimetype);
  const extOk =
    fileExtension(file.originalname) === allowedExtension.toLowerCase();
  if (mimeOk && extOk) return null;
  if (!mimeOk && !extOk) {
    return 'Hanya berkas .xlsx yang didukung.';
  }
  if (!mimeOk) {
    return `Tipe berkas tidak didukung (${file.mimetype || 'tidak diketahui'}). Unggah berkas .xlsx asli, bukan berkas .xlsx yang diubah namanya.`;
  }
  return 'Ekstensi berkas harus .xlsx — nama berkas tidak boleh mengaku tipe lain.';
}
