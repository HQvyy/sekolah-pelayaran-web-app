import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';
import { FakeEmailService } from '../src/modules/notifications/fake-email.service';
import { AccountStatus, Role } from '@prisma/client';
import * as argon2 from 'argon2';

const EMAIL = (tag: string) => `t4-${tag}@contoh.id`;

function pngBuffer(width: number, height: number): Buffer {
  const buffer = Buffer.alloc(33);
  buffer.writeUInt32BE(width, 16);
  buffer.writeUInt32BE(height, 20);
  const signature = [137, 80, 78, 71, 13, 10, 26, 10];
  signature.forEach((value, index) => {
    buffer[index] = value;
  });
  return buffer;
}

describe('Tahap 4 konten + Bunny (e2e)', () => {
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

  async function seedPublishedChain() {
    const admin = await makeUser('admin', Role.ADMIN);
    const token = await loginAs(admin.email);
    const category = (
      await agent().post('/api/v1/ship-categories').set('Authorization', `Bearer ${token}`).send({
        name: `Bulk Carrier ${Date.now()}`,
        status: 'PUBLISHED',
      })
    ).body.data;
    const cohort = await prisma.cohort.create({
      data: { code: `T4-${Date.now()}`, name: 'Cohort T4' },
    });
    const course = (
      await agent().post('/api/v1/courses').set('Authorization', `Bearer ${token}`).send({
        categoryId: category.id,
        cohortId: cohort.id,
        title: 'Dasar Pelayaran',
        status: 'PUBLISHED',
      })
    ).body.data;
    const chapter = (
      await agent()
        .post(`/api/v1/courses/${course.id}/chapters`)
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'Bab 1', status: 'PUBLISHED' })
    ).body.data;
    const material = (
      await agent()
        .post(`/api/v1/chapters/${chapter.id}/materials`)
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'Video 1', status: 'PUBLISHED' })
    ).body.data;
    return { admin, token, category, cohort, course, chapter, material };
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

  it('manager CRUD kategori; Taruna tidak boleh membuat (403)', async () => {
    const admin = await makeUser('cat-admin', Role.ADMIN);
    const taruna = await makeUser('cat-taruna');
    const adminToken = await loginAs(admin.email);
    const tarunaToken = await loginAs(taruna.email);
    const created = await agent()
      .post('/api/v1/ship-categories')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: `Tanker ${Date.now()}`, status: 'PUBLISHED' });
    expect(created.status).toBe(201);
    const denied = await agent()
      .post('/api/v1/ship-categories')
      .set('Authorization', `Bearer ${tarunaToken}`)
      .send({ name: 'Nakal', status: 'PUBLISHED' });
    expect(denied.status).toBe(403);
  });

  it('konten DRAFT tidak terlihat Taruna; lintas enrollment 404', async () => {
    const seed = await seedPublishedChain();
    const taruna = await makeUser('nolink');
    const tarunaToken = await loginAs(taruna.email);
    // Belum enroll → daftar kursus kosong, detail 404.
    const empty = await agent()
      .get('/api/v1/courses')
      .set('Authorization', `Bearer ${tarunaToken}`);
    expect(empty.body.data).toHaveLength(0);
    const notFound = await agent()
      .get(`/api/v1/courses/${seed.course.id}`)
      .set('Authorization', `Bearer ${tarunaToken}`);
    expect(notFound.status).toBe(404);
    // Enroll → bisa membaca rantai penuh.
    await prisma.enrollment.create({
      data: { userId: taruna.id, cohortId: seed.cohort.id },
    });
    const visible = await agent()
      .get(`/api/v1/courses/${seed.course.id}`)
      .set('Authorization', `Bearer ${tarunaToken}`);
    expect(visible.status).toBe(200);
    // Arsipkan kursus → Taruna kehilangan akses (404).
    await agent()
      .patch(`/api/v1/courses/${seed.course.id}`)
      .set('Authorization', `Bearer ${seed.token}`)
      .send({ status: 'ARCHIVED' });
    const gone = await agent()
      .get(`/api/v1/courses/${seed.course.id}`)
      .set('Authorization', `Bearer ${tarunaToken}`);
    expect(gone.status).toBe(404);
  });

  it('playback: butuh enrollment + video READY; token fake jelas penanda', async () => {
    const seed = await seedPublishedChain();
    const createRes = await agent()
      .post(`/api/v1/materials/${seed.material.id}/videos`)
      .set('Authorization', `Bearer ${seed.token}`)
      .send({ title: 'Klip 1' });
    const video = createRes.body.data;
    // Belum READY → 409 walau manager.
    const notReady = await agent()
      .post(`/api/v1/videos/${video.id}/playback-token`)
      .set('Authorization', `Bearer ${seed.token}`);
    expect(notReady.status).toBe(409);
    await prisma.video.update({
      where: { id: video.id },
      data: { status: 'READY' },
    });
    const taruna = await makeUser('play');
    const tarunaToken = await loginAs(taruna.email);
    // Tanpa enrollment → 404 (disamarkan).
    const noEnroll = await agent()
      .post(`/api/v1/videos/${video.id}/playback-token`)
      .set('Authorization', `Bearer ${tarunaToken}`);
    expect(noEnroll.status).toBe(404);
    await prisma.enrollment.create({
      data: { userId: taruna.id, cohortId: seed.cohort.id },
    });
    const granted = await agent()
      .post(`/api/v1/videos/${video.id}/playback-token`)
      .set('Authorization', `Bearer ${tarunaToken}`);
    expect(granted.status).toBe(201);
    expect(granted.body.data.playbackToken).toMatch(/^FAKE-PLAYBACK-/);
    expect(granted.body.data.scanStatus).toBe('PENDING_PROVIDER');
  });

  it('thumbnail: valid PNG lolos; GIF ditolak; oversize ditolak', async () => {
    const seed = await seedPublishedChain();
    const valid = await agent()
      .post(`/api/v1/materials/${seed.material.id}/thumbnail`)
      .set('Authorization', `Bearer ${seed.token}`)
      .attach('file', pngBuffer(1280, 720), 'thumb.png');
    expect(valid.status).toBe(200);
    expect(valid.body.data.width).toBe(1280);
    const gif = await agent()
      .post(`/api/v1/materials/${seed.material.id}/thumbnail`)
      .set('Authorization', `Bearer ${seed.token}`)
      .attach('file', Buffer.from('GIF89a'), 'thumb.gif');
    expect(gif.status).toBe(400);
    const huge = await agent()
      .post(`/api/v1/materials/${seed.material.id}/thumbnail`)
      .set('Authorization', `Bearer ${seed.token}`)
      .attach('file', Buffer.alloc(3 * 1024 * 1024, 1), 'besar.png');
    expect(huge.status).toBe(413);
  });

  it('provider belum dikonfigurasi → gagal aman 503 (bukan token palsu)', async () => {
    const { BunnyService } = await import('../src/modules/videos/bunny.service');
    const { FakeBunnyProvider } = await import(
      '../src/modules/videos/fake-bunny.provider'
    );
    // Simulasi produksi tanpa kredensial: fake mati, kredensial kosong.
    const stubConfig = {
      get: (key: string) => {
        if (key === 'BUNNY_USE_FAKE') return 'false';
        return '';
      },
    };
    const service = new BunnyService(
      stubConfig as unknown as import('@nestjs/config').ConfigService,
      new FakeBunnyProvider(),
    );
    expect(service.isConfigured).toBe(false);
    await expect(service.signPlayback('user-1', 'video-1', 60)).rejects.toMatchObject({
      status: 503,
    });
    await expect(service.createReference('Judul')).rejects.toMatchObject({
      status: 503,
    });
  });
});
