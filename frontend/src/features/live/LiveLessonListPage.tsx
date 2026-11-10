import { useMemo, useState } from "react";
import { ApiError } from "../../services/apiClient.ts";
import { useAccessToken, usePaginatedList } from "../accounts/useAccountList.ts";
import { useSession } from "../../app/useSession.ts";
import { listLiveLessons, listMyLiveLessons } from "./liveService.ts";
import type { LiveLesson, LiveLessonQuery, LiveLessonStatus } from "./liveTypes.ts";
import { canJoinLesson, formatLiveRange, joinBlockedMessage, liveStatusLabel } from "./liveUtils.ts";
import {
  Badge,
  Button,
  ButtonLink,
  Card,
  EmptyState,
  ErrorState,
  InfoAlert,
  LoadingState,
} from "../../components/ui.tsx";

const PAGE_SIZE = 20;

function statusTone(status: LiveLessonStatus): "open" | "progress" | "done" | "neutral" {
  if (status === "SCHEDULED") return "open";
  if (status === "ONGOING") return "progress";
  if (status === "FINISHED" || status === "COMPLETED" || status === "RESCHEDULED") return "done";
  return "neutral";
}

export function LiveLessonListPage() {
  const accessToken = useAccessToken();
  const { user } = useSession();
  const [onlyMine, setOnlyMine] = useState(user?.role === "TARUNA");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [applied, setApplied] = useState<LiveLessonQuery>({ pageSize: PAGE_SIZE });
  const canManage = user?.role === "ADMIN" || user?.role === "SUPERADMIN" || user?.role === "MENTOR";

  const loader = useMemo(() => {
    return async (page: number) => {
      if (!accessToken) throw new ApiError(401, "UNAUTHENTICATED", "Sesi berakhir.");
      if (onlyMine && user?.role === "TARUNA") {
        const result = await listMyLiveLessons(accessToken);
        return { items: result.data, totalItems: result.data.length, totalPages: 1 };
      }
      const result = await listLiveLessons({ ...applied, page, pageSize: PAGE_SIZE }, accessToken);
      return {
        items: result.data,
        totalItems: result.meta?.totalItems ?? result.data.length,
        totalPages: result.meta?.totalPages ?? 1,
      };
    };
  }, [accessToken, applied, onlyMine, user?.role]);

  const list = usePaginatedList<LiveLesson>(loader);

  return (
    <div className="page">
      <Card>
        <h1>Kelas Live</h1>
        <p className="muted">
          Jadwal ditampilkan dalam WIB. Taruna hanya melihat jadwal sesuai enrollment dan masuk
          lewat tombol Masuk Kelas agar kehadiran tercatat otomatis. Tautan konferensi mentah tidak
          ditampilkan di daftar umum.
        </p>
        <form
          className="form"
          aria-label="Filter kelas live"
          onSubmit={(event) => {
            event.preventDefault();
            list.setPage(1);
            setApplied({
              search: search.trim() || undefined,
              status: (status as LiveLessonQuery["status"]) || undefined,
              pageSize: PAGE_SIZE,
            });
          }}
        >
          <div className="grid-two">
            <div className="form-field">
              <label htmlFor="live-search">Pencarian kelas</label>
              <input
                id="live-search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Contoh: Keselamatan pelayaran"
              />
            </div>
            <div className="form-field">
              <label htmlFor="live-status">Status</label>
              <select id="live-status" value={status} onChange={(event) => setStatus(event.target.value)}>
                <option value="">Semua status</option>
                <option value="SCHEDULED">Dijadwalkan</option>
                <option value="ONGOING">Berlangsung</option>
                <option value="COMPLETED">Selesai</option>
                <option value="CANCELLED">Dibatalkan</option>
                <option value="RESCHEDULED">Dijadwalkan ulang</option>
              </select>
            </div>
          </div>
          <div className="button-row">
            <Button type="submit" variant="primary">
              Terapkan filter
            </Button>
            {user?.role === "TARUNA" ? (
              <Button type="button" variant="secondary" onClick={() => setOnlyMine((value) => !value)}>
                {onlyMine ? "Tampilkan semua yang diizinkan" : "Hanya kelas saya"}
              </Button>
            ) : null}
            {canManage ? <ButtonLink to="/kelas-live/baru">Buat jadwal</ButtonLink> : null}
          </div>
        </form>
      </Card>

      {!accessToken || list.unauthorized ? (
        <ErrorState title="Sesi berakhir" description="Silakan masuk kembali." onRetry={list.reload} />
      ) : list.loading ? (
        <LoadingState label="Memuat jadwal kelas..." />
      ) : list.error ? (
        <ErrorState
          title={list.forbidden ? "Akses ditolak" : "Gagal memuat jadwal"}
          description={list.error}
          onRetry={list.reload}
        />
      ) : list.items.length === 0 ? (
        <EmptyState
          title="Belum ada jadwal"
          description="Belum ada kelas yang tersedia untuk enrollment atau assignment ini."
        />
      ) : (
        <div className="grid-two">
          {list.items.map((lesson) => (
            <Card key={lesson.id}>
              <h2>{lesson.title}</h2>
              <p className="muted">{formatLiveRange(lesson.startsAt, lesson.endsAt)}</p>
              <p className="muted">{lesson.mentorName ? `Mentor: ${lesson.mentorName}` : "Mentor menunggu penetapan backend."}</p>
              <p>
                <Badge tone={statusTone(lesson.status)}>{liveStatusLabel(lesson.status)}</Badge>
              </p>
              {/* Pesan blokir hanya untuk Taruna; peran pengelola tidak punya tombol join. */}
              {user?.role === "TARUNA" && !canJoinLesson(lesson) ? (
                <p className="field-help">{joinBlockedMessage(lesson)}</p>
              ) : null}
              <div className="button-row">
                <ButtonLink to={`/kelas-live/${lesson.id}`}>
                  {user?.role === "TARUNA" ? "Detail dan Masuk Kelas" : "Detail kelas"}
                </ButtonLink>
              </div>
            </Card>
          ))}
        </div>
      )}
      {list.items.length > 0 && !onlyMine ? (
        <Card>
          <div className="button-row">
            <Button variant="secondary" disabled={list.page <= 1} onClick={() => list.setPage(list.page - 1)}>
              Sebelumnya
            </Button>
            <span className="muted" aria-live="polite">
              Halaman {list.page} dari {Math.max(list.totalPages, 1)}, total {list.totalItems} jadwal.
            </span>
            <Button
              variant="secondary"
              disabled={list.page >= Math.max(list.totalPages, 1)}
              onClick={() => list.setPage(list.page + 1)}
            >
              Berikutnya
            </Button>
          </div>
        </Card>
      ) : null}
      <InfoAlert>
        Notifikasi perubahan jadwal memakai email dan in-app sesuai PRD. Status terkirim menunggu
        endpoint atau provider final dan tidak ditampilkan sebagai sudah terkirim.
      </InfoAlert>
    </div>
  );
}
