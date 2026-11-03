import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EmailService } from './email.service';
import { FakeEmailService } from './fake-email.service';
import { NotificationsCenter } from './notifications-center.service';
import { MyNotificationsController } from './my-notifications.controller';

// Provider dipilih via EMAIL_PROVIDER. Selama provider real belum tersedia,
// 'fake' dipakai untuk dev/test. Production wajib provider real.
@Global()
@Module({
  controllers: [MyNotificationsController],
  providers: [
    FakeEmailService,
    NotificationsCenter,
    {
      provide: 'EMAIL_SERVICE',
      useFactory: (fake: FakeEmailService, config: ConfigService) => {
        const provider = config.get<string>('app.emailProvider', 'fake');
        if (provider === 'fake') return fake as EmailService;
        throw new Error(
          `EMAIL_PROVIDER '${provider}' belum dikonfigurasi. ` +
            `Sediakan implementasi real sebelum dipakai.`,
        );
      },
      inject: [FakeEmailService, ConfigService],
    },
  ],
  exports: ['EMAIL_SERVICE', FakeEmailService, NotificationsCenter],
})
export class NotificationsModule {}
