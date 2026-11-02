import { registerAs } from '@nestjs/config';

export interface AppConfig {
  nodeEnv: string;
  port: number;
  apiPrefix: string;
  corsOrigins: string[];
  swaggerEnabled: boolean;
  logLevel: string;
  throttleLimit: number;
  throttleTtlMs: number;
  passingGrade: number;
  maxAttempts: number;
  attemptCooldownHours: number;
  remedialAfterFailures: number;
  emailProvider: string;
  emailFrom: string;
}

function parseOrigins(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);
}

export default registerAs(
  'app',
  (): AppConfig => ({
    nodeEnv: process.env.NODE_ENV ?? 'development',
    port: Number(process.env.PORT ?? 3000),
    apiPrefix: process.env.API_PREFIX ?? 'api/v1',
    corsOrigins: parseOrigins(process.env.CORS_ORIGINS),
    swaggerEnabled: (process.env.SWAGGER_ENABLED ?? 'true') === 'true',
    logLevel: process.env.LOG_LEVEL ?? 'log',
    throttleLimit: Number(process.env.THROTTLE_DEFAULT_LIMIT ?? 100),
    throttleTtlMs: Number(process.env.THROTTLE_DEFAULT_TTL_MS ?? 60000),
    // Aturan CBT default — KONFIGURASI SEMENTARA (menunggu konfirmasi klien).
    // Bukan konstanta final; perubahan nilai tidak mengubah kontrak API.
    passingGrade: Number(process.env.PASSING_GRADE ?? 70),
    maxAttempts: Number(process.env.MAX_ATTEMPTS ?? 3),
    attemptCooldownHours: Number(process.env.ATTEMPT_COOLDOWN_HOURS ?? 24),
    remedialAfterFailures: Number(process.env.REMEDIAL_AFTER_FAILURES ?? 3),
    emailProvider: process.env.EMAIL_PROVIDER ?? 'fake',
    emailFrom: process.env.EMAIL_FROM ?? '',
  }),
);
