import { SubmitResultRetentionService } from './submit-result-retention.service';
import { CBT_AUDIT_ACTIONS, CBT_RULES } from './cbt.rules';

// Test unit untuk kebijakan retensi submitResult. Yang diuji di sini adalah
// KEPUTUSAN (cutoff, batas bawah retensi, pemanggilan audit) — bukan koneksi
// Prisma, yang diuji di e2e (lihat test/cbt.e2e-spec.ts).
describe('SubmitResultRetentionService', () => {
  const DAY_MS = 24 * 60 * 60 * 1000;

  function makeService(overrides: {
    retentionDays?: number;
    updateMany?: jest.Mock;
    record?: jest.Mock;
  } = {}) {
    const updateMany =
      overrides.updateMany ?? jest.fn().mockResolvedValue({ count: 0 });
    const record = overrides.record ?? jest.fn().mockResolvedValue(undefined);
    const config = {
      get: jest.fn((key: string) =>
        key === 'app.submitResultRetentionDays' ? overrides.retentionDays : undefined,
      ),
    };
    const service = new SubmitResultRetentionService(
      { attempt: { updateMany } } as never,
      config as never,
      { record } as never,
    );
    return { service, updateMany, record };
  }

  describe('retensi dibaca dari konfigurasi', () => {
    it('memakai nilai env yang dikonfigurasi', async () => {
      const { service, updateMany } = makeService({ retentionDays: 30 });
      await service.purgeExpiredSubmitResults();

      const cutoff = updateMany.mock.calls[0][0].where.submittedAt.lt as Date;
      // Cutoff = sekarang - 30 hari (toleransi 2 detik untuk waktu eksekusi).
      expect(Date.now() - cutoff.getTime()).toBeGreaterThan(30 * DAY_MS - 2000);
      expect(Date.now() - cutoff.getTime()).toBeLessThan(30 * DAY_MS + 2000);
    });

    it('menjaga batas bawah 1 hari bila konfigurasi tidak masuk akal', async () => {
      for (const bad of [0, -5, Number.NaN, undefined]) {
        const { service, updateMany } = makeService({ retentionDays: bad });
        await service.purgeExpiredSubmitResults();

        const cutoff = updateMany.mock.calls[0][0].where.submittedAt.lt as Date;
        const ageDays = (Date.now() - cutoff.getTime()) / DAY_MS;
        expect(ageDays).toBeGreaterThanOrEqual(1 - 0.001);
        expect(ageDays).toBeLessThan(1 + 0.001);
      }
    });

    it('membulatkan nilai pecahan ke bawah', async () => {
      const { service, updateMany } = makeService({ retentionDays: 7.9 });
      await service.purgeExpiredSubmitResults();

      const cutoff = updateMany.mock.calls[0][0].where.submittedAt.lt as Date;
      const ageDays = (Date.now() - cutoff.getTime()) / DAY_MS;
      expect(ageDays).toBeLessThan(8);
    });
  });

  describe('lingkup pembersihan', () => {
    it('hanya menyentuh attempt yang punya submitResult dan sudah lama', async () => {
      const { service, updateMany } = makeService({ retentionDays: 90 });
      await service.purgeExpiredSubmitResults();

      const arg = updateMany.mock.calls[0][0];
      expect(arg.where.submitResult).toEqual({ not: expect.anything() });
      expect(arg.data.submitResult).toBeDefined();
      // Tidak boleh ada where lain yang bisa menghapus baris attempt.
      expect(Object.keys(arg.where).sort()).toEqual(['submitResult', 'submittedAt']);
      // updateMany, bukan deleteMany — baris attempt harus tetap ada.
      expect(updateMany).toHaveBeenCalledTimes(1);
    });

    it('tidak mencatat audit bila tidak ada yang dibersihkan', async () => {
      const { service, record } = makeService({ retentionDays: 90 });
      await service.purgeExpiredSubmitResults();
      expect(record).not.toHaveBeenCalled();
    });

    it('mencatat audit dengan jumlah & retention saat ada yang dibersihkan', async () => {
      const updateMany = jest.fn().mockResolvedValue({ count: 3 });
      const { service, record } = makeService({ retentionDays: 45, updateMany });
      await service.purgeExpiredSubmitResults();

      expect(record).toHaveBeenCalledTimes(1);
      const [action, options] = record.mock.calls[0];
      expect(action).toBe(CBT_AUDIT_ACTIONS.SUBMIT_RESULT_PURGED);
      expect(options.metadata).toMatchObject({ purged: 3, retentionDays: 45 });
      // Metadata audit tidak boleh memuat isi submitResult itu sendiri.
      expect(JSON.stringify(options.metadata)).not.toContain('score');
    });
  });

  describe('konstanta aturan', () => {
    it('batas bawah retensi minimal 1 hari', () => {
      expect(CBT_RULES.SUBMIT_RESULT_RETENTION_DAYS_MIN).toBe(1);
    });
  });
});
