import { useEffect, useState } from "react";
import { ApiError } from "../../services/apiClient.ts";
import { useAccessToken } from "../accounts/useAccountList.ts";
import { getMyProgress } from "./serviceHub.ts";
import type { LearningProgress } from "./serviceTypes.ts";
import { Button, ButtonLink, Card, ErrorAlert, InfoAlert, LoadingState } from "../../components/ui.tsx";

export function MyProgressPage() {
  const accessToken = useAccessToken();
  const [progress, setProgress] = useState<LearningProgress | null>(null);
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
      const result = await getMyProgress(accessToken);
      setProgress(result.data);
    } catch (requestError) {
      setError(requestError instanceof ApiError ? requestError.message : "Gagal memuat progres.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken]);

  if (loading) return <LoadingState label="Memuat progres..." />;
  if (error || !progress) {
    return (
      <div className="page">
        <Card>
          <h1>Progres Saya</h1>
          <ErrorAlert>{error || "Progres tidak ditemukan."}</ErrorAlert>
          <div className="button-row">
            <Button variant="secondary" onClick={() => void load()}>
              Muat ulang
            </Button>
            <ButtonLink to="/dashboard">Kembali</ButtonLink>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="page">
      <Card>
        <h1>Progres Saya</h1>
        <p className="muted">
          Semua angka di bawah berasal dari respons backend, bukan perhitungan lokal. Kelulusan dan
          unlock level diatur server.
        </p>
        <p>
          Materi selesai {progress.completedMaterials} dari {progress.totalMaterials}. Asesmen selesai{" "}
          {progress.completedAssessments} dari {progress.totalAssessments}.
        </p>
        <p aria-live="polite">Progres keseluruhan: {progress.percent} persen.</p>
        {typeof progress.unlockedLevel === "number" ? (
          <p className="muted">Level terbuka menurut server: Level {progress.unlockedLevel}.</p>
        ) : null}
        <div className="button-row">
          <ButtonLink to="/belajar">Lanjut belajar</ButtonLink>
          <ButtonLink to="/asesmen">Buka asesmen</ButtonLink>
        </div>
        <InfoAlert>Frontend tidak menghitung ulang progres sebagai sumber kebenaran.</InfoAlert>
      </Card>
    </div>
  );
}
