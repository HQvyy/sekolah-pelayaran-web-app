import { useEffect, useState } from "react";
import { ApiError } from "../../services/apiClient.ts";
import { useAccessToken } from "../accounts/useAccountList.ts";
import { useSession } from "../../app/useSession.ts";
import {
  completeMaterial,
  createMaterial,
  deleteMaterial,
  getMaterial,
  listMaterials,
  requestPlaybackToken,
  updateMaterial,
} from "./learningService.ts";
import type { LearningMaterial, MaterialPayload, MaterialType } from "./learningTypes.ts";
import { fieldErrors } from "../accounts/useAccountList.ts";
import { canPlay, playbackMessage } from "./playbackUtils.ts";
import { validateThumbnailFile } from "./learningValidation.ts";
import type { PlaybackAuthorization } from "./learningTypes.ts";
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
  InfoAlert,
  LoadingState,
} from "../../components/ui.tsx";

export function ChapterDetailPage({ chapterId }: { chapterId: string }) {
  const accessToken = useAccessToken();
  const { user } = useSession();
  const [materials, setMaterials] = useState<LearningMaterial[]>([]);
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
      const result = await listMaterials(chapterId, accessToken);
      setMaterials(result.data);
    } catch (requestError) {
      if (requestError instanceof ApiError && requestError.status === 403) {
        setForbidden(true);
        setError("Akun ini tidak memiliki akses materi. Otorisasi resmi ditentukan backend.");
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
  }, [chapterId, accessToken]);

  if (loading) return <LoadingState label="Memuat materi..." />;
  if (error) {
    return (
      <div className="page">
        <Card>
          <h1>Daftar Materi</h1>
          <ErrorAlert>{error}</ErrorAlert>
          {forbidden ? <p className="muted">Materi tidak ditampilkan karena akses ditolak.</p> : null}
          <div className="button-row">
            <Button variant="secondary" onClick={() => void load()}>
              Coba lagi
            </Button>
            <ButtonLink to="/belajar">Kembali</ButtonLink>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="page">
      <Card>
        <h1>Daftar Materi</h1>
        <p className="muted">
          Materi terkunci mengikuti aturan unlock backend. Status selesai dan progres berasal dari
          server, bukan perhitungan lokal.
        </p>
        <div className="button-row">
          <ButtonLink to="/belajar">Kembali</ButtonLink>
        </div>
      </Card>
      {materials.length === 0 ? (
        <EmptyState title="Belum ada materi" description="Tambah materi bila peran memiliki izin." />
      ) : (
        <div className="grid-two">
          {materials.map((material) => (
            <Card key={material.id}>
              <h2>{material.title}</h2>
              <p className="muted">{material.description || "Belum ada deskripsi materi."}</p>
              <p>
                <Badge tone={material.isLocked ? "neutral" : "open"}>{material.isLocked ? "Terkunci" : material.type}</Badge>{" "}
                {material.isCompleted ? <Badge tone="done">Selesai</Badge> : null}
              </p>
              <div className="button-row">
                {material.isLocked ? (
                  <span className="field-help">Selesaikan materi sebelumnya sesuai aturan backend.</span>
                ) : (
                  <ButtonLink to={`/belajar/materi/${material.id}`}>Buka materi</ButtonLink>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
      {canManage ? <MaterialForm chapterId={chapterId} onSaved={() => void load()} /> : null}
    </div>
  );
}

function MaterialForm({ chapterId, onSaved }: { chapterId: string; onSaved: () => void }) {
  const accessToken = useAccessToken();
  const [form, setForm] = useState<MaterialPayload>({
    title: "",
    type: "VIDEO",
    description: "",
    videoId: "",
    status: "ACTIVE",
  });
  const [thumbnail, setThumbnail] = useState<File | null>(null);
  const [thumbnailError, setThumbnailError] = useState("");
  const [fieldErrorMap, setFieldErrorMap] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleThumbnail(file: File | null) {
    setThumbnail(file);
    setThumbnailError("");
    if (!file) return;
    const result = await validateThumbnailFile(file);
    if (!result.ok) setThumbnailError(result.message ?? "Thumbnail tidak valid.");
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!accessToken) {
      setFormError("Sesi berakhir. Silakan masuk kembali.");
      return;
    }
    const nextErrors: Record<string, string> = {};
    if (!form.title.trim()) nextErrors.title = "Judul materi wajib diisi.";
    if (form.type === "VIDEO" && !form.videoId?.trim()) nextErrors.videoId = "ID video wajib diisi untuk materi video.";
    setFieldErrorMap(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    if (thumbnailError) {
      setFormError("Perbaiki thumbnail dulu: JPG atau PNG maksimal 2 MB dan 1920x1080.");
      return;
    }
    setSaving(true);
    setFormError("");
    setSaved(false);
    try {
      await createMaterial(chapterId, { ...form, title: form.title.trim() }, accessToken);
      setForm({ title: "", type: "VIDEO", description: "", videoId: "", status: "ACTIVE" });
      setThumbnail(null);
      setSaved(true);
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
    <Card>
      <form className="form" onSubmit={handleSubmit} aria-label="Formulir tambah materi">
        <h2>Tambah Materi</h2>
        <div className="form-field">
          <label htmlFor="material-title">Judul materi</label>
          <input
            id="material-title"
            value={form.title}
            onChange={(event) => setForm((value) => ({ ...value, title: event.target.value }))}
            aria-invalid={fieldErrorMap.title ? "true" : undefined}
            aria-describedby={fieldErrorMap.title ? "material-title-error" : undefined}
            placeholder="Contoh: Pengenalan Tanker bagian 1"
          />
          <FieldError id="material-title-error" message={fieldErrorMap.title} />
        </div>
        <div className="grid-two">
          <div className="form-field">
            <label htmlFor="material-type">Jenis materi</label>
            <select
              id="material-type"
              value={form.type}
              onChange={(event) => setForm((value) => ({ ...value, type: event.target.value as MaterialType }))}
            >
              <option value="VIDEO">Video</option>
              <option value="DOKUMEN">Dokumen</option>
              <option value="TAUTAN">Tautan</option>
            </select>
          </div>
          <div className="form-field">
            <label htmlFor="material-status">Status</label>
            <select
              id="material-status"
              value={form.status}
              onChange={(event) => setForm((value) => ({ ...value, status: event.target.value as LearningMaterial["status"] }))}
            >
              <option value="ACTIVE">Aktif</option>
              <option value="INACTIVE">Nonaktif</option>
            </select>
          </div>
        </div>
        <div className="form-field">
          <label htmlFor="material-video">ID video backend</label>
          <input
            id="material-video"
            value={form.videoId ?? ""}
            onChange={(event) => setForm((value) => ({ ...value, videoId: event.target.value }))}
            aria-invalid={fieldErrorMap.videoId ? "true" : undefined}
            aria-describedby={fieldErrorMap.videoId ? "material-video-error" : undefined}
            placeholder="Contoh: uuid-video-backend"
          />
          <FieldError id="material-video-error" message={fieldErrorMap.videoId} />
          <span className="field-help">Metadata dan video dikelola backend, frontend tidak memakai secret provider.</span>
        </div>
        <div className="form-field">
          <label htmlFor="material-thumbnail">Thumbnail JPG atau PNG maksimal 2 MB</label>
          <input
            id="material-thumbnail"
            type="file"
            accept=".jpg,.jpeg,.png,image/jpeg,image/png"
            onChange={(event) => {
              void handleThumbnail(event.target.files?.[0] ?? null);
            }}
            aria-describedby="material-thumbnail-help"
          />
          <span className="field-help" id="material-thumbnail-help">
            Batas PRD: JPG atau PNG maksimal 2 MB dan dimensi maksimal 1920x1080. Validasi final tetap di server.
          </span>
          {thumbnail ? <span className="field-help">Dipilih: {thumbnail.name}</span> : null}
          {thumbnailError ? (
            <p className="field-error" role="alert">
              {thumbnailError}
            </p>
          ) : null}
        </div>
        <div className="form-field">
          <label htmlFor="material-description">Deskripsi</label>
          <textarea
            id="material-description"
            value={form.description ?? ""}
            onChange={(event) => setForm((value) => ({ ...value, description: event.target.value }))}
            rows={3}
          />
        </div>
        {formError ? <ErrorAlert>{formError}</ErrorAlert> : null}
        {saved ? <div className="alert alert-success" role="status">Materi tersimpan.</div> : null}
        <div className="button-row">
          <Button type="submit" variant="primary" disabled={saving}>
            {saving ? "Menyimpan..." : "Tambah materi"}
          </Button>
        </div>
      </form>
    </Card>
  );
}

export function MaterialDetailPage({ materialId }: { materialId: string }) {
  const accessToken = useAccessToken();
  const { user } = useSession();
  const [material, setMaterial] = useState<LearningMaterial | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [playback, setPlayback] = useState<PlaybackAuthorization | null>(null);
  const [playbackError, setPlaybackError] = useState("");
  const [playbackLoading, setPlaybackLoading] = useState(false);
  const [completeMessage, setCompleteMessage] = useState("");
  const canManage = user?.role === "ADMIN" || user?.role === "SUPERADMIN" || user?.role === "MENTOR";

  async function load() {
    if (!accessToken) {
      setLoading(false);
      setError("Sesi berakhir. Silakan masuk kembali.");
      return;
    }
    setLoading(true);
    setError("");
    setPlayback(null);
    setPlaybackError("");
    try {
      const result = await getMaterial(materialId, accessToken);
      setMaterial(result.data);
      if (result.data.videoId) {
        await loadPlayback(result.data.videoId, accessToken);
      }
    } catch (requestError) {
      if (requestError instanceof ApiError && requestError.status === 403) {
        setError("Akun ini tidak memiliki akses materi. Otorisasi resmi ditentukan backend.");
      } else if (requestError instanceof ApiError) {
        setError(requestError.message);
      } else {
        setError("Tidak dapat menghubungi server.");
      }
    } finally {
      setLoading(false);
    }
  }

  async function loadPlayback(videoId: string, token: string) {
    setPlaybackLoading(true);
    setPlaybackError("");
    try {
      const result = await requestPlaybackToken(videoId, token);
      setPlayback(result.data);
    } catch (requestError) {
      if (requestError instanceof ApiError) {
        setPlaybackError(requestError.message);
      } else {
        setPlaybackError("Tidak dapat meminta akses video.");
      }
    } finally {
      setPlaybackLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [materialId, accessToken]);

  async function handleComplete() {
    if (!accessToken) return;
    try {
      await completeMaterial(materialId, accessToken);
      setCompleteMessage("Permintaan penyelesaian dikirim. Status resmi menunggu respons backend.");
      await load();
    } catch (requestError) {
      setCompleteMessage(requestError instanceof ApiError ? requestError.message : "Gagal mencatat penyelesaian.");
    }
  }

  if (loading) return <LoadingState label="Memuat materi..." />;
  if (error || !material) {
    return (
      <div className="page">
        <Card>
          <h1>Detail Materi</h1>
          <ErrorAlert>{error || "Materi tidak ditemukan."}</ErrorAlert>
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
        <h1>{material.title}</h1>
        <p className="muted">{material.description || "Belum ada deskripsi materi."}</p>
        <p>
          <Badge tone={material.isCompleted ? "done" : "open"}>{material.isCompleted ? "Selesai" : material.type}</Badge>
        </p>
        <div className="button-row">
          <ButtonLink to="/belajar">Kembali</ButtonLink>
          {canManage ? <ButtonLink to={`/konten/materi/${material.id}/ubah`}>Ubah materi</ButtonLink> : null}
          {!material.isCompleted ? (
            <Button variant="secondary" onClick={() => void handleComplete()}>
              Tandai selesai
            </Button>
          ) : null}
        </div>
        {completeMessage ? (
          <div className="alert alert-info" role="status">
            {completeMessage}
          </div>
        ) : null}
      </Card>
      <Card>
        <h2>Video pembelajaran</h2>
        {playbackLoading ? <LoadingState label="Meminta akses video..." /> : null}
        {playbackError ? (
          <ErrorState title="Gagal memuat video" description={playbackError} onRetry={() => void load()} />
        ) : playback && canPlay(playback.status) ? (
          <>
            <VideoPlayer playbackUrl={playback.playbackUrl} title={material.title} />
            <p className="muted">URL playback berasal dari backend dan tidak disusun ulang di browser.</p>
          </>
        ) : playback ? (
          <ErrorState title="Video tidak tersedia" description={playbackMessage(playback.status)} onRetry={() => void load()} />
        ) : material.videoId ? (
          <EmptyState title="Menunggu akses video" description="Backend belum memberikan token playback." />
        ) : (
          <EmptyState title="Materi tanpa video" description="Materi ini tidak memiliki video terkait." />
        )}
      </Card>
    </div>
  );
}

export function VideoPlayer({ playbackUrl, title }: { playbackUrl: string; title: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return <ErrorState title="Video gagal diputar" description="Coba lagi. Bila masih gagal, hubungi admin." />;
  }
  return (
    <video
      controls
      preload="metadata"
      aria-label={`Video ${title}`}
      src={playbackUrl}
      style={{ width: "100%", borderRadius: "10px", background: "#000" }}
      onError={() => setFailed(true)}
    />
  );
}

export function MaterialEditPage({ materialId }: { materialId: string }) {
  const accessToken = useAccessToken();
  const { user } = useSession();
  const [form, setForm] = useState<MaterialPayload>({
    title: "",
    type: "VIDEO",
    description: "",
    videoId: "",
    status: "ACTIVE",
  });
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [fieldErrorMap, setFieldErrorMap] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const canManage = user?.role === "ADMIN" || user?.role === "SUPERADMIN" || user?.role === "MENTOR";

  useEffect(() => {
    async function load() {
      if (!accessToken) {
        setLoading(false);
        setLoadError("Sesi berakhir. Silakan masuk kembali.");
        return;
      }
      try {
        const result = await getMaterial(materialId, accessToken);
        setForm({
          title: result.data.title,
          type: result.data.type,
          description: result.data.description ?? "",
          videoId: result.data.videoId ?? "",
          status: result.data.status,
        });
      } catch (requestError) {
        setLoadError(requestError instanceof ApiError ? requestError.message : "Gagal memuat materi.");
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [materialId, accessToken]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!accessToken) {
      setFormError("Sesi berakhir. Silakan masuk kembali.");
      return;
    }
    if (!canManage) {
      setFormError("Peran ini tidak diizinkan mengelola materi pada pratinjau UX.");
      return;
    }
    if (!form.title.trim()) {
      setFieldErrorMap({ title: "Judul materi wajib diisi." });
      return;
    }
    setSaving(true);
    setFormError("");
    setFieldErrorMap({});
    setSaved(false);
    try {
      await updateMaterial(materialId, { ...form, title: form.title.trim() }, accessToken);
      setSaved(true);
      setConfirmOpen(false);
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

  async function handleDelete() {
    if (!accessToken) {
      setFormError("Sesi berakhir. Silakan masuk kembali.");
      return;
    }
    try {
      await deleteMaterial(materialId, accessToken);
      setFormError("Materi dinonaktifkan. Kembali ke daftar bab untuk melanjutkan.");
      setConfirmOpen(false);
    } catch (requestError) {
      setFormError(requestError instanceof ApiError ? requestError.message : "Hapus materi gagal.");
    }
  }

  if (loading) return <LoadingState label="Memuat materi..." />;
  if (loadError) {
    return (
      <div className="page">
        <Card>
          <h1>Ubah Materi</h1>
          <ErrorAlert>{loadError}</ErrorAlert>
          <ButtonLink to="/belajar">Kembali</ButtonLink>
        </Card>
      </div>
    );
  }

  return (
    <div className="page">
      <Card>
        <h1>Ubah Materi</h1>
        <InfoAlert>
          Thumbnail mengikuti batas PRD dan validasi final tetap di server. Status selesai dan unlock
          ditentukan backend.
        </InfoAlert>
        <form className="form" onSubmit={handleSubmit} aria-label="Formulir ubah materi">
          <div className="form-field">
            <label htmlFor="edit-material-title">Judul materi</label>
            <input
              id="edit-material-title"
              value={form.title}
              disabled={!canManage}
              onChange={(event) => setForm((value) => ({ ...value, title: event.target.value }))}
              aria-invalid={fieldErrorMap.title ? "true" : undefined}
              aria-describedby={fieldErrorMap.title ? "edit-material-title-error" : undefined}
            />
            <FieldError id="edit-material-title-error" message={fieldErrorMap.title} />
          </div>
          <div className="form-field">
            <label htmlFor="edit-material-description">Deskripsi</label>
            <textarea
              id="edit-material-description"
              value={form.description ?? ""}
              disabled={!canManage}
              onChange={(event) => setForm((value) => ({ ...value, description: event.target.value }))}
              rows={3}
            />
          </div>
          {formError ? <ErrorAlert>{formError}</ErrorAlert> : null}
          {saved ? <div className="alert alert-success" role="status">Materi tersimpan.</div> : null}
          <div className="button-row">
            <Button type="submit" variant="primary" disabled={saving || !canManage}>
              Simpan perubahan
            </Button>
            <Button variant="danger" disabled={!canManage} onClick={() => setConfirmOpen(true)}>
              Nonaktifkan
            </Button>
            <ButtonLink to="/belajar">Kembali</ButtonLink>
          </div>
        </form>
        {confirmOpen ? (
          <ConfirmDialog
            title="Nonaktifkan materi?"
            description="Materi yang dinonaktifkan mengikuti kebijakan backend."
            confirmLabel="Ya, nonaktifkan"
            onClose={() => setConfirmOpen(false)}
            onConfirm={() => {
              void handleDelete();
            }}
          />
        ) : null}
      </Card>
    </div>
  );
}
