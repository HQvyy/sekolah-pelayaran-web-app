import {
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { SERVICE_RULES } from '../services.rules';

export class CreateRatingDto {
  @IsUUID('4')
  lessonId!: string;

  @Type(() => Number)
  @IsInt()
  @Min(SERVICE_RULES.RATING_MIN)
  @Max(SERVICE_RULES.RATING_MAX)
  score!: number;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  feedback?: string;
}

export class UpdateRatingDto {
  @Type(() => Number)
  @IsInt()
  @Min(SERVICE_RULES.RATING_MIN)
  @Max(SERVICE_RULES.RATING_MAX)
  score!: number;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  feedback?: string;
}

export class IssueCertificateDto {
  @IsUUID('4')
  userId!: string;

  @IsUUID('4')
  cohortId!: string;

  @IsString()
  @MaxLength(200)
  fullName!: string;
}

export class CreateTicketDto {
  @IsString()
  @MaxLength(SERVICE_RULES.TICKET_TITLE_MAX)
  title!: string;

  @IsString()
  @MaxLength(SERVICE_RULES.TICKET_DESC_MAX)
  description!: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  category?: string;
}

export class UpdateTicketDto {
  @IsOptional()
  @IsString()
  @MaxLength(SERVICE_RULES.TICKET_TITLE_MAX)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(SERVICE_RULES.TICKET_DESC_MAX)
  description?: string;
}

export class ChangeTicketStatusDto {
  @IsString()
  status!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  comment?: string;
}
