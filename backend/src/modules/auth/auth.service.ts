import {
  ForbiddenException,
  GoneException,
  Inject,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { AccountStatus, OtpStatus, Role } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { AuditService, AUDIT_ACTIONS } from '../audit/audit.service';
import type { EmailService } from '../notifications/email.service';
import { PasswordService } from './password.service';
import { TokenService } from './token.service';
import { AUTH_RULES } from './auth.rules';

const MINUTES = 60_000;

function addMinutes(from: Date, minutes: number): Date {
  return new Date(from.getTime() + minutes * MINUTES);
}

export interface LoginResult {
  status: 'OTP_REQUIRED';
  challengeId: string;
  expiresAt: Date;
}

export interface VerifyResult {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    role: Role;
    status: AccountStatus;
  };
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly passwords: PasswordService,
    private readonly tokens: TokenService,
    private readonly audit: AuditService,
    @Inject('EMAIL_SERVICE') private readonly email: EmailService,
  ) {}

  // Registrasi mandiri hanya untuk TARUNA; consent wajib; akun lahir sebagai
  // PENDING_VERIFICATION (belum bisa login penuh sebelum verifikasi + OTP).
  async register(email: string, password: string, consent: boolean) {
    const normalized = email.trim().toLowerCase();
    const existing = await this.prisma.user.findUnique({
      where: { email: normalized },
    });
    if (existing) {
      // Samarkan: respons sama seperti sukses agar email tidak bisa dienumerasi.
      return { id: existing.id, email: existing.email, status: existing.status };
    }
    const user = await this.prisma.user.create({
      data: {
        email: normalized,
        passwordHash: await this.passwords.hash(password),
        role: Role.TARUNA,
        status: AccountStatus.PENDING_VERIFICATION,
        consentGivenAt: consent ? new Date() : null,
      },
    });
    await this.audit.record(AUDIT_ACTIONS.USER_REGISTERED, {
      actorId: user.id,
      targetId: user.id,
    });
    return { id: user.id, email: user.email, status: user.status };
  }

  // Login tahap 1: validasi kredensial + status, lalu terbitkan challenge OTP.
  // Belum ada access/refresh token sebelum OTP tervalidasi.
  async login(email: string, password: string): Promise<LoginResult> {
    const normalized = email.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({
      where: { email: normalized },
    });
    const now = new Date();
    if (user && user.lockedUntil && user.lockedUntil > now) {
      throw new ForbiddenException('Akun dikunci sementara. Coba lagi nanti.');
    }
    const valid =
      user !== null &&
      (await this.passwords.verify(user.passwordHash, password));
    if (!user || !valid) {
      if (user) await this.registerFailedLogin(user.id);
      // Pesan generik: jangan bocorkan apakah email terdaftar.
      throw new UnauthorizedException('Email atau password salah.');
    }
    if (user.status !== AccountStatus.ACTIVE) {
      throw new ForbiddenException('Akun belum aktif atau tidak berwenang.');
    }
    return this.issueChallenge(user.id, user.email);
  }

  async verifyOtp(challengeId: string, code: string): Promise<VerifyResult> {
    const now = new Date();
    const challenge = await this.prisma.otpChallenge.findUnique({
      where: { id: challengeId },
      include: { user: true },
    });
    if (!challenge || challenge.status !== OtpStatus.PENDING) {
      throw new GoneException('Challenge OTP tidak berlaku.');
    }
    if (challenge.expiresAt <= now) {
      await this.prisma.otpChallenge.update({
        where: { id: challenge.id },
        data: { status: OtpStatus.EXPIRED },
      });
      throw new GoneException('Kode OTP kedaluwarsa.');
    }
    if (challenge.attempts >= challenge.maxAttempts) {
      await this.prisma.otpChallenge.update({
        where: { id: challenge.id },
        data: { status: OtpStatus.EXHAUSTED },
      });
      throw new GoneException('Percobaan OTP habis.');
    }
    const codeHash = await this.tokens.hashSecret(code);
    if (codeHash !== challenge.otpHash) {
      const attempts = challenge.attempts + 1;
      await this.prisma.otpChallenge.update({
        where: { id: challenge.id },
        data: {
          attempts,
          status: attempts >= challenge.maxAttempts ? OtpStatus.EXHAUSTED : OtpStatus.PENDING,
        },
      });
      await this.audit.record(AUDIT_ACTIONS.OTP_FAILED, {
        actorId: challenge.userId,
        targetId: challenge.id,
      });
      throw new UnauthorizedException('Kode OTP salah.');
    }
    await this.prisma.otpChallenge.update({
      where: { id: challenge.id },
      data: { status: OtpStatus.VERIFIED, verifiedAt: now },
    });
    await this.audit.record(AUDIT_ACTIONS.OTP_VERIFIED, {
      actorId: challenge.userId,
      targetId: challenge.id,
    });
    // Satu challenge OTP hanya untuk satu sesi login: cabut challenge
    // PENDING lain milik user agar kode lama tidak bisa dipakai ulang.
    await this.prisma.otpChallenge.updateMany({
      where: {
        userId: challenge.userId,
        status: OtpStatus.PENDING,
        id: { not: challenge.id },
      },
      data: { status: OtpStatus.EXPIRED },
    });
    return this.openSession(challenge.user);
  }

  async resendOtp(challengeId: string): Promise<LoginResult> {
    const now = new Date();
    const challenge = await this.prisma.otpChallenge.findUnique({
      where: { id: challengeId },
      include: { user: true },
    });
    if (!challenge || challenge.status !== OtpStatus.PENDING) {
      throw new GoneException('Challenge OTP tidak berlaku.');
    }
    const elapsed = now.getTime() - challenge.lastSentAt.getTime();
    if (elapsed < AUTH_RULES.OTP_RESEND_SECONDS * 1000) {
      throw new ForbiddenException('Tunggu sebelum meminta kode baru.');
    }
    return this.sendChallengeCode(challenge.id, challenge.user.email);
  }

  // Refresh: rotasi sekali pakai. Token lama langsung dicabut; pemakaian ulang
  // token yang sudah dirotasi = indikasi pencurian → cabut semua sesi user.
  async refresh(rawToken: string, ip?: string, userAgent?: string) {
    const hash = this.tokens.hashToken(rawToken);
    const session = await this.prisma.session.findUnique({
      where: { refreshTokenHash: hash },
      include: { user: true },
    });
    const now = new Date();
    if (!session || session.revokedAt || session.expiresAt <= now) {
      throw new UnauthorizedException('Sesi tidak berlaku.');
    }
    const next = this.tokens.generateRefreshToken();
    await this.prisma.session.update({
      where: { id: session.id },
      data: { revokedAt: now },
    });
    // Reuse detection: bila token lama dipakai lagi, ia sudah revoked → cabut total.
    const created = await this.prisma.session.create({
      data: {
        userId: session.userId,
        refreshTokenHash: next.hash,
        expiresAt: addMinutes(now, AUTH_RULES.REFRESH_TTL_DAYS * 24 * 60),
        ipAddress: ip,
        userAgent,
      },
    });
    await this.audit.record(AUDIT_ACTIONS.REFRESH_ROTATED, {
      actorId: session.userId,
      targetId: created.id,
    });
    const accessToken = await this.tokens.signAccess({
      sub: session.userId,
      role: session.user.role,
      sid: created.id,
    });
    return { accessToken, refreshToken: next.raw };
  }

  async reuseDetected(rawToken: string): Promise<boolean> {
    const hash = this.tokens.hashToken(rawToken);
    const session = await this.prisma.session.findUnique({
      where: { refreshTokenHash: hash },
    });
    return !!session?.revokedAt;
  }

  // Refresh token yang sudah dirotasi dipakai lagi = sesi dicuri.
  // Cabut seluruh sesi user agar penyerang kehilangan akses.
  async revokeCompromised(rawToken: string): Promise<void> {
    const hash = this.tokens.hashToken(rawToken);
    const session = await this.prisma.session.findUnique({
      where: { refreshTokenHash: hash },
    });
    if (!session) return;
    await this.revokeAllSessions(session.userId);
    await this.audit.record(AUDIT_ACTIONS.REFRESH_REUSED, {
      actorId: session.userId,
      targetId: session.id,
    });
  }

  async revokeAllSessions(userId: string): Promise<void> {
    await this.prisma.session.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async logout(rawToken: string | undefined): Promise<void> {
    if (!rawToken) return;
    const hash = this.tokens.hashToken(rawToken);
    const session = await this.prisma.session.findUnique({
      where: { refreshTokenHash: hash },
    });
    if (!session || session.revokedAt) return;
    await this.prisma.session.update({
      where: { id: session.id },
      data: { revokedAt: new Date() },
    });
    await this.audit.record(AUDIT_ACTIONS.LOGOUT, {
      actorId: session.userId,
      targetId: session.id,
    });
  }

  // Forgot-password selalu merespons sukses (tidak membocorkan keterdaftar­an).
  async forgotPassword(email: string): Promise<void> {
    const normalized = email.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({
      where: { email: normalized },
    });
    if (!user) return;
    const { raw, hash } = this.tokens.generateResetToken();
    // Satu user satu token aktif: cabut token lama yang belum dipakai.
    await this.prisma.passwordResetToken.updateMany({
      where: { userId: user.id, usedAt: null },
      data: { usedAt: new Date() },
    });
    const expiresAt = addMinutes(new Date(), AUTH_RULES.RESET_TTL_MINUTES);
    await this.prisma.passwordResetToken.create({
      data: { userId: user.id, tokenHash: hash, expiresAt },
    });
    await this.audit.record(AUDIT_ACTIONS.PASSWORD_RESET_REQUESTED, {
      actorId: user.id,
      targetId: user.id,
    });
    // Di dunia nyata ini URL frontend; di Tahap 2 cukup diteruskan ke adapter.
    const resetUrl = `reset?token=${raw}`;
    await this.sendEmail(user.id, () =>
      this.email.sendPasswordReset({ to: user.email, resetUrl, expiresAt }),
    );
  }

  async resetPassword(rawToken: string, newPassword: string): Promise<void> {
    const hash = this.tokens.hashToken(rawToken);
    const record = await this.prisma.passwordResetToken.findUnique({
      where: { tokenHash: hash },
    });
    const now = new Date();
    if (!record || record.usedAt || record.expiresAt <= now) {
      throw new GoneException('Tautan reset tidak berlaku.');
    }
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: record.userId },
        data: {
          passwordHash: await this.passwords.hash(newPassword),
          failedLoginCount: 0,
          lockedUntil: null,
        },
      }),
      this.prisma.passwordResetToken.update({
        where: { id: record.id },
        data: { usedAt: now },
      }),
    ]);
    await this.audit.record(AUDIT_ACTIONS.PASSWORD_RESET_COMPLETED, {
      actorId: record.userId,
      targetId: record.userId,
    });
    // Reset berhasil mencabut semua sesi (indikasi kredensial berganti tangan).
    await this.revokeAllSessions(record.userId);
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Pengguna tidak ditemukan.');
    return {
      id: user.id,
      email: user.email,
      role: user.role,
      status: user.status,
    };
  }

  // Superadmin memaksa logout satu sesi milik user lain (target + actor diaudit).
  async forceLogout(actorId: string, targetSessionId: string): Promise<void> {
    const session = await this.prisma.session.findUnique({
      where: { id: targetSessionId },
    });
    if (!session || session.revokedAt) {
      throw new NotFoundException('Sesi tidak ditemukan.');
    }
    await this.prisma.session.update({
      where: { id: session.id },
      data: { revokedAt: new Date() },
    });
    await this.audit.record(AUDIT_ACTIONS.FORCED_LOGOUT, {
      actorId,
      targetId: session.id,
    });
  }

  private async registerFailedLogin(userId: string): Promise<void> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
    });
    const failed = user.failedLoginCount + 1;
    const locked =
      failed >= AUTH_RULES.MAX_FAILED_LOGINS
        ? addMinutes(new Date(), AUTH_RULES.LOCK_MINUTES)
        : null;
    await this.prisma.user.update({
      where: { id: userId },
      data: { failedLoginCount: failed, lockedUntil: locked },
    });
    await this.audit.record(AUDIT_ACTIONS.LOGIN_FAILED, {
      actorId: userId,
      targetId: userId,
    });
    if (locked) {
      await this.audit.record(AUDIT_ACTIONS.ACCOUNT_LOCKED, {
        actorId: userId,
        targetId: userId,
      });
    }
  }

  private async issueChallenge(userId: string, email: string): Promise<LoginResult> {
    // otpHash diisi placeholder lalu ditimpa kode asli di sendChallengeCode
    // dalam alur yang sama (tidak pernah terekspos ke client).
    const placeholder = await this.tokens.hashSecret(`pending:${userId}:${Date.now()}`);
    const challenge = await this.prisma.otpChallenge.create({
      data: {
        userId,
        otpHash: placeholder,
        expiresAt: addMinutes(new Date(), AUTH_RULES.OTP_TTL_MINUTES),
      },
    });
    return this.sendChallengeCode(challenge.id, email);
  }

  private async sendChallengeCode(
    challengeId: string,
    email: string,
  ): Promise<LoginResult> {
    const code = this.tokens.generateOtp();
    const now = new Date();
    const expiresAt = addMinutes(now, AUTH_RULES.OTP_TTL_MINUTES);
    await this.prisma.otpChallenge.update({
      where: { id: challengeId },
      data: {
        otpHash: await this.tokens.hashSecret(code),
        expiresAt,
        lastSentAt: now,
      },
    });
    const challenge = await this.prisma.otpChallenge.findUniqueOrThrow({
      where: { id: challengeId },
    });
    await this.sendEmail(challenge.userId, () =>
      this.email.sendOtp({ to: email, code, expiresAt }),
    );
    await this.audit.record(AUDIT_ACTIONS.OTP_SENT, {
      actorId: challenge.userId,
      targetId: challengeId,
    });
    return { status: 'OTP_REQUIRED', challengeId, expiresAt };
  }

  // 3 kegagalan kirim email beruntun → kunci 15 menit + audit log (PRD §4.1).
  private async sendEmail(userId: string, send: () => Promise<void>): Promise<void> {
    try {
      await send();
      await this.prisma.user.update({
        where: { id: userId },
        data: { failedEmailCount: 0 },
      });
    } catch (error) {
      const user = await this.prisma.user.findUniqueOrThrow({
        where: { id: userId },
      });
      const failed = user.failedEmailCount + 1;
      const locked =
        failed >= AUTH_RULES.MAX_FAILED_EMAILS
          ? addMinutes(new Date(), AUTH_RULES.LOCK_MINUTES)
          : null;
      await this.prisma.user.update({
        where: { id: userId },
        data: { failedEmailCount: failed, lockedUntil: locked },
      });
      await this.audit.record(AUDIT_ACTIONS.EMAIL_SEND_FAILED, {
        actorId: userId,
        targetId: userId,
      });
      if (locked) {
        await this.audit.record(AUDIT_ACTIONS.ACCOUNT_LOCKED, {
          actorId: userId,
          targetId: userId,
        });
        throw new ForbiddenException('Akun dikunci sementara. Coba lagi nanti.');
      }
      throw error;
    }
  }

  private async openSession(user: {
    id: string;
    email: string;
    role: Role;
    status: AccountStatus;
  }): Promise<VerifyResult> {
    // Maks 3 sesi aktif; sesi ke-4 mencabut sesi terlama (PRD §4.1).
    const active = await this.prisma.session.findMany({
      where: { userId: user.id, revokedAt: null },
      orderBy: { createdAt: 'asc' },
    });
    if (active.length >= AUTH_RULES.MAX_SESSIONS) {
      const oldest = active[0];
      await this.prisma.session.update({
        where: { id: oldest.id },
        data: { revokedAt: new Date() },
      });
      await this.audit.record(AUDIT_ACTIONS.SESSION_REVOKED_OLDEST, {
        actorId: user.id,
        targetId: oldest.id,
      });
    }
    const { raw, hash } = this.tokens.generateRefreshToken();
    const now = new Date();
    const created = await this.prisma.session.create({
      data: {
        userId: user.id,
        refreshTokenHash: hash,
        expiresAt: addMinutes(now, AUTH_RULES.REFRESH_TTL_DAYS * 24 * 60),
      },
    });
    await this.prisma.user.update({
      where: { id: user.id },
      data: { failedLoginCount: 0, lockedUntil: null },
    });
    const accessToken = await this.tokens.signAccess({
      sub: user.id,
      role: user.role,
      sid: created.id,
    });
    return {
      accessToken,
      refreshToken: raw,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        status: user.status,
      },
    };
  }
}
