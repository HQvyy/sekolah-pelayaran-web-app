import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import configuration from './config/configuration';
import { validationSchema } from './config/env.validation';
import { DatabaseModule } from './database/database.module';
import { HealthModule } from './health/health.module';
import { AuditModule } from './modules/audit/audit.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { CohortsModule } from './modules/cohorts/cohorts.module';
import { ContentModule } from './modules/content/content.module';
import { VideosModule } from './modules/videos/videos.module';
import { LiveLessonsModule } from './modules/live-lessons/live-lessons.module';
import { ConferenceModule } from './modules/conference/conference.module';
import { AssessmentsModule } from './modules/assessments/assessments.module';

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
    // Di NODE_ENV=test, batas dilonggarkan agar E2E tidak saling menghabiskan
    // kuota dari IP yang sama; proteksi nyata diuji via test header 429.
    ThrottlerModule.forRoot([
      {
        name: 'default',
        limit:
          process.env.NODE_ENV === 'test'
            ? 10000
            : Number(process.env.THROTTLE_DEFAULT_LIMIT ?? 100),
        ttl: Number(process.env.THROTTLE_DEFAULT_TTL_MS ?? 60000),
      },
    ]),
    DatabaseModule,
    AuditModule,
    NotificationsModule,
    AuthModule,
    UsersModule,
    CohortsModule,
    VideosModule,
    ContentModule,
    ConferenceModule,
    LiveLessonsModule,
    AssessmentsModule,
    HealthModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
