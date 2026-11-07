import { useMemo, useState } from "react";
import { useUserDetail } from "./useUserDetail.ts";
import { Link } from "react-router-dom";
import { ApiError } from "../../services/apiClient.ts";
import { listUsers, updateUserRole, updateUserStatus, verifyTaruna } from "./accountService.ts";
import type { AccountStatus, AdminUser, UserQuery } from "./accountTypes.ts";
import type { UserRole } from "../../types/api.ts";
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

  InfoAlert,
  LoadingState,
} from "../../components/ui.tsx";

const PAGE_SIZE = 20;

function statusTone(status: AccountStatus): "open" | "progress" | "done" | "neutral" {
  if (status === "ACTIVE") return "done";
  if (status === "PENDING_VERIFICATION") return "progress";
  return "neutral";
}

function statusLabel(status: AccountStatus): string {
  if (status === "ACTIVE") return "Aktif";
  if (status === "PENDING_VERIFICATION") return "Menunggu verifikasi";
  return "Ditangguhkan";
}

export function UserListPage() {
  const accessToken = useAccessToken();
  const { user } = useSession();
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("");
  const [status, setStatus] = useState("");
  const [applied, setApplied] = useState<UserQuery>({ pageSize: PAGE_SIZE });

  const loader = useMemo(() => {
    return async (page: number) => {
      if (!accessToken) throw new ApiError(401, "UNAUTHENTICATED", "Sesi berakhir.");
      const result = await listUsers({ ...applied, page, pageSize: PAGE_SIZE }, accessToken);
      return {
        items: result.data,
        totalItems: result.meta?.totalItems ?? result.data.length,
        totalPages: result.meta?.totalPages ?? 1,
      };
    };
  }, [accessToken, applied]);

  const list = usePaginatedList<AdminUser>(loader);
  const canVerify = user?.role === "ADMIN" || user?.role === "SUPERADMIN";
  const canEdit = user?.role === "ADMIN" || user?.role === "SUPERADMIN";

  return (
    <div className="page">
      <Card>
        <h1>Pengguna</h1>
        <p className="muted">
          Daftar akun Taruna, Mentor, dan Admin. Verifikasi Taruna hanya untuk Admin atau
          Superadmin. Permission rinci menunggu kontrak final, backend tetap mengotorisasi tiap
          request.
        </p>
        <form
          className="form"
          aria-label="Filter pengguna"
          onSubmit={(event) => {
            event.preventDefault();
            list.setPage(1);
            setApplied({
              search: search.trim() || undefined,
              role: (role as UserQuery["role"]) || undefined,
              status: (status as UserQuery["status"]) || undefined,
              pageSize: PAGE_SIZE,
            });
          }}
        >
          <div className="grid-two">
            <div className="form-field">
              <label htmlFor="user-search">Pencarian nama atau email</label>
              <input
                id="user-search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Contoh: taruna@example.com"
              />
            </div>
            <div className="form-field">
              <label htmlFor="user-role">Peran</label>
              <select id="user-role" value={role} onChange={(event) => setRole(event.target.value)}>
                <option value="">Semua peran</option>
                <option value="TARUNA">Taruna</option>
                <option value="MENTOR">Mentor</option>
                <option value="ADMIN">Admin</option>
                <option value="SUPERADMIN">Superadmin</option>
              </select>
            </div>
          </div>
          <div className="grid-two">
            <div className="form-field">
              <label htmlFor="user-status">Status</label>
              <select id="user-status" value={status} onChange={(event) => setStatus(event.target.value)}>
                <option value="">Semua status</option>
                <option value="PENDING_VERIFICATION">Menunggu verifikasi</option>
                <option value="ACTIVE">Aktif</option>
                <option value="SUSPENDED">Ditangguhkan</option>
              </select>
            </div>
            <div className="form-field">
              <span className="field-help">Halaman {list.page} dari {Math.max(list.totalPages, 1)}</span>
              <div className="button-row">
                <Button type="submit" variant="primary">
                  Terapkan filter
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setSearch("");
                    setRole("");
                    setStatus("");
                    setApplied({ pageSize: PAGE_SIZE });
                    list.setPage(1);
                  }}
                >
                  Atur ulang
                </Button>
              </div>
            </div>
          </div>
        </form>
      </Card>

      {!accessToken || list.unauthorized ? (
        <ErrorState
          title="Sesi berakhir"
          description="Silakan masuk kembali untuk membuka halaman pengguna."
          onRetry={list.reload}
        />
      ) : list.loading ? (
        <LoadingState label="Memuat daftar pengguna..." />
      ) : list.error ? (
        <ErrorState
          title={list.forbidden ? "Akses ditolak" : "Gagal memuat pengguna"}
          description={list.error}
          onRetry={list.reload}
        />
      ) : list.items.length === 0 ? (
        <EmptyState
          title="Belum ada pengguna"
          description="Ubah filter atau tambah akun melalui impor .xlsx dan formulir admin."
          action={<ButtonLink to="/admin/impor">Buka impor akun</ButtonLink>}
        />
      ) : (
        <Card>
          <div className="table-wrap">
            <table className="data-table">
              <caption>
                Menampilkan {list.items.length} dari {list.totalItems} pengguna.
              </caption>
              <thead>
                <tr>
                  <th scope="col">Email</th>
                  <th scope="col">Peran</th>
                  <th scope="col">Status</th>
                  <th scope="col">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {list.items.map((item) => (
                  <tr key={item.id}>
                    <td>{item.email}</td>
                    <td>{item.role}</td>
                    <td>
                      <Badge tone={statusTone(item.status)}>{statusLabel(item.status)}</Badge>
                    </td>
                    <td>
                      <div className="button-row">
                        <ButtonLink to={`/admin/pengguna/${item.id}`}>Detail</ButtonLink>
                        {canVerify && item.status === "PENDING_VERIFICATION" ? (
                          <VerifyButton userId={item.id} onDone={list.reload} />
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="button-row">
            <Button
              variant="secondary"
              disabled={list.page <= 1}
              onClick={() => list.setPage(Math.max(1, list.page - 1))}
            >
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
            {!canEdit ? (
              <span className="field-help">Aksi edit disembunyikan untuk peran ini sebagai UX.</span>
            ) : null}
          </div>
        </Card>
      )}
    </div>
  );
}

function VerifyButton({ userId, onDone }: { userId: string; onDone: () => void }) {
  const accessToken = useAccessToken();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleVerify() {
    if (!accessToken) {
      setError("Sesi berakhir. Silakan masuk kembali.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await verifyTaruna(userId, accessToken);
      setConfirmOpen(false);
      onDone();
    } catch (requestError) {
      setError(requestError instanceof ApiError ? requestError.message : "Verifikasi gagal.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Button variant="secondary" onClick={() => setConfirmOpen(true)}>
        Verifikasi
      </Button>
      {confirmOpen ? (
        <ConfirmDialog
          title="Verifikasi akun Taruna?"
          description="Akun yang diverifikasi dapat masuk dan mengikuti pembelajaran sesuai enrollment."
          confirmLabel={loading ? "Memproses..." : "Ya, verifikasi"}
          onClose={() => {
            if (!loading) setConfirmOpen(false);
          }}
          onConfirm={() => {
            void handleVerify();
          }}
        />
      ) : null}
      {error ? <ErrorAlert>{error}</ErrorAlert> : null}
    </>
  );
}

export function UserDetailPage({ userId }: { userId: string }) {
  const accessToken = useAccessToken();
  const { user } = useSession();
  const { detail, loading, error, forbidden, reload } = useUserDetail(userId);
  const canEdit = user?.role === "ADMIN" || user?.role === "SUPERADMIN";
  // Form mengikuti data server: nilai awal dihitung saat render, bukan
  // disalin lewat efek (react/set-state-in-effect). Setelah reload, form
  // sengaja TIDAK direset agar perubahan yang sedang diketik tidak hilang
  // (kunci form = id pengguna yang sedang dibuka).
  const formKey = detail?.id ?? "";
  const [form, setForm] = useState(() => ({
    key: "",
    status: "ACTIVE" as AccountStatus,
    role: "TARUNA" as UserRole,
  }));
  const status =
    form.key === formKey && detail
      ? form.status
      : detail?.status ?? "ACTIVE";
  const role =
    form.key === formKey && detail ? form.role : detail?.role ?? "TARUNA";
  const [fieldErrorMap, setFieldErrorMap] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  function setStatus(next: AccountStatus) {
    setForm({ key: formKey, status: next, role });
  }

  function setRole(next: UserRole) {
    setForm({ key: formKey, status, role: next });
  }

  async function handleSave(event: React.FormEvent) {
    event.preventDefault();
    if (!accessToken || !detail) return;
    if (!canEdit) {
      setFormError("Peran ini tidak diizinkan mengubah pengguna pada pratinjau UX.");
      return;
    }
    setSaving(true);
    setFormError("");
    setFieldErrorMap({});
    setSaved(false);
    try {
      const statusChanged = status !== detail.status;
      const roleChanged = role !== detail.role;
      if (!statusChanged && !roleChanged) {
        setSaved(true);
        return;
      }
      if (statusChanged) await updateUserStatus(detail.id, status, accessToken);
      if (roleChanged) await updateUserRole(detail.id, role, accessToken);
      setSaved(true);
      reload();
    } catch (requestError) {
      if (requestError instanceof ApiError && requestError.status === 403) {
        setFormError("Akses ditolak backend. Peran ini tidak diizinkan mengubah pengguna.");
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
  if (loading) return <LoadingState label="Memuat detail pengguna..." />;
  if (error && !detail) {
    return (
      <div className="page">
        <Card>
          <h1>Detail Pengguna</h1>
          <ErrorAlert>{error}</ErrorAlert>
          <div className="button-row">
            <ButtonLink to="/admin/pengguna">Kembali ke daftar</ButtonLink>
          </div>
          {forbidden ? (
            <InfoAlert>Error 403 ditampilkan apa adanya dan bukan keputusan frontend.</InfoAlert>
          ) : null}
        </Card>
      </div>
    );
  }
  if (!detail) {
    return (
      <div className="page">
        <EmptyState title="Pengguna tidak ditemukan" description="Periksa kembali tautan detail." />
      </div>
    );
  }

  return (
    <div className="page">
      <Card>
        <h1>Detail Pengguna</h1>
        <p className="muted">
          {detail.email} dengan peran {detail.role}.
        </p>
        <p>
          <Badge tone={statusTone(detail.status)}>{statusLabel(detail.status)}</Badge>
        </p>
      </Card>
      <Card>
        <h2>Ubah data sesuai izin</h2>
        {!canEdit ? (
          <InfoAlert>
            Formulir hanya baca untuk peran ini sebagai UX. Backend tetap menolak request tanpa izin.
          </InfoAlert>
        ) : null}
        <form className="form" onSubmit={handleSave} aria-label="Formulir ubah pengguna">
          <div className="form-field">
            <label htmlFor="user-detail-status">Status akun</label>
            <select
              id="user-detail-status"
              value={status}
              disabled={!canEdit}
              onChange={(event) => setStatus(event.target.value as AccountStatus)}
            >
              <option value="PENDING_VERIFICATION">Menunggu verifikasi</option>
              <option value="ACTIVE">Aktif</option>
              <option value="SUSPENDED">Ditangguhkan</option>
            </select>
          </div>
          <div className="form-field">
            <label htmlFor="user-detail-role">Peran</label>
            <select
              id="user-detail-role"
              value={role}
              disabled={!canEdit}
              onChange={(event) => setRole(event.target.value as UserRole)}
            >
              <option value="TARUNA">Taruna</option>
              <option value="MENTOR">Mentor</option>
              <option value="ADMIN">Admin</option>
              <option value="SUPERADMIN">Superadmin</option>
            </select>
          </div>
          {formError ? <ErrorAlert>{formError}</ErrorAlert> : null}
          {Object.values(fieldErrorMap).map((message) => (
            <ErrorAlert key={message}>{message}</ErrorAlert>
          ))}
          {saved ? <div className="alert alert-success" role="status">Perubahan tersimpan.</div> : null}
          <div className="button-row">
            <Button type="submit" variant="primary" disabled={saving || !canEdit}>
              {saving ? "Menyimpan..." : "Simpan perubahan"}
            </Button>
            <ButtonLink to="/admin/pengguna">Kembali</ButtonLink>
            <Link to="/admin/impor">Buka impor akun</Link>
          </div>
        </form>
      </Card>
    </div>
  );
}

