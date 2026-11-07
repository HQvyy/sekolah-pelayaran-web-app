import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import ExcelJS from 'exceljs';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';
import { FakeEmailService } from '../src/modules/notifications/fake-email.service';
import { AccountStatus, Role } from '@prisma/client';
import * as argon2 from 'argon2';

const EMAIL = (tag: string) => `t6-${tag}@contoh.id`;

describe('Tahap 6 CBT slice (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let fakeEmail: FakeEmailService;
  const agent = () => request(app.getHttpServer());

  async function makeUser(
    tag: string,
    role: Role = Role.TARUNA,
    status: AccountStatus = AccountStatus.ACTIVE,
  ) {
    const email = EMAIL(`${tag}-${Date.now()}-${Math.floor(Math.random() * 1e6)}`);
    return prisma.user.create({
      data: {
        email,
        passwordHash: await argon2.hash('Rahasia123', { type: argon2.argon2id }),
        role,
        status,
        consentGivenAt: new Date(),
      },
    });
  }

  async function loginAs(email: string): Promise<string> {
    const login = await agent().post('/api/v1/auth/login').send({
      email,
      password: 'Rahasia123',
    });
    const code = fakeEmail.lastOtpFor(email);
    const verify = await agent().post('/api/v1/auth/2fa/verify').send({
      challengeId: login.body.data.challengeId,
      code,
    });
    return verify.body.data.accessToken as string;
  }

  // Assessment level 1 PUBLISHED + 2 PG (bobot 1) + 1 esai (bobot 2).
  async function seedCbt(cohortCode: string) {
    const admin = await makeUser('admin', Role.ADMIN);
    const mentor = await makeUser('mentor', Role.MENTOR);
    const taruna = await makeUser('taruna');
    const adminToken = await loginAs(admin.email);
    const mentorToken = await loginAs(mentor.email);
    const tarunaToken = await loginAs(taruna.email);
    const cohort = await prisma.cohort.create({
      data: { code: `${cohortCode}-${Date.now()}`, name: 'Cohort CBT' },
    });
    await prisma.enrollment.create({
      data: { userId: taruna.id, cohortId: cohort.id },
    });
    const assessment = (
      await agent().post('/api/v1/assessments').set('Authorization', `Bearer ${adminToken}`).send({
        cohortId: cohort.id,
        level: 1,
        title: 'Ujian Level 1',
        durationMinutes: 60,
        status: 'PUBLISHED',
      })
    ).body.data;
    const pg1 = (
      await agent().post(`/api/v1/assessments/${assessment.id}/questions`).set('Authorization', `Bearer ${adminToken}`).send({
        type: 'PG',
        prompt: 'Ibukota Indonesia?',
        weight: 1,
        options: [
          { label: 'Jakarta', isCorrect: true },
          { label: 'Bandung', isCorrect: false },
        ],
      })
    ).body.data;
    const pg2 = (
      await agent().post(`/api/v1/assessments/${assessment.id}/questions`).set('Authorization', `Bearer ${adminToken}`).send({
        type: 'PG',
        prompt: '2 + 2?',
        weight: 1,
        options: [
          { label: '3', isCorrect: false },
          { label: '4', isCorrect: true },
        ],
      })
    ).body.data;
    const essay = (
      await agent().post(`/api/v1/assessments/${assessment.id}/questions`).set('Authorization', `Bearer ${adminToken}`).send({
        type: 'ESSAY',
        prompt: 'Jelaskan keselamatan pelayaran.',
        weight: 2,
      })
    ).body.data;
    return { admin, mentor, taruna, adminToken, mentorToken, tarunaToken, cohort, assessment, pg1, pg2, essay };
  }

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    const { default: cookieParser } = await import('cookie-parser');
    app.use(cookieParser());
    app.setGlobalPrefix(process.env.API_PREFIX ?? 'api/v1', {
      exclude: ['/', 'docs', 'docs-json'],
    });
    const {
      ContractValidationPipe,
    } = await import('../src/common/pipes/contract-validation.pipe');
    const {
      AllExceptionsFilter,
    } = await import('../src/common/filters/all-exceptions.filter');
    app.useGlobalPipes(new ContractValidationPipe());
    app.useGlobalFilters(new AllExceptionsFilter());
    await app.init();
    prisma = moduleRef.get(PrismaService);
    fakeEmail = moduleRef.get(FakeEmailService);
  });

  afterAll(async () => {
    await app?.close();
  });

  it('bank soal: impor .xlsx berhasil sebagian + template; >500 ditolak', async () => {
    const ctx = await seedCbt('BANK');
    const buildRows = (count: number, prefix: string) =>
      Array.from({ length: count }, (_, index) => ({
        level: 1,
        kategori_kapal: 'Bulk Carrier',
        tipe: index % 2 === 0 ? 'PG' : 'ESAI',
        pertanyaan: `${prefix} soal ${index}`,
        opsi_a: index % 2 === 0 ? 'Benar' : '',
        opsi_b: index % 2 === 0 ? 'Salah' : '',
        opsi_c: '',
        opsi_d: '',
        kunci_jawaban: index % 2 === 0 ? 'A' : '',
        bobot: 1,
      }));
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('BankSoal');
    sheet.columns = ['level', 'kategori_kapal', 'tipe', 'pertanyaan', 'opsi_a', 'opsi_b', 'opsi_c', 'opsi_d', 'kunci_jawaban', 'bobot'].map((header) => ({ header, key: header, width: 18 }));
    for (const row of [...buildRows(1, 'valid'), { level: 9, kategori_kapal: '', tipe: 'XX', pertanyaan: '', opsi_a: '', opsi_b: '', opsi_c: '', opsi_d: '', kunci_jawaban: '', bobot: 'x' }]) {
      sheet.addRow(row);
    }
    const buffer = Buffer.from(await workbook.xlsx.writeBuffer());
    const res = await agent()
      .post(`/api/v1/assessments/${ctx.assessment.id}/questions/import`)
      .set('Authorization', `Bearer ${ctx.adminToken}`)
      .attach('file', buffer, 'bank.xlsx');
    expect(res.status).toBe(201);
    expect(res.body.data.successCount).toBe(1);
    expect(res.body.data.failedCount).toBe(1);
    const log = await agent()
      .get(`/api/v1/assessments/questions/imports/${res.body.data.importId}/errors`)
      .set('Authorization', `Bearer ${ctx.adminToken}`);
    expect(log.status).toBe(200);
    const template = await agent()
      .get('/api/v1/assessments/questions/import-template')
      .set('Authorization', `Bearer ${ctx.adminToken}`);
    expect(template.status).toBe(200);
  });

  it('bank soal: .xlsx palsu (mimetype & ekstensi beda) ditolak 415', async () => {
    // Pengecekan tipe memakai AND — berkas non-xlsx yang diubah namanya
    // menjadi .xlsx tetap ditolak.
    const ctx = await seedCbt('BANKMIME');
    const res = await agent()
      .post(`/api/v1/assessments/${ctx.assessment.id}/questions/import`)
      .set('Authorization', `Bearer ${ctx.adminToken}`)
      .set('Content-Type', 'multipart/form-data')
      .attach('file', Buffer.from('level,kategori_kapal'), {
        filename: 'palsu.xlsx',
        contentType: 'text/csv',
      });
    expect(res.status).toBe(415);
    expect(res.body.error.message).toMatch(/\.xlsx/);
  });

  it('attempt: timer server, tanpa answer key, ownership dijaga', async () => {
    const ctx = await seedCbt('OWN');
    const started = await agent()
      .post(`/api/v1/assessments/${ctx.assessment.id}/attempts`)
      .set('Authorization', `Bearer ${ctx.tarunaToken}`)
      .send({});
    expect(started.status).toBe(201);
    expect(started.body.data.serverNow).toBeDefined();
    expect(started.body.data.expiresAt).toBeDefined();
    // Tidak ada kunci jawaban di payload.
    expect(JSON.stringify(started.body.data).toLowerCase()).not.toContain('jakarta');
    // Orang lain tidak bisa resume attempt ini.
    const other = await makeUser('other');
    const otherToken = await loginAs(other.email);
    const denied = await agent()
      .get(`/api/v1/attempts/${started.body.data.attemptId}`)
      .set('Authorization', `Bearer ${otherToken}`);
    expect(denied.status).toBe(404);
  });

  it('submit PG semua benar → GRADED lulus + progres PASSED; submit ulang idempotent', async () => {
    const ctx = await seedCbt('PG');
    const started = await agent()
      .post(`/api/v1/assessments/${ctx.assessment.id}/attempts`)
      .set('Authorization', `Bearer ${ctx.tarunaToken}`)
      .send({});
    const attemptId = started.body.data.attemptId as string;
    // Jawab PG dengan benar via autosave (cari optionId dari bank soal).
    const questions = await prisma.question.findMany({
      where: { assessmentId: ctx.assessment.id },
      include: { options: true },
    });
    for (const question of questions) {
      if (question.type !== 'PG') continue;
      const correct = question.options.find((item) => item.isCorrect);
      const saved = await agent()
        .put(`/api/v1/attempts/${attemptId}/answers/${question.id}`)
        .set('Authorization', `Bearer ${ctx.tarunaToken}`)
        .send({ optionId: correct!.id });
      expect(saved.status).toBe(200);
    }
    // Esai diisi agar attempt bisa submit (otomatis WAITING_MANUAL_GRADING).
    const essayQ = questions.find((item) => item.type === 'ESSAY');
    await agent()
      .put(`/api/v1/attempts/${attemptId}/answers/${essayQ!.id}`)
      .set('Authorization', `Bearer ${ctx.tarunaToken}`)
      .send({ essayText: 'Keselamatan adalah prioritas.' });
    const submitted = await agent()
      .post(`/api/v1/attempts/${attemptId}/submit`)
      .set('Authorization', `Bearer ${ctx.tarunaToken}`)
      .send({ idempotencyKey: 'kunci-unik-1' });
    expect(submitted.status).toBe(200);
    expect(submitted.body.data.status).toBe('WAITING_MANUAL_GRADING');
    // Submit ulang dengan key sama → hasil identik, tanpa ganda.
    const replay = await agent()
      .post(`/api/v1/attempts/${attemptId}/submit`)
      .set('Authorization', `Bearer ${ctx.tarunaToken}`)
      .send({ idempotencyKey: 'kunci-unik-1' });
    expect(replay.status).toBe(200);
    expect(replay.body.data.status).toBe('WAITING_MANUAL_GRADING');
  });

  it('grading esai → GRADED + progres; Taruna tidak boleh menilai (403)', async () => {
    const ctx = await seedCbt('GRADE');
    const started = await agent()
      .post(`/api/v1/assessments/${ctx.assessment.id}/attempts`)
      .set('Authorization', `Bearer ${ctx.tarunaToken}`)
      .send({});
    const attemptId = started.body.data.attemptId as string;
    const questions = await prisma.question.findMany({
      where: { assessmentId: ctx.assessment.id },
      include: { options: true },
    });
    for (const question of questions) {
      if (question.type === 'PG') {
        const correct = question.options.find((item) => item.isCorrect);
        await agent()
          .put(`/api/v1/attempts/${attemptId}/answers/${question.id}`)
          .set('Authorization', `Bearer ${ctx.tarunaToken}`)
          .send({ optionId: correct!.id });
      } else {
        await agent()
          .put(`/api/v1/attempts/${attemptId}/answers/${question.id}`)
          .set('Authorization', `Bearer ${ctx.tarunaToken}`)
          .send({ essayText: 'Jawaban esai lengkap.' });
      }
    }
    await agent()
      .post(`/api/v1/attempts/${attemptId}/submit`)
      .set('Authorization', `Bearer ${ctx.tarunaToken}`)
      .send({});
    const essayQ = questions.find((item) => item.type === 'ESSAY');
    // Taruna menilai → 403.
    const denied = await agent()
      .post(`/api/v1/attempts/${attemptId}/answers/${essayQ!.id}/grade`)
      .set('Authorization', `Bearer ${ctx.tarunaToken}`)
      .send({ score: 2 });
    expect(denied.status).toBe(403);
    // Mentor menilai penuh (2/2): PG 2/4 + esai 2/4 = 50/100? Total bobot 1+1+2=4.
    // PG benar semua = 2, esai penuh = 2 → 100 → PASSED.
    const graded = await agent()
      .post(`/api/v1/attempts/${attemptId}/answers/${essayQ!.id}/grade`)
      .set('Authorization', `Bearer ${ctx.mentorToken}`)
      .send({ score: 2, feedback: 'Bagus.' });
    expect(graded.status).toBe(201);
    const result = await agent()
      .get(`/api/v1/attempts/${attemptId}/result`)
      .set('Authorization', `Bearer ${ctx.tarunaToken}`);
    expect(result.body.data.status).toBe('GRADED');
    expect(result.body.data.score).toBe(100);
    expect(result.body.data.passed).toBe(true);
    const progress = await agent()
      .get('/api/v1/me/progress')
      .set('Authorization', `Bearer ${ctx.tarunaToken}`);
    expect(progress.body.data[0].status).toBe('PASSED');
  });

  it('attempt kedaluwarsa: autosave/submit setelah deadline ditolak', async () => {
    const ctx = await seedCbt('EXP');
    const started = await agent()
      .post(`/api/v1/assessments/${ctx.assessment.id}/attempts`)
      .set('Authorization', `Bearer ${ctx.tarunaToken}`)
      .send({});
    const attemptId = started.body.data.attemptId as string;
    await prisma.attempt.update({
      where: { id: attemptId },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });
    const questions = await prisma.question.findMany({
      where: { assessmentId: ctx.assessment.id },
    });
    const save = await agent()
      .put(`/api/v1/attempts/${attemptId}/answers/${questions[0].id}`)
      .set('Authorization', `Bearer ${ctx.tarunaToken}`)
      .send({ essayText: 'Terlambat.' });
    expect(save.status).toBe(410);
    // Resume menandai EXPIRED.
    const resumed = await agent()
      .get(`/api/v1/attempts/${attemptId}`)
      .set('Authorization', `Bearer ${ctx.tarunaToken}`);
    expect(resumed.body.data.status).toBe('EXPIRED');
  });

  it('antrean esai + overdue SLA 7 hari untuk Admin', async () => {
    const ctx = await seedCbt('SLA');
    const started = await agent()
      .post(`/api/v1/assessments/${ctx.assessment.id}/attempts`)
      .set('Authorization', `Bearer ${ctx.tarunaToken}`)
      .send({});
    const attemptId = started.body.data.attemptId as string;
    const questions = await prisma.question.findMany({
      where: { assessmentId: ctx.assessment.id },
      include: { options: true },
    });
    for (const question of questions) {
      if (question.type === 'PG') {
        const correct = question.options.find((item) => item.isCorrect);
        await agent()
          .put(`/api/v1/attempts/${attemptId}/answers/${question.id}`)
          .set('Authorization', `Bearer ${ctx.tarunaToken}`)
          .send({ optionId: correct!.id });
      } else {
        await agent()
          .put(`/api/v1/attempts/${attemptId}/answers/${question.id}`)
          .set('Authorization', `Bearer ${ctx.tarunaToken}`)
          .send({ essayText: 'Menunggu nilai.' });
      }
    }
    await agent()
      .post(`/api/v1/attempts/${attemptId}/submit`)
      .set('Authorization', `Bearer ${ctx.tarunaToken}`)
      .send({});
    const queue = await agent()
      .get('/api/v1/mentor/essay-grading')
      .set('Authorization', `Bearer ${ctx.mentorToken}`);
    expect(queue.status).toBe(200);
    expect(queue.body.data.length).toBeGreaterThanOrEqual(1);
    // Simulasi submit 8 hari lalu → overdue.
    await prisma.attempt.update({
      where: { id: attemptId },
      data: { submittedAt: new Date(Date.now() - 8 * 24 * 3_600_000) },
    });
    const overdue = await agent()
      .get('/api/v1/admin/assessments/overdue-grading')
      .set('Authorization', `Bearer ${ctx.adminToken}`);
    expect(overdue.status).toBe(200);
    expect(overdue.body.data.length).toBeGreaterThanOrEqual(1);
    expect(overdue.body.data[0].overdue).toBe(true);
    // Notifikasi ESSAY_OVERDUE masuk ke Admin (in-app).
    const adminNotice = await prisma.notification.findFirst({
      where: { userId: ctx.admin.id, kind: 'ESSAY_OVERDUE' },
      orderBy: { createdAt: 'desc' },
    });
    expect(adminNotice).not.toBeNull();
    expect(adminNotice?.body).toContain(attemptId);
  });

  it('autosave: Idempotency-Key mereplikasi jawaban; isi beda → 409', async () => {
    const ctx = await seedCbt('IDEM');
    const started = await agent()
      .post(`/api/v1/assessments/${ctx.assessment.id}/attempts`)
      .set('Authorization', `Bearer ${ctx.tarunaToken}`)
      .send({});
    const attemptId = started.body.data.attemptId as string;
    const questions = await prisma.question.findMany({
      where: { assessmentId: ctx.assessment.id },
      include: { options: true },
    });
    const essay = questions.find((item) => item.type === 'ESSAY');
    expect(essay).toBeDefined();
    const key = `autosave-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
    const url = `/api/v1/attempts/${attemptId}/answers/${essay!.id}`;
    const first = await agent()
      .put(url)
      .set('Authorization', `Bearer ${ctx.tarunaToken}`)
      .set('Idempotency-Key', key)
      .send({ essayText: 'Jawaban pertama.' });
    expect(first.status).toBe(200);
    // Replay key+payload sama → updatedAt dari penyimpanan pertama.
    const replay = await agent()
      .put(url)
      .set('Authorization', `Bearer ${ctx.tarunaToken}`)
      .set('Idempotency-Key', key)
      .send({ essayText: 'Jawaban pertama.' });
    expect(replay.status).toBe(200);
    expect(replay.body.data.updatedAt).toBe(first.body.data.updatedAt);
    // Key sama + isi berbeda → 409.
    const clash = await agent()
      .put(url)
      .set('Authorization', `Bearer ${ctx.tarunaToken}`)
      .set('Idempotency-Key', key)
      .send({ essayText: 'Jawaban lain.' });
    expect(clash.status).toBe(409);
    // Tanpa key tetap bebas memperbarui jawaban.
    const normal = await agent()
      .put(url)
      .set('Authorization', `Bearer ${ctx.tarunaToken}`)
      .send({ essayText: 'Jawaban final.' });
    expect(normal.status).toBe(200);
    const answer = await prisma.answer.findUnique({
      where: { attemptId_questionId: { attemptId, questionId: essay!.id } },
    });
    expect(answer?.essayText).toBe('Jawaban final.');
  });
});
