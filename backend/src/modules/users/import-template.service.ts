import { Injectable } from '@nestjs/common';
import ExcelJS from 'exceljs';
import { IMPORT_RULES } from './users.rules';

// Kolom template v1 (FINAL — disahkan 2026-11-02). Urutan kolom tetap;
// baris 1 adalah header.
const HEADERS = [...IMPORT_RULES.TEMPLATE_COLUMNS];

export interface ParsedImportRow {
  rowNumber: number;
  namaLengkap: string;
  email: string;
  nomorIdentitas: string;
  cohortKode: string;
  telepon: string | null;
  tanggalLahir: string | null;
}

@Injectable()
export class ImportTemplateService {
  // Berkas template kosong: header baku + satu baris contoh yang ditandai
  // jelas sebagai contoh (bukan data palsu — dihapus pengguna sebelum upload).
  async buildTemplate(): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'SPLI Backend';
    const sheet = workbook.addWorksheet('Taruna');
    sheet.columns = HEADERS.map((header) => ({
      header,
      key: header,
      width: 22,
    }));
    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFD9E1F2' },
    };
    // Baris contoh — pengguna menghapus/menimpa sebelum upload.
    sheet.addRow({
      nama_lengkap: 'CONTOH — hapus baris ini',
      email: 'contoh@email.com',
      nomor_identitas: 'ID000',
      cohort_kode: 'ANGK-2026-01',
      telepon: '0812000000',
      tanggal_lahir: '2005-01-01',
    });
    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  async parse(buffer: Buffer): Promise<ParsedImportRow[]> {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer as unknown as ArrayBuffer);
    const sheet = workbook.worksheets[0];
    if (!sheet) return [];
    const rows: ParsedImportRow[] = [];
    sheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; // header
      const values = row.values as unknown[];
      const cell = (index: number): string =>
        String(values[index] ?? '').trim();
      rows.push({
        rowNumber,
        namaLengkap: cell(1),
        email: cell(2),
        nomorIdentitas: cell(3),
        cohortKode: cell(4),
        telepon: cell(5) || null,
        tanggalLahir: cell(6) || null,
      });
    });
    // Abaikan baris contoh template bila belum dihapus pengguna.
    return rows.filter(
      (row) =>
        row.namaLengkap !== '' ||
        row.email !== '' ||
        row.nomorIdentitas !== '' ||
        row.cohortKode !== '',
    );
  }

  // Berkas log perbaikan: salinan data + kolom keterangan_eror; sel eror
  // ditandai merah agar mudah diperbaiki dan diunggah ulang.
  async buildErrorLog(
    rows: ParsedImportRow[],
    errors: Map<number, string[]>,
  ): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Perbaikan');
    sheet.columns = [
      ...HEADERS.map((header) => ({ header, key: header, width: 22 })),
      { header: 'keterangan_eror', key: 'keterangan_eror', width: 50 },
    ];
    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true };
    const columnKeys = [...HEADERS, 'keterangan_eror'];
    for (const row of rows) {
      if (!errors.has(row.rowNumber)) continue;
      const reasons = errors.get(row.rowNumber) ?? [];
      const dataRow = sheet.addRow({
        nama_lengkap: row.namaLengkap,
        email: row.email,
        nomor_identitas: row.nomorIdentitas,
        cohort_kode: row.cohortKode,
        telepon: row.telepon ?? '',
        tanggal_lahir: row.tanggalLahir ?? '',
        keterangan_eror: reasons.join('; '),
      });
      // Tandai sel eror: kolom email bila eror menyebut email, dst.
      const joined = reasons.join(' ').toLowerCase();
      columnKeys.forEach((key, index) => {
        const keyPart = key.split('_')[0];
        if (joined.includes(keyPart) || key === 'keterangan_eror') {
          const cell = dataRow.getCell(index + 1);
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFFFC7CE' },
          };
        }
      });
    }
    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }
}
