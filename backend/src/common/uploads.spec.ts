import {
  fileExtension,
  sanitizeFileName,
  validateUploadType,
} from './uploads';

const XLSX_MIME = [
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
];

describe('uploads helper', () => {
  describe('sanitizeFileName', () => {
    it('membuang path dan hanya menyisakan nama berkas', () => {
      // Kedua jenis pemisah path harus dikenali di platform apa pun:
      // `path.basename` hanya mengenali pemisah platform yang berjalan.
      expect(sanitizeFileName('C:\\Users\\x\\..\\..\\impor.xlsx')).toBe(
        'impor.xlsx',
      );
      expect(sanitizeFileName('/var/tmp/../../etc/impor.xlsx')).toBe(
        'impor.xlsx',
      );
      expect(sanitizeFileName('../../etc/passwd')).toBe('passwd');
    });

    it('mengganti karakter berbahaya dengan underscore', () => {
      expect(sanitizeFileName('nama berkas ;rm -rf .xlsx')).toBe(
        'nama_berkas__rm_-rf_.xlsx',
      );
    });

    it('menolak nama kosong atau hanya titik', () => {
      expect(sanitizeFileName('')).toBe('berkas.xlsx');
      expect(sanitizeFileName('...')).toBe('berkas.xlsx');
      expect(sanitizeFileName('..\\..\\etc\\passwd')).toBe('passwd');
    });

    it('membatasi panjang nama', () => {
      expect(sanitizeFileName(`${'a'.repeat(400)}.xlsx`)).toHaveLength(255);
    });
  });

  describe('validateUploadType', () => {
    const good = {
      mimetype:
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      originalname: 'impor.xlsx',
    };

    it('menerima mimetype dan ekstensi .xlsx yang cocok', () => {
      expect(validateUploadType(good, XLSX_MIME, 'xlsx')).toBeNull();
    });

    it('menolak berkas non-xlsx walau ekstensinya .xlsx', () => {
      const result = validateUploadType(
        { ...good, mimetype: 'text/csv' },
        XLSX_MIME,
        'xlsx',
      );
      expect(result).not.toBeNull();
      expect(result).toMatch(/Tipe berkas tidak didukung/);
    });

    it('menolak mimetype xlsx dengan ekstensi lain', () => {
      const result = validateUploadType(
        { ...good, originalname: 'data.csv' },
        XLSX_MIME,
        'xlsx',
      );
      expect(result).not.toBeNull();
      expect(result).toMatch(/Ekstensi berkas harus/);
    });

    it('menolak bila keduanya tidak cocok', () => {
      const result = validateUploadType(
        { mimetype: 'image/png', originalname: 'gambar.png' },
        XLSX_MIME,
        'xlsx',
      );
      expect(result).toMatch(/Hanya berkas \.xlsx/);
    });

    it('memperlakukan ekstensi besar/kecil sama', () => {
      expect(
        validateUploadType({ ...good, originalname: 'impor.XLSX' }, XLSX_MIME, 'xlsx'),
      ).toBeNull();
    });

    it('fileExtension mengembalikan ekstensi tanpa titik', () => {
      expect(fileExtension('impor.XLSX')).toBe('xlsx');
      expect(fileExtension('tanpa-ekstensi')).toBe('');
      // Nama tersembunyi (.gitignore) bukan ekstensi.
      expect(fileExtension('.gitignore')).toBe('');
      expect(fileExtension('berkas..xlsx')).toBe('xlsx');
    });
  });
});
