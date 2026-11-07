import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';

// Membaca header `Idempotency-Key` (opsional, maks 100 karakter) dari request.
// Dipakai endpoint non-idempoten secara alami sesuai kontrak
// docs/backend-implementation-plan.md §6.1 butir 1:
//   PUT  /attempts/{attemptId}/answers/{questionId}
//   POST /tickets
//   POST /certificates
export const IdempotencyKey = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string | undefined => {
    const req = ctx.switchToHttp().getRequest<Request>();
    const raw = req.headers['idempotency-key'];
    if (Array.isArray(raw)) return raw[0];
    const value = typeof raw === 'string' ? raw.trim() : '';
    return value.length > 0 ? value.slice(0, 100) : undefined;
  },
);
