import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';

// Audit log minimal Tahap 2 (tanpa secret/kredensial/token/OTP di metadata).
@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async record(
    action: string,
    options: {
      actorId?: string;
      targetId?: string;
      metadata?: Prisma.InputJsonValue;
    } = {},
  ): Promise<void> {
    await this.prisma.auditLog.create({
      data: {
        action,
        actorId: options.actorId,
        targetId: options.targetId,
        metadata: options.metadata ?? Prisma.DbNull,
      },
    });
  }
}

export const AUDIT_ACTIONS = {
  USER_REGISTERED: 'user.registered',
  LOGIN_FAILED: 'auth.login_failed',
  ACCOUNT_LOCKED: 'auth.account_locked',
  OTP_SENT: 'auth.otp_sent',
  OTP_VERIFIED: 'auth.otp_verified',
  OTP_FAILED: 'auth.otp_failed',
  EMAIL_SEND_FAILED: 'auth.email_send_failed',
  LOGOUT: 'auth.logout',
  REFRESH_ROTATED: 'auth.refresh_rotated',
  REFRESH_REUSED: 'auth.refresh_reused',
  SESSION_REVOKED_OLDEST: 'auth.session_revoked_oldest',
  FORCED_LOGOUT: 'auth.forced_logout',
  PASSWORD_RESET_REQUESTED: 'auth.password_reset_requested',
  PASSWORD_RESET_COMPLETED: 'auth.password_reset_completed',
  USER_VERIFIED: 'user.verified',
} as const;
