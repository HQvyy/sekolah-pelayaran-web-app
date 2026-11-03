import { useEffect, useState } from "react";
import { ApiError } from "../../services/apiClient.ts";
import { useAccessToken } from "../accounts/useAccountList.ts";
import { useSession } from "../../app/useSession.ts";
import { createCategory, getCategory, updateCategory } from "./learningService.ts";
import type { CategoryPayload, ContentStatus } from "./learningTypes.ts";
import { fieldErrors } from "../accounts/useAccountList.ts";
import { Button, ButtonLink, Card, ErrorAlert, FieldError, LoadingState } from "../../components/ui.tsx";

export function CategoryFormPage({ categoryId }: { categoryId?: string }) {
  const accessToken = useAccessToken();
  const { user } = useSession();
  const isEdit = Boolean(categoryId);
  const [form, setForm] = useState<CategoryPayload>({ name: "", description: "", status: "PUBLISHED" });
  const [loading, setLoading] = useState(isEdit);
  const [loadError, setLoadError] = useState("");
  const [fieldErrorMap, setFieldErrorMap] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const canManage = user?.role === "ADMIN" || user?.role === "SUPERADMIN";

  useEffect(() => {
    async function load() {
      if (!categoryId || !accessToken) {
        setLoading(false);
        if (!accessToken) setLoadError("Sesi berakhir. Silakan masuk kembali.");
        return;
      }
      setLoading(true);
      setLoadError("");
      try {
        const result = await getCategory(categoryId, accessToken);
        setForm({ name: result.data.name, description: result.data.description ?? "", status: result.data.status });
      } catch (requestError) {
        setLoadError(requestError instanceof ApiError ? requestError.message : "Gagal memuat kategori.");
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [categoryId, accessToken]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!accessToken) {
      setFormError("Sesi berakhir. Silakan masuk kembali.");
      return;
    }
    if (!canManage) {
      setFormError("Peran ini tidak diizinkan mengelola kategori pada pratinjau UX.");
      return;
    }
    if (!form.name.trim()) {
      setFieldErrorMap({ name: "Nama kategori wajib diisi." });
      return;
    }
    setSaving(true);
    setFormError("");
    setFieldErrorMap({});
    setSaved(false);
    try {
      if (categoryId) {
        await updateCategory(categoryId, form, accessToken);
      } else {
        await createCategory(form, accessToken);
      }
      setSaved(true);
    } catch (requestError) {
      if (requestError instanceof ApiError && requestError.status === 403) {
        setFormError("Akses ditolak backend. Peran ini tidak diizinkan mengelola kategori.");
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

  if (loading) return <LoadingState label="Memuat formulir kategori..." />;
  if (loadError) {
    return (
      <div className="page">
        <Card>
          <h1>{isEdit ? "Ubah Kategori" : "Tambah Kategori"}</h1>
          <ErrorAlert>{loadError}</ErrorAlert>
          <ButtonLink to="/belajar">Kembali ke pembelajaran</ButtonLink>
        </Card>
      </div>
    );
  }

  return (
    <div className="page">
      <Card>
        <h1>{isEdit ? "Ubah Kategori" : "Tambah Kategori"}</h1>
        <form className="form" onSubmit={handleSubmit} aria-label="Formulir kategori">
          <div className="form-field">
            <label htmlFor="category-name">Nama kategori</label>
            <input
              id="category-name"
              value={form.name}
              disabled={!canManage}
              onChange={(event) => setForm((value) => ({ ...value, name: event.target.value }))}
              aria-invalid={fieldErrorMap.name ? "true" : undefined}
              aria-describedby={fieldErrorMap.name ? "category-name-error" : undefined}
              placeholder="Contoh: Tanker"
            />
            <FieldError id="category-name-error" message={fieldErrorMap.name} />
          </div>
          <div className="form-field">
            <label htmlFor="category-description">Deskripsi</label>
            <textarea
              id="category-description"
              value={form.description ?? ""}
              disabled={!canManage}
              onChange={(event) => setForm((value) => ({ ...value, description: event.target.value }))}
              rows={3}
              placeholder="Deskripsi singkat kategori"
            />
          </div>
          <div className="form-field">
            <label htmlFor="category-status">Status</label>
            <select
              id="category-status"
              value={form.status}
              disabled={!canManage}
              onChange={(event) => setForm((value) => ({ ...value, status: event.target.value as ContentStatus }))}
            >
              <option value="PUBLISHED">Terbit</option>
              <option value="DRAFT">Draf</option>
            </select>
          </div>
          {formError ? <ErrorAlert>{formError}</ErrorAlert> : null}
          {saved ? <div className="alert alert-success" role="status">Kategori tersimpan.</div> : null}
          <div className="button-row">
            <Button type="submit" variant="primary" disabled={saving || !canManage}>
              {saving ? "Menyimpan..." : "Simpan kategori"}
            </Button>
            <ButtonLink to="/belajar">Kembali</ButtonLink>
          </div>
        </form>
      </Card>
    </div>
  );
}
