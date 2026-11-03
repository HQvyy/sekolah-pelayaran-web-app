import {
  Controller,
  Get,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { Roles } from '../auth/roles.decorator';
import { paginated } from '../../common/envelope';

// Audit log: read-only untuk Admin/Superadmin. Tanpa secret/kredensial/token
// (audit mencatat aksi + id + metadata non-sensitif saja).
@ApiTags('admin-audit')
@ApiBearerAuth()
@Controller('admin/audit-logs')
export class AuditLogsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @Roles(Role.SUPERADMIN, Role.ADMIN)
  @ApiOperation({ summary: 'Cari log aktivitas penting' })
  async list(
    @Query('action') action?: string,
    @Query('page') pageRaw?: string,
    @Query('pageSize') pageSizeRaw?: string,
  ) {
    const page = Math.max(1, Number(pageRaw ?? 1) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(pageSizeRaw ?? 20) || 20));
    const where = action ? { action } : {};
    const [totalItems, rows] = await Promise.all([
      this.prisma.auditLog.count({ where }),
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);
    return paginated(rows, page, pageSize, totalItems);
  }
}
