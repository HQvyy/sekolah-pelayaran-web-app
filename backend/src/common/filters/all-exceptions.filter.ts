import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ErrorCode, ErrorDetail, fail } from '../envelope';

// Filter global: mengubah SEMUA error menjadi envelope
// `{ error: { code, message, details, requestId } }` sesuai kontrak.
// Tidak pernah mengirim stack trace, query SQL, secret, atau data sensitif.
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const req = ctx.getRequest<Request & { requestId?: string }>();
    const res = ctx.getResponse<Response>();
    const requestId =
      req.requestId ??
      (req.headers['x-request-id'] as string | undefined) ??
      'unknown';

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let code: string = ErrorCode.INTERNAL_ERROR;
    let message = 'Terjadi kesalahan pada server.';
    let details: ErrorDetail[] = [];

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const body = exception.getResponse();
      ({ code, message, details } = this.fromHttpException(
        status,
        body,
        exception.message,
      ));
    } else {
      // Error tak terduga: log server-side saja, client hanya menerima pesan umum.
      this.logger.error(
        `[${requestId}] ${req.method} ${req.url} — unexpected error`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    res.status(status).json(fail(code, message, requestId, details));
  }

  private fromHttpException(
    status: number,
    body: unknown,
    fallbackMessage: string,
  ): { code: string; message: string; details: ErrorDetail[] } {
    if (typeof body === 'string') {
      return {
        code: this.codeFor(status),
        message: body,
        details: [],
      };
    }
    if (body !== null && typeof body === 'object') {
      const record = body as Record<string, unknown>;
      const rawDetails = Array.isArray(record.details)
        ? record.details
        : Array.isArray(record.errors)
          ? record.errors
          : [];
      const rawMessage = record.message;
      const message =
        typeof rawMessage === 'string'
          ? rawMessage
          : Array.isArray(rawMessage)
            ? rawMessage.map(String).join('; ')
            : fallbackMessage;
      const code =
        typeof record.code === 'string' ? record.code : this.codeFor(status);
      return { code, message, details: this.normalizeDetails(rawDetails) };
    }
    return {
      code: this.codeFor(status),
      message: fallbackMessage,
      details: [],
    };
  }

  private normalizeDetails(raw: unknown[]): ErrorDetail[] {
    return raw
      .filter((item): item is Record<string, unknown> => typeof item === 'object' && item !== null)
      .map((item) => ({
        field: typeof item.field === 'string' ? item.field : undefined,
        code:
          typeof item.code === 'string' ? item.code : ErrorCode.VALIDATION_ERROR,
        message: typeof item.message === 'string' ? item.message : String(item),
      }));
  }

  private codeFor(status: number): string {
    switch (status) {
      case HttpStatus.BAD_REQUEST:
        return ErrorCode.VALIDATION_ERROR;
      case HttpStatus.UNAUTHORIZED:
        return ErrorCode.UNAUTHORIZED;
      case HttpStatus.FORBIDDEN:
        return ErrorCode.FORBIDDEN;
      case HttpStatus.NOT_FOUND:
        return ErrorCode.NOT_FOUND;
      case HttpStatus.CONFLICT:
        return ErrorCode.CONFLICT;
      case HttpStatus.PAYLOAD_TOO_LARGE:
        return ErrorCode.PAYLOAD_TOO_LARGE;
      case HttpStatus.UNSUPPORTED_MEDIA_TYPE:
        return ErrorCode.UNSUPPORTED_MEDIA_TYPE;
      case HttpStatus.UNPROCESSABLE_ENTITY:
        return ErrorCode.UNPROCESSABLE;
      case HttpStatus.TOO_MANY_REQUESTS:
        return ErrorCode.RATE_LIMITED;
      case HttpStatus.SERVICE_UNAVAILABLE:
        return ErrorCode.SERVICE_UNAVAILABLE;
      case HttpStatus.GONE:
        return ErrorCode.GONE;
      default:
        return status >= 500
          ? ErrorCode.INTERNAL_ERROR
          : ErrorCode.VALIDATION_ERROR;
    }
  }
}
