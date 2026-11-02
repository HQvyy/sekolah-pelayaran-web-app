import { Injectable, Logger, NestInterceptor } from '@nestjs/common';
import type { ExecutionContext, CallHandler } from '@nestjs/common';
import type { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import type { Request, Response } from 'express';

// Logging request ringkas tanpa body/query (mencegah kebocoran
// password, OTP, token, atau data pribadi ke log).
@Injectable()
export class RequestLoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const ctx = context.switchToHttp();
    const req = ctx.getRequest<Request & { requestId?: string }>();
    const res = ctx.getResponse<Response>();
    const startedAt = Date.now();
    const requestId = req.requestId ?? 'unknown';

    return next.handle().pipe(
      tap({
        next: () => {
          this.logger.log(
            `[${requestId}] ${req.method} ${req.url} ${res.statusCode} ${Date.now() - startedAt}ms`,
          );
        },
        error: (error: unknown) => {
          const status =
            typeof error === 'object' &&
            error !== null &&
            'status' in error &&
            typeof (error as { status: unknown }).status === 'number'
              ? (error as { status: number }).status
              : 500;
          this.logger.warn(
            `[${requestId}] ${req.method} ${req.url} ${status} ${Date.now() - startedAt}ms`,
          );
        },
      }),
    );
  }
}
