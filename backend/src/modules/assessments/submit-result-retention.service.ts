import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CBT_AUDIT_ACTIONS, CBT_RULES } from './cbt.rules';

// Pembersihan submitResult (known issue QA: JSON hasil submit tumbuh per
// attempt tanpa batas).
//
// submitResult dipakai untuk replay idempoten: permintaan submit yang diulang
// dengan Idempotency-Key yang sama mengembalikan hasil percobaan pertama
// (attempts.service.ts). Karena itu nilainya TIDAK boleh dihapus begitu saja —
// tapi juga tidak boleh disimpan selamanya, sebab kolom bertipe JsonB tumbuh
// seiring banyaknya attempt.
//
// Kebijakan: simpan selama SUBMIT_RESULT_RETENTION_DAYS (default 90 hari),
// jauh di luar jendela wajar replay (detik sampai menit) dan mencukupi untuk
// audit insiden. Hanya kolom submitResult yang dikosongkan — attempt, skor,
// status, dan jawaban TIDAK disentuh, sehingga hasil ujian tetap utuh.
//
// Kunci idempoten (submitKey) sengaja TIDAK dihapus: ia tetap dipakai untuk
// mendeteksi key yang sama dengan payload berbeda (409), bukan hanya untuk
// replay. Menghapus submitKey akan mengubah semantik endpoint.
@Injectable()
export class SubmitResultRetentionService {
  private readonly logger = new Logger(SubmitResultRetentionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly audit: AuditService,
  ) {}

  private retentionDays(): number {
    const raw = this.config.get<number>('app.submitResultRetentionDays');
    const value = Number(raw);
    if (!Number.isFinite(value) || value < CBT_RULES.SUBMIT_RESULT_RETENTION_DAYS_MIN) {
      return CBT_RULES.SUBMIT_RESULT_RETENTION_DAYS_MIN;
    }
    return Math.floor(value);
  }

  // Jadwal harian 03:15 server (UTC). Sengaja di luar jam sibuk ujian.
  // Nilai retention dibaca saat job berjalan agar perubahan env tidak
  // memerlukan restart — dan agar salah konfigurasi langsung terlihat di log.
  @Cron('15 3 * * *', { name: 'submit-result-retention' })
  async purgeExpiredSubmitResults(): Promise<void> {
    const days = this.retentionDays();
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const { count } = await this.prisma.attempt.updateMany({
      where: {
        submitResult: { not: Prisma.DbNull },
        submittedAt: { lt: cutoff },
      },
      // Mengosongkan kolom JSON (bukan menghapus baris): attempt, skor,
      // status, dan jawaban tetap utuh.
      data: { submitResult: Prisma.JsonNull },
    });

    if (count > 0) {
      this.logger.log(
        `submitResult dibersihkan: ${count} attempt (retensi ${days} hari, cutoff ${cutoff.toISOString()})`,
      );
      await this.audit.record(CBT_AUDIT_ACTIONS.SUBMIT_RESULT_PURGED, {
        metadata: { purged: count, retentionDays: days, cutoff: cutoff.toISOString() },
      });
    }
  }
}
