import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EnrollmentStatus, PublishStatus, Role } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { BunnyService } from '../videos/bunny.service';
import { CONTENT_RULES } from './content.rules';

export interface ContentActor {
  id: string;
  role: Role;
}

const MANAGER_ROLES: Role[] = [Role.SUPERADMIN, Role.ADMIN, Role.MENTOR];

function assertManager(actor: ContentActor): void {
  if (!MANAGER_ROLES.includes(actor.role)) {
    throw new ForbiddenException('Tidak memiliki izin kelola konten.');
  }
}

@Injectable()
export class ContentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly bunny: BunnyService,
  ) {}

  // Read untuk Taruna: hanya PUBLISHED + enrollment aktif pada cohort kursus.
  // Manager (Admin/Mentor/Superadmin): semua status.
  private async tarunaCohortIds(userId: string): Promise<Set<string>> {
    const rows = await this.prisma.enrollment.findMany({
      where: { userId, status: EnrollmentStatus.ACTIVE },
      select: { cohortId: true },
    });
    return new Set(rows.map((row) => row.cohortId));
  }

  // ——— Kategori ———

  async listCategories(actor: ContentActor, includeAll: boolean) {
    const where =
      actor.role === Role.TARUNA && !includeAll
        ? { status: PublishStatus.PUBLISHED }
        : {};
    return this.prisma.shipCategory.findMany({
      where,
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
  }

  async createCategory(
    actor: ContentActor,
    data: { name: string; description?: string; status?: PublishStatus; sortOrder?: number },
  ) {
    assertManager(actor);
    const existing = await this.prisma.shipCategory.findUnique({
      where: { name: data.name },
    });
    if (existing) throw new ConflictException('Nama kategori sudah dipakai.');
    return this.prisma.shipCategory.create({ data });
  }

  async getCategory(actor: ContentActor, id: string) {
    const category = await this.prisma.shipCategory.findUnique({
      where: { id },
      include: { courses: false },
    });
    if (!category) throw new NotFoundException('Kategori tidak ditemukan.');
    if (
      actor.role === Role.TARUNA &&
      category.status !== PublishStatus.PUBLISHED
    ) {
      throw new NotFoundException('Kategori tidak ditemukan.');
    }
    return category;
  }

  async updateCategory(
    actor: ContentActor,
    id: string,
    data: { name?: string; description?: string; status?: PublishStatus; sortOrder?: number },
  ) {
    assertManager(actor);
    const category = await this.prisma.shipCategory.findUnique({
      where: { id },
    });
    if (!category) throw new NotFoundException('Kategori tidak ditemukan.');
    return this.prisma.shipCategory.update({ where: { id }, data });
  }

  async deleteCategory(actor: ContentActor, id: string) {
    assertManager(actor);
    const courses = await this.prisma.course.count({
      where: { categoryId: id },
    });
    if (courses > 0) {
      throw new ConflictException(
        'Kategori masih memiliki kursus; pindahkan/arsipkan dulu.',
      );
    }
    await this.prisma.shipCategory.delete({ where: { id } });
    return { deleted: true };
  }

  // ——— Kursus ———

  async listCourses(actor: ContentActor) {
    if (actor.role === Role.TARUNA) {
      const cohortIds = await this.tarunaCohortIds(actor.id);
      return this.prisma.course.findMany({
        where: {
          status: PublishStatus.PUBLISHED,
          cohortId: { in: [...cohortIds] },
        },
        include: { category: true },
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      });
    }
    return this.prisma.course.findMany({
      include: { category: true, cohort: true },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
  }

  async createCourse(
    actor: ContentActor,
    data: {
      categoryId: string;
      cohortId: string;
      title: string;
      description?: string;
      status?: PublishStatus;
      sortOrder?: number;
    },
  ) {
    assertManager(actor);
    const [category, cohort] = await Promise.all([
      this.prisma.shipCategory.findUnique({ where: { id: data.categoryId } }),
      this.prisma.cohort.findUnique({ where: { id: data.cohortId } }),
    ]);
    if (!category) throw new NotFoundException('Kategori tidak ditemukan.');
    if (!cohort) throw new NotFoundException('Angkatan tidak ditemukan.');
    return this.prisma.course.create({ data });
  }

  async getCourse(actor: ContentActor, id: string) {
    const course = await this.prisma.course.findUnique({
      where: { id },
      include: { category: true, cohort: true },
    });
    if (!course) throw new NotFoundException('Kursus tidak ditemukan.');
    if (actor.role === Role.TARUNA) {
      this.assertPublished(course.status, 'Kursus');
      await this.assertEnrolled(actor.id, course.cohortId);
    }
    return course;
  }

  async updateCourse(
    actor: ContentActor,
    id: string,
    data: { title?: string; description?: string; status?: PublishStatus; sortOrder?: number },
  ) {
    assertManager(actor);
    await this.ensureCourse(id);
    return this.prisma.course.update({ where: { id }, data });
  }

  async deleteCourse(actor: ContentActor, id: string) {
    assertManager(actor);
    await this.ensureCourse(id);
    // Chapter ikut terhapus via Cascade; kursus dengan assessment aktif
    // dicegah pada tahap CBT (assessment FK) — bukan di sini.
    await this.prisma.course.delete({ where: { id } });
    return { deleted: true };
  }

  // ——— Bab ———

  async listChapters(actor: ContentActor, courseId: string) {
    const course = await this.getCourse(actor, courseId);
    const where =
      actor.role === Role.TARUNA
        ? { courseId: course.id, status: PublishStatus.PUBLISHED }
        : { courseId: course.id };
    return this.prisma.chapter.findMany({
      where,
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
  }

  async createChapter(
    actor: ContentActor,
    courseId: string,
    data: { title: string; status?: PublishStatus; sortOrder?: number },
  ) {
    assertManager(actor);
    await this.ensureCourse(courseId);
    return this.prisma.chapter.create({ data: { ...data, courseId } });
  }

  async updateChapter(
    actor: ContentActor,
    id: string,
    data: { title?: string; status?: PublishStatus; sortOrder?: number },
  ) {
    assertManager(actor);
    const chapter = await this.prisma.chapter.findUnique({
      where: { id },
      include: { course: true },
    });
    if (!chapter) throw new NotFoundException('Bab tidak ditemukan.');
    return this.prisma.chapter.update({ where: { id }, data });
  }

  async deleteChapter(actor: ContentActor, id: string) {
    assertManager(actor);
    const chapter = await this.prisma.chapter.findUnique({
      where: { id },
    });
    if (!chapter) throw new NotFoundException('Bab tidak ditemukan.');
    await this.prisma.chapter.delete({ where: { id } });
    return { deleted: true };
  }

  // ——— Materi ———

  async listMaterials(actor: ContentActor, chapterId: string) {
    const chapter = await this.prisma.chapter.findUnique({
      where: { id: chapterId },
      include: { course: true },
    });
    if (!chapter) throw new NotFoundException('Bab tidak ditemukan.');
    if (actor.role === Role.TARUNA) {
      this.assertPublished(chapter.status, 'Bab');
      this.assertPublished(chapter.course.status, 'Kursus');
      await this.assertEnrolled(actor.id, chapter.course.cohortId);
      return this.prisma.material.findMany({
        where: { chapterId, status: PublishStatus.PUBLISHED },
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      });
    }
    return this.prisma.material.findMany({
      where: { chapterId },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
  }

  async createMaterial(
    actor: ContentActor,
    chapterId: string,
    data: { title: string; description?: string; status?: PublishStatus; sortOrder?: number },
  ) {
    assertManager(actor);
    const chapter = await this.prisma.chapter.findUnique({
      where: { id: chapterId },
    });
    if (!chapter) throw new NotFoundException('Bab tidak ditemukan.');
    return this.prisma.material.create({ data: { ...data, chapterId } });
  }

  async getMaterial(actor: ContentActor, id: string) {
    const material = await this.prisma.material.findUnique({
      where: { id },
      include: {
        chapter: { include: { course: { include: { cohort: true } } } },
        videos: true,
      },
    });
    if (!material) throw new NotFoundException('Materi tidak ditemukan.');
    if (actor.role === Role.TARUNA) {
      this.assertPublished(material.status, 'Materi');
      this.assertPublished(material.chapter.status, 'Bab');
      this.assertPublished(material.chapter.course.status, 'Kursus');
      await this.assertEnrolled(actor.id, material.chapter.course.cohortId);
      // Taruna tidak menerima providerVideoId/libraryId mentah — akses video
      // hanya via POST /videos/:id/playback-token.
      const { videos, ...rest } = material;
      return {
        ...rest,
        videos: videos.map((video) => ({
          id: video.id,
          title: video.title,
          status: video.status,
          durationSeconds: video.durationSeconds,
        })),
      };
    }
    return material;
  }

  async updateMaterial(
    actor: ContentActor,
    id: string,
    data: { title?: string; description?: string; status?: PublishStatus; sortOrder?: number },
  ) {
    assertManager(actor);
    const material = await this.prisma.material.findUnique({
      where: { id },
    });
    if (!material) throw new NotFoundException('Materi tidak ditemukan.');
    return this.prisma.material.update({ where: { id }, data });
  }

  async deleteMaterial(actor: ContentActor, id: string) {
    assertManager(actor);
    const material = await this.prisma.material.findUnique({
      where: { id },
    });
    if (!material) throw new NotFoundException('Materi tidak ditemukan.');
    await this.prisma.material.delete({ where: { id } });
    return { deleted: true };
  }

  async setThumbnail(actor: ContentActor, id: string, path: string) {
    assertManager(actor);
    const material = await this.prisma.material.findUnique({
      where: { id },
    });
    if (!material) throw new NotFoundException('Materi tidak ditemukan.');
    return this.prisma.material.update({
      where: { id },
      data: { thumbnailPath: path },
    });
  }

  // ——— Video ———

  async createVideo(actor: ContentActor, materialId: string, title: string) {
    assertManager(actor);
    const material = await this.prisma.material.findUnique({
      where: { id: materialId },
    });
    if (!material) throw new NotFoundException('Materi tidak ditemukan.');
    const reference = await this.bunny.createReference(title);
    return this.prisma.video.create({
      data: {
        materialId,
        title,
        provider: 'bunny',
        providerVideoId: reference.providerVideoId,
        libraryId: reference.libraryId,
        status: 'PENDING_UPLOAD',
      },
    });
  }

  async listVideos(actor: ContentActor, materialId: string) {
    const material = await this.getMaterial(actor, materialId);
    const materialIdValue = (material as { id: string }).id;
    if (actor.role === Role.TARUNA) {
      return this.prisma.video.findMany({
        where: { materialId: materialIdValue, status: 'READY' },
        select: {
          id: true,
          title: true,
          status: true,
          durationSeconds: true,
        },
      });
    }
    return this.prisma.video.findMany({ where: { materialId: materialIdValue } });
  }

  // Playback: cek login (guard) + enrollment + status publikasi rantai penuh +
  // video READY. Tanpa kredensial provider → gagal aman 503 (dari adapter).
  async playbackToken(actor: ContentActor, videoId: string) {
    const video = await this.prisma.video.findUnique({
      where: { id: videoId },
      include: {
        material: { include: { chapter: { include: { course: true } } } },
      },
    });
    if (!video) throw new NotFoundException('Video tidak ditemukan.');
    if (actor.role === Role.TARUNA) {
      this.assertPublished(video.material.status, 'Materi');
      this.assertPublished(video.material.chapter.status, 'Bab');
      this.assertPublished(video.material.chapter.course.status, 'Kursus');
      await this.assertEnrolled(actor.id, video.material.chapter.course.cohortId);
    }
    if (video.status !== 'READY') {
      throw new ConflictException('Video belum siap diputar.');
    }
    const grant = await this.bunny.signPlayback(
      actor.id,
      video.id,
      CONTENT_RULES.PLAYBACK_TOKEN_TTL_SECONDS,
    );
    return {
      videoId: video.id,
      playbackToken: grant.playbackToken,
      expiresAt: grant.expiresAt.toISOString(),
      scanStatus: CONTENT_RULES.SCAN_STATUS,
    };
  }

  private assertPublished(status: PublishStatus, label: string): void {
    if (status !== PublishStatus.PUBLISHED) {
      throw new NotFoundException(`${label} tidak tersedia.`);
    }
  }

  private async assertEnrolled(userId: string, cohortId: string): Promise<void> {
    const enrollment = await this.prisma.enrollment.findUnique({
      where: { userId_cohortId: { userId, cohortId } },
    });
    if (!enrollment || enrollment.status !== EnrollmentStatus.ACTIVE) {
      // Samarkan sebagai 404 agar cohort/materi tidak bisa dienumerasi.
      throw new NotFoundException('Konten tidak ditemukan.');
    }
  }

  private async ensureCourse(id: string) {
    const course = await this.prisma.course.findUnique({ where: { id } });
    if (!course) throw new NotFoundException('Kursus tidak ditemukan.');
    return course;
  }
}
