import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class LoginDto {
  @IsEmail({}, { message: 'Format email tidak valid.' })
  email!: string;

  @IsString()
  @IsNotEmpty({ message: 'Password wajib diisi.' })
  password!: string;
}
