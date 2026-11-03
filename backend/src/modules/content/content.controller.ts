import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ContentService } from './content.service';
import {
  CreateCategoryDto,
  CreateChapterDto,
  CreateCourseDto,
  CreateMaterialDto,
  CreateVideoDto,
  UpdateCategoryDto,
  UpdateChapterDto,
  UpdateCourseDto,
  UpdateMaterialDto,
} from './dto/content.dto';
import { CurrentUser, RequestUser } from '../auth/current-user.decorator';
import { ok } from '../../common/envelope';

@ApiTags('content')
@ApiBearerAuth()
@Controller()
export class ContentController {
  constructor(private readonly content: ContentService) {}

  // ——— Kategori Kapal ———

  @Get('ship-categories')
  @ApiOperation({ summary: 'Daftar kategori kapal' })
  async listCategories(
    @CurrentUser() actor: RequestUser,
    @Query('all') all?: string,
  ) {
    return ok(await this.content.listCategories(actor, all === 'true'));
  }

  @Post('ship-categories')
  @ApiOperation({ summary: 'Buat kategori kapal (manager)' })
  async createCategory(
    @CurrentUser() actor: RequestUser,
    @Body() dto: CreateCategoryDto,
  ) {
    return ok(await this.content.createCategory(actor, dto));
  }

  @Get('ship-categories/:id')
  @ApiOperation({ summary: 'Detail kategori kapal' })
  async getCategory(
    @CurrentUser() actor: RequestUser,
    @Param('id') id: string,
  ) {
    return ok(await this.content.getCategory(actor, id));
  }

  @Patch('ship-categories/:id')
  @ApiOperation({ summary: 'Ubah kategori kapal (manager)' })
  async updateCategory(
    @CurrentUser() actor: RequestUser,
    @Param('id') id: string,
    @Body() dto: UpdateCategoryDto,
  ) {
    return ok(await this.content.updateCategory(actor, id, dto));
  }

  @Delete('ship-categories/:id')
  @ApiOperation({ summary: 'Hapus kategori kapal (manager)' })
  async deleteCategory(
    @CurrentUser() actor: RequestUser,
    @Param('id') id: string,
  ) {
    return ok(await this.content.deleteCategory(actor, id));
  }

  // ——— Kursus ———

  @Get('courses')
  @ApiOperation({ summary: 'Daftar kursus (Taruna: sesuai enrollment)' })
  async listCourses(@CurrentUser() actor: RequestUser) {
    return ok(await this.content.listCourses(actor));
  }

  @Post('courses')
  @ApiOperation({ summary: 'Buat kursus (manager)' })
  async createCourse(
    @CurrentUser() actor: RequestUser,
    @Body() dto: CreateCourseDto,
  ) {
    return ok(await this.content.createCourse(actor, dto));
  }

  @Get('courses/:id')
  @ApiOperation({ summary: 'Detail kursus (Taruna: butuh enrollment)' })
  async getCourse(
    @CurrentUser() actor: RequestUser,
    @Param('id') id: string,
  ) {
    return ok(await this.content.getCourse(actor, id));
  }

  @Patch('courses/:id')
  @ApiOperation({ summary: 'Ubah kursus (manager)' })
  async updateCourse(
    @CurrentUser() actor: RequestUser,
    @Param('id') id: string,
    @Body() dto: UpdateCourseDto,
  ) {
    return ok(await this.content.updateCourse(actor, id, dto));
  }

  @Delete('courses/:id')
  @ApiOperation({ summary: 'Hapus kursus (manager)' })
  async deleteCourse(
    @CurrentUser() actor: RequestUser,
    @Param('id') id: string,
  ) {
    return ok(await this.content.deleteCourse(actor, id));
  }

  // ——— Bab ———

  @Get('courses/:courseId/chapters')
  @ApiOperation({ summary: 'Daftar bab (Taruna: butuh enrollment)' })
  async listChapters(
    @CurrentUser() actor: RequestUser,
    @Param('courseId') courseId: string,
  ) {
    return ok(await this.content.listChapters(actor, courseId));
  }

