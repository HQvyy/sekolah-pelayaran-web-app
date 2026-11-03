import { useEffect, useState } from "react";
import { ApiError } from "../../services/apiClient.ts";
import { fieldErrors, useAccessToken } from "../accounts/useAccountList.ts";
import { useSession } from "../../app/useSession.ts";
import { createRating, listMyRatings, updateRating } from "./serviceHub.ts";
import type { Rating } from "./serviceTypes.ts";
import { isEditableRating, ratingWindowMessage } from "./serviceUtils.ts";
import {
  Badge,
  Button,
  ButtonLink,
  Card,
  EmptyState,
  ErrorAlert,
  FieldError,
  InfoAlert,
  LoadingState,
} from "../../components/ui.tsx";

export function RatingPage() {
  const accessToken = useAccessToken();
  const { user } = useSession();
  const [items, setItems] = useState<Rating[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [score, setScore] = useState("5");
  const [lessonId, setLessonId] = useState("");
  const [feedback, setFeedback] = useState("");
  const [fieldErrorMap, setFieldErrorMap] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [savedMessage, setSavedMessage] = useState("");
  const isTaruna = user?.role === "TARUNA";

  async function load() {
    if (!accessToken) {
      setLoading(false);
      setError("Sesi berakhir. Silakan masuk kembali.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const result = await listMyRatings(accessToken);
      setItems(result.data);
    } catch (requestError) {
      setError(requestError instanceof ApiError ? requestError.message : "Gagal memuat rating.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken]);

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    if (!accessToken) {
      setFormError("Sesi berakhir. Silakan masuk kembali.");
      return;
    }
    if (!isTaruna) {
      setFormError("Halaman ini untuk Taruna. Peran lain tidak membuat rating di sini.");
      return;
    }
    const numericScore = Number(score);
    setFieldErrorMap({});
    setFormError("");
    setSavedMessage("");
    if (!lessonId.trim()) {
      setFieldErrorMap({ lessonId: "ID kelas (Live Lesson) wajib diisi." });
      return;
    }
    if (!Number.isInteger(numericScore) || numericScore < 1 || numericScore > 5) {
      setFieldErrorMap({ score: "Rating harus bilangan bulat 1 sampai 5." });
      return;
    }
    setSaving(true);
    try {
      await createRating({ lessonId: lessonId.trim(), score: numericScore, feedback: feedback || undefined }, accessToken);
      setScore("5");
      setLessonId("");
      setFeedback("");
      setSavedMessage("Rating tersimpan sesuai respons server.");
      await load();
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

  async function handleEdit(item: Rating) {
    if (!accessToken) {
      setFormError("Sesi berakhir. Silakan masuk kembali.");
      return;
    }
    if (!isEditableRating(item.editCount, item.editableUntil)) {
      setFormError("Rating ini sudah melewati batas edit satu kali dalam 7 hari.");
      return;
    }
    setSaving(true);
    setFormError("");
    try {
      await updateRating(item.id, { score: item.score, feedback: item.feedback }, accessToken);
      setSavedMessage("Perubahan rating tersimpan sesuai respons server.");
      await load();
    } catch (requestError) {
      setFormError(requestError instanceof ApiError ? requestError.message : "Gagal menyimpan perubahan.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <LoadingState label="Memuat rating..." />;
  if (error) {
    return (
      <div className="page">
        <Card>
          <h1>Rating dan Feedback</h1>
          <ErrorAlert>{error}</ErrorAlert>
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
        <h1>Rating dan Feedback</h1>
        <p className="muted">
          Rating skala 1 sampai 5 dan tidak anonim. Rating dapat diedit satu kali dalam 7 hari sejak
          rating pertama. Status dan batas waktu mengikuti respons server.
        </p>
        <form className="form" onSubmit={handleCreate} aria-label="Formulir rating">
          <div className="form-field">
            <label htmlFor="rating-lesson">ID kelas (Live Lesson)</label>
            <input
              id="rating-lesson"
              value={lessonId}
              disabled={!isTaruna}
              onChange={(event) => setLessonId(event.target.value)}
              aria-invalid={fieldErrorMap.lessonId ? "true" : undefined}
              aria-describedby={fieldErrorMap.lessonId ? "rating-lesson-error" : undefined}
              placeholder="Contoh: uuid-live-lesson"
            />
            <FieldError id="rating-lesson-error" message={fieldErrorMap.lessonId} />
          </div>
          <div className="form-field">
            <label htmlFor="rating-score">Nilai 1 sampai 5</label>
            <select
              id="rating-score"
              value={score}
              disabled={!isTaruna}
              onChange={(event) => setScore(event.target.value)}
              aria-invalid={fieldErrorMap.score ? "true" : undefined}
              aria-describedby={fieldErrorMap.score ? "rating-score-error" : undefined}
            >
              <option value="1">1</option>
              <option value="2">2</option>
              <option value="3">3</option>
              <option value="4">4</option>
              <option value="5">5</option>
            </select>
            <FieldError id="rating-score-error" message={fieldErrorMap.score} />
          </div>
          <div className="form-field">
            <label htmlFor="rating-feedback">Feedback</label>
            <textarea
              id="rating-feedback"
              value={feedback}
              disabled={!isTaruna}
              onChange={(event) => setFeedback(event.target.value)}
              rows={3}
              placeholder="Ceritakan pengalaman belajar"
            />
          </div>
          {formError ? <ErrorAlert>{formError}</ErrorAlert> : null}
          {savedMessage ? (
            <div className="alert alert-success" role="status">
              {savedMessage}
            </div>
          ) : null}
          <div className="button-row">
            <Button type="submit" variant="primary" disabled={saving || !isTaruna}>
              {saving ? "Menyimpan..." : "Kirim rating"}
            </Button>
            <ButtonLink to="/dashboard">Kembali</ButtonLink>
          </div>
        </form>
      </Card>
      <Card>
        <h2>Rating saya</h2>
        {items.length === 0 ? (
          <EmptyState title="Belum ada rating" description="Rating yang dikirim akan tampil di sini." />
        ) : (
          items.map((item) => (
            <Card key={item.id}>
              <h3>
                Nilai {item.score} dari 5
              </h3>
              <p className="muted">{item.feedback || "Tanpa feedback."}</p>
              <p className="muted">{ratingWindowMessage(item.editableUntil)}</p>
              <p>
                <Badge tone={isEditableRating(item.editCount, item.editableUntil) ? "open" : "neutral"}>
                  {isEditableRating(item.editCount, item.editableUntil) ? "Dapat diedit" : "Batas edit tercapai"}
                </Badge>
              </p>
              <div className="button-row">
                <Button
                  variant="secondary"
                  disabled={saving || !isEditableRating(item.editCount, item.editableUntil)}
                  onClick={() => void handleEdit(item)}
                >
                  Simpan edit terakhir
                </Button>
              </div>
            </Card>
          ))
        )}
        <InfoAlert>Kelayakan memberi rating dan hasil edit ditentukan backend.</InfoAlert>
      </Card>
    </div>
  );
}
