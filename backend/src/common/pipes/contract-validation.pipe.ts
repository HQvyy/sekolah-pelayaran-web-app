import {
  BadRequestException,
  Injectable,
  ValidationError,
  ValidationPipe,
} from '@nestjs/common';
import { ErrorCode } from '../envelope';

// ValidationPipe global dengan format error kontrak:
// `{ error: { code: VALIDATION_ERROR, message, details[{field,code,message}], requestId } }`.
@Injectable()
export class ContractValidationPipe extends ValidationPipe {
  constructor() {
    super({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
      exceptionFactory: (errors: ValidationError[]) =>
        new BadRequestException({
          code: ErrorCode.VALIDATION_ERROR,
          message: 'Data yang dikirim tidak valid.',
          details: ContractValidationPipe.flatten(errors),
        }),
    });
  }

  private static flatten(errors: ValidationError[], parent = '') {
    const details: { field?: string; code: string; message: string }[] = [];
    for (const error of errors) {
      const field = parent
        ? `${parent}.${error.property}`
        : error.property;
      if (error.constraints) {
        for (const [kind, message] of Object.entries(error.constraints)) {
          details.push({
            field,
            code: ContractValidationPipe.codeFor(kind),
            message,
          });
        }
      }
      if (error.children?.length) {
        details.push(...ContractValidationPipe.flatten(error.children, field));
      }
    }
    return details;
  }

  private static codeFor(kind: string): string {
    const upper = kind
      .replace(/([a-z])([A-Z])/g, '$1_$2')
      .toUpperCase();
    const known = new Set([
      'IS_STRING',
      'IS_INT',
      'IS_NUMBER',
      'IS_BOOLEAN',
      'IS_EMAIL',
      'IS_UUID',
      'IS_DATE',
      'IS_ENUM',
      'MIN',
      'MAX',
      'MIN_LENGTH',
      'MAX_LENGTH',
      'IS_NOT_EMPTY',
      'MATCHES',
      'WHITELIST_VALIDATION',
    ]);
    if (known.has(upper)) return upper;
    if (upper.includes('REQUIRED') || upper.includes('NOT_EMPTY'))
      return 'REQUIRED';
    return 'INVALID';
  }
}
