import { AttendanceStatus, LessonStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class CreateLessonDto {
  @IsUUID('4')
  cohortId!: string;

  @IsString()
  @MaxLength(300)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;

  @IsDateString({}, { message: 'startsAt harus ISO 8601.' })
  startsAt!: string;

  @IsDateString({}, { message: 'endsAt harus ISO 8601.' })
  endsAt!: string;

  // Diisi Admin/Superadmin untuk menunjuk mentor pemilik kelas.
  // Mentor yang membuat jadwal otomatis menjadi pemilik (diabaikan bila diisi).
  @IsOptional()
  @IsUUID('4')
  mentorId?: string;
}

export class UpdateLessonDto {
  @IsOptional()
  @IsString()
  @MaxLength(300)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;

  @IsOptional()
  @IsDateString({}, { message: 'startsAt harus ISO 8601.' })
  startsAt?: string;

  @IsOptional()
  @IsDateString({}, { message: 'endsAt harus ISO 8601.' })
  endsAt?: string;

  @IsOptional()
  @IsEnum(LessonStatus)
  status?: LessonStatus;
}

export class ListLessonsQueryDto {
  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsUUID('4')
  cohortId?: string;

  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;

  @IsOptional()
  @Type(() => Number)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  pageSize?: number;
}

export class CorrectAttendanceDto {
  @IsUUID('4')
  userId!: string;

  @IsEnum(AttendanceStatus)
  status!: AttendanceStatus;
}
