import {
  BadRequestException,
  Injectable,
  PayloadTooLargeException,
  UnsupportedMediaTypeException,
} from '@nestjs/common';
import { AccountStatus, ImportStatus, Role } from '@prisma/client';
import * as argon2 from 'argon2';
import { PrismaService } from '../../database/prisma.service';
import { sanitizeFileName, validateUploadType } from '../../common/uploads';
import { AuditService } from '../audit/audit.service';
import {
  ImportTemplateService,
  ParsedImportRow,
} from './import-template.service';
import { IMPORT_RULES, USER_AUDIT_ACTIONS } from './users.rules';

export interface ImportRowReport {
  rowNumber: number;
  email: string;
  success: boolean;
  errors: string[];
}

export interface ImportSummary {
  importId: string;
  fileName: string;
  totalRows: number;
  successCount: number;
  failedCount: number;
  status: ImportStatus;
  rows: ImportRowReport[];
  // Berkas log perbaikan tersedia bila ada baris gagal.
  hasErrorLog: boolean;
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime());
}

@Injectable()
export class ImportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly templates: ImportTemplateService,
    private readonly audit: AuditService,
  ) {}

  async importTaruna(
    file: Express.Multer.File | undefined,
    actorId: string,
  ): Promise<ImportSummary> {
    if (!file) throw new BadRequestException('Berkas .xlsx wajib diunggah.');
    // Validasi AND: mimetype harus .xlsx DAN ekstensi harus .xlsx. Sebelumnya
    // memakai OR (lolos bila salah satu cocok), sehingga berkas .csv/.gif yang
    // diubah namanya menjadi .xlsx tetap diterima.
    const typeError = validateUploadType(file, IMPORT_RULES.MINE_TYPES, 'xlsx');
    if (typeError) {
      throw new UnsupportedMediaTypeException(typeError);
    }
    if (file.size > IMPORT_RULES.MAX_FILE_BYTES) {
      throw new PayloadTooLargeException('Ukuran berkas melebihi 5 MB.');
    }
    // Nama berkas sudah dibersihkan — aman dicatat/diunduh kembali.
    const safeFileName = sanitizeFileName(file.originalname);
    let rows: ParsedImportRow[];
    try {
      rows = await this.templates.parse(file.buffer);
    } catch {
      throw new BadRequestException('Berkas .xlsx tidak dapat dibaca.');
    }
    if (rows.length === 0) {
      throw new BadRequestException('Berkas tidak berisi baris data.');
    }
    if (rows.length > IMPORT_RULES.MAX_ROWS) {
      throw new BadRequestException(
        `Maksimal ${IMPORT_RULES.MAX_ROWS} baris per berkas.`,
      );
    }

    // Validasi per baris (format + duplikasi dalam berkas + duplikasi DB).
    const seenEmails = new Set<string>();
    const reports: ImportRowReport[] = [];
    const valid: ParsedImportRow[] = [];
    const errorCells = new Map<number, string[]>();
    for (const row of rows) {
      const errors: string[] = [];
      const email = row.email.trim().toLowerCase();
      if (!row.namaLengkap) errors.push('nama_lengkap wajib diisi');
      if (!email) {
        errors.push('email wajib diisi');
      } else if (!isValidEmail(email)) {
        errors.push('email tidak valid');
      } else if (seenEmails.has(email)) {
        errors.push('email duplikat dalam berkas');
      }
      if (!row.nomorIdentitas) errors.push('nomor_identitas wajib diisi');
      if (!row.cohortKode) {
        errors.push('cohort_kode wajib diisi');
      } else {
        const cohort = await this.prisma.cohort.findUnique({
          where: { code: row.cohortKode },
        });
        if (!cohort) errors.push(`cohort_kode '${row.cohortKode}' tidak dikenal`);
      }
      if (row.telepon && !/^[+\d][\d\s-]{5,20}$/.test(row.telepon)) {
        errors.push('telepon tidak valid');
      }
      if (row.tanggalLahir && !isValidDate(row.tanggalLahir)) {
        errors.push('tanggal_lahir harus YYYY-MM-DD');
      }
      if (email && errors.length === 0) {
        const existing = await this.prisma.user.findUnique({
          where: { email },
        });
        if (existing) errors.push('email sudah terdaftar');
      }
      if (errors.length > 0) {
        errorCells.set(row.rowNumber, errors);
        reports.push({ rowNumber: row.rowNumber, email, success: false, errors });
      } else {
        seenEmails.add(email);
        valid.push({ ...row, email });
        reports.push({ rowNumber: row.rowNumber, email, success: true, errors: [] });
      }
    }

    // BERHASIL SEBAGIAN: tiap baris valid ditulis dalam transaksinya sendiri.
    // Satu baris gagal tidak me-rollback baris lain (bukan atomik penuh).
    let successCount = 0;
    for (const row of valid) {
      try {
        await this.prisma.$transaction(async (tx) => {
          const user = await tx.user.create({
            data: {
              email: row.email,
              // Password awal acak — Taruna wajib reset via forgot-password
              // sebelum bisa login (tidak ada password default yang berbagi).
              passwordHash: await argon2.hash(
                `imp-${Date.now()}-${Math.random()}-Aa1`,
                { type: argon2.argon2id },
              ),
              role: Role.TARUNA,
              status: AccountStatus.PENDING_VERIFICATION,
            },
          });
          const cohort = await tx.cohort.findUniqueOrThrow({
            where: { code: row.cohortKode },
          });
          await tx.enrollment.upsert({
            where: {
              userId_cohortId: { userId: user.id, cohortId: cohort.id },
            },
            create: { userId: user.id, cohortId: cohort.id },
            update: {},
          });
        });
        successCount += 1;
      } catch {
        errorCells.set(row.rowNumber, ['gagal menyimpan baris']);
        const report = reports.find((item) => item.rowNumber === row.rowNumber);
        if (report) {
          report.success = false;
          report.errors = ['gagal menyimpan baris'];
        }
      }
    }

    const failedCount = reports.filter((item) => !item.success).length;
    const job = await this.prisma.importJob.create({
      data: {
        fileName: safeFileName,
        totalRows: rows.length,
        successCount,
        failedCount,
        status:
          failedCount === 0
            ? ImportStatus.COMPLETED
            : ImportStatus.COMPLETED_WITH_ERRORS,
        createdBy: actorId,
      },
    });
    await this.audit.record(USER_AUDIT_ACTIONS.TARUNA_IMPORTED, {
      actorId,
      targetId: job.id,
      metadata: {
        fileName: safeFileName,
        totalRows: rows.length,
        successCount,
        failedCount,
      },
    });
    const failedRows = rows.filter((row) => errorCells.has(row.rowNumber));
    const errorLog =
      failedRows.length > 0
        ? await this.templates.buildErrorLog(rows, errorCells)
        : null;
    if (errorLog) this.errorLogs.set(job.id, errorLog);
    return {
      importId: job.id,
      fileName: safeFileName,
      totalRows: rows.length,
      successCount,
      failedCount,
      status: job.status,
      rows: reports,
      hasErrorLog: failedCount > 0,
    };
  }

  // Berkas log perbaikan disimpan di memori proses (bukan DB/blob storage
  // pada Tahap 3 — unduh segera setelah impor; hilang saat restart).
  // Batasan ini didokumentasikan di README + respons API.
  private readonly errorLogs = new Map<string, Buffer>();

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
