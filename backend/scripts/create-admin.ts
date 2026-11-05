// Bootstrap akun admin — dijalankan MANUAL, tidak pernah otomatis.
// Dipakai untuk membuat akun pertama (SUPERADMIN) di environment dev/staging
// sebelum ada Superadmin lain yang bisa memakai POST /admin/users.
//
// Contoh:
//   npm run admin:create -- --email admin@spli.local --password 'Rahasia123'
//   ADMIN_EMAIL=admin@spli.local ADMIN_PASSWORD='Rahasia123' npm run admin:create
//
// Password TIDAK pernah ditulis ke log maupun di-hardcode di file ini.
import { AccountStatus, PrismaClient, Role } from '@prisma/client';
import * as argon2 from 'argon2';

const MIN_PASSWORD_LENGTH = 8;

function arg(name: string): string | undefined {
  const index = process.argv.indexOf(`--${name}`);
  return index !== -1 ? process.argv[index + 1] : undefined;
}

function fail(message: string): never {
  console.error(`[create-admin] ${message}`);
  process.exit(1);
}

async function main(): Promise<void> {
  const email = (arg('email') ?? process.env.ADMIN_EMAIL ?? '').trim().toLowerCase();
  const password = arg('password') ?? process.env.ADMIN_PASSWORD ?? '';
  const roleArg = (arg('role') ?? process.env.ADMIN_ROLE ?? 'SUPERADMIN').toUpperCase();

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    fail('Email wajib dan harus valid: --email admin@contoh.com');
  }
  if (!(Object.values(Role) as string[]).includes(roleArg)) {
    fail(`Role tidak dikenal: ${roleArg}. Pilihan: ${Object.values(Role).join(', ')}`);
  }
  if (
    password.length < MIN_PASSWORD_LENGTH ||
    !/[A-Za-z]/.test(password) ||
    !/[0-9]/.test(password)
  ) {
    fail('Password minimal 8 karakter serta mengandung huruf dan angka.');
  }

  const role = roleArg as Role;
  const prisma = new PrismaClient();
  try {
    const passwordHash = await argon2.hash(password, { type: argon2.argon2id });
    const user = await prisma.user.upsert({
      where: { email },
      update: {
        passwordHash,
        role,
        status: AccountStatus.ACTIVE,
        verifiedAt: new Date(),
        failedLoginCount: 0,
        failedEmailCount: 0,
        lockedUntil: null,
      },
      create: {
        email,
        passwordHash,
        role,
        status: AccountStatus.ACTIVE,
        verifiedAt: new Date(),
      },
    });
    console.log(`[create-admin] akun siap: ${user.email} (role ${user.role}, status ${user.status})`);
    console.log(`[create-admin] id: ${user.id}`);
  } finally {
    await prisma.$disconnect();
  }
}

void main().catch((error: unknown) => {
  fail(error instanceof Error ? error.message : String(error));
});
