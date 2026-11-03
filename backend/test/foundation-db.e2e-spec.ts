import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';

// E2E dengan DATABASE_URL nyata: /ready harus melaporkan ready + database up.
describe('Fondasi API dengan database (e2e)', () => {
  let app: INestApplication;
  const databaseUrl = process.env.DATABASE_URL ?? '';

  beforeAll(async () => {
    if (!databaseUrl) {
       
      console.warn('DATABASE_URL kosong — e2e database dilewati.');
      return;
    }
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
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
  });

  afterAll(async () => {
    await app?.close();
  });

  it('GET /api/v1/ready melaporkan ready bila database terjangkau', async () => {
    if (!app) return;
    const res = await request(app.getHttpServer()).get('/api/v1/ready');
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('ready');
    expect(res.body.data.database).toBe('up');
  });
});
