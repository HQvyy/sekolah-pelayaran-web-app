import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Request } from 'express';
import { EnrollmentStatus } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';

// Guard fondasi Tahap 3: memastikan Taruna memiliki enrollment AKTIF.
// Dipakai tahap berikutnya (materi, Live Lesson, assessment) sebagai dasar
// otorisasi akses. Bukan guard global — dipasang per endpoint yang butuh.
@Injectable()
export class EnrollmentGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request>();
    const user = (req as Request & { user?: { id?: string; role?: string } })
      .user;
    // Hanya Taruna yang dicek enrollment; role lain lewat (otorisasi
    // assignment/peran ditangani guard masing-masing domain).
    if (!user?.id || user.role !== 'TARUNA') return true;
    const cohortId =
      (req.params as Record<string, string>)?.cohortId ??
      (req.query as Record<string, string>)?.cohortId;
    const where: { userId: string; status: EnrollmentStatus; cohortId?: string } = {
      userId: user.id,
      status: EnrollmentStatus.ACTIVE,
    };
    if (cohortId) where.cohortId = cohortId;
    const count = await this.prisma.enrollment.count({ where });
    if (count === 0) {
      throw new ForbiddenException('Tidak memiliki enrollment aktif.');
    }
    return true;
  }
}
