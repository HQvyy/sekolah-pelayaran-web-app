import { useEffect, useState } from "react";
import { ApiError } from "../../services/apiClient.ts";
import { useAccessToken } from "../accounts/useAccountList.ts";
import { getAttemptResult, resumeAttempt } from "./cbtService.ts";
import type { Attempt, AttemptResult } from "./cbtTypes.ts";
import { attemptStatusLabel, formatDuration, remainingSeconds } from "./cbtUtils.ts";
import {
  Badge,
  Button,
  ButtonLink,
  Card,
  ErrorAlert,
  InfoAlert,
  LoadingState,
} from "../../components/ui.tsx";

export function AttemptResultPage({ attemptId }: { attemptId: string }) {
  const accessToken = useAccessToken();
  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const [result, setResult] = useState<AttemptResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    if (!accessToken) {
      setLoading(false);
      setError("Sesi berakhir. Silakan masuk kembali.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const resumed = await resumeAttempt(attemptId, accessToken);
      setAttempt(resumed.data);
      try {
        const finalResult = await getAttemptResult(attemptId, accessToken);
        setResult(finalResult.data);
      } catch (resultError) {
        if (!(resultError instanceof ApiError)) {
          throw resultError;
        }
      }
    } catch (requestError) {
      setError(requestError instanceof ApiError ? requestError.message : "Gagal memuat hasil.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attemptId, accessToken]);

  if (loading) return <LoadingState label="Memuat hasil dari server..." />;
  if (error || !attempt) {
    return (
      <div className="page">
        <Card>
          <h1>Hasil Attempt</h1>
          <ErrorAlert>{error || "Hasil tidak ditemukan."}</ErrorAlert>
          <div className="button-row">
            <ButtonLink to="/asesmen">Kembali</ButtonLink>
            <Button variant="secondary" onClick={() => void load()}>
              Muat ulang
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  const remaining = remainingSeconds(attempt.serverNow, attempt.expiresAt);
  const display = result ?? {
    attemptId: attempt.attemptId,
    assessmentId: attempt.assessmentId,
    status: attempt.status,
  };

  return (
    <div className="page">
      <Card>
        <h1>Hasil Attempt</h1>
        <p className="muted">
          Status attempt: {attemptStatusLabel(display.status)}. Sisa waktu server saat resume:{" "}
          {formatDuration(remaining)}.
        </p>
        <p>
          <Badge tone={display.status === "GRADED" ? "done" : "progress"}>
            {attemptStatusLabel(display.status)}
          </Badge>
        </p>
        {typeof display.score === "number" ? <p>Nilai dari server: {display.score}</p> : null}
        {typeof display.isPassed === "boolean" ? (
          <p>{display.isPassed ? "Status dari server: Lulus." : "Status dari server: Belum lulus."}</p>
        ) : null}
        {display.essayStatus ? (
          <p className="muted">
            Status esai:{" "}
            {display.essayStatus === "GRADED"
              ? "sudah dinilai"
              : display.essayStatus === "OVERDUE"
                ? "terlambat dan dilaporkan ke Admin"
                : "menunggu penilaian maksimal 7 hari kalender"}
            .
          </p>
        ) : null}
        {display.message ? (
          <div className="alert alert-info" role="status">
            {display.message}
          </div>
        ) : null}
        <div className="button-row">
          <ButtonLink to={`/asesmen/attempt/${attemptId}`}>Kembali ke attempt</ButtonLink>
          <ButtonLink to="/asesmen">Daftar assessment</ButtonLink>
        </div>
        <InfoAlert>
          Semua angka kelulusan dan progres berasal dari backend. Frontend tidak menentukan aturan
          passing grade, attempt tersisa, remedial, atau unlock.
        </InfoAlert>
      </Card>
    </div>
  );
}
