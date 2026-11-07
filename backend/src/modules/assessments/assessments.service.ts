import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PublishStatus, Role } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { NotificationsCenter } from '../notifications/notifications-center.service';
import { CBT_AUDIT_ACTIONS } from './cbt.rules';

export interface CbtManager {
  id: string;
  role: Role;
}

const MANAGER_ROLES: Role[] = [Role.SUPERADMIN, Role.ADMIN, Role.MENTOR];

@Injectable()
export class AssessmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly notices: NotificationsCenter,
  ) {}

  private assertManager(actor: CbtManager): void {
    if (!MANAGER_ROLES.includes(actor.role)) {
      throw new ForbiddenException('Tidak memiliki izin kelola assessment.');
    }
  }

  async create(
    actor: CbtManager,
    input: {
      cohortId: string;
      level: number;
      title: string;
      description?: string;
      durationMinutes: number;
      status?: PublishStatus;
    },
  ) {
    this.assertManager(actor);
    const cohort = await this.prisma.cohort.findUnique({
      where: { id: input.cohortId },
    });
    if (!cohort) throw new NotFoundException('Angkatan tidak ditemukan.');
    const existing = await this.prisma.assessment.findUnique({
      where: { cohortId_level: { cohortId: input.cohortId, level: input.level } },
    });
    if (existing) {
      throw new ConflictException('Level assessment sudah ada di cohort ini.');
    }
    const assessment = await this.prisma.assessment.create({
      data: { ...input, createdBy: actor.id },
    });
    await this.audit.record(CBT_AUDIT_ACTIONS.ASSESSMENT_CREATED, {
      actorId: actor.id,
      targetId: assessment.id,
    });
    return assessment;
  }

  async update(
    actor: CbtManager,
    id: string,
    input: {
      title?: string;
      description?: string;
      durationMinutes?: number;
      status?: PublishStatus;
    },
  ) {
    this.assertManager(actor);
    const assessment = await this.prisma.assessment.findUnique({
      where: { id },
    });
    if (!assessment) throw new NotFoundException('Assessment tidak ditemukan.');
    // Batas perubahan bila attempt sudah berjalan: durasi tidak boleh diubah.
    if (input.durationMinutes !== undefined) {
      const running = await this.prisma.attempt.count({
        where: { assessmentId: id, status: 'IN_PROGRESS' },
      });
      if (running > 0) {
        throw new ConflictException(
          'Durasi tidak dapat diubah saat ada attempt berjalan.',
        );
      }
    }
    const updated = await this.prisma.assessment.update({
      where: { id },
      data: input,
    });
    await this.audit.record(CBT_AUDIT_ACTIONS.ASSESSMENT_UPDATED, {
      actorId: actor.id,
      targetId: id,
    });
    return updated;
  }

  // Soal untuk pengelola: TERMASUK kunci jawaban (isCorrect) — hanya role
  // pengelola yang boleh memanggil endpoint ini.
  async listQuestions(actor: CbtManager, assessmentId: string) {
    this.assertManager(actor);
    const assessment = await this.prisma.assessment.findUnique({
      where: { id: assessmentId },
    });
    if (!assessment) throw new NotFoundException('Assessment tidak ditemukan.');
    return this.prisma.question.findMany({
      where: { assessmentId },
      include: { options: true },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async addQuestion(
    actor: CbtManager,
    assessmentId: string,
    input: {
      type: 'PG' | 'ESSAY';
      prompt: string;
      weight?: number;
      options?: { label: string; isCorrect?: boolean }[];
    },
  ) {
    this.assertManager(actor);
    const assessment = await this.prisma.assessment.findUnique({
      where: { id: assessmentId },
    });
    if (!assessment) throw new NotFoundException('Assessment tidak ditemukan.');
    if (input.type === 'PG') {
      const filled = (input.options ?? []).filter((item) => item.label.trim() !== '');
      if (filled.length < 2) {
        throw new ConflictException('PG minimal 2 opsi.');
      }
      if (!filled.some((item) => item.isCorrect)) {
        throw new ConflictException('PG harus memiliki satu jawaban benar.');
      }
    }
    const question = await this.prisma.question.create({
      data: {
        assessmentId,
        type: input.type,
        prompt: input.prompt,
        weight: input.weight ?? 1,
        options:
          input.type === 'PG'
            ? {
                create: (input.options ?? [])
                  .filter((item) => item.label.trim() !== '')
                  .map((item, index) => ({
                    label: item.label,
                    isCorrect: item.isCorrect ?? false,
                    sortOrder: index,
                  })),
              }
            : undefined,
      },
      include: { options: true },
    });
    return question;
  }

  async updateQuestion(
    actor: CbtManager,
    questionId: string,
    input: { prompt?: string; weight?: number },
  ) {
    this.assertManager(actor);
    const question = await this.prisma.question.findUnique({
      where: { id: questionId },
    });
    if (!question) throw new NotFoundException('Soal tidak ditemukan.');
    const used = await this.prisma.answer.count({ where: { questionId } });
    if (used > 0 && input.weight !== undefined && input.weight !== question.weight) {
      throw new ConflictException(
        'Bobot tidak dapat diubah setelah soal dikerjakan.',
      );
    }
    return this.prisma.question.update({ where: { id: questionId }, data: input });
  }

  async deleteQuestion(actor: CbtManager, questionId: string) {
    this.assertManager(actor);
    const question = await this.prisma.question.findUnique({
      where: { id: questionId },
    });
    if (!question) throw new NotFoundException('Soal tidak ditemukan.');
    const used = await this.prisma.answer.count({ where: { questionId } });
    if (used > 0) {
      throw new ConflictException(
        'Soal yang sudah dikerjakan tidak dapat dihapus (nonaktifkan assessment bila perlu).',
      );
    }
    await this.prisma.question.delete({ where: { id: questionId } });
    return { deleted: true };
  }

  // Antrean esai untuk pemeriksa: attempt WAITING_MANUAL_GRADING + jawaban esai
  // yang belum dinilai. Mentor melihat semua (filter assignment menyusul
  // permission rinci Tahap 8); Taruna tidak boleh memanggil endpoint ini.
  async essayQueue(actor: CbtManager) {
    this.assertManager(actor);
    const attempts = await this.prisma.attempt.findMany({
      where: { status: 'WAITING_MANUAL_GRADING' },
      include: {
        assessment: true,
        answers: true,
        user: { select: { id: true, email: true } },
      },
      orderBy: { submittedAt: 'asc' },
    });
    const queue: {
      attemptId: string;
      userId: string;
      email: string;
      assessmentId: string;
      level: number;
      questionId: string;
      essayText: string | null;
      submittedAt: string | null;
      overdue: boolean;
    }[] = [];
    const now = Date.now();
    for (const attempt of attempts) {
      const questions = await this.prisma.question.findMany({
        where: { assessmentId: attempt.assessmentId, type: 'ESSAY' },
      });
      const graded = await this.prisma.manualGrade.findMany({
        where: { attemptId: attempt.id },
      });
      const gradedIds = new Set(graded.map((item) => item.questionId));
      for (const question of questions) {
        if (gradedIds.has(question.id)) continue;
        const answer = attempt.answers.find(
          (item) => item.questionId === question.id,
        );
        const submittedAt = attempt.submittedAt;
        const overdue =
          !!submittedAt &&
          now - submittedAt.getTime() > CBT_SLA_MS;
        queue.push({
          attemptId: attempt.id,
          userId: attempt.userId,
          email: attempt.user.email,
          assessmentId: attempt.assessmentId,
          level: attempt.assessment.level,
          questionId: question.id,
          essayText: answer?.essayText ?? null,
          submittedAt: submittedAt?.toISOString() ?? null,
          overdue,
        });
      }
    }
    return queue;
  }

  // Esai melewati SLA 7 hari: untuk Admin (laporan keterlambatan PRD §4.4).
  // Sekaligus memicu notifikasi in-app sekali per attempt yang terlambat.
  async overdueGrading(actor: CbtManager) {
    this.assertManager(actor);
    const queue = await this.essayQueue(actor);
    const overdue = queue.filter((item) => item.overdue);
    const attemptIds = new Set(overdue.map((item) => item.attemptId));
    for (const attemptId of attemptIds) {
      const item = overdue.find((entry) => entry.attemptId === attemptId);
      if (!item || !item.submittedAt) continue;
      await this.notices.essayOverdue({
        level: item.level,
        assessmentId: item.assessmentId,
        attemptId,
        submittedAt: new Date(item.submittedAt),
      });
    }
    return overdue;
  }
}

const CBT_SLA_MS = 7 * 24 * 3_600_000;
