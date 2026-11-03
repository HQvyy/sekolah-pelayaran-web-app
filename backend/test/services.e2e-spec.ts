import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';
import { FakeEmailService } from '../src/modules/notifications/fake-email.service';
import { AccountStatus, PublishStatus, Role } from '@prisma/client';
import * as argon2 from 'argon2';

const EMAIL = (tag: string) => `t7-${tag}@contoh.id`;

describe('Tahap 7 rating/sertifikat/tiket (e2e)', () => {
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

  async function setup() {
    const admin = await makeUser('admin', Role.ADMIN);
    const mentor = await makeUser('mentor', Role.MENTOR);
    const taruna = await makeUser('taruna');
    const outsider = await makeUser('outsider');
    const adminToken = await loginAs(admin.email);
    const mentorToken = await loginAs(mentor.email);
    const tarunaToken = await loginAs(taruna.email);
    const outsiderToken = await loginAs(outsider.email);
    const cohort = await prisma.cohort.create({
      data: { code: `T7-${Date.now()}`, name: 'Cohort T7' },
    });
    await prisma.enrollment.create({
      data: { userId: taruna.id, cohortId: cohort.id },
    });
    const lesson = await prisma.liveLesson.create({
      data: {
        cohortId: cohort.id,
        mentorId: mentor.id,
        title: 'Kelas rating',
        startsAt: new Date(Date.now() + 48 * 3_600_000),
        endsAt: new Date(Date.now() + 50 * 3_600_000),
        roomReference: 'SPLI-RATE',
        createdBy: admin.id,
      },
    });
    return { admin, mentor, taruna, outsider, adminToken, mentorToken, tarunaToken, outsiderToken, cohort, lesson };
  }

  async function passAllLevels(tarunaId: string, cohortId: string) {
    for (let level = 1; level <= 5; level += 1) {
      const assessment = await prisma.assessment.create({
        data: {
          cohortId,
          level,
          title: `Level ${level}`,
          durationMinutes: 60,
          status: PublishStatus.PUBLISHED,
          createdBy: tarunaId,
        },
      });
      const attempt = await prisma.attempt.create({
        data: {
          assessmentId: assessment.id,
          userId: tarunaId,
          status: 'GRADED',
          startedAt: new Date(Date.now() - 3_600_000),
          expiresAt: new Date(Date.now() - 1000),
          submittedAt: new Date(),
          shuffledQuestionIds: [],
          shuffledOptionIds: {},
          score: 80,
          passed: true,
        },
      });
      void attempt;
      await prisma.learningProgress.upsert({
        where: { userId_assessmentId: { userId: tarunaId, assessmentId: assessment.id } },
        create: {
          userId: tarunaId,
          assessmentId: assessment.id,
          status: 'PASSED',
          bestScore: 80,
          attemptsUsed: 1,
          passedAt: new Date(),
        },
        update: { status: 'PASSED', bestScore: 80, attemptsUsed: 1, passedAt: new Date() },
      });
    }
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

  it('rating: buat + duplikat ditolak + edit 1× + edit kedua ditolak', async () => {
    const ctx = await setup();
    const created = await agent()
      .post('/api/v1/ratings')
      .set('Authorization', `Bearer ${ctx.tarunaToken}`)
      .send({ lessonId: ctx.lesson.id, score: 5, feedback: 'Mantap.' });
    expect(created.status).toBe(201);
    const duplicate = await agent()
      .post('/api/v1/ratings')
      .set('Authorization', `Bearer ${ctx.tarunaToken}`)
      .send({ lessonId: ctx.lesson.id, score: 4 });
    expect(duplicate.status).toBe(409);
    const edited = await agent()
      .patch(`/api/v1/ratings/${created.body.data.id}`)
      .set('Authorization', `Bearer ${ctx.tarunaToken}`)
      .send({ score: 4, feedback: 'Baik.' });
    expect(edited.status).toBe(200);
    expect(edited.body.data.score).toBe(4);
    const second = await agent()
      .patch(`/api/v1/ratings/${created.body.data.id}`)
      .set('Authorization', `Bearer ${ctx.tarunaToken}`)
      .send({ score: 3 });
    expect(second.status).toBe(409);
  });

  it('rating: non-peserta ditolak (403); Mentor baca kelasnya; Taruna lain 404', async () => {
    const ctx = await setup();
    const denied = await agent()
      .post('/api/v1/ratings')
      .set('Authorization', `Bearer ${ctx.outsiderToken}`)
      .send({ lessonId: ctx.lesson.id, score: 5 });
    expect(denied.status).toBe(403);
    await agent()
      .post('/api/v1/ratings')
      .set('Authorization', `Bearer ${ctx.tarunaToken}`)
      .send({ lessonId: ctx.lesson.id, score: 5 });
    const mentorView = await agent()
      .get(`/api/v1/classes/x/ratings?lessonId=${ctx.lesson.id}`)
      .set('Authorization', `Bearer ${ctx.mentorToken}`);
    expect(mentorView.status).toBe(200);
    expect(mentorView.body.data.length).toBeGreaterThanOrEqual(1);
    // Rating milik orang lain tidak bisa diedit.
    const other = await makeUser('peretas');
    const otherToken = await loginAs(other.email);
    await prisma.enrollment.create({
      data: { userId: other.id, cohortId: ctx.cohort.id },
    });
    const victim = await prisma.rating.findFirstOrThrow({
      where: { userId: ctx.taruna.id },
    });
    const hijack = await agent()
      .patch(`/api/v1/ratings/${victim.id}`)
      .set('Authorization', `Bearer ${otherToken}`)
      .send({ score: 1 });
    expect(hijack.status).toBe(404);
  });

  it('sertifikat: syarat belum terpenuhi 409; lulus 5 level → terbit + PDF + disclaimer', async () => {
    const ctx = await setup();
    const early = await agent()
      .post('/api/v1/certificates')
      .set('Authorization', `Bearer ${ctx.adminToken}`)
      .send({ userId: ctx.taruna.id, cohortId: ctx.cohort.id, fullName: 'Taruna Uji' });
    expect(early.status).toBe(409);
    await passAllLevels(ctx.taruna.id, ctx.cohort.id);
    const issued = await agent()
      .post('/api/v1/certificates')
      .set('Authorization', `Bearer ${ctx.adminToken}`)
      .send({ userId: ctx.taruna.id, cohortId: ctx.cohort.id, fullName: 'Taruna Uji' });
    expect(issued.status).toBe(201);
    expect(issued.body.data.number).toMatch(/^SPLI-/);
    const duplicate = await agent()
      .post('/api/v1/certificates')
      .set('Authorization', `Bearer ${ctx.adminToken}`)
      .send({ userId: ctx.taruna.id, cohortId: ctx.cohort.id, fullName: 'Taruna Uji' });
    expect(duplicate.status).toBe(409);
    const pdf = await agent()
      .get(`/api/v1/certificates/${issued.body.data.id}/pdf`)
      .set('Authorization', `Bearer ${ctx.tarunaToken}`)
      .buffer(true)
      .parse((res, callback) => {
        const chunks: Buffer[] = [];
        res.on('data', (chunk: Buffer) => chunks.push(chunk));
        res.on('end', () => callback(null, Buffer.concat(chunks)));
      });
    expect(pdf.status).toBe(200);
    expect(pdf.headers['content-type']).toContain('application/pdf');
    expect(Buffer.isBuffer(pdf.body)).toBe(true);
    expect(pdf.body.length).toBeGreaterThan(1000);
    expect(pdf.body.slice(0, 5).toString()).toBe('%PDF-');
    // Isi teks (nama + disclaimer non-STCW) diverifikasi visual saat UAT —
    // ekstraksi teks otomatis tidak layak (PDFKit subset font tanpa ToUnicode).
    // Orang lain tidak bisa mengunduh.
    const stolen = await agent()
      .get(`/api/v1/certificates/${issued.body.data.id}/pdf`)
      .set('Authorization', `Bearer ${ctx.outsiderToken}`);
    expect(stolen.status).toBe(404);
  });

  it('tiket: buat → status bertahap valid; transisi ilegal 409; Mentor 403', async () => {
    const ctx = await setup();
    const created = await agent()
      .post('/api/v1/tickets')
      .set('Authorization', `Bearer ${ctx.tarunaToken}`)
      .send({ title: 'Video macet', description: 'Video bab 2 tidak bisa diputar.' });
    expect(created.status).toBe(201);
    expect(created.body.data.status).toBe('OPEN');
    // Taruna lain tidak bisa melihat.
    const hidden = await agent()
      .get(`/api/v1/tickets/${created.body.data.id}`)
      .set('Authorization', `Bearer ${ctx.outsiderToken}`);
    expect(hidden.status).toBe(404);
    // Lompat OPEN → RESOLVED ditolak.
    const illegal = await agent()
      .patch(`/api/v1/tickets/${created.body.data.id}/status`)
      .set('Authorization', `Bearer ${ctx.adminToken}`)
      .send({ status: 'RESOLVED' });
    expect(illegal.status).toBe(409);
    // Alur benar: OPEN → IN_PROGRESS → RESOLVED → CLOSED.
    for (const status of ['IN_PROGRESS', 'RESOLVED', 'CLOSED']) {
      const step = await agent()
        .patch(`/api/v1/tickets/${created.body.data.id}/status`)
        .set('Authorization', `Bearer ${ctx.adminToken}`)
        .send({ status, comment: `Ubah ke ${status}.` });
      expect(step.status).toBe(200);
      expect(step.body.data.status).toBe(status);
    }
    const history = await agent()
      .get(`/api/v1/tickets/${created.body.data.id}/history`)
      .set('Authorization', `Bearer ${ctx.tarunaToken}`);
    expect(history.body.data.length).toBeGreaterThanOrEqual(4);
    // Mentor tidak punya akses support.
    const mentorDenied = await agent()
      .get('/api/v1/tickets')
      .set('Authorization', `Bearer ${ctx.mentorToken}`);
    expect(mentorDenied.status).toBe(403);
  });
});
