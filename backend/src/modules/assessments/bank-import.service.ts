import {
  BadRequestException,
  Injectable,
  PayloadTooLargeException,
  UnsupportedMediaTypeException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { BankTemplateService } from './bank-template.service';
import { CBT_AUDIT_ACTIONS, CBT_RULES } from './cbt.rules';

export interface BankImportRowReport {
  rowNumber: number;
  success: boolean;
  errors: string[];
}

export interface BankImportSummary {
  importId: string;
  assessmentId: string;
  fileName: string;
  totalRows: number;
  successCount: number;
  failedCount: number;
  status: 'COMPLETED' | 'COMPLETED_WITH_ERRORS';
  rows: BankImportRowReport[];
  hasErrorLog: boolean;
}

const ANSWER_LETTERS = ['A', 'B', 'C', 'D'];

@Injectable()
export class BankImportService {
  private readonly errorLogs = new Map<string, Buffer>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly templates: BankTemplateService,
    private readonly audit: AuditService,
  ) {}

  async importBank(
    assessmentId: string,
    file: Express.Multer.File | undefined,
    actorId: string,
  ): Promise<BankImportSummary> {
    const assessment = await this.prisma.assessment.findUnique({
      where: { id: assessmentId },
    });
    if (!assessment) {
      throw new BadRequestException('Assessment tidak ditemukan.');
    }
    if (!file) throw new BadRequestException('Berkas .xlsx wajib diunggah.');
    if (
      !CBT_RULES.IMPORT_MINE_TYPES.includes(file.mimetype) &&
      !file.originalname.toLowerCase().endsWith('.xlsx')
    ) {
      throw new UnsupportedMediaTypeException('Hanya berkas .xlsx yang didukung.');
    }
    if (file.size > CBT_RULES.IMPORT_MAX_FILE_BYTES) {
      throw new PayloadTooLargeException('Ukuran berkas melebihi 5 MB.');
    }
    let rows;
    try {
      rows = await this.templates.parse(file.buffer);
    } catch {
      throw new BadRequestException('Berkas .xlsx tidak dapat dibaca.');
    }
    if (rows.length === 0) {
      throw new BadRequestException('Berkas tidak berisi baris data.');
    }
    if (rows.length > CBT_RULES.IMPORT_MAX_ROWS) {
      throw new BadRequestException(
        `Maksimal ${CBT_RULES.IMPORT_MAX_ROWS} baris per berkas.`,
      );
    }

    const reports: BankImportRowReport[] = [];
    const errorCells = new Map<number, string[]>();
    let successCount = 0;

    // BERHASIL SEBAGIAN: tiap baris valid dalam transaksinya sendiri.
    for (const row of rows) {
      const errors: string[] = [];
      if (row.level === null || row.level < CBT_RULES.MIN_LEVEL || row.level > CBT_RULES.MAX_LEVEL) {
        errors.push('level harus 1–5');
      } else if (row.level !== assessment.level) {
        errors.push(`level baris (${row.level}) harus sama dengan level assessment (${assessment.level})`);
      }
      if (row.tipe !== 'PG' && row.tipe !== 'ESAI') {
        errors.push("tipe harus PG atau ESAI");
      }
      if (!row.pertanyaan) errors.push('pertanyaan wajib diisi');
      const weight = row.bobot ?? 1;
      if (!Number.isFinite(weight) || weight <= 0 || weight > 100) {
        errors.push('bobot harus angka 0 < x ≤ 100 (default 1)');
      }
      const filledOptions = row.opsi
        .map((label, index) => ({ label, index }))
        .filter((item) => item.label !== '');
      if (row.tipe === 'PG') {
        if (filledOptions.length < 2) {
          errors.push('PG minimal 2 opsi terisi');
        }
        if (!ANSWER_LETTERS.slice(0, filledOptions.length).includes(row.kunciJawaban)) {
          errors.push('kunci_jawaban harus huruf opsi yang terisi (A–D)');
        }
      } else if (row.kunciJawaban) {
        errors.push('esai tidak memakai kunci_jawaban');
      }
      if (errors.length > 0) {
        errorCells.set(row.rowNumber, errors);
        reports.push({ rowNumber: row.rowNumber, success: false, errors });
        continue;
      }
      try {
        await this.prisma.$transaction(async (tx) => {
          const question = await tx.question.create({
            data: {
              assessmentId,
              // Template memakai ESAI (Indonesia); DB memakai ESSAY.
              type: row.tipe === 'ESAI' ? 'ESSAY' : 'PG',
              prompt: row.pertanyaan,
              weight,
            },
          });
          if (row.tipe === 'PG') {
            await tx.answerOption.createMany({
              data: filledOptions.map((item) => ({
                questionId: question.id,
                label: item.label,
                isCorrect:
                  ANSWER_LETTERS[item.index] === row.kunciJawaban,
                sortOrder: item.index,
              })),
            });
          }
        });
        successCount += 1;
        reports.push({ rowNumber: row.rowNumber, success: true, errors: [] });
      } catch {
        errorCells.set(row.rowNumber, ['gagal menyimpan baris']);
        reports.push({
          rowNumber: row.rowNumber,
          success: false,
          errors: ['gagal menyimpan baris'],
        });
      }
    }

    const failedCount = reports.filter((item) => !item.success).length;
    const failedRows = rows.filter((row) => errorCells.has(row.rowNumber));
    const errorLog =
      failedRows.length > 0
        ? await this.templates.buildErrorLog(rows, errorCells)
        : null;
    // importId deterministik per request (bukan entitas DB pada Tahap 6).
    const importId = `bank-${assessmentId.slice(0, 8)}-${Date.now()}`;
    if (errorLog) this.errorLogs.set(importId, errorLog);
    await this.audit.record(CBT_AUDIT_ACTIONS.QUESTIONS_IMPORTED, {
      actorId,
      targetId: assessmentId,
      metadata: {
        fileName: file.originalname,
        totalRows: rows.length,
        successCount,
        failedCount,
      },
    });
    return {
      importId,
      assessmentId,
      fileName: file.originalname,
      totalRows: rows.length,
      successCount,
      failedCount,
      status: failedCount === 0 ? 'COMPLETED' : 'COMPLETED_WITH_ERRORS',
      rows: reports,
      hasErrorLog: failedCount > 0,
    };
  }

  // Berkas log perbaikan di memori proses (bukan DB/blob pada Tahap 6 —
  // unduh segera; hilang saat restart). Batasan didokumentasikan di README.
  async getErrorLog(importId: string): Promise<Buffer> {
    const buffer = this.errorLogs.get(importId);
    if (!buffer) {
      throw new BadRequestException(
        'Berkas log tidak tersedia (mungkin sudah diunduh atau server restart).',
      );
    }
    return buffer;
  }
}
