import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { randomBytes, createHash, randomInt } from 'node:crypto';
import { AUTH_RULES } from './auth.rules';

export interface AccessPayload {
  sub: string;
  role: string;
  sid: string;
}

@Injectable()
export class TokenService {
  // Secret diambil dari environment via ConfigService; tidak ada default
  // hardcoded. Aplikasi gagal start bila JWT_SECRET belum diisi (validasi env).
  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  private accessSecret(): string {
    return this.config.getOrThrow<string>('JWT_SECRET');
  }

  async signAccess(payload: AccessPayload): Promise<string> {
    return this.jwt.signAsync(payload, {
      secret: this.accessSecret(),
      expiresIn: AUTH_RULES.ACCESS_TTL_SECONDS,
    });
  }

  async verifyAccess(token: string): Promise<AccessPayload> {
    return this.jwt.verifyAsync<AccessPayload>(token, {
      secret: this.accessSecret(),
    });
  }

  // Refresh token: opaque 256-bit, disimpan sebagai SHA-256 di DB.
  // Nilai mentah hanya dikirim via cookie HttpOnly — tidak pernah di log.
  generateRefreshToken(): { raw: string; hash: string } {
    const raw = randomBytes(32).toString('base64url');
    const hash = createHash('sha256').update(raw).digest('hex');
    return { raw, hash };
  }

  hashToken(raw: string): string {
    return createHash('sha256').update(raw).digest('hex');
  }

  generateOtp(): string {
    const max = 10 ** AUTH_RULES.OTP_LENGTH;
    return randomInt(0, max).toString().padStart(AUTH_RULES.OTP_LENGTH, '0');
  }

  async hashSecret(secret: string): Promise<string> {
    // OTP/reset memakai SHA-256 (perbandingan cepat, sekali pakai, TTL pendek).
    // Password tetap memakai argon2 (lihat PasswordService).
    return createHash('sha256').update(secret).digest('hex');
  }

  generateResetToken(): { raw: string; hash: string } {
    const raw = randomBytes(32).toString('base64url');
    return { raw, hash: this.hashToken(raw) };
  }
}
