// Seed DATA DEMO untuk development/testing — dijalankan MANUAL, tidak pernah
// otomatis dan tidak boleh dipakai di production.
//
// Contoh:
//   npm run seed:dev -- --password 'DemoSpli2026'
//   SEED_PASSWORD='DemoSpli2026' npm run seed:dev
//
// Isi: kategori kapal, angkatan, kursus + bab + materi + video, enrollment,
// live lesson + absensi, assessment 5 level + bank soal, attempt & progres,
// sertifikat, rating, tiket + riwayat, dan notifikasi in-app.
// Idempoten: data dicari lewat kunci alami (email, kode, judul, level) lalu
// diperbarui/dilewati, bukan diduplikasi. Tidak menghapus data pengguna lain.
import {
  AccountStatus,
  AttemptStatus,
  EnrollmentStatus,
  LessonStatus,
  NotificationKind,
  PrismaClient,
  ProgressStatus,
  PublishStatus,
  QuestionType,
  Role,
  TicketStatus,
  VideoStatus,
} from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();
const DAY = 24 * 3_600_000;

function arg(name: string): string | undefined {
  const index = process.argv.indexOf(`--${name}`);
  return index !== -1 ? process.argv[index + 1] : undefined;
}

function fail(message: string): never {
  console.error(`[seed-dev] ${message}`);
  process.exit(1);
}

function daysFromNow(days: number, hourOffset = 0): Date {
  return new Date(Date.now() + days * DAY + hourOffset * 3_600_000);
}

function assertPassword(password: string): void {
  if (password.length < 8 || !/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
    fail('Password seed minimal 8 karakter serta mengandung huruf dan angka.');
  }
}

async function ensureUser(input: {
  email: string;
  role: Role;
  status: AccountStatus;
  passwordHash: string;
  verifiedBy?: string;
}): Promise<{ id: string; email: string }> {
  const consentGivenAt = input.role === Role.TARUNA ? new Date() : null;
  return prisma.user.upsert({
    where: { email: input.email },
    update: {
      passwordHash: input.passwordHash,
      role: input.role,
      status: input.status,
      consentGivenAt,
      verifiedAt: input.status === AccountStatus.ACTIVE ? new Date() : null,
      verifiedBy: input.status === AccountStatus.ACTIVE ? (input.verifiedBy ?? null) : null,
      failedLoginCount: 0,
      failedEmailCount: 0,
      lockedUntil: null,
    },
    create: {
      email: input.email,
      passwordHash: input.passwordHash,
      role: input.role,
      status: input.status,
      consentGivenAt,
      verifiedAt: input.status === AccountStatus.ACTIVE ? new Date() : null,
      verifiedBy: input.status === AccountStatus.ACTIVE ? (input.verifiedBy ?? null) : null,
    },
    select: { id: true, email: true },
  });
}

async function ensureCohort(code: string, name: string, description: string) {
  return prisma.cohort.upsert({
    where: { code },
    update: { name, description, isActive: true },
    create: { code, name, description, isActive: true },
  });
}

async function ensureCategory(name: string, description: string, sortOrder: number) {
  return prisma.shipCategory.upsert({
    where: { name },
    update: { description, status: PublishStatus.PUBLISHED, sortOrder },
    create: { name, description, status: PublishStatus.PUBLISHED, sortOrder },
  });
}

async function ensureCourse(input: {
  categoryId: string;
  cohortId: string;
  title: string;
  description: string;
  sortOrder: number;
}) {
  const existing = await prisma.course.findFirst({
    where: { categoryId: input.categoryId, cohortId: input.cohortId, title: input.title },
  });
  const data = {
    categoryId: input.categoryId,
    cohortId: input.cohortId,
    title: input.title,
    description: input.description,
    status: PublishStatus.PUBLISHED,
    sortOrder: input.sortOrder,
  };
  if (existing) return prisma.course.update({ where: { id: existing.id }, data });
  return prisma.course.create({ data });
}

async function ensureChapter(courseId: string, title: string, sortOrder: number) {
  const existing = await prisma.chapter.findFirst({ where: { courseId, title } });
  const data = {
    courseId,
    title,
    status: PublishStatus.PUBLISHED,
    sortOrder,
  };
  if (existing) return prisma.chapter.update({ where: { id: existing.id }, data });
  return prisma.chapter.create({ data });
}

