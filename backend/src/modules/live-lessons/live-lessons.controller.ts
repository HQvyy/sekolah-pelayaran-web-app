import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { Role } from '@prisma/client';
import { LiveLessonsService } from './live-lessons.service';
import {
  CorrectAttendanceDto,
  CreateLessonDto,
  ListLessonsQueryDto,
  UpdateLessonDto,
} from './dto/live-lessons.dto';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser, RequestUser } from '../auth/current-user.decorator';
import { ok } from '../../common/envelope';

@ApiTags('live-lessons')
@ApiBearerAuth()
@Controller()
export class LiveLessonsController {
  constructor(private readonly lessons: LiveLessonsService) {}

  @Get('live-lessons')
  @Roles(Role.SUPERADMIN, Role.ADMIN, Role.MENTOR, Role.TARUNA)
  @ApiOperation({ summary: 'Daftar kelas live (sesuai enrollment/assignment)' })
  async list(
    @CurrentUser() actor: RequestUser,
    @Query() query: ListLessonsQueryDto,
  ) {
    return this.lessons.list(actor, query);
  }

  @Post('live-lessons')
  @Roles(Role.SUPERADMIN, Role.ADMIN, Role.MENTOR)
  @ApiOperation({ summary: 'Buat jadwal kelas (Mentor pemilik/Admin)' })
  async create(
    @CurrentUser() actor: RequestUser,
    @Body() dto: CreateLessonDto & { mentorId?: string },
  ) {
    return ok(await this.lessons.create(actor, dto));
  }

  @Get('live-lessons/:id')
  @Roles(Role.SUPERADMIN, Role.ADMIN, Role.MENTOR, Role.TARUNA)
  @ApiOperation({ summary: 'Detail jadwal' })
  async detail(@CurrentUser() actor: RequestUser, @Param('id') id: string) {
    return ok(await this.lessons.detail(actor, id));
  }

  @Patch('live-lessons/:id')
  @Roles(Role.SUPERADMIN, Role.ADMIN, Role.MENTOR)
  @ApiOperation({ summary: 'Ubah jadwal (batas H-1)' })
  async update(
    @CurrentUser() actor: RequestUser,
    @Param('id') id: string,
    @Body() dto: UpdateLessonDto,
  ) {
    return ok(await this.lessons.update(actor, id, dto));
  }

  @Post('live-lessons/:id/cancel')
  @HttpCode(HttpStatus.OK)
  @Roles(Role.SUPERADMIN, Role.ADMIN, Role.MENTOR)
  @ApiOperation({ summary: 'Batalkan kelas (batas H-1)' })
  async cancel(@CurrentUser() actor: RequestUser, @Param('id') id: string) {
    return ok(await this.lessons.cancel(actor, id));
  }

  @Post('live-lessons/:id/join')
  @HttpCode(HttpStatus.OK)
  @Roles(Role.TARUNA)
  @ApiOperation({ summary: 'Masuk kelas via tombol (catat kehadiran)' })
  async join(
    @CurrentUser() actor: RequestUser,
    @Param('id') id: string,
    @Body() body: { displayName?: string },
  ) {
    return ok(await this.lessons.join(actor, id, body?.displayName));
  }

  @Get('live-lessons/:id/attendance')
  @Roles(Role.SUPERADMIN, Role.ADMIN, Role.MENTOR)
  @ApiOperation({ summary: 'Rekap absensi' })
  async attendance(
    @CurrentUser() actor: RequestUser,
    @Param('id') id: string,
  ) {
    return ok(await this.lessons.attendance(actor, id));
  }

  @Patch('live-lessons/:id/attendance/:participantId')
  @Roles(Role.SUPERADMIN, Role.ADMIN, Role.MENTOR)
  @ApiOperation({ summary: 'Koreksi absensi (batas 24 jam, beraudit)' })
  async correct(
    @CurrentUser() actor: RequestUser,
    @Param('id') id: string,
    // participantId = userId peserta (lebih stabil untuk FE daripada record id).
    @Param('participantId') participantId: string,
    @Body() dto: CorrectAttendanceDto,
  ) {
    void participantId;
    return ok(await this.lessons.correct(actor, id, dto.userId, dto.status));
  }

  @Get('live-lessons/:id/attendance/export')
  @Roles(Role.SUPERADMIN, Role.ADMIN, Role.MENTOR)
  @ApiOperation({ summary: 'Ekspor rekap absensi (.xlsx)' })
  async export(
    @CurrentUser() actor: RequestUser,
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    const buffer = await this.lessons.exportAttendance(actor, id);
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="absensi-${id}.xlsx"`,
    );
    res.send(buffer);
  }

  @Get('me/live-lessons')
  @Roles(Role.TARUNA)
  @ApiOperation({ summary: 'Kelas milik Taruna' })
  async mine(@CurrentUser() actor: RequestUser) {
    return ok(await this.lessons.myLessons(actor));
  }
}
