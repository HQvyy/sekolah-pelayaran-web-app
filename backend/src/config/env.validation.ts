import * as Joi from 'joi';

// Skema validasi environment. Dijalankan saat bootstrap via ConfigModule;
// aplikasi gagal start dengan pesan jelas bila konfigurasi tidak valid.
export const validationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'test', 'staging', 'production')
    .default('development'),
  PORT: Joi.number().port().default(3000),
  API_PREFIX: Joi.string()
    .pattern(/^[a-z0-9/_-]+$/i)
    .default('api/v1'),
  // DATABASE_URL wajib di staging/production; opsional di dev/test agar
  // aplikasi tetap bisa boot dan /ready melaporkan status database.
  DATABASE_URL: Joi.when('NODE_ENV', {
    is: Joi.valid('staging', 'production'),
    then: Joi.string().uri({ scheme: ['postgres', 'postgresql'] }).required(),
    otherwise: Joi.string().allow('').optional(),
  }),
  CORS_ORIGINS: Joi.string().allow('').default(''),
  SWAGGER_ENABLED: Joi.boolean().truthy('true').falsy('false').default(true),
  LOG_LEVEL: Joi.string()
    .valid('verbose', 'debug', 'log', 'warn', 'error', 'fatal')
    .default('log'),
  THROTTLE_DEFAULT_LIMIT: Joi.number().integer().min(1).default(100),
  THROTTLE_DEFAULT_TTL_MS: Joi.number().integer().min(1000).default(60000),
  // Aturan CBT default — konfigurasi sementara, menunggu konfirmasi klien.
  PASSING_GRADE: Joi.number().min(0).max(100).default(70),
  MAX_ATTEMPTS: Joi.number().integer().min(1).default(3),
  ATTEMPT_COOLDOWN_HOURS: Joi.number().min(0).default(24),
  REMEDIAL_AFTER_FAILURES: Joi.number().integer().min(1).default(3),
  // Provider email: 'fake' hanya untuk dev/test. Di production aplikasi TIDAK
  // BOLEH start dengan provider palsu (OTP/reset tercetak ke log, tidak terkirim).
  EMAIL_PROVIDER: Joi.when('NODE_ENV', {
    is: Joi.valid('staging', 'production'),
    then: Joi.string().valid('smtp').required(),
    otherwise: Joi.string().valid('fake', 'smtp').default('fake'),
  }),
  EMAIL_FROM: Joi.string().allow('').default(''),
  // Secret penandatangan access token: tidak ada default; wajib diisi agar
  // aplikasi tidak pernah berjalan dengan secret yang bisa ditebak.
  JWT_SECRET: Joi.string().min(32).required(),
  // Bunny Stream: fake default untuk dev/test; produksi wajib kredensial via
  // secret manager (tanpa kredensial → endpoint integrasi gagal aman 503).
  // Fake provider juga DITOLAK di staging/production: aplikasi harus start
  // bersih atau gagal terang-terangan, bukan mengembalikan token palsu.
  BUNNY_USE_FAKE: Joi.when('NODE_ENV', {
    is: Joi.valid('staging', 'production'),
    then: Joi.boolean().truthy('true').falsy('false').default(false).invalid(true),
    otherwise: Joi.boolean().truthy('true').falsy('false').default(true),
  }),
  BUNNY_API_KEY: Joi.when('NODE_ENV', {
    is: Joi.valid('staging', 'production'),
    then: Joi.string().required(),
    otherwise: Joi.string().allow('').default(''),
  }),
  BUNNY_LIBRARY_ID: Joi.when('NODE_ENV', {
    is: Joi.valid('staging', 'production'),
    then: Joi.string().required(),
    otherwise: Joi.string().allow('').default(''),
  }),
  BUNNY_CDN_HOSTNAME: Joi.when('NODE_ENV', {
    is: Joi.valid('staging', 'production'),
    then: Joi.string().hostname().required(),
    otherwise: Joi.string().allow('').default(''),
  }),
  // Konferensi Live Lesson (Jitsi default; fake dev/test). Tanpa kredensial
  // Jitsi publik tetap jalan (ruang publik); JWT self-host menyusul bila perlu.
  CONFERENCE_USE_FAKE: Joi.when('NODE_ENV', {
    is: Joi.valid('staging', 'production'),
    then: Joi.boolean().truthy('true').falsy('false').default(false).invalid(true),
    otherwise: Joi.boolean().truthy('true').falsy('false').default(true),
  }),
  JITSI_DOMAIN: Joi.string().allow('').default(''),
});
