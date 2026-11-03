import { useEffect, useState } from "react";
import { ApiError } from "../../services/apiClient.ts";
import { fieldErrors, useAccessToken } from "../accounts/useAccountList.ts";
import { useSession } from "../../app/useSession.ts";
import { createLiveLesson, getLiveLesson, updateLiveLesson } from "./liveService.ts";
import type { LiveLessonPayload } from "./liveTypes.ts";
import { fromLocalInputValue, toLocalInputValue, validateLessonTime } from "./liveUtils.ts";
import { Button, ButtonLink, Card, ErrorAlert, FieldError, InfoAlert, LoadingState } from "../../components/ui.tsx";

export function LiveLessonFormPage({ liveLessonId }: { liveLessonId?: string }) {
  const accessToken = useAccessToken();
  const { user } = useSession();
  const isEdit = Boolean(liveLessonId);
  const [form, setForm] = useState({ title: "", description: "", cohortId: "", startsAt: "", endsAt: "" });
  const [loading, setLoading] = useState(isEdit);
  const [loadError, setLoadError] = useState("");
  const [fieldErrorMap, setFieldErrorMap] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const canManage = user?.role === "ADMIN" || user?.role === "SUPERADMIN" || user?.role === "MENTOR";

  useEffect(() => {
    async function load() {
      if (!liveLessonId || !accessToken) {
        setLoading(false);
        if (!accessToken) setLoadError("Sesi berakhir. Silakan masuk kembali.");
        return;
      }
      try {
        const result = await getLiveLesson(liveLessonId, accessToken);
        setForm({
          title: result.data.title,
          description: result.data.description ?? "",
          cohortId: result.data.cohortId ?? "",
          startsAt: toLocalInputValue(result.data.startsAt),
          endsAt: toLocalInputValue(result.data.endsAt),
        });
      } catch (requestError) {
        setLoadError(requestError instanceof ApiError ? requestError.message : "Gagal memuat jadwal.");
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [liveLessonId, accessToken]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!accessToken) {
      setFormError("Sesi berakhir. Silakan masuk kembali.");
      return;
    }
    if (!canManage) {
      setFormError("Peran ini tidak diizinkan mengelola jadwal pada pratinjau UX.");
      return;
    }
    const nextErrors: Record<string, string> = {};
    if (!form.title.trim()) nextErrors.title = "Judul kelas wajib diisi.";
    const timeError = validateLessonTime(form.startsAt, form.endsAt);
    if (timeError) nextErrors.endsAt = timeError;
    setFieldErrorMap(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    const payload: LiveLessonPayload = {
      title: form.title.trim(),
      description: form.description || undefined,
      cohortId: form.cohortId || undefined,
      startsAt: fromLocalInputValue(form.startsAt),
      endsAt: fromLocalInputValue(form.endsAt),
    };
    setSaving(true);
    setFormError("");
    setSaved(false);
    try {
      if (liveLessonId) {
        await updateLiveLesson(liveLessonId, payload, accessToken);
      } else {
        await createLiveLesson(payload, accessToken);
      }
      setSaved(true);
    } catch (requestError) {
      if (requestError instanceof ApiError && requestError.status === 403) {
        setFormError("Akses ditolak backend. Peran atau assignment ini tidak diizinkan.");
      } else if (requestError instanceof ApiError) {
        setFieldErrorMap(fieldErrors(requestError));
        setFormError(requestError.message);
      } else {
        setFormError("Tidak dapat menghubungi server.");
      }
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <LoadingState label="Memuat formulir jadwal..." />;
  if (loadError) {
    return (
      <div className="page">
        <Card>
          <h1>{isEdit ? "Ubah Jadwal" : "Buat Jadwal"}</h1>
          <ErrorAlert>{loadError}</ErrorAlert>
          <ButtonLink to="/kelas-live">Kembali</ButtonLink>
        </Card>
      </div>
    );
  }

  return (
    <div className="page">
      <Card>
        <h1>{isEdit ? "Ubah Jadwal" : "Buat Jadwal Live Lesson"}</h1>
        <p className="muted">
          Perubahan atau pembatalan hanya oleh Mentor atau Admin pemilik kelas, paling lambat H-1.
          Batas resmi dihitung backend dan tidak ditentukan lokal.
        </p>
        <form className="form" onSubmit={handleSubmit} aria-label="Formulir jadwal live">
          <div className="form-field">
            <label htmlFor="live-title">Judul kelas</label>
            <input
              id="live-title"
              value={form.title}
              disabled={!canManage}
              onChange={(event) => setForm((value) => ({ ...value, title: event.target.value }))}
              aria-invalid={fieldErrorMap.title ? "true" : undefined}
              aria-describedby={fieldErrorMap.title ? "live-title-error" : undefined}
              placeholder="Contoh: Kelas live keselamatan dasar"
            />
            <FieldError id="live-title-error" message={fieldErrorMap.title} />
          </div>
          <div className="form-field">
            <label htmlFor="live-cohort">ID Angkatan atau Kelas</label>
            <input
              id="live-cohort"
              value={form.cohortId}
              disabled={!canManage}
              onChange={(event) => setForm((value) => ({ ...value, cohortId: event.target.value }))}
              placeholder="Contoh: uuid-angkatan"
            />
          </div>
          <div className="grid-two">
            <div className="form-field">
              <label htmlFor="live-start">Mulai</label>
              <input
                id="live-start"
                type="datetime-local"
                value={form.startsAt}
                disabled={!canManage}
                onChange={(event) => setForm((value) => ({ ...value, startsAt: event.target.value }))}
              />
            </div>
            <div className="form-field">
              <label htmlFor="live-end">Selesai</label>
              <input
                id="live-end"
                type="datetime-local"
                value={form.endsAt}
                disabled={!canManage}
                onChange={(event) => setForm((value) => ({ ...value, endsAt: event.target.value }))}
                aria-invalid={fieldErrorMap.endsAt ? "true" : undefined}
                aria-describedby={fieldErrorMap.endsAt ? "live-end-error" : undefined}
              />
              <FieldError id="live-end-error" message={fieldErrorMap.endsAt} />
            </div>
          </div>
          <div className="form-field">
            <label htmlFor="live-description">Deskripsi</label>
            <textarea
              id="live-description"
              value={form.description}
              disabled={!canManage}
              onChange={(event) => setForm((value) => ({ ...value, description: event.target.value }))}
              rows={3}
            />
          </div>
          {formError ? <ErrorAlert>{formError}</ErrorAlert> : null}
          {saved ? <div className="alert alert-success" role="status">Jadwal tersimpan.</div> : null}
          <div className="button-row">
            <Button type="submit" variant="primary" disabled={saving || !canManage}>
              {saving ? "Menyimpan..." : "Simpan jadwal"}
            </Button>
            <ButtonLink to="/kelas-live">Kembali</ButtonLink>
          </div>
        </form>
        <InfoAlert>
          Layanan konferensi mengikuti PKS dan belum dikunci ke Zoom atau Google Meet. UI ini tidak
          meminta atau menampilkan tautan mentah.
        </InfoAlert>
      </Card>
    </div>
  );
}
