import { useEffect, useMemo, useState } from "react";
import { ApiError } from "../../services/apiClient.ts";
import {
  addEnrollment,
  createCohort,
  deleteCohort,
  getCohort,
  listCohorts,
  listEnrollments,
  listMyEnrollments,
  removeEnrollment,
  updateCohort,
} from "./accountService.ts";
import type { Cohort, CohortPayload, CohortQuery, CohortStatus, Enrollment } from "./accountTypes.ts";
import { fieldErrors, useAccessToken, usePaginatedList } from "./useAccountList.ts";
import { useSession } from "../../app/useSession.ts";
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

const PAGE_SIZE = 20;

function cohortStatusLabel(status: CohortStatus): string {
  return status === "ACTIVE" ? "Aktif" : "Nonaktif";
}

export function CohortListPage() {
  const accessToken = useAccessToken();
  const { user } = useSession();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [applied, setApplied] = useState<CohortQuery>({ pageSize: PAGE_SIZE });
  const canManage = user?.role === "ADMIN" || user?.role === "SUPERADMIN";

  const loader = useMemo(() => {
    return async (page: number) => {
      if (!accessToken) throw new ApiError(401, "UNAUTHENTICATED", "Sesi berakhir.");
      const result = await listCohorts({ ...applied, page, pageSize: PAGE_SIZE }, accessToken);
      return {
        items: result.data,
        totalItems: result.meta?.totalItems ?? result.data.length,
        totalPages: result.meta?.totalPages ?? 1,
      };
    };
  }, [accessToken, applied]);

  const list = usePaginatedList<Cohort>(loader);

  return (
    <div className="page">
      <Card>
        <h1>Angkatan atau Kelas</h1>
        <p className="muted">
          Kelola Angkatan atau Kelas dan enrollment Taruna. Penghapusan mengikuti relasi dan
          kebijakan backend, termasuk soft delete bila diperlukan.
        </p>
        <form
          className="form"
          aria-label="Filter Angkatan"
          onSubmit={(event) => {
            event.preventDefault();
            list.setPage(1);
            setApplied({
              search: search.trim() || undefined,
              status: (status as CohortQuery["status"]) || undefined,
              pageSize: PAGE_SIZE,
            });
          }}
        >
          <div className="grid-two">
            <div className="form-field">
              <label htmlFor="cohort-search">Pencarian Angkatan</label>
              <input
                id="cohort-search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Contoh: Angkatan 2026"
              />
            </div>
            <div className="form-field">
              <label htmlFor="cohort-status">Status</label>
              <select id="cohort-status" value={status} onChange={(event) => setStatus(event.target.value)}>
                <option value="">Semua status</option>
                <option value="ACTIVE">Aktif</option>
                <option value="INACTIVE">Nonaktif</option>
              </select>
            </div>
          </div>
          <div className="button-row">
            <Button type="submit" variant="primary">
              Terapkan filter
            </Button>
            {canManage ? <ButtonLink to="/admin/angkatan/baru">Tambah Angkatan</ButtonLink> : null}
          </div>
        </form>
      </Card>

      {!accessToken || list.unauthorized ? (
        <ErrorState title="Sesi berakhir" description="Silakan masuk kembali." onRetry={list.reload} />
      ) : list.loading ? (
        <LoadingState label="Memuat Angkatan..." />
      ) : list.error ? (
        <ErrorState
          title={list.forbidden ? "Akses ditolak" : "Gagal memuat Angkatan"}
          description={list.error}
          onRetry={list.reload}
        />
      ) : list.items.length === 0 ? (
        <EmptyState
          title="Belum ada Angkatan"
          description="Tambah Angkatan baru bila peran memiliki izin, atau ubah filter pencarian."
        />
      ) : (
        <Card>
          <div className="table-wrap">
            <table className="data-table">
              <caption>
                Menampilkan {list.items.length} dari {list.totalItems} Angkatan.
              </caption>
              <thead>
                <tr>
                  <th scope="col">Nama</th>
                  <th scope="col">Status</th>
                  <th scope="col">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {list.items.map((item) => (
                  <tr key={item.id}>
                    <td>{item.name}</td>
                    <td>
                      <Badge tone={item.status === "ACTIVE" ? "done" : "neutral"}>
                        {cohortStatusLabel(item.status)}
                      </Badge>
                    </td>
                    <td>
                      <div className="button-row">
                        <ButtonLink to={`/admin/angkatan/${item.id}`}>Detail</ButtonLink>
                        {canManage ? <DeleteCohortButton cohortId={item.id} onDone={list.reload} /> : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="button-row">
            <Button variant="secondary" disabled={list.page <= 1} onClick={() => list.setPage(list.page - 1)}>
              Sebelumnya
            </Button>
            <span className="muted" aria-live="polite">
              Halaman {list.page} dari {Math.max(list.totalPages, 1)}
            </span>
            <Button
              variant="secondary"
              disabled={list.page >= Math.max(list.totalPages, 1)}
              onClick={() => list.setPage(list.page + 1)}
            >
              Berikutnya
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}

function DeleteCohortButton({ cohortId, onDone }: { cohortId: string; onDone: () => void }) {
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
      await deleteCohort(cohortId, accessToken);
      setConfirmOpen(false);
      onDone();
    } catch (requestError) {
      setError(requestError instanceof ApiError ? requestError.message : "Hapus Angkatan gagal.");
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
          title="Nonaktifkan Angkatan?"
          description="Tindakan ini mengikuti kebijakan backend dan dapat memengaruhi enrollment terkait."
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

export function CohortFormPage({ cohortId }: { cohortId?: string }) {
  const accessToken = useAccessToken();
  const { user } = useSession();
  const isEdit = Boolean(cohortId);
  const [form, setForm] = useState<CohortPayload>({ name: "", description: "", status: "ACTIVE" });
  const [loading, setLoading] = useState(isEdit);
  const [loadError, setLoadError] = useState("");
  const [fieldErrorMap, setFieldErrorMap] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const canManage = user?.role === "ADMIN" || user?.role === "SUPERADMIN";

  useEffect(() => {
    async function load() {
      if (!cohortId || !accessToken) {
        setLoading(false);
        if (!accessToken) setLoadError("Sesi berakhir. Silakan masuk kembali.");
        return;
      }
      setLoading(true);
      setLoadError("");
      try {
        const result = await getCohort(cohortId, accessToken);
        setForm({ name: result.data.name, description: result.data.description ?? "", status: result.data.status });
      } catch (requestError) {
        setLoadError(requestError instanceof ApiError ? requestError.message : "Gagal memuat Angkatan.");
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [cohortId, accessToken]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!accessToken) {
      setFormError("Sesi berakhir. Silakan masuk kembali.");
      return;
    }
    if (!canManage) {
      setFormError("Peran ini tidak diizinkan mengelola Angkatan pada pratinjau UX.");
      return;
    }
    if (!form.name.trim()) {
      setFieldErrorMap({ name: "Nama Angkatan wajib diisi." });
      return;
    }
    setSaving(true);
    setFormError("");
    setFieldErrorMap({});
    setSaved(false);
    try {
      if (cohortId) {
        await updateCohort(cohortId, form, accessToken);
      } else {
        await createCohort(form, accessToken);
      }
      setSaved(true);
    } catch (requestError) {
      if (requestError instanceof ApiError && requestError.status === 403) {
        setFormError("Akses ditolak backend. Peran ini tidak diizinkan mengelola Angkatan.");
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

  if (loading) return <LoadingState label="Memuat formulir Angkatan..." />;
  if (loadError) {
    return (
      <div className="page">
        <Card>
          <h1>{isEdit ? "Ubah Angkatan" : "Tambah Angkatan"}</h1>
          <ErrorAlert>{loadError}</ErrorAlert>
          <ButtonLink to="/admin/angkatan">Kembali ke daftar</ButtonLink>
        </Card>
      </div>
    );
  }

  return (
    <div className="page">
      <Card>
        <h1>{isEdit ? "Ubah Angkatan" : "Tambah Angkatan"}</h1>
        <form className="form" onSubmit={handleSubmit} aria-label="Formulir Angkatan">
          <div className="form-field">
            <label htmlFor="cohort-name">Nama Angkatan atau Kelas</label>
            <input
              id="cohort-name"
              value={form.name}
              disabled={!canManage}
              onChange={(event) => setForm((value) => ({ ...value, name: event.target.value }))}
              aria-invalid={fieldErrorMap.name ? "true" : undefined}
              aria-describedby={fieldErrorMap.name ? "cohort-name-error" : undefined}
              placeholder="Contoh: Angkatan 2026 A"
            />
            <FieldError id="cohort-name-error" message={fieldErrorMap.name} />
          </div>
          <div className="form-field">
            <label htmlFor="cohort-description">Deskripsi</label>
            <textarea
              id="cohort-description"
              value={form.description ?? ""}
              disabled={!canManage}
              onChange={(event) => setForm((value) => ({ ...value, description: event.target.value }))}
              rows={3}
              placeholder="Deskripsi singkat Angkatan"
            />
          </div>
          <div className="form-field">
            <label htmlFor="cohort-status">Status</label>
            <select
              id="cohort-status"
              value={form.status}
              disabled={!canManage}
              onChange={(event) => setForm((value) => ({ ...value, status: event.target.value as CohortStatus }))}
            >
              <option value="ACTIVE">Aktif</option>
              <option value="INACTIVE">Nonaktif</option>
            </select>
          </div>
          {formError ? <ErrorAlert>{formError}</ErrorAlert> : null}
          {saved ? <div className="alert alert-success" role="status">Angkatan tersimpan.</div> : null}
          <div className="button-row">
            <Button type="submit" variant="primary" disabled={saving || !canManage}>
              {saving ? "Menyimpan..." : "Simpan Angkatan"}
            </Button>
            <ButtonLink to="/admin/angkatan">Kembali</ButtonLink>
          </div>
        </form>
      </Card>
    </div>
  );
}

export function CohortDetailPage({ cohortId }: { cohortId: string }) {
  const accessToken = useAccessToken();
  const { user } = useSession();
  const [cohort, setCohort] = useState<Cohort | null>(null);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [targetUserId, setTargetUserId] = useState("");
  const [actionError, setActionError] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const canManage = user?.role === "ADMIN" || user?.role === "SUPERADMIN";
  const canViewEnrollments =
    user?.role === "ADMIN" || user?.role === "SUPERADMIN" || user?.role === "MENTOR";

  async function load() {
    if (!accessToken) {
      setLoading(false);
      setError("Sesi berakhir. Silakan masuk kembali.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const detail = await getCohort(cohortId, accessToken);
      setCohort(detail.data);
      if (canViewEnrollments) {
        const members = await listEnrollments(cohortId, accessToken);
        setEnrollments(members.data);
      } else {
        setEnrollments([]);
      }
    } catch (requestError) {
      setError(requestError instanceof ApiError ? requestError.message : "Gagal memuat detail.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cohortId, accessToken]);

  async function handleAdd(event: React.FormEvent) {
    event.preventDefault();
    if (!accessToken) {
      setActionError("Sesi berakhir. Silakan masuk kembali.");
      return;
    }
    if (!targetUserId.trim()) {
      setActionError("Masukkan ID pengguna Taruna yang akan ditambahkan.");
      return;
    }
    setActionLoading(true);
    setActionError("");
    try {
      await addEnrollment(cohortId, { userId: targetUserId.trim() }, accessToken);
      setTargetUserId("");
      await load();
    } catch (requestError) {
      setActionError(requestError instanceof ApiError ? requestError.message : "Tambah enrollment gagal.");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleRemove(enrollmentId: string) {
    if (!accessToken) {
      setActionError("Sesi berakhir. Silakan masuk kembali.");
      return;
    }
    setActionLoading(true);
    setActionError("");
    try {
      await removeEnrollment(cohortId, enrollmentId, accessToken);
      await load();
    } catch (requestError) {
      setActionError(requestError instanceof ApiError ? requestError.message : "Hapus enrollment gagal.");
    } finally {
      setActionLoading(false);
    }
  }

  if (loading) return <LoadingState label="Memuat detail Angkatan..." />;
  if (error || !cohort) {
    return (
      <div className="page">
        <Card>
          <h1>Detail Angkatan</h1>
          <ErrorAlert>{error || "Angkatan tidak ditemukan."}</ErrorAlert>
          <ButtonLink to="/admin/angkatan">Kembali ke daftar</ButtonLink>
        </Card>
      </div>
    );
  }

  return (
    <div className="page">
      <Card>
        <h1>{cohort.name}</h1>
        <p className="muted">{cohort.description || "Belum ada deskripsi Angkatan."}</p>
        <p>
          <Badge tone={cohort.status === "ACTIVE" ? "done" : "neutral"}>
            {cohortStatusLabel(cohort.status)}
          </Badge>
        </p>
        <div className="button-row">
          <ButtonLink to="/admin/angkatan">Kembali</ButtonLink>
          {canManage ? <ButtonLink to={`/admin/angkatan/${cohort.id}/ubah`}>Ubah Angkatan</ButtonLink> : null}
        </div>
      </Card>
      <Card>
        <h2>Enrollment Taruna</h2>
        {!canViewEnrollments ? (
          <InfoAlert>Daftar enrollment hanya untuk Admin, Superadmin, atau Mentor sesuai assignment.</InfoAlert>
        ) : (
          <>
            {enrollments.length === 0 ? (
              <EmptyState title="Belum ada enrollment" description="Tambahkan Taruna ke Angkatan ini." />
            ) : (
              <div className="table-wrap">
                <table className="data-table">
                  <caption>Daftar Taruna dalam Angkatan ini.</caption>
                  <thead>
                    <tr>
                      <th scope="col">Nama</th>
                      <th scope="col">Email</th>
                      <th scope="col">Status</th>
                      <th scope="col">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {enrollments.map((item) => (
                      <tr key={item.id}>
                        <td>{item.userName}</td>
                        <td>{item.userEmail}</td>
                        <td>{item.status === "ACTIVE" ? "Aktif" : "Nonaktif"}</td>
                        <td>
                          {canManage ? (
                            <Button
                              variant="danger"
                              disabled={actionLoading}
                              onClick={() => void handleRemove(item.id)}
                            >
                              Nonaktifkan
                            </Button>
                          ) : (
                            <span className="field-help">Hanya baca</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {canManage ? (
              <form className="form" onSubmit={handleAdd} aria-label="Formulir tambah enrollment">
                <div className="form-field">
                  <label htmlFor="enrollment-user-id">ID pengguna Taruna</label>
                  <input
                    id="enrollment-user-id"
                    value={targetUserId}
                    onChange={(event) => setTargetUserId(event.target.value)}
                    placeholder="Contoh: uuid-taruna"
                  />
                </div>
                {actionError ? <ErrorAlert>{actionError}</ErrorAlert> : null}
                <div className="button-row">
                  <Button type="submit" variant="primary" disabled={actionLoading}>
                    {actionLoading ? "Memproses..." : "Tambah enrollment"}
                  </Button>
                </div>
              </form>
            ) : null}
          </>
        )}
      </Card>
    </div>
  );
}

export function MyEnrollmentPage() {
  const accessToken = useAccessToken();
  const [items, setItems] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      if (!accessToken) {
        setLoading(false);
        setError("Sesi berakhir. Silakan masuk kembali.");
        return;
      }
      setLoading(true);
      setError("");
      try {
        const result = await listMyEnrollments(accessToken);
        setItems(result.data);
      } catch (requestError) {
        setError(requestError instanceof ApiError ? requestError.message : "Gagal memuat enrollment.");
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [accessToken]);

  if (loading) return <LoadingState label="Memuat enrollment..." />;
  if (error) {
    return (
      <div className="page">
        <Card>
          <h1>Enrollment Saya</h1>
          <ErrorAlert>{error}</ErrorAlert>
        </Card>
      </div>
    );
  }

  return (
    <div className="page">
      <Card>
        <h1>Enrollment Saya</h1>
        {items.length === 0 ? (
          <EmptyState
            title="Belum ada enrollment aktif"
            description="Hubungi admin bila seharusnya sudah terdaftar pada Angkatan."
          />
        ) : (
          <ul>
            {items.map((item) => (
              <li key={item.id}>
                {item.cohortId} dengan status {item.status === "ACTIVE" ? "aktif" : "nonaktif"}.
              </li>
            ))}
          </ul>
        )}
        <InfoAlert>Enrollment menentukan materi, assessment, dan Live Lesson yang tersedia.</InfoAlert>
      </Card>
    </div>
  );
}
