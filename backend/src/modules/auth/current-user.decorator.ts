import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';
import { Role } from '@prisma/client';

export interface RequestUser {
  id: string;
  role: Role;
  sessionId: string;
}

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): RequestUser => {
    const req = ctx.switchToHttp().getRequest<Request>();
    return (req as Request & { user: RequestUser }).user;
  },
);
