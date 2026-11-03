import {
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PublishStatus } from '@prisma/client';
import { CBT_RULES } from '../cbt.rules';

export class CreateAssessmentDto {
  @IsUUID('4')
  cohortId!: string;

  @Type(() => Number)
  @IsInt()
  @Min(CBT_RULES.MIN_LEVEL)
  @Max(CBT_RULES.MAX_LEVEL)
  level!: number;

  @IsString()
  @MaxLength(300)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;

  @Type(() => Number)
  @IsInt()
  @Min(CBT_RULES.MIN_DURATION_MINUTES)
  @Max(CBT_RULES.MAX_DURATION_MINUTES)
  durationMinutes!: number;

  @IsOptional()
  @IsEnum(PublishStatus)
  status?: PublishStatus;
}

export class UpdateAssessmentDto {
  @IsOptional()
  @IsString()
  @MaxLength(300)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(CBT_RULES.MIN_DURATION_MINUTES)
  @Max(CBT_RULES.MAX_DURATION_MINUTES)
  durationMinutes?: number;

  @IsOptional()
  @IsEnum(PublishStatus)
  status?: PublishStatus;
}

export class CreateQuestionDto {
  @IsEnum(['PG', 'ESSAY'])
  type!: 'PG' | 'ESSAY';

  @IsString()
  @MaxLength(5000)
  prompt!: string;

  @IsOptional()
  @Type(() => Number)
  weight?: number;

  @IsOptional()
  options?: { label: string; isCorrect?: boolean }[];
}

export class UpdateQuestionDto {
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  prompt?: string;

  @IsOptional()
  @Type(() => Number)
  weight?: number;
}

export class AutosaveAnswerDto {
  @IsOptional()
  @IsUUID('4')
  optionId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20000)
  essayText?: string;
}

export class SubmitAttemptDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  idempotencyKey?: string;
}

export class GradeEssayDto {
  @IsNumber()
  @Type(() => Number)
  score!: number;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  feedback?: string;
}

export class AttemptListQueryDto {
  @IsOptional()
  @IsDateString()
  from?: string;
}
