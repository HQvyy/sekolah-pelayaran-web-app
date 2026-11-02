import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthThrottle } from './auth.throttle';
import type { Request, Response } from 'express';
import { Role } from '@prisma/client';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ResendOtpDto, VerifyOtpDto } from './dto/otp.dto';
import { ForgotPasswordDto, ResetPasswordDto } from './dto/password.dto';
import { Public } from './public.decorator';
import { Roles } from './roles.decorator';
import { CurrentUser, RequestUser } from './current-user.decorator';
import { ok } from '../../common/envelope';
import { AUTH_RULES, AUTH_THROTTLE } from './auth.rules';

// Nama cookie refresh (keputusan dikunci: HttpOnly + Secure + SameSite=Lax).
export const REFRESH_COOKIE = 'spli_refresh';

function refreshCookieOptions(req: Request) {
  const secure =
    (req.headers['x-forwarded-proto'] as string | undefined) === 'https' ||
    process.env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    secure,
    sameSite: 'lax' as const,
    path: '/api/v1/auth',
    maxAge: AUTH_RULES.REFRESH_TTL_DAYS * 24 * 60 * 60 * 1000,
  };
}

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Post('register')
  @ApiOperation({ summary: 'Registrasi mandiri Taruna + consent PDP' })
  async register(@Body() dto: RegisterDto) {
    return ok(await this.auth.register(dto.email, dto.password, dto.consent));
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @AuthThrottle(AUTH_THROTTLE.login.limit, AUTH_THROTTLE.login.ttlMs)
  @ApiOperation({ summary: 'Validasi kredensial, mulai proses 2FA' })
  async login(@Body() dto: LoginDto) {
    return ok(await this.auth.login(dto.email, dto.password));
  }

  @Public()
  @Post('2fa/verify')
  @HttpCode(HttpStatus.OK)
  @AuthThrottle(AUTH_THROTTLE.otpVerify.limit, AUTH_THROTTLE.otpVerify.ttlMs)
  @ApiOperation({ summary: 'Verifikasi OTP, selesaikan login' })
  async verify(
    @Body() dto: VerifyOtpDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.auth.verifyOtp(dto.challengeId, dto.code);
    res.cookie(REFRESH_COOKIE, result.refreshToken, refreshCookieOptions(req));
    return ok({
      accessToken: result.accessToken,
      user: result.user,
    });
  }

  @Public()
  @Post('2fa/resend')
  @HttpCode(HttpStatus.OK)
  @AuthThrottle(AUTH_THROTTLE.otpResend.limit, AUTH_THROTTLE.otpResend.ttlMs)
  @ApiOperation({ summary: 'Kirim ulang OTP (throttle 60 detik + rate limit)' })
  async resend(@Body() dto: ResendOtpDto) {
    return ok(await this.auth.resendOtp(dto.challengeId));
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @AuthThrottle(AUTH_THROTTLE.refresh.limit, AUTH_THROTTLE.refresh.ttlMs)
  @ApiOperation({ summary: 'Rotasi refresh token (sekali pakai)' })
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const raw = req.cookies?.[REFRESH_COOKIE] as string | undefined;
    if (!raw) {
      // Guard tidak dipakai di sini (belum ada access token); validasi manual.
      const { UnauthorizedException } = await import('@nestjs/common');
      throw new UnauthorizedException('Sesi tidak berlaku.');
    }
    if (await this.auth.reuseDetected(raw)) {
      // Reuse = indikasi pencurian: cabut semua sesi user lalu tolak.
      await this.auth.revokeCompromised(raw);
      const { UnauthorizedException } = await import('@nestjs/common');
      throw new UnauthorizedException('Sesi tidak berlaku.');
    }
    const result = await this.auth.refresh(
      raw,
      req.ip,
      req.headers['user-agent'],
    );
    res.cookie(REFRESH_COOKIE, result.refreshToken, refreshCookieOptions(req));
    return ok({ accessToken: result.accessToken });
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Logout + cabut refresh token/sesi' })
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    await this.auth.logout(req.cookies?.[REFRESH_COOKIE]);
    res.clearCookie(REFRESH_COOKIE, { path: '/api/v1/auth' });
    return ok({ loggedOut: true });
  }

  @Public()
  @Post('password/forgot')
  @HttpCode(HttpStatus.OK)
  @AuthThrottle(AUTH_THROTTLE.forgotPassword.limit, AUTH_THROTTLE.forgotPassword.ttlMs)
  @ApiOperation({ summary: 'Minta email reset (selalu sukses, anti-enumerasi)' })
  async forgot(@Body() dto: ForgotPasswordDto) {
    await this.auth.forgotPassword(dto.email);
    return ok({ sent: true });
  }

  @Public()
  @Post('password/reset')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset password via token sekali pakai (1 jam)' })
  async reset(@Body() dto: ResetPasswordDto) {
    await this.auth.resetPassword(dto.token, dto.newPassword);
    return ok({ reset: true });
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Profil + role pengguna aktif' })
  async me(@CurrentUser() user: RequestUser) {
    return ok(await this.auth.me(user.id));
  }

  @Delete('sessions/:sessionId')
  @Roles(Role.SUPERADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Force logout sesi (Superadmin)' })
  async forceLogout(
    @Param('sessionId') sessionId: string,
    @CurrentUser() user: RequestUser,
  ) {
    await this.auth.forceLogout(user.id, sessionId);
    return ok({ revoked: true });
  }
}
