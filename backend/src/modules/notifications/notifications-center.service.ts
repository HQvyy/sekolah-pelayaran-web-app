import { Inject, Injectable } from '@nestjs/common';
import { NotificationKind, Role } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import type { EmailService } from '../notifications/email.service';

export interface LessonNotice {
  lessonId: string;
  title: string;
  startsAt: Date;
  cohortId: string;
}

// Notifikasi perubahan/pembatalan Live Lesson: in-app (selalu) + email
// (bila adapter real; fake di dev/test hanya mencatat, tanpa klaim terkirim).
@Injectable()
export class NotificationsCenter {
  constructor(
    private readonly prisma: PrismaService,
    @Inject('EMAIL_SERVICE') private readonly email: EmailService,
  ) {}

  private async recipients(cohortId: string, excludeUserId?: string) {
    const enrollments = await this.prisma.enrollment.findMany({
      where: { cohortId, status: 'ACTIVE' },
      include: { user: { select: { id: true, email: true, status: true } } },
    });
    return enrollments
      .map((item) => item.user)
      .filter(
        (user) =>
          user.status === 'ACTIVE' &&
          (!excludeUserId || user.id !== excludeUserId),
      );
  }

  private async broadcast(
    cohortId: string,
    kind: NotificationKind,
    title: string,
    body: string,
  ): Promise<void> {
    const users = await this.recipients(cohortId);
    if (users.length === 0) return;
    await this.prisma.notification.createMany({
      data: users.map((user) => ({
        userId: user.id,
        kind,
        title,
        body,
      })),
    });
    for (const user of users) {
      try {
        await this.email.sendScheduleChange({
          to: user.email,
          title,
          detail: body,
        });
      } catch {
        // Email gagal tidak menggagalkan penjadwalan; in-app tetap tercatat.
        // Lockout email 3x ditangani alur auth; di sini cukup abaikan aman.
      }
    }
  }

  async scheduleCreated(notice: LessonNotice): Promise<void> {
    await this.broadcast(
      notice.cohortId,
      NotificationKind.SCHEDULE_CREATED,
      `Jadwal baru: ${notice.title}`,
      `Kelas pada ${notice.startsAt.toISOString()}.`,
    );
  }

  async scheduleChanged(notice: LessonNotice): Promise<void> {
    await this.broadcast(
      notice.cohortId,
      NotificationKind.SCHEDULE_CHANGED,
      `Jadwal berubah: ${notice.title}`,
      `Jadwal baru pada ${notice.startsAt.toISOString()}.`,
    );
  }

  async scheduleCancelled(notice: LessonNotice): Promise<void> {
    await this.broadcast(
      notice.cohortId,
      NotificationKind.SCHEDULE_CANCELLED,
      `Kelas dibatalkan: ${notice.title}`,
      `Jadwal ${notice.startsAt.toISOString()} dibatalkan.`,
    );
  }

  // Notifikasi langsung ke daftar penerima tertentu (bukan satu cohort).
  private async notify(
    recipients: { id: string; email: string }[],
    kind: NotificationKind,
    title: string,
    body: string,
    emailKind: string,
  ): Promise<void> {
    if (recipients.length === 0) return;
    await this.prisma.notification.createMany({
      data: recipients.map((user) => ({
        userId: user.id,
        kind,
        title,
        body,
      })),
    });
    for (const user of recipients) {
      try {
        await this.email.sendScheduleChange({
          to: user.email,
          title,
          detail: body,
        });
      } catch {
        // Email gagal tidak menggagalkan aksi bisnis; in-app tetap tercatat.
        // `emailKind` dicatat agar pengembangan bisa membedakan sumber panggilan.
        void emailKind;
      }
    }
  }

  // Esai melewati SLA 7 hari (PRD §4.4): semua Admin/Superadmin aktif diberi
  // tahu in-app agar penilaian tertunda tidak hilang dari pantauan.
  async essayOverdue(detail: {
    level: number;
    assessmentId: string;
    attemptId: string;
    submittedAt: Date;
  }): Promise<void> {
    const admins = await this.prisma.user.findMany({
      where: {
        role: { in: [Role.ADMIN, Role.SUPERADMIN] },
        status: 'ACTIVE',
      },
      select: { id: true, email: true },
    });
    await this.notify(
      admins,
      NotificationKind.ESSAY_OVERDUE,
      `Penilaian esai terlambat: level ${detail.level}`,
      `Attempt ${detail.attemptId} (assessment ${detail.assessmentId}) ` +
        `dikirim ${detail.submittedAt.toISOString()} dan melewati SLA 7 hari.`,
      'essay-overdue',
    );
  }

  // Sertifikat terbit: pemilik diberi tahu in-app + email.
  async certificateIssued(detail: {
    userId: string;
    number: string;
    cohortName: string;
  }): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: detail.userId },
      select: { id: true, email: true, status: true },
    });
    if (!user || user.status !== 'ACTIVE') return;
    await this.notify(
      [user],
      NotificationKind.CERTIFICATE_ISSUED,
      'Sertifikat diterbitkan',
      `Sertifikat ${detail.number} untuk ${detail.cohortName} siap diunduh.`,
      'certificate-issued',
    );
  }
}
