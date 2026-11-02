import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import configuration from './config/configuration';
import { validationSchema } from './config/env.validation';
import { DatabaseModule } from './database/database.module';
import { HealthModule } from './health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      load: [configuration],
      validationSchema,
      validationOptions: {
        abortEarly: false,
        allowUnknown: true,
      },
    }),
    // Rate limit global default dari konfigurasi; endpoint sensitif
    // (login, OTP, reset) mendapat batas sendiri pada tahap auth.
    ThrottlerModule.forRoot([
      {
        name: 'default',
        limit: Number(process.env.THROTTLE_DEFAULT_LIMIT ?? 100),
        ttl: Number(process.env.THROTTLE_DEFAULT_TTL_MS ?? 60000),
      },
    ]),
    DatabaseModule,
    HealthModule,
  ],
})
export class AppModule {}
