import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Match } from '../../../common/validators/match.validator';
import { AUTH_RULES } from '../auth.rules';

export class ForgotPasswordDto {
  @IsEmail({}, { message: 'Format email tidak valid.' })
  email!: string;
}

export class ResetPasswordDto {
  @IsString()
  @IsNotEmpty({ message: 'Token reset wajib diisi.' })
  token!: string;

  @IsString()
  @MinLength(AUTH_RULES.PASSWORD_MIN_LENGTH, {
    message: 'Password minimal 8 karakter.',
  })
  @MaxLength(128)
  @Match(/(?=.*[A-Za-z])(?=.*\d)/, {
    message: 'Password harus mengandung huruf dan angka.',
  })
  newPassword!: string;
}
