import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AccountStatus, Prisma, Role } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { PasswordService } from '../auth/password.service';
import { paginated } from '../../common/envelope';
import { USER_AUDIT_ACTIONS } from './users.rules';
import { USER_SORTABLE_FIELDS } from './dto/users.dto';
import {
  DEFAULT_PAGE,
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
} from '../../common/dto/pagination-query.dto';

export interface ListUsersParams {
  page?: number;
  pageSize?: number;
  role?: Role;
  status?: AccountStatus;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// Proyeksi minimal: field pribadi seminimal mungkin untuk daftar/detail.
const USER_PUBLIC_SELECT = {
  id: true,
  email: true,
  role: true,
  status: true,
  createdAt: true,
} as const;

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly passwords: PasswordService,
    private readonly audit: AuditService,
  ) {}

  async list(params: ListUsersParams) {
    const page = Math.max(1, params.page ?? DEFAULT_PAGE);
    const pageSize = Math.min(
      MAX_PAGE_SIZE,
      Math.max(1, params.pageSize ?? DEFAULT_PAGE_SIZE),
    );
    const where: Prisma.UserWhereInput = {};
    if (params.role) where.role = params.role;
    if (params.status) where.status = params.status;
    if (params.search) {
      where.email = { contains: params.search, mode: 'insensitive' };
    }
    const sortBy =
      params.sortBy &&
      (USER_SORTABLE_FIELDS as readonly string[]).includes(params.sortBy)
        ? params.sortBy
        : 'createdAt';
    const [totalItems, rows] = await Promise.all([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({
        where,
        select: USER_PUBLIC_SELECT,
        orderBy: { [sortBy]: params.sortOrder === 'asc' ? 'asc' : 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);
    return paginated(rows, page, pageSize, totalItems);
  }

  async detail(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        ...USER_PUBLIC_SELECT,
        consentGivenAt: true,
        verifiedAt: true,
      },
    });
    if (!user) throw new NotFoundException('Pengguna tidak ditemukan.');
    return user;
  }

  // Verifikasi Taruna oleh Admin/Superadmin (keputusan Tahap 3 butir 2).
  // PENDING_VERIFICATION → ACTIVE; status lain ditolak (422 via Conflict).
  async verify(userId: string, actorId: string, verified: boolean) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user) throw new NotFoundException('Pengguna tidak ditemukan.');
    if (user.role !== Role.TARUNA) {
      throw new ForbiddenException('Hanya akun Taruna yang diverifikasi.');
    }
    if (verified) {
      if (user.status !== AccountStatus.PENDING_VERIFICATION) {
        throw new ConflictException('Hanya akun menunggu verifikasi.');
      }
      const updated = await this.prisma.user.update({
        where: { id: userId },
        data: {
          status: AccountStatus.ACTIVE,
          verifiedAt: new Date(),
          verifiedBy: actorId,
        },
        select: USER_PUBLIC_SELECT,
      });
      await this.audit.record(USER_AUDIT_ACTIONS.USER_VERIFIED, {
        actorId,
        targetId: userId,
      });
      return updated;
    }
    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { status: AccountStatus.SUSPENDED },
      select: USER_PUBLIC_SELECT,
    });
    await this.audit.record(USER_AUDIT_ACTIONS.USER_STATUS_CHANGED, {
      actorId,
      targetId: userId,
      metadata: { from: user.status, to: AccountStatus.SUSPENDED },
    });
    return updated;
  }

  // Akun non-Taruna hanya dibuat Superadmin (keputusan Tahap 3 butir 3).
  // Dipanggil controller yang sudah dijaga @Roles(SUPERADMIN).
  async createBySuperadmin(
    email: string,
    password: string,
    role: Role,
    actorId: string,
  ) {
    if (role === Role.TARUNA) {
      throw new ForbiddenException(
        'Akun Taruna dibuat via registrasi atau impor.',
      );
    }
    const normalized = email.trim().toLowerCase();
    const existing = await this.prisma.user.findUnique({
      where: { email: normalized },
    });
    if (existing) throw new ConflictException('Email sudah terdaftar.');
    const user = await this.prisma.user.create({
      data: {
        email: normalized,
        passwordHash: await this.passwords.hash(password),
        role,
        // Akun operasional langsung ACTIVE (dibuat pihak berwenang).
        status: AccountStatus.ACTIVE,
        verifiedAt: new Date(),
        verifiedBy: actorId,
      },
      select: USER_PUBLIC_SELECT,
    });
    await this.audit.record(USER_AUDIT_ACTIONS.USER_CREATED_BY_ADMIN, {
      actorId,
      targetId: user.id,
      metadata: { role },
    });
    return user;
  }

  // Perubahan status oleh Admin/Superadmin. Aturan: tidak boleh mengubah
  // status diri sendiri menjadi non-ACTIVE (mencegah lockout diri).
  async updateStatus(
    userId: string,
    status: AccountStatus,
    actorId: string,
  ) {
    if (userId === actorId && status !== AccountStatus.ACTIVE) {
      throw new ForbiddenException('Tidak dapat menonaktifkan akun sendiri.');
    }
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user) throw new NotFoundException('Pengguna tidak ditemukan.');
    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { status },
      select: USER_PUBLIC_SELECT,
    });
    await this.audit.record(USER_AUDIT_ACTIONS.USER_STATUS_CHANGED, {
      actorId,
      targetId: userId,
      metadata: { from: user.status, to: status },
    });
    return updated;
  }

  // Perubahan role HANYA Superadmin (controller dijaga @Roles(SUPERADMIN)).
  // Anti-escalation: tidak boleh mengubah role diri sendiri; tidak boleh
  // menurunkan Superadmin terakhir.
  async updateRole(userId: string, role: Role, actorId: string) {
    if (userId === actorId) {
      throw new ForbiddenException('Tidak dapat mengubah role sendiri.');
    }
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user) throw new NotFoundException('Pengguna tidak ditemukan.');
    if (user.role === Role.SUPERADMIN && role !== Role.SUPERADMIN) {
      const remaining = await this.prisma.user.count({
        where: {
          role: Role.SUPERADMIN,
          id: { not: userId },
          status: AccountStatus.ACTIVE,
        },
      });
      if (remaining === 0) {
        throw new ForbiddenException('Superadmin terakhir tidak dapat diturunkan.');
      }
    }
    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { role },
      select: USER_PUBLIC_SELECT,
    });
    await this.audit.record(USER_AUDIT_ACTIONS.USER_ROLE_CHANGED, {
      actorId,
      targetId: userId,
      metadata: { from: user.role, to: role },
    });
    return updated;
  }

  // Penghapusan permanen (hard delete) — HANYA Superadmin dan SELALU tercatat
  // di audit log (PRD §9: "penghapusan permanen hanya oleh Superadmin dan
  // tercatat di audit log"). Penghapusan biasa tetap soft (status SUSPENDED
  // / cohort nonaktif); endpoint ini untuk permintaan hapus data pribadi yang
  // disetujui, bukan alat administratif sehari-hari.
  //
  // Relasi turunan ikut terhapus melalui ON DELETE CASCADE pada skema; yang
  // tidak di-cascade (verified_by) di-set NULL oleh database. Sesi refresh
  // dicabut lebih dulu agar token lama tidak lolos setelah akun hilang.
  //
  // Audit log ditulis SEBELUM baris pengguna dihapus agar penghapusan tetap
  // meninggalkan jejak bila langkah hapus sesudahnya gagal. Perlu dicatat:
  // `audit_logs.actor_id` memakai ON DELETE SET NULL pada skema, jadi ketika
  // aktor menghapus dirinya sendiri database akan men-NULL-kan `actor_id`
  // — memindahkan pemanggilan ini tidak mencegah hal itu. Karena itu identitas
  // aktor juga disalin ke `metadata.actorEmail`/`actorRole` supaya pelaku
  // tetap dapat diidentifikasi setelah barisnya hilang. Verifikasi e2e:
  // skenario "Superadmin menghapus dirinya sendiri".
  async deletePermanently(userId: string, actorId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, role: true, status: true },
    });
    if (!user) throw new NotFoundException('Pengguna tidak ditemukan.');
    if (user.role === Role.SUPERADMIN) {
      const remaining = await this.prisma.user.count({
        where: { role: Role.SUPERADMIN, id: { not: userId } },
      });
      if (remaining === 0) {
        throw new ForbiddenException(
          'Superadmin terakhir tidak dapat dihapus permanen.',
        );
      }
    }
    const actor = await this.prisma.user.findUnique({
      where: { id: actorId },
      select: { id: true, email: true, role: true },
    });
    await this.audit.record(USER_AUDIT_ACTIONS.USER_DELETED_PERMANENTLY, {
      actorId,
      targetId: userId,
      // Hanya identitas non-sensitif dicatat — tanpa hash/password/token.
      // `actorEmail`/`actorRole` menjaga identitas pelaku tetap terbaca
      // meski `actor_id` di-NULL-kan saat aktor menghapus dirinya sendiri.
      metadata: {
        email: user.email,
        role: user.role,
        status: user.status,
        actorEmail: actor?.email ?? null,
        actorRole: actor?.role ?? null,
      },
    });
    await this.prisma.session.deleteMany({ where: { userId } });
    await this.prisma.user.delete({ where: { id: userId } });
    return { deleted: true };
  }
}