async function ensureMaterial(input: {
  chapterId: string;
  title: string;
  description: string;
  sortOrder: number;
  videoTitle: string;
  durationSeconds: number;
  providerVideoId: string;
}) {
  const existing = await prisma.material.findFirst({
    where: { chapterId: input.chapterId, title: input.title },
  });
  const data = {
    chapterId: input.chapterId,
    title: input.title,
    description: input.description,
    status: PublishStatus.PUBLISHED,
    sortOrder: input.sortOrder,
  };
  const material = existing
    ? await prisma.material.update({ where: { id: existing.id }, data })
    : await prisma.material.create({ data });

  const video = await prisma.video.findFirst({
    where: { materialId: material.id, providerVideoId: input.providerVideoId },
  });
  if (!video) {
    await prisma.video.create({
      data: {
        materialId: material.id,
        title: input.videoTitle,
        provider: 'bunny',
        providerVideoId: input.providerVideoId,
        libraryId: 'demo-library',
        status: VideoStatus.READY,
        durationSeconds: input.durationSeconds,
      },
    });
  }
  return material;
}

interface SeedQuestion {
  prompt: string;
  options: string[];
  correct: number;
}

interface SeedLevel {
  level: number;
  title: string;
  description: string;
  durationMinutes: number;
  score: number;
  questions: SeedQuestion[];
  essayPrompt: string;
  essayAnswer: string;
}

