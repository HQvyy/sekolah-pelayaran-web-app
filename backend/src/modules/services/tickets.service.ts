import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Role, TicketStatus } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { SERVICE_AUDIT_ACTIONS, TICKET_TRANSITIONS } from './services.rules';
import { paginated } from '../../common/envelope';
import {
  DEFAULT_PAGE,
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
} from '../../common/dto/pagination-query.dto';

export interface TicketActor {
  id: string;
  role: Role;
}

function parseStatus(value: string): TicketStatus {
  const normalized = value.toUpperCase();
  if (
    normalized === TicketStatus.OPEN ||
    normalized === TicketStatus.IN_PROGRESS ||
    normalized === TicketStatus.RESOLVED ||
    normalized === TicketStatus.CLOSED
  ) {
    return normalized;
  }
  throw new ConflictException(`Status '${value}' tidak dikenal.`);
}

@Injectable()
export class TicketsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  // Taruna: tiket sendiri. Admin/Superadmin: semua. Mentor: ditolak
  // (tidak otomatis punya akses support — PRD §2/§4.6).
  private canSupport(actor: TicketActor): boolean {
    return actor.role === Role.ADMIN || actor.role === Role.SUPERADMIN;
  }

  async list(
    actor: TicketActor,
    query: { status?: string; page?: number; pageSize?: number },
  ) {
    if (actor.role === Role.MENTOR) {
      throw new ForbiddenException('Tidak memiliki akses ticketing.');
    }
    const page = Math.max(1, Number(query.page ?? DEFAULT_PAGE) || DEFAULT_PAGE);
    const pageSize = Math.min(
      MAX_PAGE_SIZE,
      Math.max(1, Number(query.pageSize ?? DEFAULT_PAGE_SIZE) || DEFAULT_PAGE_SIZE),
    );
    const where: { reporterId?: string; status?: TicketStatus } = {};
    if (actor.role === Role.TARUNA) where.reporterId = actor.id;
    if (query.status) where.status = parseStatus(query.status);
    const [totalItems, rows] = await Promise.all([
      this.prisma.ticket.count({ where }),
      this.prisma.ticket.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);
    return paginated(rows, page, pageSize, totalItems);
  }

  async create(reporterId: string, input: { title: string; description: string; category?: string }) {
    const ticket = await this.prisma.ticket.create({
      data: {
        reporterId,
        title: input.title,
        description: input.description,
        category: input.category ?? 'GENERAL',
        status: TicketStatus.OPEN,
      },
    });
    await this.prisma.ticketHistory.create({
      data: {
        ticketId: ticket.id,
        actorId: reporterId,
        toStatus: TicketStatus.OPEN,
        comment: 'Tiket dibuat.',
      },
    });
    await this.audit.record(SERVICE_AUDIT_ACTIONS.TICKET_CREATED, {
      actorId: reporterId,
      targetId: ticket.id,
    });
    return ticket;
  }

  private async assertReadable(actor: TicketActor, id: string) {
    const ticket = await this.prisma.ticket.findUnique({ where: { id } });
    if (!ticket) throw new NotFoundException('Tiket tidak ditemukan.');
    if (actor.role === Role.MENTOR) {
      throw new ForbiddenException('Tidak memiliki akses ticketing.');
    }
    if (actor.role === Role.TARUNA && ticket.reporterId !== actor.id) {
      throw new NotFoundException('Tiket tidak ditemukan.');
    }
    return ticket;
  }

  async detail(actor: TicketActor, id: string) {
    return this.assertReadable(actor, id);
  }

  // Ubah judul/deskripsi: pemilik hanya saat OPEN; Admin kapan pun kecuali CLOSED.
  async update(
    actor: TicketActor,
    id: string,
    input: { title?: string; description?: string },
  ) {
    const ticket = await this.assertReadable(actor, id);
    if (actor.role === Role.TARUNA && ticket.status !== TicketStatus.OPEN) {
      throw new ForbiddenException(
        'Tiket yang sudah diproses tidak dapat diubah pelapor.',
      );
    }
    if (ticket.status === TicketStatus.CLOSED && !this.canSupport(actor)) {
      throw new ForbiddenException('Tiket yang ditutup tidak dapat diubah.');
    }
    const updated = await this.prisma.ticket.update({
      where: { id },
      data: input,
    });
    await this.prisma.ticketHistory.create({
      data: {
        ticketId: id,
        actorId: actor.id,
        comment: 'Detail tiket diperbarui.',
      },
    });
    await this.audit.record(SERVICE_AUDIT_ACTIONS.TICKET_UPDATED, {
      actorId: actor.id,
      targetId: id,
    });
    return updated;
  }

  // Ubah status: hanya Admin/Superadmin; transisi divalidasi.
  async changeStatus(
    actor: TicketActor,
    id: string,
    status: string,
    comment?: string,
  ) {
    const ticket = await this.assertReadable(actor, id);
    if (!this.canSupport(actor)) {
      throw new ForbiddenException('Hanya Admin yang mengubah status tiket.');
    }
    const next = parseStatus(status);
    const allowed = TICKET_TRANSITIONS[ticket.status] ?? [];
    if (!allowed.includes(next)) {
      throw new ConflictException(
        `Transisi ${ticket.status} → ${next} tidak diizinkan.`,
      );
    }
    const updated = await this.prisma.ticket.update({
      where: { id },
      data: { status: next },
    });
    await this.prisma.ticketHistory.create({
      data: {
        ticketId: id,
        actorId: actor.id,
        fromStatus: ticket.status,
        toStatus: next,
        comment: comment ?? null,
      },
    });
    await this.audit.record(SERVICE_AUDIT_ACTIONS.TICKET_STATUS_CHANGED, {
      actorId: actor.id,
      targetId: id,
    });
    return updated;
  }

  async history(actor: TicketActor, id: string) {
    await this.assertReadable(actor, id);
    return this.prisma.ticketHistory.findMany({
      where: { ticketId: id },
      orderBy: { createdAt: 'asc' },
    });
  }
}
