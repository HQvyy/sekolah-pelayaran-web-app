import { Controller, Get, HttpCode, ServiceUnavailableException } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../database/prisma.service';
import { ok } from '../common/envelope';
import { Public } from '../modules/auth/public.decorator';

// Readiness: siap menerima traffic bila database terjangkau.
// Publik agar orchestrator bisa memeriksa; respons minimal tanpa secret.
// Bila DATABASE_URL belum dikonfigurasi (dev/test tanpa DB), status
// dilaporkan apa adanya tanpa membocorkan detail koneksi.
@Public()
@ApiTags('operational')
@Controller()
export class ReadyController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('ready')
  @HttpCode(200)
  @ApiOperation({ summary: 'Readiness termasuk koneksi database' })
  async ready() {
    const databaseConfigured = Boolean(process.env.DATABASE_URL);
    const databaseReachable = databaseConfigured
      ? await this.prisma.ping()
      : false;
    if (databaseConfigured && !databaseReachable) {
      throw new ServiceUnavailableException(
        'Database belum dapat dijangkau.',
      );
    }
    return ok({
      status: databaseConfigured ? 'ready' : 'degraded',
      database: databaseConfigured
        ? databaseReachable
          ? 'up'
          : 'down'
        : 'not-configured',
      time: new Date().toISOString(),
    });
  }
}
