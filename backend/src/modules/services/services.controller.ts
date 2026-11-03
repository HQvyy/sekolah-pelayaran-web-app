import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { Role } from '@prisma/client';
import { RatingsService } from './ratings.service';
import { CertificatesService } from './certificates.service';
import { ProgressService } from './progress.service';
import { TicketsService } from './tickets.service';
import {
  ChangeTicketStatusDto,
  CreateRatingDto,
  CreateTicketDto,
  IssueCertificateDto,
  UpdateRatingDto,
  UpdateTicketDto,
} from './dto/services.dto';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser, RequestUser } from '../auth/current-user.decorator';
import { ok } from '../../common/envelope';

@ApiBearerAuth()
@Controller()
export class ServicesController {
  constructor(
    private readonly ratings: RatingsService,
    private readonly certificates: CertificatesService,
    private readonly progress: ProgressService,
    private readonly tickets: TicketsService,
  ) {}

  @Get('me/ratings')
  @Roles(Role.TARUNA)
  @ApiTags('ratings')
  @ApiOperation({ summary: 'Rating milik Taruna' })
  async myRatings(@CurrentUser() user: RequestUser) {
    return ok(await this.ratings.myRatings(user.id));
  }

  @Post('ratings')
  @Roles(Role.TARUNA)
  @ApiTags('ratings')
  @ApiOperation({ summary: 'Buat rating kelas/mentor 1–5' })
  async createRating(
    @CurrentUser() user: RequestUser,
    @Body() dto: CreateRatingDto,
  ) {
    return ok(await this.ratings.create(user.id, dto));
  }

  @Patch('ratings/:ratingId')
  @Roles(Role.TARUNA)
  @ApiTags('ratings')
  @ApiOperation({ summary: 'Edit rating (1× dalam 7 hari)' })
  async editRating(
    @CurrentUser() user: RequestUser,
    @Param('ratingId') ratingId: string,
    @Body() dto: UpdateRatingDto,
  ) {
    return ok(await this.ratings.edit(user.id, ratingId, dto));
  }

  @Get('classes/:classId/ratings')
  @Roles(Role.MENTOR, Role.ADMIN, Role.SUPERADMIN)
  @ApiTags('ratings')
  @ApiOperation({ summary: 'Lihat rating yang relevan' })
  async classRatings(
    @CurrentUser() actor: RequestUser,
    @Param('classId') classId: string,
    @Query('lessonId') lessonId?: string,
  ) {
    return ok(await this.ratings.classRatings(actor, classId, lessonId));
  }

  @Get('me/progress')
  @Roles(Role.TARUNA)
  @ApiTags('progress')
  @ApiOperation({ summary: 'Progres agregat Taruna (untuk dasbor FE)' })
  async myProgress(@CurrentUser() user: RequestUser) {
    return ok(await this.progress.myProgress(user.id));
  }

  @Get('me/certificates')
  @Roles(Role.TARUNA)
  @ApiTags('certificates')
  @ApiOperation({ summary: 'Daftar sertifikat Taruna' })
  async myCertificates(@CurrentUser() user: RequestUser) {
    return ok(await this.certificates.myCertificates(user.id));
  }

  @Get('certificates/:certificateId')
  @Roles(Role.TARUNA, Role.ADMIN, Role.SUPERADMIN)
  @ApiTags('certificates')
  @ApiOperation({ summary: 'Detail sertifikat' })
  async certificateDetail(
    @CurrentUser() actor: RequestUser,
    @Param('certificateId') certificateId: string,
  ) {
    return ok(await this.certificates.detail(actor, certificateId));
  }

  @Get('certificates/:certificateId/pdf')
  @Roles(Role.TARUNA, Role.ADMIN, Role.SUPERADMIN)
  @ApiTags('certificates')
  @ApiOperation({ summary: 'Unduh PDF sertifikat' })
  async certificatePdf(
    @CurrentUser() actor: RequestUser,
    @Param('certificateId') certificateId: string,
    @Res() res: Response,
  ) {
    const { buffer, filename } = await this.certificates.download(
      actor,
      certificateId,
    );
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${filename}"`,
    );
    res.send(buffer);
  }

  @Post('certificates')
  @Roles(Role.ADMIN, Role.SUPERADMIN)
  @ApiTags('certificates')
  @ApiOperation({ summary: 'Terbitkan sertifikat (syarat Opsi A)' })
  async issueCertificate(
    @CurrentUser() actor: RequestUser,
    @Body() dto: IssueCertificateDto,
  ) {
    return ok(await this.certificates.issue(actor, dto));
  }

  @Get('tickets')
  @Roles(Role.TARUNA, Role.ADMIN, Role.SUPERADMIN)
  @ApiTags('tickets')
  @ApiOperation({ summary: 'Daftar tiket (Taruna: milik sendiri)' })
  async listTickets(
    @CurrentUser() actor: RequestUser,
    @Query('status') status?: string,
    @Query('page') page?: number,
    @Query('pageSize') pageSize?: number,
  ) {
    return this.tickets.list(actor, { status, page, pageSize });
  }

  @Post('tickets')
  @Roles(Role.TARUNA, Role.ADMIN, Role.SUPERADMIN)
  @ApiTags('tickets')
  @ApiOperation({ summary: 'Buat tiket' })
  async createTicket(
    @CurrentUser() user: RequestUser,
    @Body() dto: CreateTicketDto,
  ) {
    return ok(await this.tickets.create(user.id, dto));
  }

  @Get('tickets/:id')
  @Roles(Role.TARUNA, Role.ADMIN, Role.SUPERADMIN)
  @ApiTags('tickets')
  @ApiOperation({ summary: 'Detail tiket' })
  async ticketDetail(
    @CurrentUser() actor: RequestUser,
    @Param('id') id: string,
  ) {
    return ok(await this.tickets.detail(actor, id));
  }

  @Patch('tickets/:id')
  @Roles(Role.TARUNA, Role.ADMIN, Role.SUPERADMIN)
  @ApiTags('tickets')
  @ApiOperation({ summary: 'Ubah detail tiket (batas status)' })
  async updateTicket(
    @CurrentUser() actor: RequestUser,
    @Param('id') id: string,
    @Body() dto: UpdateTicketDto,
  ) {
    return ok(await this.tickets.update(actor, id, dto));
  }

  @Patch('tickets/:id/status')
  @Roles(Role.ADMIN, Role.SUPERADMIN)
  @ApiTags('tickets')
  @ApiOperation({ summary: 'Ubah status tiket (transisi divalidasi)' })
  async changeStatus(
    @CurrentUser() actor: RequestUser,
    @Param('id') id: string,
    @Body() dto: ChangeTicketStatusDto,
  ) {
    return ok(
      await this.tickets.changeStatus(actor, id, dto.status, dto.comment),
    );
  }

  @Get('tickets/:id/history')
  @Roles(Role.TARUNA, Role.ADMIN, Role.SUPERADMIN)
  @ApiTags('tickets')
  @ApiOperation({ summary: 'Riwayat penanganan tiket' })
  async ticketHistory(
    @CurrentUser() actor: RequestUser,
    @Param('id') id: string,
  ) {
    return ok(await this.tickets.history(actor, id));
  }
}
