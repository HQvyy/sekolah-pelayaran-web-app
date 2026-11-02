import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EnrollmentStatus, Role } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { USER_AUDIT_ACTIONS } from '../users/users.rules';

@Injectable()
export class CohortsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async list() {
    return this.prisma.cohort.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async create(code: string, name: string, description: string | undefined, actorId: string) {
    const existing = await this.prisma.cohort.findUnique({ where: { code } });
    if (existing) throw new ConflictException('Kode angkatan sudah dipakai.');
    const cohort = await this.prisma.cohort.create({
      data: { code, name, description },
    });
    await this.audit.record(USER_AUDIT_ACTIONS.COHORT_CREATED, {
      actorId,
      targetId: cohort.id,
      metadata: { code },
    });
    return cohort;
  }

  async detail(cohortId: string) {
    const cohort = await this.prisma.cohort.findUnique({
      where: { id: cohortId },
    });
    if (!cohort) throw new NotFoundException('Angkatan tidak ditemukan.');
    return cohort;
  }

  async update(
    cohortId: string,
    data: { name?: string; description?: string; isActive?: boolean },
    actorId: string,
  ) {
    await this.detail(cohortId);
    const updated = await this.prisma.cohort.update({
      where: { id: cohortId },
      data,
    });
    const action = data.isActive === false
      ? USER_AUDIT_ACTIONS.COHORT_DEACTIVATED
      : USER_AUDIT_ACTIONS.COHORT_UPDATED;
    await this.audit.record(action, { actorId, targetId: cohortId });
    return updated;
  }

  // Nonaktifkan (soft): cohort dengan enrollment aktif tidak bisa dinonaktifkan
  // sebelum enrollment dipindahkan/dinonaktifkan — mencegah yatim.
  async deactivate(cohortId: string, actorId: string) {
    const active = await this.prisma.enrollment.count({
      where: { cohortId, status: EnrollmentStatus.ACTIVE },
    });
    if (active > 0) {
      throw new ConflictException(
        `Masih ada ${active} enrollment aktif di angkatan ini.`,
      );
    }
    return this.update(cohortId, { isActive: false }, actorId);
  }

  async listEnrollments(cohortId: string) {
    await this.detail(cohortId);
    return this.prisma.enrollment.findMany({
      where: { cohortId },
      include: {
        user: { select: { id: true, email: true, role: true, status: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // Hanya Taruna ACTIVE yang bisa di-enroll; duplikat (aktif) ditolak.
  // Re-enroll setelah INACTIVE = aktifkan kembali (bukan duplikat baru).
  async enroll(cohortId: string, userId: string, actorId: string) {
    await this.detail(cohortId);
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user) throw new NotFoundException('Pengguna tidak ditemukan.');
    if (user.role !== Role.TARUNA) {
      throw new ForbiddenException('Hanya Taruna yang bisa di-enroll.');
    }
    const existing = await this.prisma.enrollment.findUnique({
      where: { userId_cohortId: { userId, cohortId } },
    });
    if (existing?.status === EnrollmentStatus.ACTIVE) {
      throw new ConflictException('Taruna sudah ter-enroll aktif.');
    }
    const enrollment = existing
      ? await this.prisma.enrollment.update({
          where: { id: existing.id },
          data: { status: EnrollmentStatus.ACTIVE },
        })
      : await this.prisma.enrollment.create({
          data: { userId, cohortId },
        });
    await this.audit.record(USER_AUDIT_ACTIONS.ENROLLMENT_CREATED, {
      actorId,
      targetId: enrollment.id,
      metadata: { userId, cohortId },
    });
    return enrollment;
  }

  async unenroll(cohortId: string, enrollmentId: string, actorId: string) {
    const enrollment = await this.prisma.enrollment.findUnique({
      where: { id: enrollmentId },
    });
    if (!enrollment || enrollment.cohortId !== cohortId) {
      throw new NotFoundException('Enrollment tidak ditemukan.');
    }
    const updated = await this.prisma.enrollment.update({
      where: { id: enrollmentId },
      data: { status: EnrollmentStatus.INACTIVE },
    });
    await this.audit.record(USER_AUDIT_ACTIONS.ENROLLMENT_DEACTIVATED, {
      actorId,
      targetId: enrollmentId,
    });
    return updated;
  }

  async myEnrollments(userId: string) {
    return this.prisma.enrollment.findMany({
      where: { userId, status: EnrollmentStatus.ACTIVE },
      include: { cohort: true },
      orderBy: { createdAt: 'desc' },
    });
  }
}
