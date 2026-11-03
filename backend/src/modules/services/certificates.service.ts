import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ProgressStatus, Role } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CertificatePdfService } from './certificate-pdf.service';
import { SERVICE_AUDIT_ACTIONS, SERVICE_RULES } from './services.rules';

export interface CertificateActor {
  id: string;
  role: Role;
}

@Injectable()
export class CertificatesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pdf: CertificatePdfService,
    private readonly audit: AuditService,
  ) {}

  // Syarat Opsi A (keputusan Tahap 7): seluruh level 1–5 PASSED pada cohort
  // yang sama. Nomor unik server-side (SPLI-<tahun>-<acak>); dibuat sekali.
  async issue(
    actor: CertificateActor,
    input: { userId: string; cohortId: string; fullName: string },
  ) {
    if (actor.role !== Role.SUPERADMIN && actor.role !== Role.ADMIN) {
      throw new ForbiddenException('Tidak memiliki izin penerbitan.');
    }
    const user = await this.prisma.user.findUnique({
      where: { id: input.userId },
    });
    if (!user) throw new NotFoundException('Pengguna tidak ditemukan.');
    const cohort = await this.prisma.cohort.findUnique({
      where: { id: input.cohortId },
    });
    if (!cohort) throw new NotFoundException('Angkatan tidak ditemukan.');
    const passed = await this.prisma.learningProgress.count({
      where: {
        userId: input.userId,
        status: ProgressStatus.PASSED,
        assessment: { cohortId: input.cohortId },
      },
    });
    const levels = await this.prisma.assessment.count({
      where: { cohortId: input.cohortId },
    });
    // MVP: 5 level. Bila cohort memiliki <5 assessment, syarat belum terpenuhi
    // (tidak menerbitkan sebagian tanpa persetujuan).
    if (levels < 5 || passed < 5) {
      throw new ConflictException(
        'Syarat kelulusan belum terpenuhi (seluruh level 1–5 harus PASSED).',
      );
    }
    const existing = await this.prisma.certificate.findFirst({
      where: { userId: input.userId, cohortId: input.cohortId },
    });
    if (existing) {
      throw new ConflictException('Sertifikat sudah diterbitkan.');
    }
    let number = '';
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const candidate = `${SERVICE_RULES.CERT_NUMBER_PREFIX}-${new Date().getUTCFullYear()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
      const clash = await this.prisma.certificate.findUnique({
        where: { number: candidate },
      });
      if (!clash) {
        number = candidate;
        break;
      }
    }
    if (!number) {
      throw new ConflictException('Gagal membuat nomor sertifikat unik.');
    }
    const certificate = await this.prisma.certificate.create({
      data: {
        userId: input.userId,
        cohortId: input.cohortId,
        number,
        fullName: input.fullName,
        createdBy: actor.id,
      },
    });
    await this.audit.record(SERVICE_AUDIT_ACTIONS.CERTIFICATE_ISSUED, {
      actorId: actor.id,
      targetId: certificate.id,
      metadata: { number, userId: input.userId, cohortId: input.cohortId },
    });
    return certificate;
  }

  async myCertificates(userId: string) {
    return this.prisma.certificate.findMany({
      where: { userId },
      orderBy: { issuedAt: 'desc' },
    });
  }

  private async assertReadable(actor: CertificateActor, id: string) {
    const certificate = await this.prisma.certificate.findUnique({
      where: { id },
      include: { user: true },
    });
    if (!certificate) throw new NotFoundException('Sertifikat tidak ditemukan.');
    if (
      actor.role === Role.TARUNA &&
      certificate.userId !== actor.id
    ) {
      throw new NotFoundException('Sertifikat tidak ditemukan.');
    }
    if (
      actor.role === Role.MENTOR
    ) {
      throw new ForbiddenException('Tidak memiliki izin.');
    }
    return certificate;
  }

  async detail(actor: CertificateActor, id: string) {
    const certificate = await this.assertReadable(actor, id);
    const { user: _user, ...rest } = certificate;
    void _user;
    return rest;
  }

  // Unduhan hanya pemilik + Admin/Superadmin. PDF dirender dari data tersimpan
  // (nomor tidak dibuat ulang saat unduh).
  async download(actor: CertificateActor, id: string): Promise<{ buffer: Buffer; filename: string }> {
    const certificate = await this.assertReadable(actor, id);
    const cohort = await this.prisma.cohort.findUniqueOrThrow({
      where: { id: certificate.cohortId },
    });
    const buffer = await this.pdf.render({
      number: certificate.number,
      fullName: certificate.fullName,
      cohortName: cohort.name,
      issuedAt: certificate.issuedAt,
    });
    return {
      buffer,
      filename: `sertifikat-${certificate.number}.pdf`,
    };
  }
}
