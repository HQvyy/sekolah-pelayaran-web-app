import { IsNotEmpty, IsString, IsUUID, Matches } from 'class-validator';
import { AUTH_RULES } from '../auth.rules';

export class VerifyOtpDto {
  @IsUUID('4', { message: 'Challenge tidak valid.' })
  challengeId!: string;

  @IsString()
  @IsNotEmpty({ message: 'Kode OTP wajib diisi.' })
  @Matches(new RegExp(`^\\d{${AUTH_RULES.OTP_LENGTH}}$`), {
    message: 'Kode OTP harus 6 digit angka.',
  })
  code!: string;
}

export class ResendOtpDto {
  @IsUUID('4', { message: 'Challenge tidak valid.' })
  challengeId!: string;
}
