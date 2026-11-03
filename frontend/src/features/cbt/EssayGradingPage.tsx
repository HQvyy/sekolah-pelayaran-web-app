import { useEffect, useState } from "react";
import { ApiError } from "../../services/apiClient.ts";
import { fieldErrors, useAccessToken } from "../accounts/useAccountList.ts";
import { useSession } from "../../app/useSession.ts";
import { gradeEssay, listEssayQueue, listOverdueGrading } from "./cbtService.ts";
import type { EssayQueueItem } from "./cbtTypes.ts";
import { formatWib } from "../../lib/config.ts";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorAlert,
  ErrorState,
  FieldError,
  InfoAlert,
  LoadingState,
} from "../../components/ui.tsx";

export function EssayGradingPage() {
  const accessToken = useAccessToken();
  const { user } = useSession();
  const [items, setItems] = useState<EssayQueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [scores, setScores] = useState<Record<string, string>>({});
  const [feedback, setFeedback] = useState<Record<string, string>>({});
  const [fieldErrorMap, setFieldErrorMap] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);
  const [savedMessage, setSavedMessage] = useState("");
  const canGrade = user?.role === "MENTOR" || user?.role === "ADMIN" || user?.role === "SUPERADMIN";

  async function load() {
    if (!accessToken) {
      setLoading(false);
      setError("Sesi berakhir. Silakan masuk kembali.");
      return;
    }
    if (!canGrade) {
      setLoading(false);
      setError("Halaman ini hanya untuk Mentor atau pemeriksa berwenang sesuai assignment.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const result = await listEssayQueue(accessToken);
      setItems(result.data);
    } catch (requestError) {
      setError(requestError instanceof ApiError ? requestError.message : "Gagal memuat antrean esai.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken]);

  async function handleGrade(item: EssayQueueItem) {
    if (!accessToken) {
      setFormError("Sesi berakhir. Silakan masuk kembali.");
      return;
    }
    const score = Number(scores[item.answerId]);
    if (!Number.isFinite(score) || score < 0 || score > 100) {
      setFieldErrorMap({ [item.answerId]: "Nilai esai 0 sampai 100." });
      return;
    }
    setSavingId(item.answerId);
    setFormError("");
    setFieldErrorMap({});
    setSavedMessage("");
    try {
      await gradeEssay(
        item.attemptId,
        item.answerId,
        { score, feedback: feedback[item.answerId] || undefined },
        accessToken,
      );
      setSavedMessage(`Nilai untuk ${item.participantName} tersimpan sesuai respons server.`);
      await load();
    } catch (requestError) {
      if (requestError instanceof ApiError) {
        setFieldErrorMap(fieldErrors(requestError));
        setFormError(requestError.message);
      } else {
        setFormError("Tidak dapat menghubungi server.");
      }
    } finally {
      setSavingId(null);
    }
  }

  if (loading) return <LoadingState label="Memuat antrean esai..." />;
  if (error) {
    return (
      <div className="page">
        <Card>
          <h1>Koreksi Esai</h1>
          <ErrorState title="Gagal memuat antrean" description={error} onRetry={() => void load()} />
        </Card>
      </div>
    );
  }

  return (
    <div className="page">
      <Card>
        <h1>Koreksi Esai</h1>
        <p className="muted">
          Hanya untuk pemeriksa berwenang sesuai assignment. Deadline dan status terlambat berasal
          dari API, maksimal 7 hari kalender sesuai PRD.
        </p>
        {savedMessage ? (
          <div className="alert alert-success" role="status">
            {savedMessage}
          </div>
        ) : null}
        {formError ? <ErrorAlert>{formError}</ErrorAlert> : null}
        {items.length === 0 ? (
          <EmptyState title="Antrean kosong" description="Belum ada jawaban esai menunggu penilaian." />
        ) : (
          items.map((item) => (
            <Card key={item.answerId}>
              <h2>{item.participantName}</h2>
              <p className="muted">Dikirim {formatWib(item.submittedAt)}.</p>
              {item.dueAt ? <p className="muted">Batas nilai {formatWib(item.dueAt)}.</p> : null}
              <p>
                <Badge tone={item.isOverdue ? "progress" : "open"}>
                  {item.isOverdue ? "Terlambat" : "Menunggu dinilai"}
                </Badge>
              </p>
              <p>{item.answerText}</p>
              <div className="grid-two">
                <div className="form-field">
                  <label htmlFor={`score-${item.answerId}`}>Nilai 0 sampai 100</label>
                  <input
                    id={`score-${item.answerId}`}
                    type="number"
                    min={0}
                    max={100}
                    value={scores[item.answerId] ?? ""}
                    onChange={(event) => setScores((value) => ({ ...value, [item.answerId]: event.target.value }))}
                    aria-invalid={fieldErrorMap[item.answerId] ? "true" : undefined}
                    aria-describedby={fieldErrorMap[item.answerId] ? `score-error-${item.answerId}` : undefined}
                  />
                  <FieldError id={`score-error-${item.answerId}`} message={fieldErrorMap[item.answerId]} />
                </div>
                <div className="form-field">
                  <label htmlFor={`feedback-${item.answerId}`}>Feedback</label>
                  <textarea
                    id={`feedback-${item.answerId}`}
                    value={feedback[item.answerId] ?? ""}
                    onChange={(event) => setFeedback((value) => ({ ...value, [item.answerId]: event.target.value }))}
                    rows={3}
                  />
                </div>
              </div>
              <div className="button-row">
                <Button
                  variant="primary"
                  disabled={savingId === item.answerId}
                  onClick={() => void handleGrade(item)}
                >
                  {savingId === item.answerId ? "Menyimpan..." : "Simpan nilai"}
                </Button>
              </div>
            </Card>
          ))
        )}
        <InfoAlert>Frontend tidak menghitung nilai akhir atau kelulusan dari nilai esai ini.</InfoAlert>
      </Card>
    </div>
  );
}

export function OverdueGradingPage() {
  const accessToken = useAccessToken();
  const [items, setItems] = useState<EssayQueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      if (!accessToken) {
        setLoading(false);
        setError("Sesi berakhir. Silakan masuk kembali.");
        return;
      }
      try {
        const result = await listOverdueGrading(accessToken);
        setItems(result.data);
      } catch (requestError) {
        setError(requestError instanceof ApiError ? requestError.message : "Gagal memuat data.");
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [accessToken]);

  if (loading) return <LoadingState label="Memuat esai terlambat..." />;
  if (error) {
    return (
      <div className="page">
        <Card>
          <h1>Esai Melewati SLA</h1>
          <ErrorAlert>{error}</ErrorAlert>
        </Card>
      </div>
    );
  }

  return (
    <div className="page">
      <Card>
        <h1>Esai Melewati SLA 7 Hari</h1>
        {items.length === 0 ? (
          <EmptyState title="Tidak ada yang terlambat" description="Semua penilaian masih dalam SLA server." />
        ) : (
          <ul>
            {items.map((item) => (
              <li key={item.answerId}>
                {item.participantName} dikirim {formatWib(item.submittedAt)}.
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
