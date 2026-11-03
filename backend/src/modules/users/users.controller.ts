import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiConsumes,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { Role } from '@prisma/client';
import { memoryStorage } from 'multer';
import { AuthService } from '../auth/auth.service';
import { UsersService } from './users.service';
import { ImportService } from './import.service';
import { ImportTemplateService } from './import-template.service';
import { PrismaService } from '../../database/prisma.service';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser, RequestUser } from '../auth/current-user.decorator';
import { ok } from '../../common/envelope';
import { IMPORT_RULES } from './users.rules';
import {
  CreateUserBodyDto,
  ListUsersQueryDto,
  UpdateUserRoleDto,
  UpdateUserStatusDto,
  VerifyUserDto,
} from './dto/users.dto';

@ApiTags('admin-users')
@ApiBearerAuth()
@Controller('admin/users')
export class UsersController {
  constructor(
    private readonly users: UsersService,
    private readonly imports: ImportService,
    private readonly templates: ImportTemplateService,
    private readonly prisma: PrismaService,
    private readonly auth: AuthService,
  ) {}

  @Get()
  @Roles(Role.SUPERADMIN, Role.ADMIN)
  @ApiOperation({ summary: 'Daftar/pencarian pengguna + pagination' })
  async list(@Query() query: ListUsersQueryDto) {
    return this.users.list(query);
  }

  @Get('imports/template')
  @Roles(Role.SUPERADMIN, Role.ADMIN)
  @ApiOperation({ summary: 'Unduh template .xlsx impor Taruna' })
  async template(@Res() res: Response) {
    const buffer = await this.templates.buildTemplate();
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="template-impor-taruna.xlsx"',
    );
    res.send(buffer);
  }

  @Get(':userId')
  @Roles(Role.SUPERADMIN, Role.ADMIN)
  @ApiOperation({ summary: 'Detail pengguna (field minimal)' })
  async detail(@Param('userId') userId: string) {
    return ok(await this.users.detail(userId));
  }

  @Post()
  @Roles(Role.SUPERADMIN)
  @ApiOperation({ summary: 'Buat akun non-Taruna (Superadmin saja)' })
  async create(
    @Body() dto: CreateUserBodyDto,
    @CurrentUser() actor: RequestUser,
  ) {
    return ok(
      await this.users.createBySuperadmin(dto.email, dto.password, dto.role, actor.id),
    );
  }

  @Post(':userId/verify')
  @HttpCode(HttpStatus.OK)
  @Roles(Role.SUPERADMIN, Role.ADMIN)
  @ApiOperation({ summary: 'Verifikasi pendaftaran Taruna' })
  async verify(
    @Param('userId') userId: string,
    @Body() dto: VerifyUserDto,
    @CurrentUser() actor: RequestUser,
  ) {
    return ok(await this.users.verify(userId, actor.id, dto.verified));
  }

  @Patch(':userId/status')
  @Roles(Role.SUPERADMIN, Role.ADMIN)
  @ApiOperation({ summary: 'Ubah status akun' })
  async updateStatus(
    @Param('userId') userId: string,
    @Body() dto: UpdateUserStatusDto,
    @CurrentUser() actor: RequestUser,
  ) {
    return ok(await this.users.updateStatus(userId, dto.status, actor.id));
  }

  @Patch(':userId/role')
  @Roles(Role.SUPERADMIN)
  @ApiOperation({ summary: 'Ubah role (Superadmin saja, anti-escalation)' })
  async updateRole(
    @Param('userId') userId: string,
    @Body() dto: UpdateUserRoleDto,
    @CurrentUser() actor: RequestUser,
  ) {
    return ok(await this.users.updateRole(userId, dto.role, actor.id));
  }

  @Post('import')
  @HttpCode(HttpStatus.OK)
  @Roles(Role.SUPERADMIN, Role.ADMIN)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: IMPORT_RULES.MAX_FILE_BYTES },
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Impor Taruna .xlsx (≤500 baris, berhasil sebagian + log eror)',
  })
  async import(
    @UploadedFile() file: Express.Multer.File | undefined,
    @CurrentUser() actor: RequestUser,
  ) {
    return ok(await this.imports.importTaruna(file, actor.id));
  }

  @Get('imports/:importId/errors')
  @Roles(Role.SUPERADMIN, Role.ADMIN)
  @ApiOperation({ summary: 'Unduh berkas log perbaikan .xlsx' })
  async errorLog(@Param('importId') importId: string, @Res() res: Response) {
    const buffer = await this.imports.getErrorLog(importId);
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="log-perbaikan-${importId}.xlsx"`,
    );
    res.send(buffer);
  }

  @Get(':userId/sessions')
  @Roles(Role.SUPERADMIN, Role.ADMIN)
  @ApiOperation({ summary: 'Daftar sesi perangkat pengguna' })
  async sessions(@Param('userId') userId: string) {
    const rows = await this.prisma.session.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        createdAt: true,
        expiresAt: true,
        revokedAt: true,
        ipAddress: true,
      },
    });
    return ok(rows);
  }

  @Delete(':userId/sessions/:sessionId')
  @Roles(Role.SUPERADMIN)
  @ApiOperation({ summary: 'Force logout satu sesi (Superadmin)' })
  async revokeSession(
    @Param('userId') userId: string,
    @Param('sessionId') sessionId: string,
    @CurrentUser() actor: RequestUser,
  ) {
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
    });
    if (!session || session.userId !== userId) {
      const { NotFoundException } = await import('@nestjs/common');
      throw new NotFoundException('Sesi tidak ditemukan.');
    }
    await this.auth.forceLogout(actor.id, sessionId);
    return ok({ revoked: true });
  }
}

// Kontrak api-spec: GET /users/{userId}/progress (terpisah dari /admin/users).
// Controller kecil agar path sesuai kontrak tanpa merombak UsersController.
@ApiTags('admin-users')
@ApiBearerAuth()
@Controller('users')
export class UserProgressController {
  constructor(private readonly prisma: PrismaService) {}

  @Get(':userId/progress')
  @Roles(Role.SUPERADMIN, Role.ADMIN, Role.MENTOR)
  @ApiOperation({ summary: 'Progres Taruna (Admin/Mentor berwenang)' })
  async userProgress(@Param('userId') userId: string) {
    const rows = await this.prisma.learningProgress.findMany({
      where: { userId },
      include: { assessment: true },
      orderBy: { updatedAt: 'desc' },
    });
    return ok(rows);
  }
}
