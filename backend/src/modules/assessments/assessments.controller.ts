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
  Put,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiConsumes,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { memoryStorage } from 'multer';
import type { Response } from 'express';
import { Role } from '@prisma/client';
import { AttemptsService } from './attempts.service';
import { AssessmentsService } from './assessments.service';
import { GradingService } from './grading.service';
import { BankImportService } from './bank-import.service';
import { BankTemplateService } from './bank-template.service';
import {
  AutosaveAnswerDto,
  CreateAssessmentDto,
  CreateQuestionDto,
  GradeEssayDto,
  SubmitAttemptDto,
  UpdateAssessmentDto,
  UpdateQuestionDto,
} from './dto/cbt.dto';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser, RequestUser } from '../auth/current-user.decorator';
import { ok } from '../../common/envelope';
import { IdempotencyKey } from '../../common/idempotency-key.decorator';
import { CBT_RULES } from './cbt.rules';
import { UploadThrottleGuard } from '../../common/throttle/upload-throttle.guard';

@ApiTags('assessments')
@ApiBearerAuth()
@Controller()
export class AssessmentsController {
  constructor(
    private readonly attempts: AttemptsService,
    private readonly assessments: AssessmentsService,
    private readonly grading: GradingService,
    private readonly bankImport: BankImportService,
    private readonly bankTemplate: BankTemplateService,
  ) {}

  @Get('assessments')
  @ApiOperation({ summary: 'Daftar assessment yang dapat diakses' })
  async list(@CurrentUser() actor: RequestUser) {
    return ok(await this.attempts.listAssessments(actor));
  }

  @Post('assessments')
  @Roles(Role.SUPERADMIN, Role.ADMIN, Role.MENTOR)
  @ApiOperation({ summary: 'Buat assessment (manager)' })
  async create(
    @CurrentUser() actor: RequestUser,
    @Body() dto: CreateAssessmentDto,
  ) {
    return ok(await this.assessments.create(actor, dto));
  }

  @Get('assessments/:id')
  @ApiOperation({ summary: 'Metadata assessment (tanpa answer key)' })
  async get(@CurrentUser() actor: RequestUser, @Param('id') id: string) {
    if (actor.role === Role.TARUNA) {
      const list = await this.attempts.listAssessments(actor);
      const found = list.find((item) => item.id === id);
      if (!found) {
        const { NotFoundException } = await import('@nestjs/common');
        throw new NotFoundException('Assessment tidak ditemukan.');
      }
      return ok(found);
    }
    // Manager: kembalikan metadata dasar (pengelolaan soal via endpoint khusus).
    const list = await this.attempts.listAssessments(actor);
    const found = list.find((item) => item.id === id);
    if (!found) {
      const { NotFoundException } = await import('@nestjs/common');
      throw new NotFoundException('Assessment tidak ditemukan.');
    }
    return ok(found);
  }

  @Patch('assessments/:id')
  @Roles(Role.SUPERADMIN, Role.ADMIN, Role.MENTOR)
  @ApiOperation({ summary: 'Ubah assessment (manager; durasi terkunci bila berjalan)' })
  async update(
    @CurrentUser() actor: RequestUser,
    @Param('id') id: string,
    @Body() dto: UpdateAssessmentDto,
  ) {
    return ok(await this.assessments.update(actor, id, dto));
  }

  @Get('assessments/:id/questions')
  @Roles(Role.SUPERADMIN, Role.ADMIN, Role.MENTOR)
  @ApiOperation({ summary: 'Bank soal + answer key (pengelola saja)' })
  async questions(
    @CurrentUser() actor: RequestUser,
    @Param('id') id: string,
  ) {
    return ok(await this.assessments.listQuestions(actor, id));
  }

  @Post('assessments/:id/questions')
  @Roles(Role.SUPERADMIN, Role.ADMIN, Role.MENTOR)
  @ApiOperation({ summary: 'Tambah soal (pengelola)' })
  async addQuestion(
    @CurrentUser() actor: RequestUser,
    @Param('id') id: string,
    @Body() dto: CreateQuestionDto,
  ) {
    return ok(await this.assessments.addQuestion(actor, id, dto));
  }

  @Patch('questions/:questionId')
  @Roles(Role.SUPERADMIN, Role.ADMIN, Role.MENTOR)
  @ApiOperation({ summary: 'Ubah soal (bobot terkunci bila sudah dikerjakan)' })
  async updateQuestion(
    @CurrentUser() actor: RequestUser,
    @Param('questionId') questionId: string,
    @Body() dto: UpdateQuestionDto,
  ) {
    return ok(await this.assessments.updateQuestion(actor, questionId, dto));
  }

  @Delete('questions/:questionId')
  @Roles(Role.SUPERADMIN, Role.ADMIN, Role.MENTOR)
  @ApiOperation({ summary: 'Nonaktifkan soal (tolak bila sudah dikerjakan)' })
  async deleteQuestion(
    @CurrentUser() actor: RequestUser,
    @Param('questionId') questionId: string,
  ) {
    return ok(await this.assessments.deleteQuestion(actor, questionId));
  }

