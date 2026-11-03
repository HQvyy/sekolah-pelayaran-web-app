import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

// Wrapper Prisma agar lifecycle koneksi mengikuti modul NestJS.
// Skema + migrasi: lihat backend/prisma/schema.prisma (code-first, prisma migrate).
@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  async onModuleInit(): Promise<void> {
    // Koneksi dibuka lazy oleh Prisma; panggil $connect eksplisit agar
    // /ready dapat melaporkan status database secara akurat.
    if (process.env.DATABASE_URL) {
      await this.$connect();
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }

  async ping(): Promise<boolean> {
    try {
      await this.$queryRaw`SELECT 1`;
      return true;
    } catch {
      return false;
    }
  }
}
