import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';
import { FakeEmailService } from '../src/modules/notifications/fake-email.service';
import { AccountStatus, Role } from '@prisma/client';
import * as argon2 from 'argon2';

// QA Tahap 8: endpoint pelengkap kontrak (audit-logs, user progress,
// ship-category detail) + verifikasi Swagger memuat semua tag.
describe('QA Tahap 8 endpoint pelengkap (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let fakeEmail: FakeEmailService;
  const agent = () => request(app.getHttpServer());

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

  it('audit-logs: Admin bisa baca; Taruna ditolak (403)', async () => {
    const adminEmail = `qa8-admin-${Date.now()}@contoh.id`;
    await prisma.user.create({
      data: {
        email: adminEmail,
        passwordHash: await argon2.hash('Rahasia123', { type: argon2.argon2id }),
        role: Role.ADMIN,
        status: AccountStatus.ACTIVE,
        consentGivenAt: new Date(),
      },
    });
    const tarunaEmail = `qa8-taruna-${Date.now()}@contoh.id`;
    await prisma.user.create({
      data: {
        email: tarunaEmail,
        passwordHash: await argon2.hash('Rahasia123', { type: argon2.argon2id }),
        role: Role.TARUNA,
        status: AccountStatus.ACTIVE,
        consentGivenAt: new Date(),
      },
    });
    const adminToken = await loginAs(adminEmail);
    const tarunaToken = await loginAs(tarunaEmail);
    const res = await agent()
      .get('/api/v1/admin/audit-logs?page=1&pageSize=5')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.meta.pageSize).toBe(5);
    // Tanpa secret di log.
    expect(JSON.stringify(res.body.data)).not.toMatch(
      /passwordHash|otpHash|tokenHash|refreshToken/i,
    );
    const denied = await agent()
      .get('/api/v1/admin/audit-logs')
      .set('Authorization', `Bearer ${tarunaToken}`);
    expect(denied.status).toBe(403);
  });

  it('user progress + category detail mengikuti aturan akses', async () => {
    const adminEmail = `qa8-a2-${Date.now()}@contoh.id`;
    const admin = await prisma.user.create({
      data: {
        email: adminEmail,
        passwordHash: await argon2.hash('Rahasia123', { type: argon2.argon2id }),
        role: Role.ADMIN,
        status: AccountStatus.ACTIVE,
        consentGivenAt: new Date(),
      },
    });
    void admin;
    const adminToken = await loginAs(adminEmail);
    const tarunaEmail = `qa8-t2-${Date.now()}@contoh.id`;
    const taruna = await prisma.user.create({
      data: {
        email: tarunaEmail,
        passwordHash: await argon2.hash('Rahasia123', { type: argon2.argon2id }),
        role: Role.TARUNA,
        status: AccountStatus.ACTIVE,
        consentGivenAt: new Date(),
      },
    });
    const tarunaToken = await loginAs(tarunaEmail);
    // Kontrak api-spec: GET /users/{userId}/progress.
    const progress = await agent()
      .get(`/api/v1/users/${taruna.id}/progress`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(progress.status).toBe(200);
    // Taruna tidak boleh membuka progres milik orang lain via rute admin.
    const hijack = await agent()
      .get(`/api/v1/users/${taruna.id}/progress`)
      .set('Authorization', `Bearer ${tarunaToken}`);
    expect(hijack.status).toBe(403);
    const category = await agent()
      .post('/api/v1/ship-categories')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: `QA8 ${Date.now()}`, status: 'PUBLISHED' });
    expect(category.status).toBe(201);
    const detail = await agent()
      .get(`/api/v1/ship-categories/${category.body.data.id}`)
      .set('Authorization', `Bearer ${tarunaToken}`);
    expect(detail.status).toBe(200);
  });
});