  @Post('assessments/:id/attempts')
  @HttpCode(HttpStatus.CREATED)
  @Roles(Role.TARUNA)
  @ApiOperation({ summary: 'Mulai attempt (timer server + randomisasi)' })
  async start(
    @CurrentUser() actor: RequestUser,
    @Param('id') id: string,
  ) {
    return ok(await this.attempts.startAttempt(actor.id, id));
  }

  @Get('attempts/:attemptId')
  @Roles(Role.TARUNA)
  @ApiOperation({ summary: 'Lanjutkan attempt (tanpa answer key)' })
  async resume(
    @CurrentUser() actor: RequestUser,
    @Param('attemptId') attemptId: string,
  ) {
    return ok(await this.attempts.resumeAttempt(actor.id, attemptId));
  }

  @Put('attempts/:attemptId/answers/:questionId')
  @Roles(Role.TARUNA)
  @ApiOperation({ summary: 'Autosave jawaban satu soal (opsional idempotent)' })
  async autosave(
    @CurrentUser() actor: RequestUser,
    @Param('attemptId') attemptId: string,
    @Param('questionId') questionId: string,
    @Body() dto: AutosaveAnswerDto,
    @IdempotencyKey() idempotencyKey?: string,
  ) {
    return ok(
      await this.attempts.autosave(
        actor.id,
        attemptId,
        questionId,
        dto,
        idempotencyKey,
      ),
    );
  }

  @Post('attempts/:attemptId/submit')
  @HttpCode(HttpStatus.OK)
  @Roles(Role.TARUNA)
  @ApiOperation({ summary: 'Submit final (idempotent)' })
  async submit(
    @CurrentUser() actor: RequestUser,
    @Param('attemptId') attemptId: string,
    @Body() dto: SubmitAttemptDto,
  ) {
    return ok(await this.attempts.submit(actor.id, attemptId, dto.idempotencyKey));
  }

  @Get('attempts/:attemptId/result')
  @Roles(Role.TARUNA)
  @ApiOperation({ summary: 'Hasil attempt (tanpa answer key)' })
  async result(
    @CurrentUser() actor: RequestUser,
    @Param('attemptId') attemptId: string,
  ) {
    return ok(await this.attempts.result(actor.id, attemptId));
  }

  @Get('mentor/essay-grading')
  @Roles(Role.MENTOR, Role.ADMIN, Role.SUPERADMIN)
  @ApiOperation({ summary: 'Antrean esai yang perlu dinilai' })
  async queue(@CurrentUser() actor: RequestUser) {
    return ok(await this.assessments.essayQueue(actor));
  }

  @Post('attempts/:attemptId/answers/:answerId/grade')
  @Roles(Role.MENTOR, Role.ADMIN, Role.SUPERADMIN)
  @ApiOperation({ summary: 'Nilai esai (pemeriksa berwenang)' })
  async grade(
    @CurrentUser() actor: RequestUser,
    @Param('attemptId') attemptId: string,
    @Param('answerId') questionId: string,
    @Body() dto: GradeEssayDto,
  ) {
    // :answerId pada kontrak = questionId esai (stabil, bukan id jawaban).
    return ok(
      await this.grading.grade(actor, attemptId, questionId, dto.score, dto.feedback),
    );
  }

  @Get('admin/assessments/overdue-grading')
  @Roles(Role.ADMIN, Role.SUPERADMIN)
  @ApiOperation({ summary: 'Esai melewati SLA 7 hari' })
  async overdue(@CurrentUser() actor: RequestUser) {
    return ok(await this.assessments.overdueGrading(actor));
  }

  @Get('me/progress')
  @Roles(Role.TARUNA)
  @ApiOperation({ summary: 'Progres pembelajaran Taruna' })
  async myProgress(@CurrentUser() actor: RequestUser) {
    return ok(await this.attempts.myProgress(actor.id));
  }

  @Post('assessments/:id/questions/import')
  @Roles(Role.SUPERADMIN, Role.ADMIN, Role.MENTOR)
  @UseGuards(UploadThrottleGuard)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: CBT_RULES.IMPORT_MAX_FILE_BYTES },
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Impor bank soal .xlsx (berhasil sebagian + log)' })
  async importBank(
    @CurrentUser() actor: RequestUser,
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File | undefined,
  ) {
    return ok(await this.bankImport.importBank(id, file, actor.id));
  }

  @Get('assessments/questions/import-template')
  @ApiOperation({ summary: 'Unduh template .xlsx bank soal' })
  async template(@Res() res: Response) {
    const buffer = await this.bankTemplate.buildTemplate();
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="template-bank-soal.xlsx"',
    );
    res.send(buffer);
  }

  @Get('assessments/questions/imports/:importId/errors')
  @Roles(Role.SUPERADMIN, Role.ADMIN, Role.MENTOR)
  @ApiOperation({ summary: 'Unduh berkas log perbaikan bank soal' })
  async errorLog(@Param('importId') importId: string, @Res() res: Response) {
    const buffer = await this.bankImport.getErrorLog(importId);
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="log-perbaikan-bank-${importId}.xlsx"`,
    );
    res.send(buffer);
  }
}
