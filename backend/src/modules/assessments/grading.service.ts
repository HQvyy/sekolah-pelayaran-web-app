import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AttemptStatus, Role } from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CBT_AUDIT_ACTIONS } from './cbt.rules';

export interface Grader {
  id: string;
  role: Role;
}

// Penilaian esai manual: hanya Mentor/pemeriksa berwenang (Admin/Superadmin
// termasuk). Menyimpan siapa penilai, kapan, skor, feedback. Setelah semua
// esai dinilai, skor final = gabungan PG+esai dan progres diperbarui.
@Injectable()
export class GradingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly audit: AuditService,
  ) {}

  private assertGrader(actor: Grader): void {
    if (
      actor.role !== Role.MENTOR &&
      actor.role !== Role.ADMIN &&
      actor.role !== Role.SUPERADMIN
    ) {
      throw new ForbiddenException('Tidak berwenang menilai esai.');
    }
  }

  async grade(
    actor: Grader,
    attemptId: string,
    questionId: string,
    score: number,
    feedback?: string,
  ) {
    this.assertGrader(actor);
    const attempt = await this.prisma.attempt.findUnique({
      where: { id: attemptId },
      include: { answers: true },
    });
    if (!attempt) throw new NotFoundException('Attempt tidak ditemukan.');
    if (attempt.status !== AttemptStatus.WAITING_MANUAL_GRADING) {
      throw new ForbiddenException('Attempt belum menunggu penilaian esai.');
    }
    const question = await this.prisma.question.findUnique({
      where: { id: questionId },
    });
    if (!question || question.assessmentId !== attempt.assessmentId) {
      throw new NotFoundException('Soal tidak ditemukan.');
    }
    if (question.type !== 'ESSAY') {
      throw new ForbiddenException('Hanya soal esai yang dinilai manual.');
    }
    if (!Number.isFinite(score) || score < 0 || score > question.weight) {
      throw new ForbiddenException(
        `Skor esai harus 0–${question.weight}.`,
      );
    }
    const existing = await this.prisma.manualGrade.findUnique({
      where: { attemptId_questionId: { attemptId, questionId } },
    });
    if (existing) {
      throw new ForbiddenException('Esai sudah dinilai.');
    }
    const grade = await this.prisma.manualGrade.create({
      data: {
        attemptId,
        questionId,
        graderId: actor.id,
        score,
        maxScore: question.weight,
        feedback,
      },
    });
    await this.audit.record(CBT_AUDIT_ACTIONS.ESSAY_GRADED, {
      actorId: actor.id,
      targetId: attemptId,
    });
    await this.finalizeIfComplete(attemptId);
    return grade;
  }

  private async finalizeIfComplete(attemptId: string): Promise<void> {
    const attempt = await this.prisma.attempt.findUniqueOrThrow({
      where: { id: attemptId },
      include: { answers: true },
    });
    const questions = await this.prisma.question.findMany({
      where: { assessmentId: attempt.assessmentId },
    });
    const essays = questions.filter((item) => item.type === 'ESSAY');
    const grades = await this.prisma.manualGrade.findMany({
      where: { attemptId },
    });
    if (grades.length < essays.length) return;
    const totalWeight = questions.reduce((sum, item) => sum + item.weight, 0) || 1;
    const pgEarned = attempt.answers.reduce(
      (sum, item) => sum + (item.autoScore ?? 0),
      0,
    );
    const essayEarned = grades.reduce((sum, item) => sum + item.score, 0);
    const score = Math.round(((pgEarned + essayEarned) / totalWeight) * 100 * 100) / 100;
    const passingGrade = Number(this.config.get('PASSING_GRADE', 70));
    const passed = score >= passingGrade;
    await this.prisma.attempt.update({
      where: { id: attemptId },
      data: { status: AttemptStatus.GRADED, score, passed },
    });
    // Progres diperbarui saat final (sama seperti jalur tanpa esai).
    const graded = await this.prisma.attempt.findMany({
      where: {
        userId: attempt.userId,
        assessmentId: attempt.assessmentId,
        status: AttemptStatus.GRADED,
      },
      orderBy: { score: 'desc' },
    });
    const best = graded[0]?.score ?? score;
    const bestPassed = best >= passingGrade;
    await this.prisma.learningProgress.upsert({
      where: {
        userId_assessmentId: {
          userId: attempt.userId,
          assessmentId: attempt.assessmentId,
        },
      },
      create: {
        userId: attempt.userId,
        assessmentId: attempt.assessmentId,
        status: bestPassed ? 'PASSED' : 'FAILED',
        bestScore: best,
        attemptsUsed: graded.length,
        passedAt: bestPassed ? new Date() : null,
      },
      update: {
        status: bestPassed ? 'PASSED' : 'FAILED',
        bestScore: best,
        attemptsUsed: graded.length,
        passedAt: bestPassed ? new Date() : null,
      },
    });
    await this.audit.record(CBT_AUDIT_ACTIONS.PROGRESS_UPDATED, {
      actorId: attempt.userId,
      targetId: attempt.assessmentId,
    });
  }
}
