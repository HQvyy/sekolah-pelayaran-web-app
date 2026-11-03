import { PrismaService } from './prisma.service';

describe('PrismaService (butuh DATABASE_URL valid)', () => {
  const databaseUrl = process.env.DATABASE_URL ?? '';
  const canConnect = databaseUrl.length > 0;

  it('ping() mengembalikan true saat database terjangkau', async () => {
    if (!canConnect) {
       
      console.warn('DATABASE_URL kosong — test koneksi dilewati.');
      return;
    }
    const prisma = new PrismaService();
    await expect(prisma.ping()).resolves.toBe(true);
    await prisma.$disconnect();
  });
});