  @Post('courses/:courseId/chapters')
  @ApiOperation({ summary: 'Buat bab (manager)' })
  async createChapter(
    @CurrentUser() actor: RequestUser,
    @Param('courseId') courseId: string,
    @Body() dto: CreateChapterDto,
  ) {
    return ok(await this.content.createChapter(actor, courseId, dto));
  }

  @Patch('chapters/:chapterId')
  @ApiOperation({ summary: 'Ubah bab (manager)' })
  async updateChapter(
    @CurrentUser() actor: RequestUser,
    @Param('chapterId') chapterId: string,
    @Body() dto: UpdateChapterDto,
  ) {
    return ok(await this.content.updateChapter(actor, chapterId, dto));
  }

  @Delete('chapters/:chapterId')
  @ApiOperation({ summary: 'Hapus bab (manager)' })
  async deleteChapter(
    @CurrentUser() actor: RequestUser,
    @Param('chapterId') chapterId: string,
  ) {
    return ok(await this.content.deleteChapter(actor, chapterId));
  }

  // ——— Materi ———

  @Get('chapters/:chapterId/materials')
  @ApiOperation({ summary: 'Daftar materi (Taruna: butuh enrollment)' })
  async listMaterials(
    @CurrentUser() actor: RequestUser,
    @Param('chapterId') chapterId: string,
  ) {
    return ok(await this.content.listMaterials(actor, chapterId));
  }

  @Post('chapters/:chapterId/materials')
  @ApiOperation({ summary: 'Buat materi (manager)' })
  async createMaterial(
    @CurrentUser() actor: RequestUser,
    @Param('chapterId') chapterId: string,
    @Body() dto: CreateMaterialDto,
  ) {
    return ok(await this.content.createMaterial(actor, chapterId, dto));
  }

  @Get('materials/:materialId')
  @ApiOperation({ summary: 'Detail materi (Taruna: butuh enrollment)' })
  async getMaterial(
    @CurrentUser() actor: RequestUser,
    @Param('materialId') materialId: string,
  ) {
    return ok(await this.content.getMaterial(actor, materialId));
  }

  @Patch('materials/:materialId')
  @ApiOperation({ summary: 'Ubah materi (manager)' })
  async updateMaterial(
    @CurrentUser() actor: RequestUser,
    @Param('materialId') materialId: string,
    @Body() dto: UpdateMaterialDto,
  ) {
    return ok(await this.content.updateMaterial(actor, materialId, dto));
  }

  @Delete('materials/:materialId')
  @ApiOperation({ summary: 'Hapus materi (manager)' })
  async deleteMaterial(
    @CurrentUser() actor: RequestUser,
    @Param('materialId') materialId: string,
  ) {
    return ok(await this.content.deleteMaterial(actor, materialId));
  }

  @Post('materials/:materialId/complete')
  @ApiOperation({
    summary: 'Tandai materi selesai (belum tersedia — 501)',
  })
  async completeMaterial() {
    const { ServiceUnavailableException } = await import('@nestjs/common');
    throw new ServiceUnavailableException(
      'Penandaan selesai materi belum tersedia: butuh tabel penyelesaian per-pengguna (migrasi).',
    );
  }

  // ——— Video metadata ———

  @Post('materials/:materialId/videos')
  @ApiOperation({ summary: 'Buat metadata video (manager, via adapter Bunny)' })
  async createVideo(
    @CurrentUser() actor: RequestUser,
    @Param('materialId') materialId: string,
    @Body() dto: CreateVideoDto,
  ) {
    return ok(await this.content.createVideo(actor, materialId, dto.title));
  }

  @Get('materials/:materialId/videos')
  @ApiOperation({ summary: 'Daftar video materi (Taruna: hanya READY)' })
  async listVideos(
    @CurrentUser() actor: RequestUser,
    @Param('materialId') materialId: string,
  ) {
    return ok(await this.content.listVideos(actor, materialId));
  }

  @Post('videos/:videoId/playback-token')
  @ApiOperation({ summary: 'Minta token playback (cek enrollment+status)' })
  async playbackToken(
    @CurrentUser() actor: RequestUser,
    @Param('videoId') videoId: string,
  ) {
    return ok(await this.content.playbackToken(actor, videoId));
  }
}
