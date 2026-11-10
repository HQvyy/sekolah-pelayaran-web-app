import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AttendanceStatus,
  EnrollmentStatus,
  LessonStatus,
  Role,
} from '@prisma/client';
import ExcelJS from 'exceljs';
import { PrismaService } from '../../database/prisma.service';
import type { ConferenceProvider } from '../conference/conference.provider';
import { NotificationsCenter } from '../notifications/notifications-center.service';
import { LESSON_AUDIT_ACTIONS, LESSON_RULES } from './live-lessons.rules';
import { paginated } from '../../common/envelope';
import {
  DEFAULT_PAGE,
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
} from '../../common/dto/pagination-query.dto';

export interface LessonActor {
  id: string;
  role: Role;
}

const HOUR_MS = 3_600_000;

// Bentuk baris lesson yang diteruskan ke respons (tanpa roomReference).
type LessonRow = {
  id: string;
  cohortId: string;
  mentorId: string;
  title: string;
  description?: string | null;
  startsAt: Date;
  endsAt: Date;
  status: LessonStatus;
  roomReference?: string | null;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  cohort?: unknown;
};

type LessonRowWithCohort = LessonRow & { cohort?: unknown };

type LessonResponse = LessonRow & { isJoinable: boolean };

function hoursUntil(from: Date, to: Date): number {
  return (to.getTime() - from.getTime()) / HOUR_MS;
}

// Kelayakan join adalah keputusan server: Taruna yang terdaftar boleh masuk
// hanya dalam jendela [mulai - 15 menit, selesai]. Status non-SCHEDULED/ONGOING
// (CANCELLED) selalu ditolak. Peran pengelola melihat false agar tidak ada
// tombol Masuk Kelas yang akan selalu ditolak guard Taruna-only.
function isJoinableFor(lesson: LessonRow, role: Role, now = new Date()): boolean {
  if (role !== Role.TARUNA) return false;
  if (lesson.status !== LessonStatus.SCHEDULED && lesson.status !== LessonStatus.ONGOING) {
    return false;
  }
  const opensAt =
    lesson.startsAt.getTime() - LESSON_RULES.JOIN_OPEN_BEFORE_MINUTES * 60_000;
  const nowMs = now.getTime();
  return nowMs >= opensAt && nowMs <= lesson.endsAt.getTime();
}

function withJoinable<T extends LessonRowWithCohort>(
  rows: T[],
  role: Role,
  now = new Date(),
): LessonResponse[] {
  return rows.map((row) => decorate(row, role, now));
}

// roomReference hanya untuk peran pengelola (Admin/Mentor) — Taruna tidak
// pernah menerimanya, sesuai aturan "tautan konferensi tidak dibagikan".
function decorate(row: LessonRowWithCohort, role: Role, now: Date = new Date()): LessonResponse {
  const { roomReference, ...rest } = row;
  return {
    ...rest,
    isJoinable: isJoinableFor(row, role, now),
    ...(role !== Role.TARUNA && roomReference ? { roomReference } : {}),
  };
}

