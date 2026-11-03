import { Inject, Injectable } from '@nestjs/common';
import { NotificationKind } from '@prisma/client';
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
}
