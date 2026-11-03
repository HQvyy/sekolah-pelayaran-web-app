import { Controller, Get, NotFoundException, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../../database/prisma.service';
import { CurrentUser, RequestUser } from '../auth/current-user.decorator';
import { ok } from '../../common/envelope';

@ApiTags('notifications')
@ApiBearerAuth()
@Controller('me/notifications')
export class MyNotificationsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @ApiOperation({ summary: 'Daftar notifikasi in-app' })
  async list(@CurrentUser() user: RequestUser) {
    const rows = await this.prisma.notification.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    return ok(rows);
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Tandai notifikasi sudah dibaca (milik sendiri)' })
  async read(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    const row = await this.prisma.notification.findUnique({ where: { id } });
    if (!row || row.userId !== user.id) {
      throw new NotFoundException('Notifikasi tidak ditemukan.');
    }
    const updated = await this.prisma.notification.update({
      where: { id },
      data: { readAt: new Date() },
    });
    return ok(updated);
  }

  @Post('read-all')
  @ApiOperation({ summary: 'Tandai seluruh notifikasi sudah dibaca' })
  async readAll(@CurrentUser() user: RequestUser) {
    const result = await this.prisma.notification.updateMany({
      where: { userId: user.id, readAt: null },
      data: { readAt: new Date() },
    });
    return ok({ marked: result.count });
  }
}
