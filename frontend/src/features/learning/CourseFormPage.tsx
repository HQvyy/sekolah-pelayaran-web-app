import { useEffect, useState } from "react";
import { ApiError } from "../../services/apiClient.ts";
import { fieldErrors, useAccessToken } from "../accounts/useAccountList.ts";
import { useSession } from "../../app/useSession.ts";
import { createCourse, getCourse, getCategory, updateCourse } from "./learningService.ts";
import type { ContentStatus, CourseCreatePayload, CoursePayload } from "./learningTypes.ts";
import { Button, ButtonLink, Card, ErrorAlert, FieldError, LoadingState } from "../../components/ui.tsx";

export function CourseFormPage({ courseId, categoryId }: { courseId?: string; categoryId?: string }) {
  const accessToken = useAccessToken();
  const { user } = useSession();
  const isEdit = Boolean(courseId);
  const [form, setForm] = useState<CoursePayload>({
    categoryId: categoryId ?? "",
    cohortId: "",
    title: "",
    description: "",
    status: "PUBLISHED",
  });
  const [categoryName, setCategoryName] = useState("");
  const [loading, setLoading] = useState(isEdit);
  const [loadError, setLoadError] = useState("");
  const [fieldErrorMap, setFieldErrorMap] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const canManage = user?.role === "ADMIN" || user?.role === "SUPERADMIN" || user?.role === "MENTOR";

  useEffect(() => {
    async function load() {
      if (!accessToken) {
        setLoading(false);
        setLoadError("Sesi berakhir. Silakan masuk kembali.");
        return;
      }
      try {
        if (courseId) {
          const result = await getCourse(courseId, accessToken);
          setForm({
            categoryId: result.data.categoryId,
            title: result.data.title,
            description: result.data.description ?? "",
            status: result.data.status,
          });
        } else if (categoryId) {
          const category = await getCategory(categoryId, accessToken);
          setCategoryName(category.data.name);
          setForm((value) => ({ ...value, categoryId }));
          setLoading(false);
          return;
        }
      } catch (requestError) {
        setLoadError(requestError instanceof ApiError ? requestError.message : "Gagal memuat kursus.");
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [courseId, categoryId, accessToken]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!accessToken) {
      setFormError("Sesi berakhir. Silakan masuk kembali.");
      return;
    }
    if (!canManage) {
      setFormError("Peran ini tidak diizinkan mengelola kursus pada pratinjau UX.");
      return;
    }
    const nextErrors: Record<string, string> = {};
    if (!form.categoryId) nextErrors.categoryId = "Kategori wajib dipilih.";
    if (!isEdit && !form.cohortId?.trim()) nextErrors.cohortId = "Angkatan (cohort) wajib dipilih untuk kursus baru.";
    if (!form.title.trim()) nextErrors.title = "Judul kursus wajib diisi.";
    setFieldErrorMap(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    setSaving(true);
    setFormError("");
    setSaved(false);
    try {
      if (courseId) {
        const { cohortId: _cohortId, ...updatePayload } = form;
        await updateCourse(courseId, updatePayload, accessToken);
      } else {
        const payload: CourseCreatePayload = {
          categoryId: form.categoryId,
          cohortId: (form.cohortId ?? "").trim(),
          title: form.title.trim(),
          description: form.description,
          status: form.status,
        };
        await createCourse(payload, accessToken);
      }
      setSaved(true);
    } catch (requestError) {
      if (requestError instanceof ApiError && requestError.status === 403) {
        setFormError("Akses ditolak backend. Peran ini tidak diizinkan mengelola kursus.");
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

  if (loading) return <LoadingState label="Memuat formulir kursus..." />;
  if (loadError) {
    return (
      <div className="page">
        <Card>
          <h1>{isEdit ? "Ubah Kursus" : "Tambah Kursus"}</h1>
          <ErrorAlert>{loadError}</ErrorAlert>
          <ButtonLink to="/belajar">Kembali</ButtonLink>
        </Card>
      </div>
    );
  }

  return (
    <div className="page">
      <Card>
        <h1>{isEdit ? "Ubah Kursus" : `Tambah Kursus${categoryName ? ` untuk ${categoryName}` : ""}`}</h1>
        <form className="form" onSubmit={handleSubmit} aria-label="Formulir kursus">
          <div className="form-field">
            <label htmlFor="course-category">ID kategori</label>
            <input
              id="course-category"
              value={form.categoryId}
              disabled={Boolean(categoryId) || isEdit || !canManage}
              onChange={(event) => setForm((value) => ({ ...value, categoryId: event.target.value }))}
              aria-invalid={fieldErrorMap.categoryId ? "true" : undefined}
              aria-describedby={fieldErrorMap.categoryId ? "course-category-error" : undefined}
              placeholder="Contoh: uuid-kategori"
            />
            <FieldError id="course-category-error" message={fieldErrorMap.categoryId} />
          </div>
          {!isEdit ? (
            <div className="form-field">
              <label htmlFor="course-cohort">ID Angkatan (cohort)</label>
              <input
                id="course-cohort"
                value={form.cohortId ?? ""}
                disabled={!canManage}
                onChange={(event) => setForm((value) => ({ ...value, cohortId: event.target.value }))}
                aria-invalid={fieldErrorMap.cohortId ? "true" : undefined}
                aria-describedby={fieldErrorMap.cohortId ? "course-cohort-error" : undefined}
                placeholder="Contoh: uuid-angkatan"
              />
              <FieldError id="course-cohort-error" message={fieldErrorMap.cohortId} />
            </div>
          ) : null}
          <div className="form-field">
            <label htmlFor="course-title">Judul kursus</label>
            <input
              id="course-title"
              value={form.title}
              disabled={!canManage}
              onChange={(event) => setForm((value) => ({ ...value, title: event.target.value }))}
              aria-invalid={fieldErrorMap.title ? "true" : undefined}
              aria-describedby={fieldErrorMap.title ? "course-title-error" : undefined}
              placeholder="Contoh: Keselamatan dasar"
            />
            <FieldError id="course-title-error" message={fieldErrorMap.title} />
          </div>
          <div className="form-field">
            <label htmlFor="course-description">Deskripsi</label>
            <textarea
              id="course-description"
              value={form.description ?? ""}
              disabled={!canManage}
              onChange={(event) => setForm((value) => ({ ...value, description: event.target.value }))}
              rows={3}
            />
          </div>
          <div className="form-field">
            <label htmlFor="course-status">Status</label>
            <select
              id="course-status"
              value={form.status}
              disabled={!canManage}
              onChange={(event) => setForm((value) => ({ ...value, status: event.target.value as ContentStatus }))}
            >
              <option value="PUBLISHED">Terbit</option>
              <option value="DRAFT">Draf</option>
            </select>
          </div>
          {formError ? <ErrorAlert>{formError}</ErrorAlert> : null}
          {saved ? <div className="alert alert-success" role="status">Kursus tersimpan.</div> : null}
          <div className="button-row">
            <Button type="submit" variant="primary" disabled={saving || !canManage}>
              {saving ? "Menyimpan..." : "Simpan kursus"}
            </Button>
            <ButtonLink to="/belajar">Kembali</ButtonLink>
          </div>
        </form>
      </Card>
    </div>
  );
}
