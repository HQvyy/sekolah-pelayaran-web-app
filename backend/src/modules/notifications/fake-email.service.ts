import { Injectable, Logger } from '@nestjs/common';
import {
  EmailService,
  SendOtpParams,
  SendPasswordResetParams,
  SendScheduleChangeParams,
} from './email.service';

// Fake untuk dev/test: mencatat pengiriman ke log + menyimpan pesan terakhir
// agar test dapat membaca OTP tanpa email nyata. Jangan klaim email terkirim
// sungguhan bila provider ini yang aktif.
@Injectable()
export class FakeEmailService implements EmailService {
  readonly providerName = 'fake';
  private readonly logger = new Logger(FakeEmailService.name);
  readonly sent: { kind: string; to: string; body: string }[] = [];
  failNext = 0;

  private record(kind: string, to: string, body: string): void {
    this.sent.push({ kind, to, body });
    this.logger.log(`[fake-email] ${kind} → ${to}`);
  }

  async sendOtp(params: SendOtpParams): Promise<void> {
    this.maybeFail('otp');
    // OTP dicatat hanya di log test/dev — tidak pernah di production.
    this.record('otp', params.to, params.code);
  }

  async sendPasswordReset(params: SendPasswordResetParams): Promise<void> {
    this.maybeFail('password-reset');
    this.record('password-reset', params.to, params.resetUrl);
  }

  async sendScheduleChange(params: SendScheduleChangeParams): Promise<void> {
    this.maybeFail('schedule-change');
    this.record('schedule-change', params.to, `${params.title}: ${params.detail}`);
  }

  lastOtpFor(to: string): string | undefined {
    const found = [...this.sent]
      .reverse()
      .find((item) => item.kind === 'otp' && item.to === to);
    return found?.body;
  }

  private maybeFail(kind: string): void {
    if (this.failNext > 0) {
      this.failNext -= 1;
      throw new Error(`fake email gagal terkirim (${kind})`);
    }
  }
}