const SEED_LEVELS: SeedLevel[] = [
  {
    level: 1,
    title: 'Level 1 — Keselamatan Dasar dan Prosedur Darurat',
    description:
      'Dasar keselamatan kerja di kapal, jenis alat pemadam, alarm darurat, dan muster station.',
    durationMinutes: 30,
    score: 86,
    questions: [
      {
        prompt: 'Alat pemadam apa yang paling tepat untuk kebakaran minyak di kamar mesin?',
        options: [
          'Air bertekanan tinggi',
          'APAR berbasis foam atau CO2',
          'Pasir basah saja',
          'Semburan udara bertekanan',
        ],
        correct: 1,
      },
      {
        prompt: 'Sinyal marabahaya yang dikirim kapal berupa bunyi adalah…',
        options: [
          'Tiga bunyi pendek berulang',
          'Satu bunyi panjang diikuti dua bunyi pendek berulang',
          'Dua bunyi panjang sekaligus',
          'Empat bunyi pendek sekali',
        ],
        correct: 1,
      },
      {
        prompt: 'Tindakan pertama setelah alarm kebakaran umum berbunyi adalah…',
        options: [
          'Mencari sumber api seorang diri',
          'Menuju muster station sesuai daftar tugas',
          'Mengambil barang pribadi di kabin',
          'Menelepon keluarga terlebih dahulu',
        ],
        correct: 1,
      },
      {
        prompt: 'Alat pelindung diri wajib saat bekerja di area dek terbuka adalah…',
        options: [
          'Helm, safety shoes, dan pelampung sesuai area kerja',
          'Hanya sarung tangan',
          'Kacamata hitam dan topi',
          'Tidak ada kewajiban khusus',
        ],
        correct: 0,
      },
    ],
    essayPrompt: 'Jelaskan urutan tindakan kru saat alarm umum (general alarm) berbunyi di atas kapal.',
    essayAnswer:
      'Kru berhenti dari pekerjaan, memakai APD, menuju muster station sesuai muster list, dilakukan head count, lalu menunggu instruksi perwira jaga sebelum bertindak.',
  },
  {
    level: 2,
    title: 'Level 2 — Penanganan dan Perencanaan Muatan',
    description:
      'Perencanaan pemuatan, draft survey, lashing, tank cleaning, dan pengawasan muatan curah/cair.',
    durationMinutes: 45,
    score: 82,
    questions: [
      {
        prompt: 'Dokumen utama yang menjadi acuan rencana pemuatan adalah…',
        options: ['Cargo plan yang disetujui', 'Daftar menu kru', 'Jadwal libur awak', 'Surat izin berlayar'],
        correct: 0,
      },
      {
        prompt: 'Draft survey dilakukan untuk mengetahui…',
        options: [
          'Berat muatan berdasarkan draft kapal',
          'Kecepatan kapal',
          'Jumlah bahan bakar yang tersisa saja',
          'Suhu ruang mesin',
        ],
        correct: 0,
      },
      {
        prompt: 'Sebelum memuat muatan curah, ruang muat wajib…',
        options: [
          'Bersih, kering, dan bebas bau',
          'Diisi air laut',
          'Ditutup rapat tanpa inspeksi',
          'Dibiarkan lembap',
        ],
        correct: 0,
      },
      {
        prompt: 'Tujuan utama lashing pada muatan kontainer adalah…',
        options: [
          'Mencegah pergeseran saat kapal mengoleng',
          'Mempercepat bongkar muat',
          'Mengurangi berat muatan',
          'Memperindah tampilan dek',
        ],
        correct: 0,
      },
    ],
    essayPrompt: 'Uraikan prosedur persiapan ruang muat sebelum pemuatan muatan curah kering.',
    essayAnswer:
      'Ruang dibersihkan dan dikeringkan, diperiksa bilge dan pipa, dicek ventilasi serta penerangan, lalu dilakukan inspeksi bersama sebelum loading dimulai.',
  },
  {
    level: 3,
    title: 'Level 3 — Navigasi dan Komunikasi Maritim',
    description: 'COLREG, penentuan posisi, passage plan, dan komunikasi GMDSS.',
    durationMinutes: 45,
    score: 88,
    questions: [
      {
        prompt: 'Dua kapal tenaga yang berlayar berlawanan arah harus…',
        options: [
          'Keduanya berbelok ke kanan',
          'Keduanya berhenti',
          'Kapal yang lebih kecil menepi',
          'Membunyikan satu bunyi panjang',
        ],
        correct: 0,
      },
      {
        prompt: 'Penentuan posisi kapal paling akurat umumnya menggunakan…',
        options: ['GNSS/GPS dengan koreksi', 'Perkiraan arus', 'Jam tangan navigator', 'Suara mesin'],
        correct: 0,
      },
      {
        prompt: 'Passage plan disusun sebelum kapal…',
        options: ['Berlayar dari pelabuhan asal', 'Tiba di dermaga', 'Melakukan bunkering', 'Mengganti kru'],
        correct: 0,
      },
      {
        prompt: 'Frekuensi marabahaya GMDSS untuk komunikasi darurat adalah…',
        options: ['VHF Channel 16 / DSC 70', 'VHF Channel 06', 'Radio FM komersial', 'Channel 12'],
        correct: 0,
      },
    ],
    essayPrompt: 'Jelaskan langkah menyusun passage plan dari pelabuhan asal sampai pelabuhan tujuan.',
    essayAnswer:
      'Kumpulkan peta dan publikasi terbaru, tentukan rute aman dengan jarak dan kedalaman cukup, tandai waypoint, hitung ETA, lalu review bersama perwira sebelum berlayar.',
  },
  {
    level: 4,
    title: 'Level 4 — Manajemen Kru dan K3',
    description: 'ISM Code, jam kerja dan istirahat, toolbox meeting, serta penilaian risiko.',
    durationMinutes: 40,
    score: 90,
    questions: [
      {
        prompt: 'Toolbox meeting sebelum pekerjaan berisiko bertujuan…',
        options: [
          'Menyamakan pemahaman bahaya dan langkah aman',
          'Mengganti prosedur resmi',
          'Mempercepat pekerjaan tanpa pengawasan',
          'Mencatat kehadiran saja',
        ],
        correct: 0,
      },
      {
        prompt: 'Jam kerja dan istirahat kru diatur untuk mencegah…',
        options: ['Kelelahan yang membahayakan keselamatan', 'Kenaikan gaji', 'Perubahan rute', 'Penambahan kru'],
        correct: 0,
      },
      {
        prompt: 'Dokumen yang mengatur sistem manajemen keselamatan kapal adalah…',
        options: ['ISM Code', 'SOLAS Bab I', 'MARPOL Annex VI', 'STCW Bab II'],
        correct: 0,
      },
      {
        prompt: 'Penilaian risiko (risk assessment) dilakukan…',
        options: [
          'Sebelum pekerjaan dimulai dan diperbarui bila kondisi berubah',
          'Setelah kecelakaan terjadi',
          'Hanya saat audit eksternal',
          'Setahun sekali tanpa melihat pekerjaan',
        ],
        correct: 0,
      },
    ],
    essayPrompt: 'Susun agenda singkat toolbox meeting untuk pekerjaan perawatan di dek.',
    essayAnswer:
      'Bahaya pekerjaan, APD wajib, urutan langkah aman, pembagian tugas, alat komunikasi, titik kumpul, dan prosedur berhenti kerja bila kondisi tidak aman.',
  },
  {
    level: 5,
    title: 'Level 5 — Evaluasi Akhir Kompetensi',
    description: 'Studi kasus terintegrasi: darurat, pencemaran, keamanan, dan pengambilan keputusan.',
    durationMinutes: 60,
    score: 87,
    questions: [
      {
        prompt: 'Pencemaran minyak ke laut wajib dilaporkan sesuai…',
        options: ['MARPOL', 'STCW', 'MLC', 'COLREG'],
        correct: 0,
      },
      {
        prompt: 'Saat kapal menghadapi cuaca buruk, keputusan mengurangi kecepatan diambil oleh…',
        options: [
          'Nakhoda berdasarkan penilaian keselamatan',
          'Kru dek secara voting',
          'Pemilik kargo',
          'Operator radio',
        ],
        correct: 0,
      },
      {
        prompt: 'Tingkat keamanan kapal (ISPS) ditetapkan berdasarkan…',
        options: ['Penilaian ancaman keamanan', 'Jumlah penumpang', 'Ukuran kapal', 'Warna lambung'],
        correct: 0,
      },
      {
        prompt: 'Laporan insiden internal sebaiknya memuat…',
        options: [
          'Kronologi, penyebab, dampak, dan tindakan perbaikan',
          'Nama pelapor saja',
          'Foto tanpa keterangan',
          'Perkiraan tanpa bukti',
        ],
        correct: 0,
      },
    ],
    essayPrompt: 'Uraikan pengambilan keputusan nakhoda saat menghadapi kebakaran muatan di tengah laut.',
    essayAnswer:
      'Identifikasi jenis muatan dan sumber api, aktifkan prosedur darurat dan komunikasi, pertimbangkan keselamatan kru, arah angin, serta opsi menuju pelabuhan terdekat sebelum mengambil tindakan pemadaman.',
  },
];

