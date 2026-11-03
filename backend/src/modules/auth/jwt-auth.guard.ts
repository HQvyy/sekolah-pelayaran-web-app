import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { TokenService } from './token.service';
import { PrismaService } from '../../database/prisma.service';
import { AccountStatus } from '@prisma/client';
import { IS_PUBLIC_KEY } from './public.decorator';

// Guard autentikasi: access token via Authorization Bearer (keputusan dikunci).
// Melekat pada request: user { id, role, sessionId }. Menolak token dari sesi
// yang sudah dicabut serta akun yang tidak ACTIVE.
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly tokens: TokenService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;
    const req = context.switchToHttp().getRequest<Request>();
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      throw new UnauthorizedException('Autentikasi diperlukan.');
    }
    const token = header.slice('Bearer '.length).trim();
    let payload;
    try {
      payload = await this.tokens.verifyAccess(token);
    } catch {
      throw new UnauthorizedException('Token tidak valid atau kedaluwarsa.');
    }
    const session = await this.prisma.session.findUnique({
      where: { id: payload.sid },
      include: { user: true },
    });
    if (!session || session.revokedAt || session.userId !== payload.sub) {
      throw new UnauthorizedException('Sesi tidak berlaku.');
    }
    if (session.user.status !== AccountStatus.ACTIVE) {
      throw new UnauthorizedException('Akun tidak aktif.');
    }
    (req as Request & { user?: unknown }).user = {
      id: payload.sub,
      role: payload.role,
      sessionId: payload.sid,
    };
    return true;
  }
}
