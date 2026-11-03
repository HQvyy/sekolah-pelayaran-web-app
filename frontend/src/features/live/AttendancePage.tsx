import { useEffect, useState } from "react";
import { ApiError } from "../../services/apiClient.ts";
import { fieldErrors, useAccessToken } from "../accounts/useAccountList.ts";
import { useSession } from "../../app/useSession.ts";
import { attendanceExportUrl, correctAttendance, getAttendance, getLiveLesson } from "./liveService.ts";
import type { AttendanceRecord, AttendanceStatus } from "./liveTypes.ts";
import { attendanceLabel, formatLiveRange } from "./liveUtils.ts";
import {
  Badge,
  Button,
  ButtonLink,
  Card,
  EmptyState,
  ErrorAlert,
  InfoAlert,
  LoadingState,
} from "../../components/ui.tsx";

export function AttendancePage({ liveLessonId }: { liveLessonId: string }) {
  const accessToken = useAccessToken();
  const { user } = useSession();
  const [title, setTitle] = useState("");
  const [schedule, setSchedule] = useState("");
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [forbidden, setForbidden] = useState(false);
  const [selected, setSelected] = useState<Record<string, AttendanceStatus>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [actionError, setActionError] = useState("");
  const [actionMessage, setActionMessage] = useState("");
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
      const detail = await getLiveLesson(liveLessonId, accessToken);
      setTitle(detail.data.title);
      setSchedule(formatLiveRange(detail.data.startsAt, detail.data.endsAt));
      const attendance = await getAttendance(liveLessonId, accessToken);
      setRecords(attendance.data);
    } catch (requestError) {
      if (requestError instanceof ApiError && requestError.status === 403) {
        setForbidden(true);
        setError("Akun ini tidak memiliki akses absensi. Otorisasi resmi ditentukan backend.");
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

  async function handleCorrect(record: AttendanceRecord) {
    if (!accessToken) {
      setActionError("Sesi berakhir. Silakan masuk kembali.");
      return;
    }
    const status = selected[record.participantId] ?? record.status;
    setActionLoading(record.participantId);
    setActionError("");
    setActionMessage("");
    try {
      await correctAttendance(
        liveLessonId,
        record.participantId,
        { status, note: notes[record.participantId] || undefined },
        accessToken,
      );
      setActionMessage(`Koreksi untuk ${record.userName} tersimpan sesuai respons server.`);
      await load();
    } catch (requestError) {
      if (requestError instanceof ApiError && requestError.status === 403) {
        setActionError("Akses ditolak backend. Koreksi hanya untuk pihak berwenang.");
      } else if (requestError instanceof ApiError) {
        const details = fieldErrors(requestError);
        setActionError(details.status ?? requestError.message);
      } else {
        setActionError("Tidak dapat menghubungi server.");
      }
    } finally {
      setActionLoading(null);
    }
  }

  if (loading) return <LoadingState label="Memuat absensi..." />;
  if (error) {
    return (
      <div className="page">
        <Card>
          <h1>Absensi Kelas Live</h1>
          <ErrorAlert>{error}</ErrorAlert>
          {forbidden ? <p className="muted">Rekap tidak ditampilkan karena akses ditolak.</p> : null}
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

  return (
    <div className="page">
      <Card>
        <h1>Absensi {title || "Kelas Live"}</h1>
        <p className="muted">{schedule}</p>
        <p className="muted">
          Koreksi manual hanya untuk Mentor atau Admin berwenang dan dicatat audit oleh backend.
          Absensi ditutup otomatis 24 jam setelah sesi berakhir menurut aturan server.
        </p>
        <div className="button-row">
          <ButtonLink to={`/kelas-live/${liveLessonId}`}>Kembali ke detail</ButtonLink>
          {canManage ? (
            <a className="btn btn-secondary" href={attendanceExportUrl(liveLessonId)}>
              Ekspor rekap
            </a>
          ) : null}
        </div>
      </Card>
      <Card>
        <h2>Rekap kehadiran dari server</h2>
        {actionMessage ? (
          <div className="alert alert-success" role="status">
            {actionMessage}
          </div>
        ) : null}
        {actionError ? <ErrorAlert>{actionError}</ErrorAlert> : null}
        {records.length === 0 ? (
          <EmptyState title="Belum ada data absensi" description="Absensi tercatat setelah join backend berhasil." />
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <caption>Hasil absensi resmi dari backend, bukan perhitungan lokal.</caption>
              <thead>
                <tr>
                  <th scope="col">Peserta</th>
                  <th scope="col">Status server</th>
                  <th scope="col">Koreksi</th>
                </tr>
              </thead>
              <tbody>
                {records.map((record) => (
                  <tr key={record.participantId}>
                    <td>
                      {record.userName}
                      <br />
                      <span className="muted">{record.userEmail}</span>
                    </td>
                    <td>
                      <Badge tone={record.status === "PRESENT" ? "done" : "neutral"}>
                        {attendanceLabel(record.status)}
                      </Badge>
                    </td>
                    <td>
                      {canManage ? (
                        <div className="form-field">
                          <label htmlFor={`status-${record.participantId}`}>Status koreksi</label>
                          <select
                            id={`status-${record.participantId}`}
                            value={selected[record.participantId] ?? record.status}
                            onChange={(event) =>
                              setSelected((value) => ({
                                ...value,
                                [record.participantId]: event.target.value as AttendanceStatus,
                              }))
                            }
                          >
                            <option value="PRESENT">Hadir</option>
                            <option value="ABSENT">Tidak hadir</option>
                            <option value="EXCUSED">Izin</option>
                            <option value="PENDING">Menunggu</option>
                          </select>
                          <label htmlFor={`note-${record.participantId}`}>Catatan audit</label>
                          <input
                            id={`note-${record.participantId}`}
                            value={notes[record.participantId] ?? ""}
                            onChange={(event) =>
                              setNotes((value) => ({ ...value, [record.participantId]: event.target.value }))
                            }
                            placeholder="Alasan koreksi"
                          />
                          <Button
                            variant="secondary"
                            disabled={actionLoading === record.participantId}
                            onClick={() => void handleCorrect(record)}
                          >
                            {actionLoading === record.participantId ? "Menyimpan..." : "Simpan koreksi"}
                          </Button>
                        </div>
                      ) : (
                        <span className="field-help">Hanya baca untuk peran ini.</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <InfoAlert>
          Frontend tidak menghitung atau mengesahkan kehadiran. Semua angka dan batas waktu berasal
          dari respons server.
        </InfoAlert>
      </Card>
    </div>
  );
}
