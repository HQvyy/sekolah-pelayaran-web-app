import { useEffect, useState } from "react";
import { ApiError } from "../../services/apiClient.ts";
import { useAccessToken } from "../accounts/useAccountList.ts";
import { getAssessment, startAttempt } from "./cbtService.ts";
import type { Assessment } from "./cbtTypes.ts";
import {
  Button,
  ButtonLink,
  Card,
  ConfirmDialog,
  ErrorAlert,
  InfoAlert,
  LoadingState,
} from "../../components/ui.tsx";

export function AssessmentDetailPage({ assessmentId }: { assessmentId: string }) {
  const accessToken = useAccessToken();
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    async function load() {
      if (!accessToken) {
        setLoading(false);
        setError("Sesi berakhir. Silakan masuk kembali.");
        return;
      }
      try {
        const result = await getAssessment(assessmentId, accessToken);
        setAssessment(result.data);
      } catch (requestError) {
        setError(requestError instanceof ApiError ? requestError.message : "Gagal memuat assessment.");
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [assessmentId, accessToken]);

  async function handleStart() {
    if (!accessToken) {
      setStartError("Sesi berakhir. Silakan masuk kembali.");
      return;
    }
    setStarting(true);
    setStartError("");
    try {
      const result = await startAttempt(assessmentId, accessToken);
      if (typeof window !== "undefined") {
        window.location.assign(`/asesmen/attempt/${result.data.attemptId}`);
      }
    } catch (requestError) {
      if (requestError instanceof ApiError) {
        setStartError(requestError.message);
      } else {
        setStartError("Tidak dapat memulai attempt.");
      }
      setConfirmOpen(false);
    } finally {
      setStarting(false);
    }
  }

  if (loading) return <LoadingState label="Memuat instruksi assessment..." />;
  if (error || !assessment) {
    return (
      <div className="page">
        <Card>
          <h1>Instruksi Asesmen</h1>
          <ErrorAlert>{error || "Assessment tidak ditemukan."}</ErrorAlert>
          <ButtonLink to="/asesmen">Kembali</ButtonLink>
        </Card>
      </div>
    );
  }

  return (
    <div className="page">
      <Card>
        <h1>{assessment.title}</h1>
        <p className="muted">Level {assessment.level} selama {assessment.durationMinutes} menit menurut server.</p>
        <p className="muted">{assessment.description || "Ikuti instruksi resmi dari backend sebelum memulai."}</p>
        <ul className="muted">
          <li>Timer resmi dihitung server. Jangan mengandalkan jam browser.</li>
          <li>Jawaban autosave tiap 30 detik dan saat jawaban berubah bila didukung API.</li>
          <li>Kunci jawaban tidak pernah ditampilkan sebelum atau saat ujian.</li>
          <li>Aturan attempt dan remedial masih dikonfirmasi dan tidak ditampilkan sebagai final.</li>
        </ul>
        {startError ? <ErrorAlert>{startError}</ErrorAlert> : null}
        <div className="button-row">
          <Button variant="primary" disabled={starting} onClick={() => setConfirmOpen(true)}>
            {starting ? "Memulai..." : "Mulai attempt"}
          </Button>
          <ButtonLink to="/asesmen">Kembali</ButtonLink>
        </div>
        <InfoAlert>
          Server menentukan waktu mulai, waktu berakhir, randomisasi soal, dan kelayakan attempt.
        </InfoAlert>
      </Card>
      {confirmOpen ? (
        <ConfirmDialog
          title="Mulai attempt sekarang?"
          description="Timer server dimulai setelah backend mengonfirmasi. Pastikan koneksi stabil."
          confirmLabel={starting ? "Memulai..." : "Ya, mulai"}
          onClose={() => {
            if (!starting) setConfirmOpen(false);
          }}
          onConfirm={() => {
            void handleStart();
          }}
        />
      ) : null}
    </div>
  );
}
