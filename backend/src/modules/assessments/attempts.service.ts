import {
  ConflictException,
  GoneException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AttemptStatus,
  EnrollmentStatus,
  Prisma,
  PublishStatus,
  QuestionType,
  Role,
} from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { checkIdempotency, payloadHash } from '../../common/idempotency';
import { CBT_AUDIT_ACTIONS } from './cbt.rules';

export interface CbtActor {
  id: string;
  role: Role;
}

interface ConfigSnapshot {
  passingGrade: number;
  maxAttempts: number;
  cooldownHours: number;
}

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const other = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[other]] = [copy[other] as T, copy[index] as T];
  }
  return copy;
}

@Injectable()
export class AttemptsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly audit: AuditService,
  ) {}

  private rules(): ConfigSnapshot {
    return {
      passingGrade: Number(this.config.get('PASSING_GRADE', 70)),
      maxAttempts: Number(this.config.get('MAX_ATTEMPTS', 3)),
      cooldownHours: Number(this.config.get('ATTEMPT_COOLDOWN_HOURS', 24)),
    };
  }

  // Daftar assessment yang dapat diakses Taruna (PUBLISHED + enrollment aktif).
  // Manager melihat semua milik cohort yang relevan.
  async listAssessments(actor: CbtActor) {
    if (actor.role === Role.TARUNA) {
      const enrollments = await this.prisma.enrollment.findMany({
        where: { userId: actor.id, status: EnrollmentStatus.ACTIVE },
        select: { cohortId: true },
      });
      return this.prisma.assessment.findMany({
        where: {
          status: PublishStatus.PUBLISHED,
          cohortId: { in: enrollments.map((item) => item.cohortId) },
        },
        include: { cohort: true },
        orderBy: { level: 'asc' },
      });
    }
    return this.prisma.assessment.findMany({
      include: { cohort: true },
      orderBy: [{ cohortId: 'asc' }, { level: 'asc' }],
    });
  }

  private async assertEligible(userId: string, assessmentId: string) {
    const assessment = await this.prisma.assessment.findUnique({
      where: { id: assessmentId },
    });
    if (!assessment) throw new NotFoundException('Assessment tidak ditemukan.');
    if (assessment.status !== PublishStatus.PUBLISHED) {
      throw new NotFoundException('Assessment tidak tersedia.');
    }
    const enrollment = await this.prisma.enrollment.findUnique({
      where: { userId_cohortId: { userId, cohortId: assessment.cohortId } },
    });
    if (!enrollment || enrollment.status !== EnrollmentStatus.ACTIVE) {
      throw new NotFoundException('Assessment tidak tersedia.');
    }
    const { maxAttempts, cooldownHours } = this.rules();
    const attempts = await this.prisma.attempt.findMany({
      where: { userId, assessmentId },
      orderBy: { createdAt: 'desc' },
    });
    const counted = attempts.filter(
      (item) => item.status !== AttemptStatus.EXPIRED,
    );
    if (counted.length >= maxAttempts) {
      throw new ConflictException(
        `Batas ${maxAttempts} percobaan tercapai.`,
      );
    }
    const last = attempts[0];
    if (last) {
      const base =
        last.submittedAt ?? last.expiresAt ?? last.createdAt;
      const hoursSince = (Date.now() - base.getTime()) / 3_600_000;
      if (hoursSince < cooldownHours) {
        throw new ConflictException(
          `Jeda ${cooldownHours} jam antar percobaan belum terpenuhi.`,
        );
      }
    }
    return assessment;
  }

  // Mulai attempt: timer server (startedAt/expiresAt), randomisasi tercatat.
  async startAttempt(userId: string, assessmentId: string) {
    const assessment = await this.assertEligible(userId, assessmentId);
    const questions = await this.prisma.question.findMany({
      where: { assessmentId },
      include: { options: true },
      orderBy: { sortOrder: 'asc' },
    });
    if (questions.length === 0) {
      throw new ConflictException('Assessment belum memiliki soal.');
    }
    const shuffledQuestions = shuffle(questions.map((item) => item.id));
    const shuffledOptions: Record<string, string[]> = {};
    for (const question of questions) {
      shuffledOptions[question.id] = shuffle(
        question.options.map((option) => option.id),
      );
    }
    const now = new Date();
    const expiresAt = new Date(now.getTime() + assessment.durationMinutes * 60_000);
    const attempt = await this.prisma.attempt.create({
      data: {
        assessmentId,
        userId,
        status: AttemptStatus.IN_PROGRESS,
        startedAt: now,
        expiresAt,
        shuffledQuestionIds: shuffledQuestions,
        shuffledOptionIds: shuffledOptions,
      },
    });
    await this.audit.record(CBT_AUDIT_ACTIONS.ATTEMPT_STARTED, {
      actorId: userId,
      targetId: attempt.id,
    });
    return this.presentAttempt(userId, attempt.id);
  }

  // Resume: kirim jawaban tersimpan + waktu server tersisa. Tanpa answer key.
  async resumeAttempt(userId: string, attemptId: string) {
    return this.presentAttempt(userId, attemptId);
  }

  private async presentAttempt(userId: string, attemptId: string) {
    const attempt = await this.prisma.attempt.findUnique({
      where: { id: attemptId },
      include: {
        assessment: {
          include: { questions: { include: { options: true } } },
        },
        answers: true,
      },
    });
    if (!attempt || attempt.userId !== userId) {
      throw new NotFoundException('Attempt tidak ditemukan.');
    }
    const now = new Date();
    if (
      attempt.status === AttemptStatus.IN_PROGRESS &&
      attempt.expiresAt <= now
    ) {
      await this.expireAttempt(attempt.id, userId);
      const expired = await this.prisma.attempt.findUniqueOrThrow({
        where: { id: attemptId },
        include: {
          assessment: {
            include: { questions: { include: { options: true } } },
          },
          answers: true,
        },
      });
      return this.serialize(expired, now, true);
    }
    return this.serialize(attempt, now, false);
  }

  private serialize(
    attempt: {
      id: string;
      assessmentId: string;
      status: AttemptStatus;
      startedAt: Date;
      expiresAt: Date;
      score: number | null;
      passed: boolean | null;
      assessment: {
        id: string;
        title: string;
        level: number;
        questions: {
          id: string;
          type: QuestionType;
          prompt: string;
          options: { id: string; label: string }[];
        }[];
      };
      answers: { questionId: string; optionId: string | null; essayText: string | null; updatedAt: Date }[];
    } & { shuffledQuestionIds: unknown; shuffledOptionIds: unknown },
    serverNow: Date,
    justExpired: boolean,
  ) {
    const shuffledQuestions = attempt.shuffledQuestionIds as string[];
    return {
      attemptId: attempt.id,
      assessmentId: attempt.assessmentId,
      status: justExpired ? AttemptStatus.EXPIRED : attempt.status,
      serverNow: serverNow.toISOString(),
      startedAt: attempt.startedAt.toISOString(),
      expiresAt: attempt.expiresAt.toISOString(),
      // Prompt + opsi (label saja) supaya layar CBT bisa menampilkan soal.
      // Answer key (isCorrect), bobot, dan sortOrder TIDAK pernah dikirim.
      questions: shuffledQuestions.map((questionId) => {
        const saved = attempt.answers.find((item) => item.questionId === questionId);
        const question = attempt.assessment.questions.find((item) => item.id === questionId);
        if (!question) {
          throw new NotFoundException(`Soal attempt tidak ditemukan: ${questionId}`);
        }
        // Opsi diurutkan sesuai shuffledOptionIds yang dicatat saat attempt
        // dimulai, supaya resume menampilkan urutan yang sama.
        const optionOrder = (attempt.shuffledOptionIds as Record<string, string[]>)?.[
          questionId
        ];
        const orderedOptions = optionOrder
          ? optionOrder
              .map((optionId) => question.options.find((option) => option.id === optionId))
              .filter((option): option is { id: string; label: string } => Boolean(option))
          : question.options;
        return {
          questionId,
          type: question.type,
          prompt: question.prompt,
          options: orderedOptions.map((option) => ({
            id: option.id,
            label: option.label,
          })),
          // Hanya pilihan yang disimpan (optionId), bukan kunci jawaban.
          selectedOptionId: saved?.optionId ?? null,
          essayText: saved?.essayText ?? null,
          updatedAt: saved?.updatedAt.toISOString() ?? null,
        };
      }),
      score: attempt.score,
      passed: attempt.passed,
    };
  }

  // Autosave satu jawaban: validasi ownership + status aktif + deadline.
  // Last-write-wins per (attempt, question) via upsert. Idempoten via
  // header Idempotency-Key: key sama + payload sama → status tersimpan
  // dikembalikan tanpa penulisan ulang; key sama + payload beda → 409.
  async autosave(
    userId: string,
    attemptId: string,
    questionId: string,
    input: { optionId?: string; essayText?: string },
    idempotencyKey?: string,
  ) {
    const attempt = await this.prisma.attempt.findUnique({
      where: { id: attemptId },
      include: { assessment: true },
    });
    if (!attempt || attempt.userId !== userId) {
      throw new NotFoundException('Attempt tidak ditemukan.');
    }
    if (attempt.status !== AttemptStatus.IN_PROGRESS) {
      throw new GoneException('Attempt sudah final.');
    }
    if (attempt.expiresAt <= new Date()) {
      await this.expireAttempt(attempt.id, userId);
      throw new GoneException('Waktu pengerjaan habis.');
    }
    const question = await this.prisma.question.findUnique({
      where: { id: questionId },
      include: { options: true },
    });
    if (!question || question.assessmentId !== attempt.assessmentId) {
      throw new NotFoundException('Soal tidak ditemukan.');
    }
    if (input.optionId) {
      const option = question.options.find((item) => item.id === input.optionId);
      if (!option) throw new NotFoundException('Opsi tidak ditemukan.');
      if (question.type !== 'PG') {
        throw new ConflictException('Soal ini bukan pilihan ganda.');
      }
    }
    if (input.essayText !== undefined && question.type !== 'ESSAY') {
      throw new ConflictException('Soal ini bukan esai.');
    }
    // Idempotency autosave: baris jawaban sudah unik per (attempt, question),
    // jadi key+payload disimpan pada baris itu. Key sama + isi sama → replay
    // tanpa menulis ulang; key sama + isi beda → 409 (key dipakai ulang).
    const payload = {
      optionId: input.optionId ?? null,
      essayText: input.essayText ?? null,
    };
    if (idempotencyKey) {
      const stored = await this.prisma.answer.findUnique({
        where: { attemptId_questionId: { attemptId, questionId } },
      });
      const match = checkIdempotency(stored, idempotencyKey, payload);
      if (match.conflict) {
        throw new ConflictException(
          'Idempotency-Key sudah dipakai dengan isi permintaan yang berbeda.',
        );
      }
      if (match.replay) {
        return {
          attemptId,
          questionId,
          updatedAt: match.replay.updatedAt.toISOString(),
          serverNow: new Date().toISOString(),
        };
      }
    }
    const saved = await this.prisma.answer.upsert({
      where: { attemptId_questionId: { attemptId, questionId } },
      create: {
        attemptId,
        questionId,
        ...payload,
        idempotencyKey: idempotencyKey ?? null,
        idempotencyPayload: idempotencyKey ? payloadHash(payload) : null,
      },
      update: {
        optionId: input.optionId ?? null,
        essayText: input.essayText ?? null,
        idempotencyKey: idempotencyKey ?? null,
        idempotencyPayload: idempotencyKey ? payloadHash(payload) : null,
      },
    });
    return {
      attemptId,
      questionId,
      updatedAt: saved.updatedAt.toISOString(),
      serverNow: new Date().toISOString(),
    };
  }

  // Submit final: idempotent via submitKey (payload identik → hasil sama;
  // attempt sudah final → kembalikan hasil tanpa ganda).
  async submit(userId: string, attemptId: string, submitKey?: string) {
    const attempt = await this.prisma.attempt.findUnique({
      where: { id: attemptId },
      include: { assessment: true, answers: { include: { } } },
    });
    if (!attempt || attempt.userId !== userId) {
      throw new NotFoundException('Attempt tidak ditemukan.');
    }
    if (
      attempt.status !== AttemptStatus.IN_PROGRESS &&
      attempt.status !== AttemptStatus.EXPIRED
    ) {
      // Sudah final: kembalikan hasil tersimpan (idempotent replay).
      return this.result(userId, attemptId);
    }
    if (
      submitKey &&
      attempt.submitKey === submitKey &&
      attempt.submitResult
    ) {
      return attempt.submitResult as unknown as Record<string, unknown>;
    }
    if (attempt.expiresAt <= new Date() && attempt.status === AttemptStatus.IN_PROGRESS) {
      await this.expireAttempt(attempt.id, userId);
    }
    const finalResult = await this.gradeAttempt(attempt.id, userId, submitKey);
    await this.audit.record(CBT_AUDIT_ACTIONS.ATTEMPT_SUBMITTED, {
      actorId: userId,
      targetId: attempt.id,
    });
    return finalResult;
  }

  private async gradeAttempt(attemptId: string, userId: string, submitKey?: string) {
    const attempt = await this.prisma.attempt.findUniqueOrThrow({
      where: { id: attemptId },
      include: {
        assessment: true,
        answers: true,
      },
    });
    const questions = await this.prisma.question.findMany({
      where: { assessmentId: attempt.assessmentId },
      include: { options: true },
    });
    const totalWeight = questions.reduce((sum, item) => sum + item.weight, 0) || 1;
    let earned = 0;
    let hasEssay = false;
    for (const question of questions) {
      if (question.type === 'ESSAY') {
        hasEssay = true;
        continue;
      }
      const answer = attempt.answers.find((item) => item.questionId === question.id);
      const correct = question.options.find((item) => item.isCorrect);
      const isRight = !!answer?.optionId && answer.optionId === correct?.id;
      const itemScore = isRight ? question.weight : 0;
      earned += itemScore;
      if (answer) {
        await this.prisma.answer.update({
          where: { id: answer.id },
          data: { autoScore: itemScore },
        });
      }
    }
    const pgScore = (earned / totalWeight) * 100;
    const now = new Date();
    if (!hasEssay) {
      const { passingGrade } = this.rules();
      const passed = pgScore >= passingGrade;
      const updated = await this.prisma.attempt.update({
        where: { id: attemptId },
        data: {
          status: AttemptStatus.GRADED,
          submittedAt: attempt.submittedAt ?? now,
          score: Math.round(pgScore * 100) / 100,
          passed,
          submitKey: submitKey ?? attempt.submitKey,
        },
      });
      const result = {
        attemptId,
        status: updated.status,
        score: updated.score,
        passed: updated.passed,
      };
      await this.prisma.attempt.update({
        where: { id: attemptId },
        data: { submitResult: result as unknown as Prisma.InputJsonValue },
      });
      await this.updateProgress(userId, attempt.assessmentId);
      return result;
    }
    // Ada esai: PG dinilai otomatis, status menunggu penilaian manual.
    const updated = await this.prisma.attempt.update({
      where: { id: attemptId },
      data: {
        status: AttemptStatus.WAITING_MANUAL_GRADING,
        submittedAt: attempt.submittedAt ?? now,
        score: Math.round(pgScore * 100) / 100,
        submitKey: submitKey ?? attempt.submitKey,
      },
    });
    const result = {
      attemptId,
      status: updated.status,
      autoScore: updated.score,
      score: null,
      passed: null as boolean | null,
    };
    await this.prisma.attempt.update({
      where: { id: attemptId },
      data: { submitResult: result as unknown as Prisma.InputJsonValue },
    });
    return result;
  }

  private async expireAttempt(attemptId: string, userId: string) {
    await this.prisma.attempt.update({
      where: { id: attemptId },
      data: { status: AttemptStatus.EXPIRED },
    });
    await this.audit.record(CBT_AUDIT_ACTIONS.ATTEMPT_EXPIRED, {
      actorId: userId,
      targetId: attemptId,
    });
  }

  // Hasil: tanpa answer key. Esai menunggu grading → skor final null.
  async result(userId: string, attemptId: string) {
    const attempt = await this.prisma.attempt.findUnique({
      where: { id: attemptId },
    });
    if (!attempt || attempt.userId !== userId) {
      throw new NotFoundException('Attempt tidak ditemukan.');
    }
    if (
      attempt.status === AttemptStatus.IN_PROGRESS ||
      attempt.status === AttemptStatus.SUBMITTED ||
      attempt.status === AttemptStatus.AUTO_GRADED
    ) {
      throw new ConflictException('Hasil belum tersedia.');
    }
    return {
      attemptId: attempt.id,
      status: attempt.status,
      score: attempt.score,
      passed: attempt.passed,
      submittedAt: attempt.submittedAt?.toISOString() ?? null,
    };
  }

  // Progres dihitung backend dari attempt GRADED terbaik.
  private async updateProgress(userId: string, assessmentId: string) {
    const { passingGrade } = this.rules();
    const graded = await this.prisma.attempt.findMany({
      where: { userId, assessmentId, status: AttemptStatus.GRADED },
      orderBy: { score: 'desc' },
    });
    const best = graded[0]?.score ?? null;
    const passed = (best ?? 0) >= passingGrade;
    await this.prisma.learningProgress.upsert({
      where: { userId_assessmentId: { userId, assessmentId } },
      create: {
        userId,
        assessmentId,
        status: passed ? 'PASSED' : 'FAILED',
        bestScore: best,
        attemptsUsed: graded.length,
        passedAt: passed ? new Date() : null,
      },
      update: {
        status: passed ? 'PASSED' : 'FAILED',
        bestScore: best,
        attemptsUsed: graded.length,
        passedAt: passed ? new Date() : null,
      },
    });
    await this.audit.record(CBT_AUDIT_ACTIONS.PROGRESS_UPDATED, {
      actorId: userId,
      targetId: assessmentId,
    });
  }

  async myProgress(userId: string) {
    return this.prisma.learningProgress.findMany({
      where: { userId },
      include: { assessment: true },
    });
  }
}
