import { Type } from 'class-transformer';
import { IsBoolean, IsEnum, IsOptional, IsString } from 'class-validator';
import { AccountStatus, Role } from '@prisma/client';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export class ListUsersQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(Role)
  role?: Role;

  @IsOptional()
  @IsEnum(AccountStatus)
  status?: AccountStatus;
}

// Field yang boleh di-sort dari client (allowlist — bukan nama kolom bebas).
export const USER_SORTABLE_FIELDS = ['createdAt', 'email'] as const;

export class UpdateUserStatusDto {
  @IsEnum(AccountStatus)
  status!: AccountStatus;
}

export class UpdateUserRoleDto {
  @IsEnum(Role)
  role!: Role;
}

export class CreateUserByAdminDto {
  @IsString()
  @IsOptional()
  email?: string;

  @IsOptional()
  @IsString()
  password?: string;

  @IsEnum(Role)
  role!: Role;
}

export class CreateUserBodyDto {
  @IsString()
  email!: string;

  @IsString()
  password!: string;

  @IsEnum(Role)
  role!: Role;
}

export class VerifyUserDto {
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  verified: boolean = true;
}
