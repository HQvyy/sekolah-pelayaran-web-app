import { Injectable, NotFoundException } from '@nestjs/common';
import { EnrollmentStatus, Role } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';

export interface ProgressSummary {
  completedMaterials: number;
  totalMaterials: number;
  completedAssessments: number;
  totalAssessments: number;
  percent: number;
  unlockedLevel?: number;
}

export interface TarunaProgress {
  userId: string;
  progress: ProgressSummary;
}

@Injectable()
export class ProgressService {
  constructor(private readonly prisma: PrismaService) {}

  // Agregat progres untuk Taruna: assessment dari LearningProgress (sumber
  // kebenaran backend); materi belum dilacak per-user (tidak ada tabel
  // completion) sehingga dilaporkan 0/total agar jujur, bukan dikarang.
  // unlockedLevel = level assessment tertinggi yang PASSED + 1.
  async myProgress(userId: string): Promise<ProgressSummary> {
    return this.summarize(userId);
  }

  async userProgress(
    actor: { id: string; role: Role },
    userId: string,
  ): Promise<TarunaProgress> {
    if (actor.role === Role.MENTOR) {
      await this.assertSameCohort(actor.id, userId);
    }
    const progress = await this.summarize(userId);
    return { userId, progress };
  }

  private async summarize(userId: string): Promise<ProgressSummary> {
    const enrollments = await this.prisma.enrollment.findMany({
      where: { userId, status: EnrollmentStatus.ACTIVE },
      select: { cohortId: true },
    });
    const cohortIds = [...new Set(enrollments.map((row) => row.cohortId))];

    const [assessments, progresses] = await Promise.all([
      cohortIds.length > 0
        ? this.prisma.assessment.findMany({
            where: { cohortId: { in: cohortIds } },
            select: { id: true, level: true },
          })
        : Promise.resolve([]),
      this.prisma.learningProgress.findMany({
        where: { userId },
        include: { assessment: { select: { level: true } } },
      }),
    ]);

    const passedLevels = progresses
      .filter((row) => row.status === 'PASSED')
      .map((row) => row.assessment.level);
    const completedAssessments = new Set(
      progresses
        .filter((row) => row.status === 'PASSED')
        .map((row) => row.assessmentId),
    ).size;
    const totalAssessments = assessments.length;
    // Level terbuka = level tertinggi lulus + 1 (level 1 terbuka sejak awal).
    const unlockedLevel =
      passedLevels.length > 0 ? Math.max(...passedLevels) + 1 : 1;
    const percent =
      totalAssessments > 0
        ? Math.round((completedAssessments / totalAssessments) * 100)
        : 0;

    return {
      completedMaterials: 0,
      totalMaterials: 0,
      completedAssessments,
      totalAssessments,
      percent,
      unlockedLevel,
    };
  }

  // Mentor hanya boleh melihat progres Taruna satu cohort dengan dirinya.
  private async assertSameCohort(
    mentorId: string,
    userId: string,
  ): Promise<void> {
    const [mentorCohorts, userCohorts] = await Promise.all([
      this.prisma.enrollment.findMany({
        where: { userId: mentorId, status: EnrollmentStatus.ACTIVE },
        select: { cohortId: true },
      }),
      this.prisma.enrollment.findMany({
        where: { userId, status: EnrollmentStatus.ACTIVE },
        select: { cohortId: true },
      }),
    ]);
    const mentorSet = new Set(mentorCohorts.map((row) => row.cohortId));
    const shared = userCohorts.some((row) => mentorSet.has(row.cohortId));
    if (!shared) {
      throw new NotFoundException('Progres tidak ditemukan.');
    }
  }
}
