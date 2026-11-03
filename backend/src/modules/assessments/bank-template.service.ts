import { Injectable } from '@nestjs/common';
import ExcelJS from 'exceljs';
import { CBT_RULES } from './cbt.rules';

const HEADERS = [...CBT_RULES.BANK_TEMPLATE_COLUMNS];

export interface ParsedBankRow {
  rowNumber: number;
  level: number | null;
  kategoriKapal: string;
  tipe: string;
  pertanyaan: string;
  opsi: string[];
  kunciJawaban: string;
  bobot: number | null;
}

@Injectable()
export class BankTemplateService {
  async buildTemplate(): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'SPLI Backend';
    const sheet = workbook.addWorksheet('BankSoal');
    sheet.columns = HEADERS.map((header) => ({ header, key: header, width: 20 }));
    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFD9E1F2' },
    };
    // Baris contoh — pengguna menghapus/menimpa sebelum upload.
    sheet.addRow({
      level: 1,
      kategori_kapal: 'Bulk Carrier',
      tipe: 'PG',
      pertanyaan: 'CONTOH — hapus baris ini',
      opsi_a: 'Pilihan A',
      opsi_b: 'Pilihan B',
      opsi_c: '',
      opsi_d: '',
      kunci_jawaban: 'A',
      bobot: 1,
    });
    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  async parse(buffer: Buffer): Promise<ParsedBankRow[]> {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer as unknown as ArrayBuffer);
    const sheet = workbook.worksheets[0];
    if (!sheet) return [];
    const rows: ParsedBankRow[] = [];
    sheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
      const values = row.values as unknown[];
      const cell = (index: number): string => String(values[index] ?? '').trim();
      const levelRaw = cell(1);
      const bobotRaw = cell(10);
      rows.push({
        rowNumber,
        level: /^\d+$/.test(levelRaw) ? Number(levelRaw) : null,
        kategoriKapal: cell(2),
        tipe: cell(3).toUpperCase(),
        pertanyaan: cell(4),
        opsi: [cell(5), cell(6), cell(7), cell(8)],
        kunciJawaban: cell(9).toUpperCase(),
        bobot: bobotRaw === '' ? null : Number(bobotRaw),
      });
    });
    return rows.filter(
      (row) =>
        row.pertanyaan !== '' ||
        row.level !== null ||
        row.kategoriKapal !== '',
    );
  }

  async buildErrorLog(
    rows: ParsedBankRow[],
    errors: Map<number, string[]>,
  ): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Perbaikan');
    sheet.columns = [
      ...HEADERS.map((header) => ({ header, key: header, width: 20 })),
      { header: 'keterangan_eror', key: 'keterangan_eror', width: 50 },
    ];
    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true };
    const keys = [...HEADERS, 'keterangan_eror'];
    const asRecord = (row: ParsedBankRow): Record<string, unknown> => ({
      level: row.level ?? '',
      kategori_kapal: row.kategoriKapal,
      tipe: row.tipe,
      pertanyaan: row.pertanyaan,
      opsi_a: row.opsi[0] ?? '',
      opsi_b: row.opsi[1] ?? '',
      opsi_c: row.opsi[2] ?? '',
      opsi_d: row.opsi[3] ?? '',
      kunci_jawaban: row.kunciJawaban,
      bobot: row.bobot ?? '',
    });
    for (const row of rows) {
      if (!errors.has(row.rowNumber)) continue;
      const reasons = errors.get(row.rowNumber) ?? [];
      const dataRow = sheet.addRow({
        ...asRecord(row),
        keterangan_eror: reasons.join('; '),
      });
      const joined = reasons.join(' ').toLowerCase();
      keys.forEach((key, index) => {
        if (joined.includes(key.split('_')[0]) || key === 'keterangan_eror') {
          dataRow.getCell(index + 1).fill = {
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
