import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { Role } from '@prisma/client';
import { ROLES_KEY } from './roles.decorator';

// Guard otorisasi: memeriksa role server-side setelah JwtAuthGuard.
// Tanpa @Roles → endpoint butuh login saja. Dengan @Roles → role harus cocok.
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required || required.length === 0) return true;
    const req = context.switchToHttp().getRequest<Request>();
    const user = (req as Request & { user?: { role?: Role } }).user;
    if (!user?.role || !required.includes(user.role)) {
      throw new ForbiddenException('Tidak memiliki izin.');
    }
    return true;
  }
}
