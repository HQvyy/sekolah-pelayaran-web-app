// Reset password semua akun demo di database dev — dijalankan MANUAL.
// Dipakai sebelum UAT manual agar login tidak terhalang lockout/OTP lama.
// TIDAK menghapus data lain (kursus, attempt, sertifikat, tiket tetap utuh).
//
// Contoh:
//   npm run reset:demo-passwords -- --password 'UatSpli2026'
//   RESET_PASSWORD='UatSpli2026' npm run reset:demo-passwords
//
// Password TIDAK ditulis ke log dan tidak di-hardcode di file ini.
// Hanya targetkan spli_dev; skrip menolak database selain spli_dev.
import { AccountStatus, PrismaClient, Role } from '@prisma/client';
import * as argon2 from 'argon2';

const MIN_PASSWORD_LENGTH = 8;

function arg(name: string): string | undefined {
  const index = process.argv.indexOf(`--${name}`);
  return index !== -1 ? process.argv[index + 1] : undefined;
}

function fail(message: string): never {
  console.error(`[reset-passwords] ${message}`);
  process.exit(1);
}

// Hanya email demo internal; email pribadi pengguna nyata tidak disentuh.
const DEMO_EMAILS = [
  'admin@spli.local',
  'mentor@spli.local',
  'taruna@spli.local',
  'taruna2@spli.local',
  'taruna.pending@spli.local',
];

async function main(): Promise<void> {
  const password = arg('password') ?? process.env.RESET_PASSWORD ?? '';
  if (
    password.length < MIN_PASSWORD_LENGTH ||
    !/[A-Za-z]/.test(password) ||
    !/[0-9]/.test(password)
  ) {
    fail('Password minimal 8 karakter serta mengandung huruf dan angka.');
  }

  const url = process.env.DATABASE_URL ?? '';
  if (!/spli_dev/.test(url)) {
    fail(
      `DATABASE_URL harus mengarah ke spli_dev (dapat: ${url || 'kosong'}). ` +
        'Skrip ini hanya untuk database dev.',
    );
  }

  const prisma = new PrismaClient();
  try {
    const passwordHash = await argon2.hash(password, { type: argon2.argon2id });
    for (const email of DEMO_EMAILS) {
      const existing = await prisma.user.findUnique({ where: { email } });
      if (!existing) {
        console.log(`[reset-passwords] lewati ${email} (tidak ada)`);
        continue;
      }
      await prisma.user.update({
        where: { email },
        data: {
          passwordHash,
          // Bersihkan lockout agar login tidak terhalang.
          failedLoginCount: 0,
          failedEmailCount: 0,
          lockedUntil: null,
          // Akun demo yang dipakai uji admin harus bisa langsung aktif.
          ...(existing.status === AccountStatus.PENDING_VERIFICATION
            ? {
                status: AccountStatus.ACTIVE,
                verifiedAt: existing.verifiedAt ?? new Date(),
              }
            : {}),
        },
      });
      console.log(`[reset-passwords] diperbarui: ${email} (${existing.role})`);
    }
    // Buang sesi & challenge OTP lama agar tidak ada login setengah jadi.
    const users = await prisma.user.findMany({
      where: { email: { in: DEMO_EMAILS } },
      select: { id: true },
    });
    const ids = users.map((user) => user.id);
    if (ids.length > 0) {
      const sessions = await prisma.session.deleteMany({ where: { userId: { in: ids } } });
      const otps = await prisma.otpChallenge.deleteMany({ where: { userId: { in: ids } } });
      console.log(
        `[reset-passwords] sesi dihapus: ${sessions.count}, challenge OTP dihapus: ${otps.count}`,
      );
    }
    console.log('[reset-passwords] selesai.');
  } finally {
    await prisma.$disconnect();
  }
}

void main().catch((error: unknown) => {
  fail(error instanceof Error ? error.message : String(error));
});