async function ensureAssessment(cohortId: string, seed: SeedLevel, createdBy: string) {
  const assessment = await prisma.assessment.upsert({
    where: { cohortId_level: { cohortId, level: seed.level } },
    update: {
      title: seed.title,
      description: seed.description,
      durationMinutes: seed.durationMinutes,
      status: PublishStatus.PUBLISHED,
    },
    create: {
      cohortId,
      level: seed.level,
      title: seed.title,
      description: seed.description,
      durationMinutes: seed.durationMinutes,
      status: PublishStatus.PUBLISHED,
      createdBy,
    },
  });

  const allPrompts = [...seed.questions.map((item) => item.prompt), seed.essayPrompt];
  for (let index = 0; index < allPrompts.length; index += 1) {
    const prompt = allPrompts[index]!;
    const existing = await prisma.question.findFirst({
      where: { assessmentId: assessment.id, prompt },
    });
    if (existing) continue;
    if (index < seed.questions.length) {
      const question = seed.questions[index]!;
      await prisma.question.create({
        data: {
          assessmentId: assessment.id,
          type: QuestionType.PG,
          prompt,
          weight: 1,
          sortOrder: index,
          options: {
            create: question.options.map((label, optionIndex) => ({
              label,
              isCorrect: optionIndex === question.correct,
              sortOrder: optionIndex,
            })),
          },
        },
      });
    } else {
      await prisma.question.create({
        data: {
          assessmentId: assessment.id,
          type: QuestionType.ESSAY,
          prompt,
          weight: 4,
          sortOrder: index,
        },
      });
    }
  }
  return assessment;
}

async function ensureAttempt(input: {
  userId: string;
  assessmentId: string;
  status: AttemptStatus;
  score: number;
  submittedDaysAgo: number;
  submitKey: string;
  essayText: string;
  graderId: string;
}) {
  const existing = await prisma.attempt.findFirst({
    where: { userId: input.userId, assessmentId: input.assessmentId, status: input.status },
  });
  if (existing) return existing;

  const questions = await prisma.question.findMany({
    where: { assessmentId: input.assessmentId },
    include: { options: true },
    orderBy: { sortOrder: 'asc' },
  });
  if (questions.length === 0) throw new Error('Assessment belum punya soal');

  const submittedAt = daysFromNow(-input.submittedDaysAgo);
  const startedAt = new Date(submittedAt.getTime() - 30 * 60_000);
  const attempt = await prisma.attempt.create({
    data: {
      assessmentId: input.assessmentId,
      userId: input.userId,
      status: input.status,
      startedAt,
      expiresAt: new Date(startedAt.getTime() + 45 * 60_000),
      submittedAt,
      shuffledQuestionIds: questions.map((item) => item.id),
      shuffledOptionIds: Object.fromEntries(
        questions.map((item) => [item.id, item.options.map((option) => option.id)]),
      ),
      score: input.score,
      passed: input.status === AttemptStatus.GRADED ? input.score >= 70 : null,
      submitKey: input.submitKey,
      submitResult: {
        attemptId: '',
        status: input.status,
        score: input.score,
        passed: input.status === AttemptStatus.GRADED ? input.score >= 70 : null,
      },
    },
  });

  for (const question of questions) {
    if (question.type === QuestionType.PG) {
      const correct = question.options.find((option) => option.isCorrect);
      if (!correct) continue;
      await prisma.answer.create({
        data: {
          attemptId: attempt.id,
          questionId: question.id,
          optionId: correct.id,
          autoScore: question.weight,
        },
      });
    } else {
      await prisma.answer.create({
        data: {
          attemptId: attempt.id,
          questionId: question.id,
          essayText: input.essayText,
        },
      });
      if (input.status === AttemptStatus.GRADED) {
        await prisma.manualGrade.create({
          data: {
            attemptId: attempt.id,
            questionId: question.id,
            graderId: input.graderId,
            score: 3,
            maxScore: 4,
            feedback: 'Jawaban sesuai prosedur, lengkap, dan mudah dipahami.',
          },
        });
      }
    }
  }
  await prisma.attempt.update({
    where: { id: attempt.id },
    data: { submitResult: { attemptId: attempt.id, status: input.status, score: input.score } },
  });
  return attempt;
}

