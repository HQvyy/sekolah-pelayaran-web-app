import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { CohortsService } from './cohorts.service';
import {
  CreateCohortDto,
  EnrollUserDto,
  UpdateCohortDto,
} from './dto/cohorts.dto';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser, RequestUser } from '../auth/current-user.decorator';
import { ok } from '../../common/envelope';

@ApiTags('cohorts')
@ApiBearerAuth()
@Controller('cohorts')
export class CohortsController {
  constructor(private readonly cohorts: CohortsService) {}

  @Get()
  @Roles(Role.SUPERADMIN, Role.ADMIN, Role.MENTOR)
  @ApiOperation({ summary: 'Daftar Angkatan/Kelas' })
  async list() {
    return ok(await this.cohorts.list());
  }

  @Post()
  @Roles(Role.SUPERADMIN, Role.ADMIN)
  @ApiOperation({ summary: 'Buat Angkatan/Kelas' })
  async create(@Body() dto: CreateCohortDto, @CurrentUser() actor: RequestUser) {
    return ok(
      await this.cohorts.create(dto.code, dto.name, dto.description, actor.id),
    );
  }

  @Get(':cohortId')
  @Roles(Role.SUPERADMIN, Role.ADMIN, Role.MENTOR)
  @ApiOperation({ summary: 'Detail Angkatan/Kelas' })
  async detail(@Param('cohortId') cohortId: string) {
    return ok(await this.cohorts.detail(cohortId));
  }

  @Patch(':cohortId')
  @Roles(Role.SUPERADMIN, Role.ADMIN)
  @ApiOperation({ summary: 'Ubah Angkatan/Kelas' })
  async update(
    @Param('cohortId') cohortId: string,
    @Body() dto: UpdateCohortDto,
    @CurrentUser() actor: RequestUser,
  ) {
    return ok(await this.cohorts.update(cohortId, dto, actor.id));
  }

  @Delete(':cohortId')
  @Roles(Role.SUPERADMIN, Role.ADMIN)
  @ApiOperation({ summary: 'Nonaktifkan Angkatan/Kelas' })
  async deactivate(
    @Param('cohortId') cohortId: string,
    @CurrentUser() actor: RequestUser,
  ) {
    return ok(await this.cohorts.deactivate(cohortId, actor.id));
  }

  @Get(':cohortId/enrollments')
  @Roles(Role.SUPERADMIN, Role.ADMIN, Role.MENTOR)
  @ApiOperation({ summary: 'Daftar Taruna dalam kelas' })
  async listEnrollments(@Param('cohortId') cohortId: string) {
    return ok(await this.cohorts.listEnrollments(cohortId));
  }

  @Post(':cohortId/enrollments')
  @Roles(Role.SUPERADMIN, Role.ADMIN)
  @ApiOperation({ summary: 'Enroll Taruna ke kelas' })
  async enroll(
    @Param('cohortId') cohortId: string,
    @Body() dto: EnrollUserDto,
    @CurrentUser() actor: RequestUser,
  ) {
    return ok(await this.cohorts.enroll(cohortId, dto.userId, actor.id));
  }

  @Delete(':cohortId/enrollments/:enrollmentId')
  @Roles(Role.SUPERADMIN, Role.ADMIN)
  @ApiOperation({ summary: 'Nonaktifkan enrollment' })
  async unenroll(
    @Param('cohortId') cohortId: string,
    @Param('enrollmentId') enrollmentId: string,
    @CurrentUser() actor: RequestUser,
  ) {
    return ok(await this.cohorts.unenroll(cohortId, enrollmentId, actor.id));
  }
}
