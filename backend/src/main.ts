import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { AppModule } from './app.module';
import type { AppConfig } from './config/configuration';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { ContractValidationPipe } from './common/pipes/contract-validation.pipe';
import { RequestIdMiddleware } from './common/middleware/request-id.middleware';
import { RequestLoggingInterceptor } from './common/interceptors/request-logging.interceptor';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  const logger = new Logger('Bootstrap');
  const config = app.get(ConfigService).getOrThrow<AppConfig>('app');

  app.use(new RequestIdMiddleware().use.bind(new RequestIdMiddleware()));
  app.use(helmet());
  app.use(cookieParser());

  // CORS allowlist dari environment; tolak origin di luar daftar.
  const origins = config.corsOrigins;
  app.enableCors({
    origin: (
      origin: string | undefined,
      callback: (err: Error | null, allow?: boolean) => void,
    ) => {
      if (!origin || origins.length === 0 || origins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`Origin tidak diizinkan: ${origin}`));
      }
    },
    credentials: true,
  });

  app.setGlobalPrefix(config.apiPrefix, {
    exclude: ['/', 'docs', 'docs-json'],
  });
  app.useGlobalPipes(new ContractValidationPipe());
  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalInterceptors(new RequestLoggingInterceptor());

  if (config.swaggerEnabled) {
    const document = SwaggerModule.createDocument(
      app,
      new DocumentBuilder()
        .setTitle('E-Learning Sekolah Pelaut Indonesia')
        .setDescription(
          'REST API backend (NestJS). Kontrak mengikuti docs/api-specification.md; ' +
            'bagian berlabel usulan/draft pada dokumen tersebut belum final.',
        )
        .setVersion('0.1.0')
        .addBearerAuth()
        .build(),
    );
    SwaggerModule.setup('docs', app, document);
  }

  await app.listen(config.port);
  logger.log(
    `Backend berjalan pada port ${config.port} (prefix /${config.apiPrefix}, env ${config.nodeEnv}).`,
  );
}

void bootstrap();
