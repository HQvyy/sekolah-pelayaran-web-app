import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EnrollmentStatus, Role } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { SERVICE_AUDIT_ACTIONS, SERVICE_RULES } from './services.rules';

export interface ServiceActor {
  id: string;
  role: Role;
}

@Injectable()
export class RatingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  // Syarat memberi rating: enrollment aktif pada cohort lesson (keputusan:
  // partisipasi = terdaftar aktif; kehadiran fisik tidak disyaratkan karena
  // provider Jitsi publik tidak memberi sinyal kehadiran tepercaya).
  private async assertEligible(userId: string, lessonId: string) {
    const lesson = await this.prisma.liveLesson.findUnique({
      where: { id: lessonId },
    });
    if (!lesson) throw new NotFoundException('Kelas tidak ditemukan.');
    const enrollment = await this.prisma.enrollment.findUnique({
      where: { userId_cohortId: { userId, cohortId: lesson.cohortId } },
    });
    if (!enrollment || enrollment.status !== EnrollmentStatus.ACTIVE) {
      throw new ForbiddenException('Hanya peserta kelas yang bisa memberi rating.');
    }
    return lesson;
  }

  async myRatings(userId: string) {
    return this.prisma.rating.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(
    userId: string,
    input: { lessonId: string; score: number; feedback?: string },
  ) {
    const lesson = await this.assertEligible(userId, input.lessonId);
    const existing = await this.prisma.rating.findUnique({
      where: { userId_lessonId: { userId, lessonId: input.lessonId } },
    });
    if (existing) {
      throw new ConflictException('Rating untuk kelas ini sudah ada (gunakan edit).');
    }
    const rating = await this.prisma.rating.create({
      data: {
        userId,
        lessonId: input.lessonId,
        mentorId: lesson.mentorId,
        score: input.score,
        feedback: input.feedback,
      },
    });
    await this.audit.record(SERVICE_AUDIT_ACTIONS.RATING_CREATED, {
      actorId: userId,
      targetId: rating.id,
    });
    return rating;
  }

  // Edit maksimal 1× dalam 7 hari sejak rating pertama (backend menghitung).
  async edit(
    userId: string,
    ratingId: string,
    input: { score: number; feedback?: string },
  ) {
    const rating = await this.prisma.rating.findUnique({
      where: { id: ratingId },
    });
    if (!rating || rating.userId !== userId) {
      throw new NotFoundException('Rating tidak ditemukan.');
    }
    if (rating.editedAt) {
      throw new ConflictException('Rating hanya dapat diedit satu kali.');
    }
    const ageMs = Date.now() - rating.createdAt.getTime();
    if (ageMs > SERVICE_RULES.RATING_EDIT_DAYS * 24 * 3_600_000) {
      throw new ConflictException('Batas 7 hari edit rating terlewati.');
    }
    const updated = await this.prisma.rating.update({
      where: { id: ratingId },
      data: {
        score: input.score,
        feedback: input.feedback,
        editedAt: new Date(),
      },
    });
    await this.audit.record(SERVICE_AUDIT_ACTIONS.RATING_EDITED, {
      actorId: userId,
      targetId: ratingId,
    });
    return updated;
  }

  // Melihat rating kelas: Mentor (kelasnya), Admin/Superadmin.
  async classRatings(actor: ServiceActor, classId: string, lessonId?: string) {
    if (actor.role === Role.MENTOR) {
      const lessons = await this.prisma.liveLesson.findMany({
        where: { id: lessonId ?? undefined, mentorId: actor.id },
        select: { id: true },
      });
      const ids = lessonId ? [lessonId] : lessons.map((item) => item.id);
      if (lessonId && !lessons.some((item) => item.id === lessonId)) {
        throw new ForbiddenException('Bukan kelas yang Anda ampu.');
      }
      return this.prisma.rating.findMany({
        where: { lessonId: { in: ids }, mentorId: actor.id },
        orderBy: { createdAt: 'desc' },
      });
    }
    if (actor.role === Role.TARUNA) {
      throw new ForbiddenException('Tidak memiliki izin.');
    }
    return this.prisma.rating.findMany({
      where: lessonId ? { lessonId } : undefined,
      orderBy: { createdAt: 'desc' },
    });
  }
}
