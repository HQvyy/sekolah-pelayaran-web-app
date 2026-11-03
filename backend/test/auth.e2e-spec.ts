import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';
import { FakeEmailService } from '../src/modules/notifications/fake-email.service';
import { AccountStatus, Role } from '@prisma/client';
import * as argon2 from 'argon2';

const EMAIL = (tag: string) => `taruna-${tag}@contoh.id`;

// Helper E2E auth: memakai DB nyata (spli_test bila DATABASE_URL menunjuk ke sana).
describe('Auth Tahap 2 (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let fakeEmail: FakeEmailService;

  const agent = () => request(app.getHttpServer());

  async function makeUser(
    tag: string,
    overrides: Partial<{ role: Role; status: AccountStatus }> = {},
  ) {
    const email = EMAIL(`${tag}-${Date.now()}-${Math.floor(Math.random() * 1e6)}`);
    return prisma.user.create({
      data: {
        email,
        passwordHash: await argon2.hash('Rahasia123', { type: argon2.argon2id }),
        role: overrides.role ?? Role.TARUNA,
        status: overrides.status ?? AccountStatus.ACTIVE,
        consentGivenAt: new Date(),
      },
    });
  }

  async function loginAndVerify(email: string) {
    const login = await agent().post('/api/v1/auth/login').send({
      email,
      password: 'Rahasia123',
    });
    const challengeId = login.body.data.challengeId as string;
    const code = fakeEmail.lastOtpFor(email);
    expect(code).toBeDefined();
    const verify = await agent()
      .post('/api/v1/auth/2fa/verify')
      .send({ challengeId, code });
    return verify;
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

  it('register: Taruna baru PENDING_VERIFICATION + consent tercatat', async () => {
    const email = EMAIL(`reg-${Date.now()}`);
    const res = await agent().post('/api/v1/auth/register').send({
      email,
      password: 'Rahasia123',
      consent: true,
    });
    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe('PENDING_VERIFICATION');
    const row = await prisma.user.findUniqueOrThrow({ where: { email } });
    expect(row.role).toBe('TARUNA');
    expect(row.consentGivenAt).not.toBeNull();
    expect(row.passwordHash).not.toContain('Rahasia123');
  });

  it('register: password lemah ditolak validasi', async () => {
    const res = await agent().post('/api/v1/auth/register').send({
      email: EMAIL('lemah'),
      password: 'pendek',
      consent: true,
    });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('login: kredensial benar → OTP_REQUIRED, belum ada access token', async () => {
    const user = await makeUser('login');
    const res = await agent().post('/api/v1/auth/login').send({
      email: user.email,
      password: 'Rahasia123',
    });
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('OTP_REQUIRED');
    expect(res.body.data.challengeId).toBeDefined();
    expect(res.body.data.accessToken).toBeUndefined();
  });

  it('login: password salah → 401 generik', async () => {
    const user = await makeUser('salah');
    const res = await agent().post('/api/v1/auth/login').send({
      email: user.email,
      password: 'Salah9999',
    });
    expect(res.status).toBe(401);
  });

  it('login: 5 gagal beruntun → akun dikunci 15 menit', async () => {
    const user = await makeUser('lock');
    for (let i = 0; i < 5; i++) {
      await agent().post('/api/v1/auth/login').send({
        email: user.email,
        password: 'Salah9999',
      });
    }
    const res = await agent().post('/api/v1/auth/login').send({
      email: user.email,
      password: 'Rahasia123',
    });
    expect(res.status).toBe(403);
    const row = await prisma.user.findUniqueOrThrow({
      where: { id: user.id },
    });
    expect(row.lockedUntil).not.toBeNull();
  });

  it('verify: OTP benar → access token + cookie refresh', async () => {
    const user = await makeUser('verify');
    const res = await loginAndVerify(user.email);
    expect(res.status).toBe(200);
    expect(res.body.data.accessToken).toBeDefined();
    expect(res.body.data.user.role).toBe('TARUNA');
    const cookies = res.headers['set-cookie'] as unknown as string[];
    expect(cookies.join(';')).toContain('spli_refresh=');
    expect(cookies.join(';').toLowerCase()).toContain('httponly');
  });

  it('verify: OTP salah → 401', async () => {
    const user = await makeUser('otpsalah');
    const login = await agent().post('/api/v1/auth/login').send({
      email: user.email,
      password: 'Rahasia123',
    });
    const res = await agent().post('/api/v1/auth/2fa/verify').send({
      challengeId: login.body.data.challengeId,
      code: '000000',
    });
    expect(res.status).toBe(401);
  });

  it('verify: 5x salah → challenge EXHAUSTED', async () => {
    const user = await makeUser('exhaust');
    const login = await agent().post('/api/v1/auth/login').send({
      email: user.email,
      password: 'Rahasia123',
    });
    const challengeId = login.body.data.challengeId as string;
    for (let i = 0; i < 5; i++) {
      await agent().post('/api/v1/auth/2fa/verify').send({
        challengeId,
        code: '000000',
      });
    }
    const res = await agent().post('/api/v1/auth/2fa/verify').send({
      challengeId,
      code: '000000',
    });
    expect(res.status).toBe(410);
  });

  it('resend: sebelum 60 detik → 403', async () => {
    const user = await makeUser('resend');
    const login = await agent().post('/api/v1/auth/login').send({
      email: user.email,
      password: 'Rahasia123',
    });
    const res = await agent()
      .post('/api/v1/auth/2fa/resend')
      .send({ challengeId: login.body.data.challengeId });
    expect(res.status).toBe(403);
  });

  it('me: tanpa token → 401; dengan token → profil', async () => {
    const denied = await agent().get('/api/v1/auth/me');
    expect(denied.status).toBe(401);
    const user = await makeUser('me');
    const verified = await loginAndVerify(user.email);
    const res = await agent()
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${verified.body.data.accessToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.email).toBe(user.email);
  });

  it('refresh: rotasi sekali pakai; token lama ditolak', async () => {
    const user = await makeUser('refresh');
    const verified = await loginAndVerify(user.email);
    const cookie = (verified.headers['set-cookie'] as unknown as string[])[0];
    const first = await agent().post('/api/v1/auth/refresh').set('Cookie', cookie);
    expect(first.status).toBe(200);
    expect(first.body.data.accessToken).toBeDefined();
    // Token lama sudah dirotasi → reuse ditolak.
    const reuse = await agent().post('/api/v1/auth/refresh').set('Cookie', cookie);
    expect(reuse.status).toBe(401);
  });

  it('logout: sesi dicabut, refresh berikutnya ditolak', async () => {
    const user = await makeUser('logout');
    const verified = await loginAndVerify(user.email);
    const cookie = (verified.headers['set-cookie'] as unknown as string[])[0];
    const out = await agent()
      .post('/api/v1/auth/logout')
      .set('Authorization', `Bearer ${verified.body.data.accessToken}`)
      .set('Cookie', cookie);
    expect(out.status).toBe(200);
    const again = await agent().post('/api/v1/auth/refresh').set('Cookie', cookie);
    expect(again.status).toBe(401);
  });

  it('session limit: login ke-4 mencabut sesi terlama', async () => {
    const user = await makeUser('limit');
    const tokens: string[] = [];
    for (let i = 0; i < 4; i++) {
      const verified = await loginAndVerify(user.email);
      tokens.push(verified.body.data.accessToken as string);
    }
    // Sesi pertama (terlama) sudah dicabut → me ditolak.
    const first = await agent()
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${tokens[0]}`);
    expect(first.status).toBe(401);
    const last = await agent()
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${tokens[3]}`);
    expect(last.status).toBe(200);
  });

  it('force logout: Superadmin mencabut sesi user lain', async () => {
    const admin = await makeUser('sa', { role: Role.SUPERADMIN });
    const victim = await makeUser('victim');
    const victimLogin = await loginAndVerify(victim.email);
    const victimSid = (
      await prisma.session.findMany({
        where: { userId: victim.id, revokedAt: null },
      })
    )[0].id;
    const adminLogin = await loginAndVerify(admin.email);
    const res = await agent()
      .delete(`/api/v1/auth/sessions/${victimSid}`)
      .set('Authorization', `Bearer ${adminLogin.body.data.accessToken}`);
    expect(res.status).toBe(200);
    const meVictim = await agent()
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${victimLogin.body.data.accessToken}`);
    expect(meVictim.status).toBe(401);
  });

  it('force logout: Taruna ditolak (403)', async () => {
    const a = await makeUser('f1');
    const b = await makeUser('f2');
    const loginA = await loginAndVerify(a.email);
    const sidB = (
      await prisma.session.findMany({
        where: { userId: b.id, revokedAt: null },
      })
    )[0]?.id;
    void sidB;
    const victim = await makeUser('f3');
    const victimLogin = await loginAndVerify(victim.email);
    void victimLogin;
    const res = await agent()
      .delete(`/api/v1/auth/sessions/${a.id}`)
      .set('Authorization', `Bearer ${loginA.body.data.accessToken}`);
    expect(res.status).toBe(403);
  });

  it('forgot: email tak dikenal tetap sukses (anti-enumerasi)', async () => {
    const res = await agent().post('/api/v1/auth/password/forgot').send({
      email: EMAIL('tidak-ada'),
    });
    expect(res.status).toBe(200);
    expect(res.body.data.sent).toBe(true);
  });

  it('reset: token sekali pakai 1 jam; pakai ulang ditolak', async () => {
    const user = await makeUser('reset');
    await agent().post('/api/v1/auth/password/forgot').send({
      email: user.email,
    });
    const tokenRow = await prisma.passwordResetToken.findFirstOrThrow({
      where: { userId: user.id, usedAt: null },
      orderBy: { createdAt: 'desc' },
    });
    // Ambil raw token dari fake email (URL reset?token=RAW).
    const sent = fakeEmail.sent.filter(
      (item) => item.kind === 'password-reset' && item.to === user.email,
    );
    const raw = sent[sent.length - 1].body.split('token=')[1];
    expect(raw).toBeDefined();
    void tokenRow;
    const okReset = await agent().post('/api/v1/auth/password/reset').send({
      token: raw,
      newPassword: 'Baru1234',
    });
    expect(okReset.status).toBe(200);
    const reuse = await agent().post('/api/v1/auth/password/reset').send({
      token: raw,
      newPassword: 'Lain1234',
    });
    expect(reuse.status).toBe(410);
    // Password baru bisa login.
    const login = await agent().post('/api/v1/auth/login').send({
      email: user.email,
      password: 'Baru1234',
    });
    expect(login.status).toBe(200);
  });

  it('email gagal 3x beruntun → akun dikunci + audit', async () => {
    const user = await makeUser('emailfail');
    fakeEmail.failNext = 3;
    for (let i = 0; i < 3; i++) {
      await agent().post('/api/v1/auth/login').send({
        email: user.email,
        password: 'Rahasia123',
      });
    }
    const row = await prisma.user.findUniqueOrThrow({
      where: { id: user.id },
    });
    expect(row.lockedUntil).not.toBeNull();
    const audit = await prisma.auditLog.findFirst({
      where: { action: 'auth.email_send_failed', actorId: user.id },
    });
    expect(audit).not.toBeNull();
  });
});
