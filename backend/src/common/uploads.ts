// Helper bersama untuk berkas unggahan: nama berkas dibersihkan (basename +
// karakter aman) agar tak bisa dipakai untuk path traversal / nama berkas
// berisi karakter aneh saat dicatat atau diunduh kembali, dan pengecekan tipe
// berkas memakai AND (mimetype DAN ekstensi harus valid) — bukan OR, supaya
// berkas dengan mimetype dikirim asal tidak lolos.
import { basename, extname } from 'path';

const SAFE_NAME = /[^A-Za-z0-9._-]/g;
const MAX_NAME_LENGTH = 255;

/**
 * Nama berkas aman: hanya path terakhir, tanpa karakter selain [A-Za-z0-9._-],
 * tidak dimulai dengan titik, dan dibatasi panjangnya.
 */
export function sanitizeFileName(original: string): string {
  const base = basename(String(original ?? '')).replace(SAFE_NAME, '_');
  const trimmed = base.replace(/^\.+/, '').slice(0, MAX_NAME_LENGTH);
  return trimmed.length > 0 ? trimmed : 'berkas.xlsx';
}

/**
 * Ekstensi huruf kecil (tanpa titik) — dipakai untuk validasi tipe berkas.
 */
export function fileExtension(original: string): string {
  return extname(sanitizeFileName(original)).toLowerCase().replace('.', '');
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