async function main(): Promise<void> {
  const password = arg('password') ?? process.env.SEED_PASSWORD ?? '';
  assertPassword(password);

  const admin =
    (await prisma.user.findFirst({ where: { role: Role.SUPERADMIN } })) ??
    (await prisma.user.findFirst({ where: { role: Role.ADMIN } }));
  if (!admin) fail('Belum ada SUPERADMIN/ADMIN. Jalankan npm run admin:create dulu.');

  const passwordHash = await argon2.hash(password, { type: argon2.argon2id });

  const mentor = await ensureUser({
    email: 'mentor@spli.local',
    role: Role.MENTOR,
    status: AccountStatus.ACTIVE,
    passwordHash,
    verifiedBy: admin.id,
  });
  const taruna1 = await ensureUser({
    email: 'taruna@spli.local',
    role: Role.TARUNA,
    status: AccountStatus.ACTIVE,
    passwordHash,
    verifiedBy: admin.id,
  });
  const taruna2 = await ensureUser({
    email: 'taruna2@spli.local',
    role: Role.TARUNA,
    status: AccountStatus.ACTIVE,
    passwordHash,
    verifiedBy: admin.id,
  });
  const tarunaPending = await ensureUser({
    email: 'taruna.pending@spli.local',
    role: Role.TARUNA,
    status: AccountStatus.PENDING_VERIFICATION,
    passwordHash,
  });

  const cohortA = await ensureCohort(
    'SPLI-2026-A',
    'Angkatan 2026 — Alpha',
    'Angkatan demo dengan enrollment, kelas live, CBT, dan sertifikat.',
  );
  const cohortB = await ensureCohort(
    'SPLI-2026-B',
    'Angkatan 2026 — Bravo',
    'Angkatan demo untuk pengujian impor dan enrollment.',
  );

  const categories = await Promise.all([
    ensureCategory(
      'Bulk Carrier',
      'Pengoperasian aman kapal pengangkut muatan curah dan penanganan muatannya.',
      1,
    ),
    ensureCategory('Tanker', 'Operasi kapal tanker, penanganan muatan cair, dan keselamatan.', 2),
    ensureCategory(
      'Container Ship',
      'Manajemen muatan kontainer, lashing, dan stowage plan.',
      3,
    ),
    ensureCategory(
      'Passenger Ship',
      'Pelayanan penumpang, evakuasi, dan keselamatan kapal penumpang.',
      4,
    ),
  ]);

  const courseSeeds = [
    {
      category: categories[0]!,
      title: 'Dasar Keselamatan Bulk Carrier',
      description: 'Prosedur keselamatan, pemuatan, dan perawatan dasar kapal curah.',
    },
    {
      category: categories[1]!,
      title: 'Operasi Tanker dan Penanganan Muatan',
      description: 'Persiapan tangki, pemuatan cair, gas monitoring, dan prosedur darurat.',
    },
    {
      category: categories[2]!,
      title: 'Manajemen Muatan Container Ship',
      description: 'Stowage plan, lashing, dan pengawasan muatan kontainer.',
    },
    {
      category: categories[3]!,
      title: 'Pelayanan dan Keselamatan Penumpang',
      description: 'Pelayanan penumpang, muster drill, dan evakuasi kapal penumpang.',
    },
  ];

  for (let courseIndex = 0; courseIndex < courseSeeds.length; courseIndex += 1) {
    const seed = courseSeeds[courseIndex]!;
    const course = await ensureCourse({
      categoryId: seed.category.id,
      cohortId: cohortA.id,
      title: seed.title,
      description: seed.description,
      sortOrder: courseIndex + 1,
    });

    const chapters = [
      {
        title: 'Bab 1 — Pengenalan dan Regulasi',
        materials: [
          {
            title: `Video: Pengenalan ${seed.category.name}`,
            description: `Ringkasan karakteristik ${seed.category.name} dan regulasi terkait.`,
            videoTitle: `Pengenalan ${seed.category.name}`,
            durationSeconds: 420,
          },
          {
            title: 'Modul: Daftar Periksa Keselamatan',
            description: 'Daftar periksa sebelum operasi dan pelaporan temuan.',
            videoTitle: 'Daftar Periksa Keselamatan',
            durationSeconds: 300,
          },
        ],
      },
      {
        title: 'Bab 2 — Praktik Operasional',
        materials: [
          {
            title: `Video: Praktik ${seed.category.name}`,
            description: 'Demonstrasi langkah kerja sesuai prosedur di lapangan.',
            videoTitle: `Praktik ${seed.category.name}`,
            durationSeconds: 540,
          },
          {
            title: 'Studi Kasus dan Diskusi',
            description: 'Studi kasus insiden dan diskusi tindakan perbaikan.',
            videoTitle: 'Studi Kasus Operasional',
            durationSeconds: 360,
          },
        ],
      },
    ];

    let materialIndex = 0;
    for (let chapterIndex = 0; chapterIndex < chapters.length; chapterIndex += 1) {
      const chapterSeed = chapters[chapterIndex]!;
      const chapter = await ensureChapter(course.id, chapterSeed.title, chapterIndex + 1);
      for (const materialSeed of chapterSeed.materials) {
        materialIndex += 1;
        await ensureMaterial({
          chapterId: chapter.id,
          title: materialSeed.title,
          description: materialSeed.description,
          sortOrder: materialIndex,
          videoTitle: materialSeed.videoTitle,
          durationSeconds: materialSeed.durationSeconds,
          providerVideoId: `demo-${seed.category.name.toLowerCase().replace(/\s+/g, '-')}-${materialIndex}`,
        });
      }
    }
  }

  // Satu kursus tambahan untuk angkatan B (terlihat oleh admin/mentor).
  const cohortBCourse = await ensureCourse({
    categoryId: categories[0]!.id,
    cohortId: cohortB.id,
    title: 'Induksi Keselamatan Pelayaran (Angkatan Bravo)',
    description: 'Materi induksi dasar sebelum penempatan angkatan Bravo.',
    sortOrder: 1,
  });
  const cohortBChapter = await ensureChapter(cohortBCourse.id, 'Bab 1 — Induksi', 1);
  await ensureMaterial({
    chapterId: cohortBChapter.id,
    title: 'Video: Orientasi Kapal',
    description: 'Pengenalan bagian kapal dan aturan dasar keselamatan.',
    sortOrder: 1,
    videoTitle: 'Orientasi Kapal',
    durationSeconds: 480,
    providerVideoId: 'demo-induksi-bravo-1',
  });

  for (const taruna of [taruna1, taruna2]) {
    await prisma.enrollment.upsert({
      where: { userId_cohortId: { userId: taruna.id, cohortId: cohortA.id } },
      update: { status: EnrollmentStatus.ACTIVE },
      create: { userId: taruna.id, cohortId: cohortA.id, status: EnrollmentStatus.ACTIVE },
    });
  }

  const assessments = new Map<number, { id: string }>();
  for (const seed of SEED_LEVELS) {
    const assessment = await ensureAssessment(cohortA.id, seed, admin.id);
    assessments.set(seed.level, assessment);
  }

  for (const seed of SEED_LEVELS) {
    const assessment = assessments.get(seed.level)!;
    await ensureAttempt({
      userId: taruna1.id,
      assessmentId: assessment.id,
      status: AttemptStatus.GRADED,
      score: seed.score,
      submittedDaysAgo: 20 - seed.level,
      submitKey: `seed-graded-${seed.level}`,
      essayText: seed.essayAnswer,
      graderId: mentor.id,
    });
    await prisma.learningProgress.upsert({
      where: { userId_assessmentId: { userId: taruna1.id, assessmentId: assessment.id } },
      update: {
        status: ProgressStatus.PASSED,
        bestScore: seed.score,
        attemptsUsed: 1,
        passedAt: daysFromNow(-(20 - seed.level)),
      },
      create: {
        userId: taruna1.id,
        assessmentId: assessment.id,
        status: ProgressStatus.PASSED,
        bestScore: seed.score,
        attemptsUsed: 1,
        passedAt: daysFromNow(-(20 - seed.level)),
      },
    });
  }

  // Attempt esai yang menunggu penilaian manual (antrean mentor).
  await ensureAttempt({
    userId: taruna1.id,
    assessmentId: assessments.get(2)!.id,
    status: AttemptStatus.WAITING_MANUAL_GRADING,
    score: 78,
    submittedDaysAgo: 2,
    submitKey: 'seed-waiting-2',
    essayText:
      'Persiapan ruang muat: bersihkan sisa muatan sebelumnya, keringkan, periksa bilge, lalu lakukan inspeksi bersama sebelum memuat.',
    graderId: mentor.id,
  });

  // Sertifikat demo (syarat 5 level PASSED sudah terpenuhi).
  await prisma.certificate.upsert({
    where: { number: 'SPLI-2026-DEMO01' },
    update: { userId: taruna1.id, cohortId: cohortA.id, fullName: 'Taruna Demo Alpha' },
    create: {
      userId: taruna1.id,
      cohortId: cohortA.id,
      number: 'SPLI-2026-DEMO01',
      fullName: 'Taruna Demo Alpha',
      issuedAt: daysFromNow(-1),
      createdBy: admin.id,
    },
  });

  const lessonSeeds = [
    {
      title: 'Keselamatan Kerja di Atas Kapal',
      description: 'Pembahasan APD, prosedur kerja aman, dan pelaporan bahaya.',
      startsAt: daysFromNow(-7),
      endsAt: daysFromNow(-7, 2),
      status: LessonStatus.FINISHED,
      roomReference: 'demo-room-safety',
    },
    {
      title: 'Simulasi Evakuasi dan Fire Drill',
      description: 'Latihan evakuasi dan pemadaman api skala kecil.',
      startsAt: daysFromNow(0, -1),
      endsAt: daysFromNow(0, 2),
      status: LessonStatus.ONGOING,
      roomReference: 'demo-room-drill',
    },
    {
      title: 'Manajemen Muatan Tanker',
      description: 'Persiapan tangki, gas monitoring, dan pengawasan pemuatan.',
      startsAt: daysFromNow(3),
      endsAt: daysFromNow(3, 2),
      status: LessonStatus.SCHEDULED,
      roomReference: 'demo-room-tanker',
    },
    {
      title: 'Briefing CBT Level 2',
      description: 'Persiapan menghadapi asesmen level 2 dan tanya jawab mentor.',
      startsAt: daysFromNow(7),
      endsAt: daysFromNow(7, 1),
      status: LessonStatus.SCHEDULED,
      roomReference: 'demo-room-cbt',
    },
    {
      title: 'Kelas Tambahan: K3 Lanjutan',
      description: 'Kelas yang dibatalkan untuk pengujian tampilan admin.',
      startsAt: daysFromNow(10),
      endsAt: daysFromNow(10, 2),
      status: LessonStatus.CANCELLED,
      roomReference: 'demo-room-cancelled',
    },
  ];

  const lessons: { id: string; title: string }[] = [];
  for (const seed of lessonSeeds) {
    const existing = await prisma.liveLesson.findFirst({
      where: { cohortId: cohortA.id, title: seed.title },
    });
    const lesson = existing
      ? await prisma.liveLesson.update({
          where: { id: existing.id },
          data: {
            description: seed.description,
            startsAt: seed.startsAt,
            endsAt: seed.endsAt,
            status: seed.status,
            mentorId: mentor.id,
            roomReference: seed.roomReference,
          },
        })
      : await prisma.liveLesson.create({
          data: {
            cohortId: cohortA.id,
            mentorId: mentor.id,
            title: seed.title,
            description: seed.description,
            startsAt: seed.startsAt,
            endsAt: seed.endsAt,
            status: seed.status,
            roomReference: seed.roomReference,
            createdBy: admin.id,
          },
        });
    lessons.push({ id: lesson.id, title: lesson.title });

    if (seed.status !== LessonStatus.CANCELLED) {
      for (const taruna of [taruna1, taruna2]) {
        await prisma.lessonParticipant.upsert({
          where: { lessonId_userId: { lessonId: lesson.id, userId: taruna.id } },
          update: {},
          create: { lessonId: lesson.id, userId: taruna.id },
        });
      }
    }
  }

  const finished = lessons[0]!;
  const ongoing = lessons[1]!;
  await prisma.attendanceRecord.upsert({
    where: { lessonId_userId: { lessonId: finished.id, userId: taruna1.id } },
    update: { status: 'PRESENT', source: 'JOIN' },
    create: {
      lessonId: finished.id,
      userId: taruna1.id,
      status: 'PRESENT',
      source: 'JOIN',
      recordedAt: daysFromNow(-7, 0.1),
    },
  });
  await prisma.attendanceRecord.upsert({
    where: { lessonId_userId: { lessonId: finished.id, userId: taruna2.id } },
    update: { status: 'ABSENT', source: 'MANUAL', correctedBy: mentor.id, correctedAt: new Date() },
    create: {
      lessonId: finished.id,
      userId: taruna2.id,
      status: 'ABSENT',
      source: 'MANUAL',
      correctedBy: mentor.id,
      correctedAt: new Date(),
    },
  });
  await prisma.attendanceRecord.upsert({
    where: { lessonId_userId: { lessonId: ongoing.id, userId: taruna1.id } },
    update: { status: 'PRESENT', source: 'JOIN' },
    create: {
      lessonId: ongoing.id,
      userId: taruna1.id,
      status: 'PRESENT',
      source: 'JOIN',
      recordedAt: daysFromNow(0, -0.5),
    },
  });

  const ratingSeeds = [
    {
      userId: taruna1.id,
      lessonId: finished.id,
      score: 5,
      feedback: 'Materi sangat jelas dan mentor responsif menjawab pertanyaan.',
    },
    {
      userId: taruna2.id,
      lessonId: finished.id,
      score: 4,
      feedback: 'Penjelasan baik, waktu diskusi bisa ditambah.',
    },
  ];
  for (const rating of ratingSeeds) {
    await prisma.rating.upsert({
      where: { userId_lessonId: { userId: rating.userId, lessonId: rating.lessonId } },
      update: { score: rating.score, feedback: rating.feedback, mentorId: mentor.id },
      create: {
        userId: rating.userId,
        lessonId: rating.lessonId,
        mentorId: mentor.id,
        score: rating.score,
        feedback: rating.feedback,
      },
    });
  }

  const ticketSeeds = [
    {
      title: 'Video materi tidak bisa diputar',
      description: 'Video pada Bab 1 menampilkan status tidak tersedia saat dibuka.',
      category: 'CONTENT',
      status: TicketStatus.OPEN,
      history: [] as { to: TicketStatus; comment: string }[],
    },
    {
      title: 'Sertifikat belum muncul di daftar',
      description: 'Saya sudah lulus semua level tetapi sertifikat belum terlihat.',
      category: 'CERTIFICATE',
      status: TicketStatus.IN_PROGRESS,
      history: [
        { to: TicketStatus.IN_PROGRESS, comment: 'Tiket diterima dan sedang diperiksa.' },
      ],
    },
    {
      title: 'Jadwal kelas live mundur 15 menit',
      description: 'Kelas dimulai lebih lambat dari jadwal yang tertera.',
      category: 'LIVE_CLASS',
      status: TicketStatus.RESOLVED,
      history: [
        { to: TicketStatus.IN_PROGRESS, comment: 'Dikoordinasikan dengan mentor.' },
        { to: TicketStatus.RESOLVED, comment: 'Jadwal sudah diperbarui dan kelas berjalan.' },
      ],
    },
  ];

  for (const seed of ticketSeeds) {
    const existing = await prisma.ticket.findFirst({
      where: { reporterId: taruna1.id, title: seed.title },
    });
    if (existing) continue;
    const ticket = await prisma.ticket.create({
      data: {
        reporterId: taruna1.id,
        title: seed.title,
        description: seed.description,
        category: seed.category,
        status: seed.status,
      },
    });
    await prisma.ticketHistory.create({
      data: {
        ticketId: ticket.id,
        actorId: taruna1.id,
        toStatus: TicketStatus.OPEN,
        comment: 'Tiket dibuat.',
      },
    });
    for (const item of seed.history) {
      await prisma.ticketHistory.create({
        data: {
          ticketId: ticket.id,
          actorId: admin.id,
          fromStatus: TicketStatus.OPEN,
          toStatus: item.to,
          comment: item.comment,
        },
      });
    }
  }

  const notificationSeeds = [
    {
      userId: taruna1.id,
      kind: NotificationKind.CERTIFICATE_ISSUED,
      title: 'Sertifikat program internal diterbitkan',
      body: 'Sertifikat SPLI-2026-DEMO01 sudah tersedia di halaman Sertifikat Saya.',
      readAt: null,
    },
    {
      userId: taruna1.id,
      kind: NotificationKind.SCHEDULE_CREATED,
      title: 'Jadwal kelas live baru: Manajemen Muatan Tanker',
      body: 'Kelas dijadwalkan dalam 3 hari. Cek detail di halaman Kelas Live.',
      readAt: daysFromNow(-1),
    },
    {
      userId: taruna2.id,
      kind: NotificationKind.SCHEDULE_CREATED,
      title: 'Jadwal kelas live baru: Simulasi Evakuasi',
      body: 'Kelas sedang berlangsung. Masuk melalui halaman Kelas Live.',
      readAt: null,
    },
    {
      userId: mentor.id,
      kind: NotificationKind.ESSAY_OVERDUE,
      title: 'Ada esai menunggu penilaian',
      body: 'Satu jawaban esai Taruna menunggu koreksi Anda.',
      readAt: null,
    },
  ];
  for (const seed of notificationSeeds) {
    const existing = await prisma.notification.findFirst({
      where: { userId: seed.userId, kind: seed.kind, title: seed.title },
    });
    if (existing) continue;
    await prisma.notification.create({ data: seed });
  }

  const [userCount, cohortCount, courseCount, lessonCount, assessmentCount, ticketCount] =
    await Promise.all([
      prisma.user.count(),
      prisma.cohort.count(),
      prisma.course.count(),
      prisma.liveLesson.count(),
      prisma.assessment.count(),
      prisma.ticket.count(),
    ]);

  console.log('[seed-dev] selesai.');
  console.log(
    `[seed-dev] users=${userCount} cohorts=${cohortCount} courses=${courseCount} lessons=${lessonCount} assessments=${assessmentCount} tickets=${ticketCount}`,
  );
  console.log('[seed-dev] akun demo (password sama dengan --password):');
  console.log('  SUPERADMIN : admin@spli.local (dibuat lewat admin:create)');
  console.log('  MENTOR     : mentor@spli.local');
  console.log('  TARUNA     : taruna@spli.local (lengkap: progres, sertifikat, tiket, rating)');
  console.log('  TARUNA     : taruna2@spli.local (fresh untuk uji attempt/rating)');
  console.log('  TARUNA     : taruna.pending@spli.local (PENDING_VERIFICATION untuk uji verifikasi)');
  void tarunaPending;
}

void main()
  .catch((error: unknown) => {
    console.error('[seed-dev] gagal:', error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => {
    void prisma.$disconnect();
  });
