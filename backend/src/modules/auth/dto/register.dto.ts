import { IsBoolean, IsEmail, IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';
import { Match } from '../../../common/validators/match.validator';
import { AUTH_RULES } from '../auth.rules';

export class RegisterDto {
  @IsEmail({}, { message: 'Format email tidak valid.' })
  email!: string;

  @IsString()
  @MinLength(AUTH_RULES.PASSWORD_MIN_LENGTH, {
    message: 'Password minimal 8 karakter.',
  })
  @MaxLength(128)
  @Match(/(?=.*[A-Za-z])(?=.*\d)/, {
    message: 'Password harus mengandung huruf dan angka.',
  })
  password!: string;

  // Consent pemrosesan data pribadi (UU PDP) — wajib true.
  @IsBoolean({ message: 'Persetujuan pemrosesan data wajib diberikan.' })
  @IsNotEmpty({ message: 'Persetujuan pemrosesan data wajib diberikan.' })
  consent!: boolean;
}
