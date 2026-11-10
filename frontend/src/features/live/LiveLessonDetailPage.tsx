import { useEffect, useState } from "react";
import { ApiError } from "../../services/apiClient.ts";
import { useAccessToken } from "../accounts/useAccountList.ts";
import { useSession } from "../../app/useSession.ts";
import {
  cancelLiveLesson,
  getLiveLesson,
  joinLiveLesson,
} from "./liveService.ts";
import type { LiveLesson } from "./liveTypes.ts";
import { canJoinLesson, formatLiveRange, joinBlockedMessage, liveStatusLabel } from "./liveUtils.ts";
import {
  Badge,
  Button,
  ButtonLink,
  Card,
  ConfirmDialog,
  ErrorAlert,
  InfoAlert,
  LoadingState,
} from "../../components/ui.tsx";

export function LiveLessonDetailPage({ liveLessonId }: { liveLessonId: string }) {
  const accessToken = useAccessToken();
  const { user } = useSession();
  const [lesson, setLesson] = useState<LiveLesson | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [forbidden, setForbidden] = useState(false);
  const [joining, setJoining] = useState(false);
  const [joinMessage, setJoinMessage] = useState("");
  const [joinError, setJoinError] = useState("");
  const [joinRoom, setJoinRoom] = useState("");
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const canManage = user?.role === "ADMIN" || user?.role === "SUPERADMIN" || user?.role === "MENTOR";

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
      const result = await getLiveLesson(liveLessonId, accessToken);
      setLesson(result.data);
    } catch (requestError) {
      if (requestError instanceof ApiError && requestError.status === 403) {
        setForbidden(true);
        setError("Akun ini tidak memiliki akses jadwal. Otorisasi resmi ditentukan backend.");
      } else if (requestError instanceof ApiError) {
        setError(requestError.message);
      } else {
        setError("Tidak dapat menghubungi server.");
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liveLessonId, accessToken]);

  async function handleJoin() {
    if (!accessToken || !lesson) return;
    setJoining(true);
    setJoinMessage("");
    setJoinError("");
    setJoinRoom("");
    try {
      const result = await joinLiveLesson(lesson.id, accessToken);
      const data = result.data;
      const allowed = data.status === "JOIN_ALLOWED" || Boolean(data.join);
      if (!allowed) {
        setJoinError(data.message || "Backend menolak permintaan join untuk jadwal ini.");
        return;
      }
      // Backend Tahap 5 mengirim materi join + recordedAt, bukan redirectUrl.
      const recorded = data.attendanceRecorded ?? Boolean(data.recordedAt);
      setJoinMessage(
        recorded
          ? "Akses disetujui backend dan kehadiran tercatat."
          : "Akses disetujui backend. Ikuti instruksi resmi untuk masuk kelas.",
      );
      if (data.join) {
        setJoinRoom(`${data.join.roomName} (${data.join.domain})`);
      }
      if (data.redirectUrl && typeof window !== "undefined") {
        window.location.href = data.redirectUrl;
      }
    } catch (requestError) {
      if (requestError instanceof ApiError && requestError.status === 403) {
        setJoinError("Akses ditolak backend. Jadwal ini tidak tersedia untuk enrollment ini.");
      } else if (requestError instanceof ApiError) {
        setJoinError(requestError.message);
      } else {
        setJoinError("Tidak dapat menghubungi server.");
      }
    } finally {
      setJoining(false);
    }
  }

  async function handleCancel() {
    if (!accessToken || !lesson) return;
    setCancelling(true);
    try {
      const result = await cancelLiveLesson(lesson.id, accessToken);
      setLesson(result.data);
      setCancelOpen(false);
    } catch (requestError) {
      setJoinError(requestError instanceof ApiError ? requestError.message : "Pembatalan gagal.");
      setCancelOpen(false);
    } finally {
      setCancelling(false);
    }
  }

  if (loading) return <LoadingState label="Memuat detail kelas..." />;
  if (error || !lesson) {
    return (
      <div className="page">
        <Card>
          <h1>Detail Kelas Live</h1>
          <ErrorAlert>{error || "Jadwal tidak ditemukan."}</ErrorAlert>
          {forbidden ? <p className="muted">Tombol join disembunyikan karena akses ditolak.</p> : null}
          <div className="button-row">
            <ButtonLink to="/kelas-live">Kembali</ButtonLink>
            <Button variant="secondary" onClick={() => void load()}>
              Coba lagi
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  // Tombol Masuk Kelas hanya untuk Taruna: guard backend (@Roles(TARUNA))
  // akan menolak peran lain, jadi tombolnya tidak boleh ditawarkan.
  const isTaruna = user?.role === "TARUNA";
  const joinable = isTaruna && canJoinLesson(lesson);

  return (
    <div className="page">
      <Card>
        <h1>{lesson.title}</h1>
        <p className="muted">{formatLiveRange(lesson.startsAt, lesson.endsAt)}</p>
        <p className="muted">{lesson.description || "Belum ada deskripsi kelas."}</p>
        <p>
          <Badge tone={lesson.status === "CANCELLED" ? "neutral" : "open"}>{liveStatusLabel(lesson.status)}</Badge>
        </p>
        {isTaruna && !joinable ? <p className="field-help">{joinBlockedMessage(lesson)}</p> : null}
        {lesson.status === "CANCELLED" ? (
          <ErrorAlert>Jadwal dibatalkan. Perubahan melewati alur join yang ditetapkan backend.</ErrorAlert>
        ) : null}
        {lesson.status === "RESCHEDULED" ? (
          <div className="alert alert-info" role="status">
            Jadwal diubah. Periksa waktu terbaru dalam WIB sebelum masuk kelas.
          </div>
        ) : null}
        {joinMessage ? (
          <div className="alert alert-success" role="status">
            {joinMessage}
            {joinRoom ? ` Ruang kelas: ${joinRoom}.` : ""}
          </div>
        ) : null}
        {joinError ? <ErrorAlert>{joinError}</ErrorAlert> : null}
        <div className="button-row">
          {joinable ? (
            <Button variant="primary" disabled={joining} onClick={() => void handleJoin()}>
              {joining ? "Memeriksa akses..." : "Masuk Kelas"}
            </Button>
          ) : null}
          <ButtonLink to="/kelas-live">Kembali</ButtonLink>
          {canManage ? <ButtonLink to={`/kelas-live/${lesson.id}/ubah`}>Ubah jadwal</ButtonLink> : null}
          {canManage && lesson.status !== "CANCELLED" ? (
            <Button variant="danger" onClick={() => setCancelOpen(true)}>
              Batalkan kelas
            </Button>
          ) : null}
          {canManage ? <ButtonLink to={`/kelas-live/${lesson.id}/absensi`}>Absensi</ButtonLink> : null}
        </div>
        <InfoAlert>
          UI ini generik dan tidak mengunci ke Zoom atau Google Meet. Tautan konferensi tidak
          ditampilkan mentah dan hanya dibuka lewat respons join backend bila tersedia.
        </InfoAlert>
      </Card>
      {cancelOpen ? (
        <ConfirmDialog
          title="Batalkan kelas?"
          description="Pembatalan mengikuti aturan H-1 dan memicu pemberitahuan backend bila memenuhi syarat."
          confirmLabel={cancelling ? "Memproses..." : "Ya, batalkan"}
          onClose={() => {
            if (!cancelling) setCancelOpen(false);
          }}
          onConfirm={() => {
            void handleCancel();
          }}
        />
      ) : null}
    </div>
  );
}
