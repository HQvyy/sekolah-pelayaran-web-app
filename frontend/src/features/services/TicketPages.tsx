import { useEffect, useMemo, useState } from "react";
import { ApiError } from "../../services/apiClient.ts";
import { fieldErrors, useAccessToken, usePaginatedList } from "../accounts/useAccountList.ts";
import { useSession } from "../../app/useSession.ts";
import { createTicket, getTicket, getTicketHistory, listTickets, updateTicketStatus } from "./serviceHub.ts";
import type { Ticket, TicketPayload, TicketQuery, TicketStatus } from "./serviceTypes.ts";
import { ticketStatusLabel, ticketTone } from "./serviceUtils.ts";
import { formatWib } from "../../lib/config.ts";
import {
  Badge,
  Button,
  ButtonLink,
  Card,
  ConfirmDialog,
  EmptyState,
  ErrorAlert,
  ErrorState,
  FieldError,
  InfoAlert,
  LoadingState,
} from "../../components/ui.tsx";
import type { TicketHistoryItem } from "./serviceTypes.ts";

const PAGE_SIZE = 20;

export function TicketListPage() {
  const accessToken = useAccessToken();
  const { user } = useSession();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [applied, setApplied] = useState<TicketQuery>({ pageSize: PAGE_SIZE });
  const isSupport = user?.role === "ADMIN" || user?.role === "SUPERADMIN";

  const loader = useMemo(() => {
    return async (page: number) => {
      if (!accessToken) throw new ApiError(401, "UNAUTHENTICATED", "Sesi berakhir.");
      const result = await listTickets({ ...applied, page, pageSize: PAGE_SIZE }, accessToken);
      return {
        items: result.data,
        totalItems: result.meta?.totalItems ?? result.data.length,
        totalPages: result.meta?.totalPages ?? 1,
      };
    };
  }, [accessToken, applied]);

  const list = usePaginatedList<Ticket>(loader);

  return (
    <div className="page">
      <Card>
        <h1>{isSupport ? "Tiket Bantuan" : "Tiket Saya"}</h1>
        <p className="muted">
          {isSupport
            ? "Halaman support untuk Admin sesuai izin. Jangan menganggap Mentor sebagai petugas support."
            : "Taruna hanya melihat tiket milik sendiri. Status aktual berasal dari backend."}
        </p>
        <form
          className="form"
          aria-label="Filter tiket"
          onSubmit={(event) => {
            event.preventDefault();
            list.setPage(1);
            setApplied({
              search: search.trim() || undefined,
              status: (status as TicketQuery["status"]) || undefined,
              pageSize: PAGE_SIZE,
            });
          }}
        >
          <div className="grid-two">
            <div className="form-field">
              <label htmlFor="ticket-search">Pencarian tiket</label>
              <input
                id="ticket-search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Contoh: video tidak bisa diputar"
              />
            </div>
            <div className="form-field">
              <label htmlFor="ticket-status">Status</label>
              <select id="ticket-status" value={status} onChange={(event) => setStatus(event.target.value)}>
                <option value="">Semua status</option>
                <option value="OPEN">Open</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="RESOLVED">Resolved</option>
                <option value="CLOSED">Closed</option>
              </select>
            </div>
          </div>
          <div className="button-row">
            <Button type="submit" variant="primary">
              Terapkan filter
            </Button>
            <ButtonLink to="/tiket/baru">Buat tiket</ButtonLink>
          </div>
        </form>
      </Card>

      {!accessToken || list.unauthorized ? (
        <ErrorState title="Sesi berakhir" description="Silakan masuk kembali." onRetry={list.reload} />
      ) : list.loading ? (
        <LoadingState label="Memuat tiket..." />
      ) : list.error ? (
        <ErrorState
          title={list.forbidden ? "Akses ditolak" : "Gagal memuat tiket"}
          description={list.error}
          onRetry={list.reload}
        />
      ) : list.items.length === 0 ? (
        <EmptyState title="Belum ada tiket" description="Buat tiket baru bila membutuhkan bantuan." />
      ) : (
        <div className="grid-two">
          {list.items.map((ticket) => (
            <Card key={ticket.id}>
              <h2>{ticket.title}</h2>
              <p className="muted">{ticket.description}</p>
              <p>
                <Badge tone={ticketTone(ticket.status)}>{ticketStatusLabel(ticket.status)}</Badge>
              </p>
              <p className="muted">Diperbarui {formatWib(ticket.updatedAt)}.</p>
              <div className="button-row">
                <ButtonLink to={`/tiket/${ticket.id}`}>Detail dan riwayat</ButtonLink>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

export function TicketFormPage() {
  const accessToken = useAccessToken();
  const [form, setForm] = useState<TicketPayload>({ title: "", description: "", category: "" });
  const [fieldErrorMap, setFieldErrorMap] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [savedMessage, setSavedMessage] = useState("");

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!accessToken) {
      setFormError("Sesi berakhir. Silakan masuk kembali.");
      return;
    }
    const nextErrors: Record<string, string> = {};
    if (!form.title.trim()) nextErrors.title = "Judul tiket wajib diisi.";
    if (!form.description.trim()) nextErrors.description = "Deskripsi tiket wajib diisi.";
    setFieldErrorMap(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    setSaving(true);
    setFormError("");
    setSavedMessage("");
    try {
      const result = await createTicket(
        { title: form.title.trim(), description: form.description.trim(), category: form.category || undefined },
        accessToken,
      );
      setSavedMessage(`Tiket ${result.data.title} tersimpan dengan status ${ticketStatusLabel(result.data.status)}.`);
      setForm({ title: "", description: "", category: "" });
    } catch (requestError) {
      if (requestError instanceof ApiError) {
        setFieldErrorMap(fieldErrors(requestError));
        setFormError(requestError.message);
      } else {
        setFormError("Tidak dapat menghubungi server.");
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="page">
      <Card>
        <h1>Buat Tiket</h1>
        <form className="form" onSubmit={handleSubmit} aria-label="Formulir tiket">
          <div className="form-field">
            <label htmlFor="ticket-title">Judul</label>
            <input
              id="ticket-title"
              value={form.title}
              onChange={(event) => setForm((value) => ({ ...value, title: event.target.value }))}
              aria-invalid={fieldErrorMap.title ? "true" : undefined}
              aria-describedby={fieldErrorMap.title ? "ticket-title-error" : undefined}
              placeholder="Contoh: Video materi tidak bisa diputar"
            />
            <FieldError id="ticket-title-error" message={fieldErrorMap.title} />
          </div>
          <div className="form-field">
            <label htmlFor="ticket-category">Kategori</label>
            <input
              id="ticket-category"
              value={form.category ?? ""}
              onChange={(event) => setForm((value) => ({ ...value, category: event.target.value }))}
              placeholder="Contoh: Video, Akun, Jadwal"
            />
          </div>
          <div className="form-field">
            <label htmlFor="ticket-description">Deskripsi</label>
            <textarea
              id="ticket-description"
              value={form.description}
              onChange={(event) => setForm((value) => ({ ...value, description: event.target.value }))}
              aria-invalid={fieldErrorMap.description ? "true" : undefined}
              aria-describedby={fieldErrorMap.description ? "ticket-description-error" : undefined}
              rows={5}
              placeholder="Jelaskan kendala, langkah yang sudah dicoba, dan waktu kejadian"
            />
            <FieldError id="ticket-description-error" message={fieldErrorMap.description} />
          </div>
          {formError ? <ErrorAlert>{formError}</ErrorAlert> : null}
          {savedMessage ? (
            <div className="alert alert-success" role="status">
              {savedMessage}
            </div>
          ) : null}
          <div className="button-row">
            <Button type="submit" variant="primary" disabled={saving}>
              {saving ? "Menyimpan..." : "Kirim tiket"}
            </Button>
            <ButtonLink to="/tiket">Kembali</ButtonLink>
          </div>
        </form>
        <InfoAlert>Pelapor hanya melihat tiket miliknya. Perubahan status hanya oleh pihak berwenang.</InfoAlert>
      </Card>
    </div>
  );
}

export function TicketDetailPage({ ticketId }: { ticketId: string }) {
  const accessToken = useAccessToken();
  const { user } = useSession();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [history, setHistory] = useState<TicketHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [forbidden, setForbidden] = useState(false);
  const [statusDraft, setStatusDraft] = useState<TicketStatus>("IN_PROGRESS");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState("");
  const isSupport = user?.role === "ADMIN" || user?.role === "SUPERADMIN";

  async function load() {
    if (!accessToken) {
      setLoading(false);
      setError("Sesi berakhir. Silakan masuk kembali.");
      return;
    }
    setLoading(true);
    setError("");
    setForbidden(false);
    try {
      const detail = await getTicket(ticketId, accessToken);
      setTicket(detail.data);
      setStatusDraft(detail.data.status === "OPEN" ? "IN_PROGRESS" : detail.data.status);
      try {
        const historyResult = await getTicketHistory(ticketId, accessToken);
        setHistory(historyResult.data);
      } catch (historyError) {
        if (!(historyError instanceof ApiError)) throw historyError;
      }
    } catch (requestError) {
      if (requestError instanceof ApiError && requestError.status === 403) {
        setForbidden(true);
        setError("Akun ini tidak memiliki akses tiket. Tiket lintas pengguna ditolak backend.");
      } else if (requestError instanceof ApiError) {
        setError(requestError.message);
      } else {
        setError("Gagal memuat tiket.");
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticketId, accessToken]);

  async function handleStatus() {
    if (!accessToken || !ticket) return;
    setActionLoading(true);
    setActionError("");
    try {
      const result = await updateTicketStatus(ticket.id, statusDraft, accessToken);
      setTicket(result.data);
      setConfirmOpen(false);
      await load();
    } catch (requestError) {
      setActionError(requestError instanceof ApiError ? requestError.message : "Gagal mengubah status.");
      setConfirmOpen(false);
    } finally {
      setActionLoading(false);
    }
  }

  if (loading) return <LoadingState label="Memuat tiket..." />;
  if (error || !ticket) {
    return (
      <div className="page">
        <Card>
          <h1>Detail Tiket</h1>
          <ErrorAlert>{error || "Tiket tidak ditemukan."}</ErrorAlert>
          {forbidden ? <p className="muted">Detail disembunyikan karena tiket milik pengguna lain.</p> : null}
          <div className="button-row">
            <ButtonLink to="/tiket">Kembali</ButtonLink>
            {!forbidden ? (
              <Button variant="secondary" onClick={() => void load()}>
                Coba lagi
              </Button>
            ) : null}
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="page">
      <Card>
        <h1>{ticket.title}</h1>
        <p className="muted">{ticket.description}</p>
        <p>
          <Badge tone={ticketTone(ticket.status)}>{ticketStatusLabel(ticket.status)}</Badge>
        </p>
        <p className="muted">Dibuat {formatWib(ticket.createdAt)}, diperbarui {formatWib(ticket.updatedAt)}.</p>
        {actionError ? <ErrorAlert>{actionError}</ErrorAlert> : null}
        <div className="button-row">
          <ButtonLink to="/tiket">Kembali</ButtonLink>
        </div>
        {isSupport ? (
          <form
            className="form"
            aria-label="Formulir status tiket"
            onSubmit={(event) => {
              event.preventDefault();
              setConfirmOpen(true);
            }}
          >
            <div className="form-field">
              <label htmlFor="ticket-status-draft">Ubah status</label>
              <select
                id="ticket-status-draft"
                value={statusDraft}
                onChange={(event) => setStatusDraft(event.target.value as TicketStatus)}
              >
                <option value="OPEN">Open</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="RESOLVED">Resolved</option>
                <option value="CLOSED">Closed</option>
              </select>
            </div>
            <div className="button-row">
              <Button type="submit" variant="primary" disabled={actionLoading}>
                Simpan status
              </Button>
            </div>
          </form>
        ) : (
          <InfoAlert>Perubahan status hanya oleh Admin sesuai izin.</InfoAlert>
        )}
      </Card>
      <Card>
        <h2>Riwayat penanganan</h2>
        {history.length === 0 ? (
          <EmptyState title="Belum ada riwayat" description="Perubahan status tercatat di sini." />
        ) : (
          <ul>
            {history.map((item) => (
              <li key={item.id}>
                {item.status ? `${ticketStatusLabel(item.status)}: ` : ""}
                {item.message || "Perubahan status tercatat."}{" "}
                <span className="muted">{formatWib(item.createdAt)}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
      {confirmOpen ? (
        <ConfirmDialog
          title="Ubah status tiket?"
          description={`Status tiket berubah menjadi ${ticketStatusLabel(statusDraft)}. Tindakan ini tercatat di riwayat.`}
          confirmLabel={actionLoading ? "Memproses..." : "Ya, ubah"}
          onClose={() => {
            if (!actionLoading) setConfirmOpen(false);
          }}
          onConfirm={() => {
            void handleStatus();
          }}
        />
      ) : null}
    </div>
  );
}