@Injectable()
export class LiveLessonsService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject('CONFERENCE_PROVIDER')
    private readonly conference: ConferenceProvider,
    private readonly notices: NotificationsCenter,
  ) {}

  // Hak kelola: Admin/Superadmin penuh; Mentor hanya kelas yang ia ampu.
  private async assertCanManage(
    actor: LessonActor,
    mentorId?: string,
  ): Promise<void> {
    if (actor.role === Role.SUPERADMIN || actor.role === Role.ADMIN) return;
    if (actor.role === Role.MENTOR && mentorId === actor.id) return;
    throw new ForbiddenException('Tidak memiliki izin atas jadwal ini.');
  }

  async list(
    actor: LessonActor,
    query: {
      status?: string;
      cohortId?: string;
      from?: string;
      to?: string;
      page?: number;
      pageSize?: number;
    },
  ) {
    const page = Math.max(1, Number(query.page ?? DEFAULT_PAGE) || DEFAULT_PAGE);
    const pageSize = Math.min(
      MAX_PAGE_SIZE,
      Math.max(1, Number(query.pageSize ?? DEFAULT_PAGE_SIZE) || DEFAULT_PAGE_SIZE),
    );
    const where: Record<string, unknown> = {};
    if (query.status) where.status = query.status;
    if (query.cohortId) where.cohortId = query.cohortId;
    if (query.from || query.to) {
      where.startsAt = {
        ...(query.from ? { gte: new Date(query.from) } : {}),
        ...(query.to ? { lte: new Date(query.to) } : {}),
      };
    }
    if (actor.role === Role.TARUNA) {
      const enrollments = await this.prisma.enrollment.findMany({
        where: { userId: actor.id, status: EnrollmentStatus.ACTIVE },
        select: { cohortId: true },
      });
      where.cohortId = { in: enrollments.map((item) => item.cohortId) };
      where.status = { not: LessonStatus.CANCELLED };
    }
    if (actor.role === Role.MENTOR) {
      where.mentorId = actor.id;
    }
    const [totalItems, rows] = await Promise.all([
      this.prisma.liveLesson.count({ where }),
      this.prisma.liveLesson.findMany({
        where,
        include: { cohort: true },
        orderBy: { startsAt: 'asc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);
    // isJoinable dikirim untuk semua peran agar UI bisa memutuskan tampilan
    // tombol tanpa menebak; roomReference tetap tidak ikut (tidak bocor).
    return paginated(withJoinable(rows, actor.role), page, pageSize, totalItems);
  }

  async create(
    actor: LessonActor,
    input: {
      cohortId: string;
      title: string;
      description?: string;
      startsAt: string;
      endsAt: string;
      mentorId?: string;
    },
  ) {
    const mentorId =
      actor.role === Role.MENTOR ? actor.id : (input.mentorId ?? actor.id);
    await this.assertCanManage(actor, mentorId);
    const cohort = await this.prisma.cohort.findUnique({
      where: { id: input.cohortId },
    });
    if (!cohort) throw new NotFoundException('Angkatan tidak ditemukan.');
    const mentor = await this.prisma.user.findUnique({
      where: { id: mentorId },
    });
    if (!mentor || mentor.role !== Role.MENTOR) {
      throw new NotFoundException('Mentor tidak ditemukan.');
    }
    const startsAt = new Date(input.startsAt);
    const endsAt = new Date(input.endsAt);
    if (!(startsAt < endsAt)) {
      throw new ConflictException('Waktu selesai harus setelah waktu mulai.');
    }
    if (startsAt.getTime() <= Date.now()) {
      throw new ConflictException('Jadwal harus di masa depan.');
    }
    const room = await this.conference.createRoom(mentorId, input.title);
    const lesson = await this.prisma.liveLesson.create({
      data: {
        cohortId: input.cohortId,
        mentorId,
        title: input.title,
        description: input.description,
        startsAt,
        endsAt,
        roomReference: room.roomReference,
        createdBy: actor.id,
      },
    });
    await this.lessonAudit(lesson.id, actor.id, LESSON_AUDIT_ACTIONS.LESSON_CREATED, {
      cohortId: input.cohortId,
      mentorId,
      startsAt: startsAt.toISOString(),
    });
    await this.notices.scheduleCreated({
      lessonId: lesson.id,
      title: lesson.title,
      startsAt,
      cohortId: lesson.cohortId,
    });
    // Peserta = seluruh Taruna ACTIVE pada cohort saat jadwal dibuat.
    await this.syncParticipants(lesson.id, lesson.cohortId);
    return decorate(lesson, actor.role);
  }

  async detail(actor: LessonActor, id: string) {
    const lesson = await this.prisma.liveLesson.findUnique({
      where: { id },
      include: { cohort: true },
    });
    if (!lesson) throw new NotFoundException('Jadwal tidak ditemukan.');
    if (actor.role === Role.TARUNA) {
      await this.assertEnrolled(actor.id, lesson.cohortId);
      if (lesson.status === LessonStatus.CANCELLED) {
        throw new NotFoundException('Jadwal tidak ditemukan.');
      }
      return decorate(lesson, actor.role);
    }
    if (actor.role === Role.MENTOR && lesson.mentorId !== actor.id) {
      throw new ForbiddenException('Bukan kelas yang Anda ampu.');
    }
    return decorate(lesson, actor.role);
  }

  // Reschedule: hanya pemilik/berwenang, paling lambat H-1. Tidak ada bypass.
  async update(
    actor: LessonActor,
    id: string,
    input: { title?: string; description?: string; startsAt?: string; endsAt?: string },
  ) {
    const lesson = await this.prisma.liveLesson.findUnique({
      where: { id },
    });
    if (!lesson) throw new NotFoundException('Jadwal tidak ditemukan.');
    await this.assertCanManage(actor, lesson.mentorId);
    if (lesson.status === LessonStatus.CANCELLED) {
      throw new ConflictException('Jadwal yang dibatalkan tidak dapat diubah.');
    }
    const changingTime = input.startsAt !== undefined || input.endsAt !== undefined;
    if (changingTime && hoursUntil(new Date(), lesson.startsAt) < LESSON_RULES.RESCHEDULE_MIN_HOURS) {
      throw new ForbiddenException(
        'Perubahan jadwal melewati batas H-1.',
      );
    }
    const startsAt = input.startsAt ? new Date(input.startsAt) : lesson.startsAt;
    const endsAt = input.endsAt ? new Date(input.endsAt) : lesson.endsAt;
    if (!(startsAt < endsAt)) {
      throw new ConflictException('Waktu selesai harus setelah waktu mulai.');
    }
    const updated = await this.prisma.liveLesson.update({
      where: { id },
      data: {
        title: input.title ?? lesson.title,
        description: input.description ?? lesson.description,
        startsAt,
        endsAt,
      },
    });
    await this.lessonAudit(id, actor.id, LESSON_AUDIT_ACTIONS.LESSON_UPDATED, {
      startsAt: startsAt.toISOString(),
    });
    if (changingTime) {
      await this.notices.scheduleChanged({
        lessonId: id,
        title: updated.title,
        startsAt,
        cohortId: updated.cohortId,
      });
    }
    return decorate(updated, actor.role);
  }

  async cancel(actor: LessonActor, id: string) {
    const lesson = await this.prisma.liveLesson.findUnique({
      where: { id },
    });
    if (!lesson) throw new NotFoundException('Jadwal tidak ditemukan.');
    await this.assertCanManage(actor, lesson.mentorId);
    if (lesson.status === LessonStatus.CANCELLED) {
      throw new ConflictException('Jadwal sudah dibatalkan.');
    }
    if (hoursUntil(new Date(), lesson.startsAt) < LESSON_RULES.RESCHEDULE_MIN_HOURS) {
      throw new ForbiddenException(
        'Pembatalan melewati batas H-1.',
      );
    }
    const updated = await this.prisma.liveLesson.update({
      where: { id },
      data: { status: LessonStatus.CANCELLED },
    });
    await this.lessonAudit(id, actor.id, LESSON_AUDIT_ACTIONS.LESSON_CANCELLED, {});
    await this.notices.scheduleCancelled({
      lessonId: id,
      title: updated.title,
      startsAt: updated.startsAt,
      cohortId: updated.cohortId,
    });
    return decorate(updated, actor.role);
  }

  // Join: validasi login (guard) + enrollment + jadwal + status. Mencatat
  // kehadiran PRESENT + peserta; mengembalikan materi embed (bukan URL mentah
  // untuk daftar publik).
  async join(actor: LessonActor, id: string, displayName?: string) {
    const lesson = await this.prisma.liveLesson.findUnique({
      where: { id },
    });
    if (!lesson) throw new NotFoundException('Jadwal tidak ditemukan.');
    if (lesson.status === LessonStatus.CANCELLED) {
      throw new ConflictException('Kelas dibatalkan.');
    }
    if (actor.role !== Role.TARUNA) {
      throw new ForbiddenException('Hanya Taruna yang join via tombol kelas.');
    }
    await this.assertEnrolled(actor.id, lesson.cohortId);
    // Aturan yang sama dengan isJoinable: jendela [mulai - 15 menit, selesai].
    // Tanpa ini, kelas yang sudah lewat masih bisa di-join walau UI
    // menyembunyikan tombolnya.
    if (!isJoinableFor(lesson, actor.role)) {
      throw new ConflictException('Kelas belum dibuka atau sudah selesai.');
    }
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: actor.id },
    });
    const material = await this.conference.getJoinMaterial(
      lesson.roomReference ?? lesson.id,
      displayName ?? user.email,
    );
    await this.prisma.lessonParticipant.upsert({
      where: { lessonId_userId: { lessonId: id, userId: actor.id } },
      create: { lessonId: id, userId: actor.id },
      update: {},
    });
    await this.prisma.attendanceRecord.upsert({
      where: { lessonId_userId: { lessonId: id, userId: actor.id } },
      create: { lessonId: id, userId: actor.id, status: 'PRESENT', source: 'JOIN' },
      update: {},
    });
    await this.lessonAudit(id, actor.id, LESSON_AUDIT_ACTIONS.ATTENDANCE_RECORDED, {
      source: 'JOIN',
    });
    return {
      lessonId: id,
      join: material,
      recordedAt: new Date().toISOString(),
    };
  }

  async myLessons(actor: LessonActor) {
    if (actor.role !== Role.TARUNA) {
      throw new ForbiddenException('Hanya untuk Taruna.');
    }
    const enrollments = await this.prisma.enrollment.findMany({
      where: { userId: actor.id, status: EnrollmentStatus.ACTIVE },
      select: { cohortId: true },
    });
    const rows = await this.prisma.liveLesson.findMany({
      where: {
        cohortId: { in: enrollments.map((item) => item.cohortId) },
        status: { not: LessonStatus.CANCELLED },
      },
      include: { cohort: true },
      orderBy: { startsAt: 'asc' },
    });
    return withJoinable(rows, actor.role);
  }

  async attendance(actor: LessonActor, id: string) {
    const lesson = await this.prisma.liveLesson.findUnique({
      where: { id },
    });
    if (!lesson) throw new NotFoundException('Jadwal tidak ditemukan.');
    await this.assertCanManage(actor, lesson.mentorId);
    return this.prisma.attendanceRecord.findMany({
      where: { lessonId: id },
      orderBy: { recordedAt: 'asc' },
    });
  }

  // Koreksi manual mentor: hanya dalam 24 jam setelah sesi berakhir + audit.
  async correct(
    actor: LessonActor,
    id: string,
    userId: string,
    status: AttendanceStatus,
  ) {
    const lesson = await this.prisma.liveLesson.findUnique({
      where: { id },
    });
    if (!lesson) throw new NotFoundException('Jadwal tidak ditemukan.');
    await this.assertCanManage(actor, lesson.mentorId);
    if (
      hoursUntil(lesson.endsAt, new Date()) >
      LESSON_RULES.ATTENDANCE_CLOSE_HOURS
    ) {
      throw new ForbiddenException('Koreksi melewati batas 24 jam.');
    }
    const record = await this.prisma.attendanceRecord.findUnique({
      where: { lessonId_userId: { lessonId: id, userId } },
    });
    if (!record) throw new NotFoundException('Data absensi tidak ditemukan.');
    const updated = await this.prisma.attendanceRecord.update({
      where: { id: record.id },
      data: {
        status,
        source: 'MANUAL',
        correctedBy: actor.id,
        correctedAt: new Date(),
      },
    });
    await this.lessonAudit(id, actor.id, LESSON_AUDIT_ACTIONS.ATTENDANCE_CORRECTED, {
      userId,
      from: record.status,
      to: status,
    });
    return updated;
  }

  async exportAttendance(actor: LessonActor, id: string): Promise<Buffer> {
    const rows = await this.attendance(actor, id);
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Absensi');
    sheet.columns = [
      { header: 'user_id', key: 'userId', width: 38 },
      { header: 'status', key: 'status', width: 12 },
      { header: 'source', key: 'source', width: 10 },
      { header: 'recorded_at', key: 'recordedAt', width: 26 },
      { header: 'corrected_by', key: 'correctedBy', width: 38 },
    ];
    for (const row of rows) {
      sheet.addRow({
        userId: row.userId,
        status: row.status,
        source: row.source,
        recordedAt: row.recordedAt.toISOString(),
        correctedBy: row.correctedBy ?? '',
      });
    }
    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  private async assertEnrolled(userId: string, cohortId: string): Promise<void> {
    const enrollment = await this.prisma.enrollment.findUnique({
      where: { userId_cohortId: { userId, cohortId } },
    });
    if (!enrollment || enrollment.status !== EnrollmentStatus.ACTIVE) {
      throw new NotFoundException('Jadwal tidak ditemukan.');
    }
  }

  private async syncParticipants(lessonId: string, cohortId: string): Promise<void> {
    const enrollments = await this.prisma.enrollment.findMany({
      where: { cohortId, status: EnrollmentStatus.ACTIVE },
      select: { userId: true },
    });
    if (enrollments.length === 0) return;
    await this.prisma.lessonParticipant.createMany({
      data: enrollments.map((item) => ({ lessonId, userId: item.userId })),
      skipDuplicates: true,
    });
  }

  private async lessonAudit(
    lessonId: string,
    actorId: string,
    action: string,
    metadata: Record<string, unknown>,
  ): Promise<void> {
    await this.prisma.lessonAuditLog.create({
      data: { lessonId, actorId, action, metadata: metadata as never },
    });
  }
}
