import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { randomUUID } from 'node:crypto';

// Setiap request mendapat requestId: dipakai di header respons
// `X-Request-Id` dan body error `{ error: { ..., requestId } }`.
@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(req: Request, _res: Response, next: NextFunction): void {
    const header = req.headers['x-request-id'];
    const incoming = Array.isArray(header) ? header[0] : header;
    (req as Request & { requestId: string }).requestId =
      incoming && incoming.trim().length > 0 ? incoming : randomUUID();
    next();
  }
}
