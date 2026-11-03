import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';
import { FakeEmailService } from '../src/modules/notifications/fake-email.service';
import { AccountStatus, Role } from '@prisma/client';
import * as argon2 from 'argon2';

const EMAIL = (tag: string) => `t5-${tag}@contoh.id`;
const HOUR_MS = 3_600_000;

describe('Tahap 5 live lesson + absensi (e2e)', () => {
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
    const cohort = await prisma.cohort.create({
      data: { code: `T5-${Date.now()}`, name: 'Cohort T5' },
    });
    await prisma.enrollment.create({
      data: { userId: taruna.id, cohortId: cohort.id },
    });
    return {
      adminToken: await loginAs(admin.email),
      mentorToken: await loginAs(mentor.email),
      tarunaToken: await loginAs(taruna.email),
      outsiderToken: await loginAs(outsider.email),
      admin,
      mentor,
      taruna,
      outsider,
      cohort,
    };
  }

  function future(hoursFromNow: number, durationHours = 2): { startsAt: string; endsAt: string } {
    const startsAt = new Date(Date.now() + hoursFromNow * HOUR_MS);
    const endsAt = new Date(startsAt.getTime() + durationHours * HOUR_MS);
    return { startsAt: startsAt.toISOString(), endsAt: endsAt.toISOString() };
  }

  async function createLesson(
    token: string,
    cohortId: string,
    hoursFromNow: number,
    mentorId?: string,
  ) {
    const window = future(hoursFromNow);
    const res = await agent()
      .post('/api/v1/live-lessons')
      .set('Authorization', `Bearer ${token}`)
      .send({
        cohortId,
        title: `Kelas ${Date.now()}`,
        ...window,
        ...(mentorId ? { mentorId } : {}),
      });
    return res;
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

  it('jadwal: Admin/Mentor bisa buat; Taruna ditolak (403)', async () => {
    const ctx = await setup();
    const created = await createLesson(ctx.adminToken, ctx.cohort.id, 48, ctx.mentor.id);
    expect(created.status).toBe(201);
    expect(created.body.data.roomReference).toBeDefined();
    const denied = await createLesson(ctx.tarunaToken, ctx.cohort.id, 48);
    expect(denied.status).toBe(403);
  });

  it('join: Taruna enrolled tercatat PRESENT + materi embed; non-enrolled 404', async () => {
    const ctx = await setup();
    const created = await createLesson(ctx.mentorToken, ctx.cohort.id, 48);
    const join = await agent()
      .post(`/api/v1/live-lessons/${created.body.data.id}/join`)
      .set('Authorization', `Bearer ${ctx.tarunaToken}`)
      .send({});
    expect(join.status).toBe(200);
    expect(join.body.data.join.roomName).toBeDefined();
    expect(join.body.data.join.domain).toBeDefined();
    // URL mentah provider tidak dibocorkan sebagai field 'url'.
    expect(join.body.data.join.url).toBeUndefined();
    const record = await prisma.attendanceRecord.findUnique({
      where: {
        lessonId_userId: {
          lessonId: created.body.data.id,
          userId: ctx.taruna.id,
        },
      },
    });
    expect(record?.status).toBe('PRESENT');
    expect(record?.source).toBe('JOIN');
    const noEnroll = await agent()
      .post(`/api/v1/live-lessons/${created.body.data.id}/join`)
      .set('Authorization', `Bearer ${ctx.outsiderToken}`)
      .send({});
    expect(noEnroll.status).toBe(404);
  });

  it('reschedule setelah batas H-1 ditolak (403); sebelum H-1 lolos', async () => {
    const ctx = await setup();
    // Jadwal 12 jam dari sekarang (< H-1): perubahan waktu DITOLAK.
    const soon = await prisma.liveLesson.create({
      data: {
        cohortId: ctx.cohort.id,
        mentorId: ctx.mentor.id,
        title: 'Kelas mepet',
        startsAt: new Date(Date.now() + 12 * HOUR_MS),
        endsAt: new Date(Date.now() + 14 * HOUR_MS),
        roomReference: 'SPLI-MEPET',
        createdBy: ctx.admin.id,
      },
    });
    const denied = await agent()
      .patch(`/api/v1/live-lessons/${soon.id}`)
      .set('Authorization', `Bearer ${ctx.adminToken}`)
      .send({ title: 'Geser juga', startsAt: future(30).startsAt, endsAt: future(30, 2).endsAt });
    expect(denied.status).toBe(403);
    // Jadwal 72 jam dari sekarang (> H-1): perubahan waktu BOLEH.
    const far = await createLesson(ctx.adminToken, ctx.cohort.id, 72, ctx.mentor.id);
    expect(far.status).toBe(201);
    const near = future(30);
    const allowed = await agent()
      .patch(`/api/v1/live-lessons/${far.body.data.id}`)
      .set('Authorization', `Bearer ${ctx.adminToken}`)
      .send({ startsAt: near.startsAt, endsAt: near.endsAt });
    expect(allowed.status).toBe(200);
  });

  it('pembatalan: H-1 lolos + notifikasi; setelah batas ditolak; join kelas batal 409', async () => {
    const ctx = await setup();
    const lesson = await createLesson(ctx.adminToken, ctx.cohort.id, 72, ctx.mentor.id);
    const cancelled = await agent()
      .post(`/api/v1/live-lessons/${lesson.body.data.id}/cancel`)
      .set('Authorization', `Bearer ${ctx.adminToken}`)
      .send({});
    expect(cancelled.status).toBe(200);
    expect(cancelled.body.data.status).toBe('CANCELLED');
    // Notifikasi in-app untuk peserta cohort.
    const notices = await prisma.notification.findMany({
      where: { userId: ctx.taruna.id },
    });
    expect(notices.length).toBeGreaterThanOrEqual(1);
    // Join kelas batal ditolak.
    const join = await agent()
      .post(`/api/v1/live-lessons/${lesson.body.data.id}/join`)
      .set('Authorization', `Bearer ${ctx.tarunaToken}`)
      .send({});
    expect(join.status).toBe(409);
    // Kelas 12 jam dari sekarang tidak bisa dibatalkan (< H-1).
    const soon = await prisma.liveLesson.create({
      data: {
        cohortId: ctx.cohort.id,
        mentorId: ctx.mentor.id,
        title: 'Melewati batas',
        startsAt: new Date(Date.now() + 12 * HOUR_MS),
        endsAt: new Date(Date.now() + 14 * HOUR_MS),
        roomReference: 'SPLI-SOON',
        createdBy: ctx.admin.id,
      },
    });
    const late = await agent()
      .post(`/api/v1/live-lessons/${soon.id}/cancel`)
      .set('Authorization', `Bearer ${ctx.adminToken}`)
      .send({});
    expect(late.status).toBe(403);
  });

  it('koreksi absensi: Mentor dalam 24 jam lolos + audit; lewat 24 jam ditolak', async () => {
    const ctx = await setup();
    const created = await createLesson(ctx.mentorToken, ctx.cohort.id, 48);
    await agent()
      .post(`/api/v1/live-lessons/${created.body.data.id}/join`)
      .set('Authorization', `Bearer ${ctx.tarunaToken}`)
      .send({});
    const corrected = await agent()
      .patch(
        `/api/v1/live-lessons/${created.body.data.id}/attendance/${ctx.taruna.id}`,
      )
      .set('Authorization', `Bearer ${ctx.mentorToken}`)
      .send({ userId: ctx.taruna.id, status: 'EXCUSED' });
    expect(corrected.status).toBe(200);
    expect(corrected.body.data.status).toBe('EXCUSED');
    expect(corrected.body.data.source).toBe('MANUAL');
    const audit = await prisma.lessonAuditLog.findFirst({
      where: {
        lessonId: created.body.data.id,
        action: 'attendance.corrected',
      },
    });
    expect(audit).not.toBeNull();
    // Simulasi sesi berakhir >24 jam lalu → koreksi ditolak.
    await prisma.liveLesson.update({
      where: { id: created.body.data.id },
      data: {
        startsAt: new Date(Date.now() - 30 * HOUR_MS),
        endsAt: new Date(Date.now() - 28 * HOUR_MS),
      },
    });
    const late = await agent()
      .patch(
        `/api/v1/live-lessons/${created.body.data.id}/attendance/${ctx.taruna.id}`,
      )
      .set('Authorization', `Bearer ${ctx.mentorToken}`)
      .send({ userId: ctx.taruna.id, status: 'PRESENT' });
    expect(late.status).toBe(403);
  });

  it('rekap + ekspor absensi; Mentor kelas lain ditolak (403)', async () => {
    const ctx = await setup();
    const otherMentor = await makeUser('mentor-lain', Role.MENTOR);
    const otherToken = await loginAs(otherMentor.email);
    const created = await createLesson(ctx.mentorToken, ctx.cohort.id, 48);
    await agent()
      .post(`/api/v1/live-lessons/${created.body.data.id}/join`)
      .set('Authorization', `Bearer ${ctx.tarunaToken}`)
      .send({});
    const recap = await agent()
      .get(`/api/v1/live-lessons/${created.body.data.id}/attendance`)
      .set('Authorization', `Bearer ${ctx.mentorToken}`);
    expect(recap.status).toBe(200);
    expect(recap.body.data.length).toBe(1);
    const denied = await agent()
      .get(`/api/v1/live-lessons/${created.body.data.id}/attendance`)
      .set('Authorization', `Bearer ${otherToken}`);
    expect(denied.status).toBe(403);
    const exported = await agent()
      .get(`/api/v1/live-lessons/${created.body.data.id}/attendance/export`)
      .set('Authorization', `Bearer ${ctx.mentorToken}`);
    expect(exported.status).toBe(200);
    expect(exported.headers['content-type']).toContain('spreadsheetml');
  });
});
