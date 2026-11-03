import { useEffect, useState } from "react";
import { ApiError } from "../../services/apiClient.ts";
import { useAccessToken } from "../accounts/useAccountList.ts";
import { useSession } from "../../app/useSession.ts";
import {
  createChapter,
  deleteChapter,
  getCourse,
  listChapters,
} from "./learningService.ts";
import type { Chapter, ChapterPayload, ContentStatus } from "./learningTypes.ts";
import { fieldErrors } from "../accounts/useAccountList.ts";
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
  LoadingState,
} from "../../components/ui.tsx";

export function CourseDetailPage({ courseId }: { courseId: string }) {
  const accessToken = useAccessToken();
  const { user } = useSession();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [forbidden, setForbidden] = useState(false);
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
      const detail = await getCourse(courseId, accessToken);
      setTitle(detail.data.title);
      setDescription(detail.data.description ?? "");
      const chapterList = await listChapters(courseId, accessToken);
      setChapters(chapterList.data);
    } catch (requestError) {
      if (requestError instanceof ApiError && requestError.status === 403) {
        setForbidden(true);
        setError("Akun ini tidak memiliki akses kursus. Otorisasi resmi ditentukan backend.");
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
  }, [courseId, accessToken]);

  if (loading) return <LoadingState label="Memuat detail kursus..." />;
  if (error) {
    return (
      <div className="page">
        <Card>
          <h1>Detail Kursus</h1>
          <ErrorAlert>{error}</ErrorAlert>
          {forbidden ? <p className="muted">Video tidak ditampilkan karena akses ditolak.</p> : null}
          <div className="button-row">
            <ButtonLink to="/belajar">Kembali</ButtonLink>
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
        <h1>{title || "Detail Kursus"}</h1>
        <p className="muted">{description || "Belum ada deskripsi kursus."}</p>
        <div className="button-row">
          <ButtonLink to="/belajar">Kembali</ButtonLink>
          {canManage ? <ButtonLink to={`/konten/kursus/${courseId}/ubah`}>Ubah kursus</ButtonLink> : null}
        </div>
      </Card>
      <Card>
        <h2>Daftar Bab</h2>
        {chapters.length === 0 ? (
          <EmptyState title="Belum ada bab" description="Tambah bab bila peran memiliki izin." />
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <caption>Bab dalam kursus ini sesuai urutan backend.</caption>
              <thead>
                <tr>
                  <th scope="col">Urutan</th>
                  <th scope="col">Judul</th>
                  <th scope="col">Status</th>
                  <th scope="col">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {chapters.map((chapter) => (
                  <tr key={chapter.id}>
                    <td>{chapter.order}</td>
                    <td>{chapter.title}</td>
                    <td>
                      <Badge tone={chapter.status === "PUBLISHED" ? "done" : "neutral"}>
                        {chapter.status === "PUBLISHED" ? "Terbit" : "Draf"}
                      </Badge>
                    </td>
                    <td>
                      <div className="button-row">
                        <ButtonLink to={`/belajar/bab/${chapter.id}`}>Buka materi</ButtonLink>
                        {canManage ? <DeleteChapterButton chapterId={chapter.id} onDone={() => void load()} /> : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {canManage ? <ChapterForm courseId={courseId} onSaved={() => void load()} /> : null}
      </Card>
    </div>
  );
}

function ChapterForm({ courseId, onSaved }: { courseId: string; onSaved: () => void }) {
  const accessToken = useAccessToken();
  const [form, setForm] = useState<ChapterPayload>({ title: "", order: 1, status: "PUBLISHED" });
  const [fieldErrorMap, setFieldErrorMap] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!accessToken) {
      setFormError("Sesi berakhir. Silakan masuk kembali.");
      return;
    }
    const nextErrors: Record<string, string> = {};
    if (!form.title.trim()) nextErrors.title = "Judul bab wajib diisi.";
    if (!Number.isFinite(form.order) || form.order < 1) nextErrors.order = "Urutan minimal 1.";
    setFieldErrorMap(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    setSaving(true);
    setFormError("");
    try {
      await createChapter(courseId, { ...form, title: form.title.trim() }, accessToken);
      setForm({ title: "", order: form.order + 1, status: "PUBLISHED" });
      onSaved();
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
    <form className="form" onSubmit={handleSubmit} aria-label="Formulir tambah bab">
      <h3>Tambah Bab</h3>
      <div className="grid-two">
        <div className="form-field">
          <label htmlFor="chapter-title">Judul bab</label>
          <input
            id="chapter-title"
            value={form.title}
            onChange={(event) => setForm((value) => ({ ...value, title: event.target.value }))}
            aria-invalid={fieldErrorMap.title ? "true" : undefined}
            aria-describedby={fieldErrorMap.title ? "chapter-title-error" : undefined}
            placeholder="Contoh: Bab 1 Pengenalan"
          />
          <FieldError id="chapter-title-error" message={fieldErrorMap.title} />
        </div>
        <div className="form-field">
          <label htmlFor="chapter-order">Urutan</label>
          <input
            id="chapter-order"
            type="number"
            min={1}
            value={form.order}
            onChange={(event) => setForm((value) => ({ ...value, order: Number(event.target.value) }))}
            aria-invalid={fieldErrorMap.order ? "true" : undefined}
            aria-describedby={fieldErrorMap.order ? "chapter-order-error" : undefined}
          />
          <FieldError id="chapter-order-error" message={fieldErrorMap.order} />
        </div>
      </div>
      <div className="form-field">
        <label htmlFor="chapter-status">Status</label>
        <select
          id="chapter-status"
          value={form.status}
          onChange={(event) => setForm((value) => ({ ...value, status: event.target.value as ContentStatus }))}
        >
          <option value="PUBLISHED">Terbit</option>
          <option value="DRAFT">Draf</option>
        </select>
      </div>
      {formError ? <ErrorAlert>{formError}</ErrorAlert> : null}
      <div className="button-row">
        <Button type="submit" variant="primary" disabled={saving}>
          {saving ? "Menyimpan..." : "Tambah bab"}
        </Button>
      </div>
    </form>
  );
}

function DeleteChapterButton({ chapterId, onDone }: { chapterId: string; onDone: () => void }) {
  const accessToken = useAccessToken();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleDelete() {
    if (!accessToken) {
      setError("Sesi berakhir. Silakan masuk kembali.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await deleteChapter(chapterId, accessToken);
      setConfirmOpen(false);
      onDone();
    } catch (requestError) {
      setError(requestError instanceof ApiError ? requestError.message : "Hapus bab gagal.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Button variant="danger" onClick={() => setConfirmOpen(true)}>
        Nonaktifkan
      </Button>
      {confirmOpen ? (
        <ConfirmDialog
          title="Nonaktifkan bab?"
          description="Materi dalam bab mengikuti kebijakan backend setelah bab dinonaktifkan."
          confirmLabel={loading ? "Memproses..." : "Ya, nonaktifkan"}
          onClose={() => {
            if (!loading) setConfirmOpen(false);
          }}
          onConfirm={() => {
            void handleDelete();
          }}
        />
      ) : null}
      {error ? <ErrorAlert>{error}</ErrorAlert> : null}
    </>
  );
}

export function ChapterErrorState({ onRetry }: { onRetry?: () => void }) {
  return <ErrorState title="Gagal memuat bab" description="Coba lagi atau hubungi admin." onRetry={onRetry} />;
}
