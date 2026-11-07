import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import ExcelJS from 'exceljs';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';
import { FakeEmailService } from '../src/modules/notifications/fake-email.service';
import { AccountStatus, Role } from '@prisma/client';
import * as argon2 from 'argon2';

const EMAIL = (tag: string) => `t3-${tag}@contoh.id`;

describe('Tahap 3 users/cohorts/enrollment/impor (e2e)', () => {
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

  function xlsxBuffer(rows: Record<string, string>[]): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Taruna');
    sheet.columns = [
      'nama_lengkap',
      'email',
      'nomor_identitas',
      'cohort_kode',
      'telepon',
      'tanggal_lahir',
    ].map((header) => ({ header, key: header, width: 20 }));
    for (const row of rows) sheet.addRow(row);
    return workbook.xlsx.writeBuffer().then((buffer) => Buffer.from(buffer));
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

  it('daftar users: Admin bisa paginasi + filter; tanpa token 401', async () => {
    const denied = await agent().get('/api/v1/admin/users');
    expect(denied.status).toBe(401);
    const admin = await makeUser('admin', Role.ADMIN);
    const token = await loginAs(admin.email);
    const res = await agent()
      .get('/api/v1/admin/users?page=1&pageSize=5')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data).toBeDefined();
    expect(res.body.meta.pageSize).toBe(5);
  });

  it('Taruna tidak boleh membuka daftar users (403)', async () => {
    const taruna = await makeUser('t');
    const token = await loginAs(taruna.email);
    const res = await agent()
      .get('/api/v1/admin/users')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
  });

  it('verifikasi: Admin mengaktifkan Taruna PENDING; Mentor ditolak', async () => {
    const pending = await makeUser('pending', Role.TARUNA, AccountStatus.PENDING_VERIFICATION);
    const admin = await makeUser('vadmin', Role.ADMIN);
    const mentor = await makeUser('vmentor', Role.MENTOR);
    const adminToken = await loginAs(admin.email);
    const okRes = await agent()
      .post(`/api/v1/admin/users/${pending.id}/verify`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ verified: true });
    expect(okRes.status).toBe(200);
    expect(okRes.body.data.status).toBe('ACTIVE');
    const mentorToken = await loginAs(mentor.email);
    const denied = await agent()
      .post(`/api/v1/admin/users/${pending.id}/verify`)
      .set('Authorization', `Bearer ${mentorToken}`)
      .send({ verified: true });
    expect(denied.status).toBe(403);
  });

  it('role: Admin tidak boleh membuat Mentor; Superadmin boleh', async () => {
    const admin = await makeUser('cadmin', Role.ADMIN);
    const sa = await makeUser('csa', Role.SUPERADMIN);
    const adminToken = await loginAs(admin.email);
    const denied = await agent()
      .post('/api/v1/admin/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ email: EMAIL(`mentor-baru-${Date.now()}`), password: 'Rahasia123', role: 'MENTOR' });
    expect(denied.status).toBe(403);
    const saToken = await loginAs(sa.email);
    const created = await agent()
      .post('/api/v1/admin/users')
      .set('Authorization', `Bearer ${saToken}`)
      .send({ email: EMAIL(`mentor-ok-${Date.now()}`), password: 'Rahasia123', role: 'MENTOR' });
    expect(created.status).toBe(201);
    expect(created.body.data.role).toBe('MENTOR');
  });

  it('role: Superadmin tidak boleh mengubah role sendiri', async () => {
    const sa = await makeUser('selfsa', Role.SUPERADMIN);
    const token = await loginAs(sa.email);
    const res = await agent()
      .patch(`/api/v1/admin/users/${sa.id}/role`)
      .set('Authorization', `Bearer ${token}`)
      .send({ role: 'ADMIN' });
    expect(res.status).toBe(403);
  });

  it('hapus permanen: hanya Superadmin + tercatat di audit log', async () => {
    const sa = await makeUser('delsa', Role.SUPERADMIN);
    const admin = await makeUser('deladmin', Role.ADMIN);
    const victim = await makeUser('delvictim', Role.TARUNA);
    const saToken = await loginAs(sa.email);
    const adminToken = await loginAs(admin.email);
    // Admin ditolak (403) — aksi ini khusus Superadmin.
    const denied = await agent()
      .delete(`/api/v1/admin/users/${victim.id}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(denied.status).toBe(403);
    expect(await prisma.user.findUnique({ where: { id: victim.id } })).not.toBeNull();
    // Superadmin menghapus → baris hilang + sesi refresh dicabut.
    const session = await prisma.session.create({
      data: {
        userId: victim.id,
        refreshTokenHash: `hash-${Date.now()}`,
        expiresAt: new Date(Date.now() + 86_400_000),
      },
    });
    const removed = await agent()
      .delete(`/api/v1/admin/users/${victim.id}`)
      .set('Authorization', `Bearer ${saToken}`);
    expect(removed.status).toBe(200);
    expect(removed.body.data.deleted).toBe(true);
    expect(await prisma.user.findUnique({ where: { id: victim.id } })).toBeNull();
    expect(
      await prisma.session.findUnique({ where: { id: session.id } }),
    ).toBeNull();
    // Jejak audit tersimpan (tanpa data sensitif).
    const logged = await prisma.auditLog.findFirst({
      where: { action: 'user.deleted_permanently', targetId: victim.id },
      orderBy: { createdAt: 'desc' },
    });
    expect(logged).not.toBeNull();
    expect(logged?.actorId).toBe(sa.id);
    // Pengguna yang sudah tidak ada → 404.
    const missing = await agent()
      .delete(`/api/v1/admin/users/${victim.id}`)
      .set('Authorization', `Bearer ${saToken}`);
    expect(missing.status).toBe(404);
  });

  it('hapus permanen: Superadmin terakhir tidak boleh dihapus', async () => {
    // Uji "superadmin terakhir" harus lepas dari sisa data tes lain: akun
    // Superadmin lain diturunkan dulu ke ADMIN agar hanya tersisa satu.
    await prisma.user.updateMany({
      where: { role: Role.SUPERADMIN },
      data: { role: Role.ADMIN },
    });
    const sa = await makeUser('lastsa', Role.SUPERADMIN);
    const token = await loginAs(sa.email);
    const res = await agent()
      .delete(`/api/v1/admin/users/${sa.id}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
    expect(res.body.error?.code).toBe('FORBIDDEN');
    // Akun tetap ada (gagal aman — tidak ada penghapusan sebagian).
    expect(await prisma.user.findUnique({ where: { id: sa.id } })).not.toBeNull();
    expect(
      await prisma.auditLog.findFirst({
        where: { action: 'user.deleted_permanently', targetId: sa.id },
      }),
    ).toBeNull();
  });

  it('hapus permanen: Superadmin boleh menghapus dirinya sendiri bila ada Superadmin lain', async () => {
    const sa = await makeUser('selfdel', Role.SUPERADMIN);
    const other = await makeUser('selfdel2', Role.SUPERADMIN);
    const token = await loginAs(sa.email);
    const res = await agent()
      .delete(`/api/v1/admin/users/${sa.id}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(await prisma.user.findUnique({ where: { id: sa.id } })).toBeNull();
    // Superadmin lain tidak terpengaruh, dan jejak audit tetap tersimpan
    // setelah baris aktor dihapus. `audit_logs.actor_id` memakai
    // ON DELETE SET NULL, jadi identitas aktor dibaca dari metadata.
    expect(
      await prisma.user.findUnique({ where: { id: other.id } }),
    ).not.toBeNull();
    const logged = await prisma.auditLog.findFirst({
      where: { action: 'user.deleted_permanently', targetId: sa.id },
      orderBy: { createdAt: 'desc' },
    });
    expect(logged?.actorId).toBeNull();
    expect(logged?.metadata).toMatchObject({
      role: 'SUPERADMIN',
      actorEmail: sa.email,
      actorRole: Role.SUPERADMIN,
    });
  });

  it('cohort: CRUD + enroll + my-enrollments milik sendiri', async () => {
    const admin = await makeUser('coadmin', Role.ADMIN);
    const token = await loginAs(admin.email);
    const created = await agent()
      .post('/api/v1/cohorts')
      .set('Authorization', `Bearer ${token}`)
      .send({ code: `ANGK-${Date.now()}`, name: 'Angkatan Test' });
    expect(created.status).toBe(201);
    const taruna = await makeUser('cot');
    const enrolled = await agent()
      .post(`/api/v1/cohorts/${created.body.data.id}/enrollments`)
      .set('Authorization', `Bearer ${token}`)
      .send({ userId: taruna.id });
    expect(enrolled.status).toBe(201);
    const tarunaToken = await loginAs(taruna.email);
    const mine = await agent()
      .get('/api/v1/me/enrollments')
      .set('Authorization', `Bearer ${tarunaToken}`);
    expect(mine.status).toBe(200);
    expect(mine.body.data.length).toBeGreaterThanOrEqual(1);
    // Taruna tidak bisa enroll diri sendiri / orang lain.
    const selfEnroll = await agent()
      .post(`/api/v1/cohorts/${created.body.data.id}/enrollments`)
      .set('Authorization', `Bearer ${tarunaToken}`)
      .send({ userId: taruna.id });
    expect(selfEnroll.status).toBe(403);
  });

  it('impor: berhasil sebagian + unduh log eror + template', async () => {
    const admin = await makeUser('impadmin', Role.ADMIN);
    const token = await loginAs(admin.email);
    const cohortCode = `IMP-${Date.now()}`;
    await agent()
      .post('/api/v1/cohorts')
      .set('Authorization', `Bearer ${token}`)
      .send({ code: cohortCode, name: 'Impor Test' });
    const duplikat = await makeUser('duplikat');
    const uniq = Date.now();
    const buffer = await xlsxBuffer([
      {
        nama_lengkap: 'Valid Satu',
        email: EMAIL(`valid1-${uniq}`),
        nomor_identitas: 'ID001',
        cohort_kode: cohortCode,
        telepon: '0812000001',
        tanggal_lahir: '2005-02-01',
      },
      {
        nama_lengkap: '',
        email: 'bukan-email',
        nomor_identitas: '',
        cohort_kode: 'TIDAK-ADA',
        telepon: 'xx',
        tanggal_lahir: '01-02-2005',
      },
      {
        nama_lengkap: 'Duplikat',
        email: duplikat.email,
        nomor_identitas: 'ID003',
        cohort_kode: cohortCode,
        telepon: '',
        tanggal_lahir: '',
      },
    ]);
    const res = await agent()
      .post('/api/v1/admin/users/import')
      .set('Authorization', `Bearer ${token}`)
      .attach('file', buffer, 'impor.xlsx');
    expect(res.status).toBe(200);
    expect(res.body.data.totalRows).toBe(3);
    expect(res.body.data.successCount).toBe(1);
    expect(res.body.data.failedCount).toBe(2);
    expect(res.body.data.rows).toHaveLength(3);
    const log = await agent()
      .get(`/api/v1/admin/users/imports/${res.body.data.importId}/errors`)
      .set('Authorization', `Bearer ${token}`);
    expect(log.status).toBe(200);
    expect(log.headers['content-type']).toContain('spreadsheetml');
    const template = await agent()
      .get('/api/v1/admin/users/imports/template')
      .set('Authorization', `Bearer ${token}`);
    expect(template.status).toBe(200);
    expect(template.headers['content-type']).toContain('spreadsheetml');
    // Baris valid masuk + ter-enroll ke cohort impor.
    const validUser = await prisma.user.findUnique({
      where: { email: res.body.data.rows[0].email },
    });
    expect(validUser?.role).toBe('TARUNA');
    const enrollment = await prisma.enrollment.findFirst({
      where: { userId: validUser!.id },
    });
    expect(enrollment).not.toBeNull();
  });

  it('impor: di atas 500 baris ditolak', async () => {
    const admin = await makeUser('imp500', Role.ADMIN);
    const token = await loginAs(admin.email);
    const rows = Array.from({ length: 501 }, (_, index) => ({
      nama_lengkap: `Nama ${index}`,
      email: EMAIL(`bulk${index}`),
      nomor_identitas: `ID${index}`,
      cohort_kode: 'APAPUN',
      telepon: '',
      tanggal_lahir: '',
    }));
    const buffer = await xlsxBuffer(rows);
    const res = await agent()
      .post('/api/v1/admin/users/import')
      .set('Authorization', `Bearer ${token}`)
      .attach('file', buffer, 'bulk.xlsx');
    expect(res.status).toBe(400);
    expect(res.body.error.message).toMatch(/500/);
  });

  it('impor: berkas di atas 5 MB ditolak 413', async () => {
    const admin = await makeUser('imp413', Role.ADMIN);
    const token = await loginAs(admin.email);
    // Batas ukuran multer (MAX_FILE_BYTES) menolak lebih dulu → 413.
    const res = await agent()
      .post('/api/v1/admin/users/import')
      .set('Authorization', `Bearer ${token}`)
      .attach(
        'file',
        Buffer.alloc(6 * 1024 * 1024, 0x41),
        {
          filename: 'besar.xlsx',
          contentType:
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        },
      );
    expect(res.status).toBe(413);
  });

  it('impor: file non-xlsx ditolak 415', async () => {
    const admin = await makeUser('impcsv', Role.ADMIN);
    const token = await loginAs(admin.email);
    const res = await agent()
      .post('/api/v1/admin/users/import')
      .set('Authorization', `Bearer ${token}`)
      .attach('file', Buffer.from('a,b,c'), 'data.csv');
    expect(res.status).toBe(415);
  });

  it('impor: .xlsx palsu (mimetype & ekstensi beda) ditolak 415', async () => {
    // Pengecekan tipe memakai AND: mimetype harus xlsx DAN ekstensi harus
    // .xlsx. Berkas lain yang diubah namanya menjadi .xlsx tetap ditolak.
    const admin = await makeUser('impfake', Role.ADMIN);
    const token = await loginAs(admin.email);
    // supertest menentukan mimetype dari nama, jadi isi .xlsx palsu ini
    // dikirim dengan mimetype text/csv.
    const renamed = await agent()
      .post('/api/v1/admin/users/import')
      .set('Authorization', `Bearer ${token}`)
      .set('Content-Type', 'multipart/form-data')
      .attach('file', Buffer.from('a,b,c'), {
        filename: 'palsu.xlsx',
        contentType: 'text/csv',
      });
    expect(renamed.status).toBe(415);
    expect(renamed.body.error.message).toMatch(/\.xlsx/);
  });
});
