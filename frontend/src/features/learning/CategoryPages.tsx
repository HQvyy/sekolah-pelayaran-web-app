import { useMemo, useState } from "react";
import { ApiError } from "../../services/apiClient.ts";
import { useAccessToken, usePaginatedList } from "../accounts/useAccountList.ts";
import { useSession } from "../../app/useSession.ts";
import { deleteCategory, listCategories } from "./learningService.ts";
import type { CategoryQuery, ShipCategory } from "./learningTypes.ts";
import {
  Badge,
  Button,
  ButtonLink,
  Card,
  ConfirmDialog,
  EmptyState,
  ErrorAlert,
  ErrorState,
  LoadingState,
} from "../../components/ui.tsx";

const PAGE_SIZE = 20;

export function CategoryListPage() {
  const accessToken = useAccessToken();
  const { user } = useSession();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [applied, setApplied] = useState<CategoryQuery>({ pageSize: PAGE_SIZE });
  const canManage = user?.role === "ADMIN" || user?.role === "SUPERADMIN";

  const loader = useMemo(() => {
    return async (page: number) => {
      if (!accessToken) throw new ApiError(401, "UNAUTHENTICATED", "Sesi berakhir.");
      const result = await listCategories({ ...applied, page, pageSize: PAGE_SIZE }, accessToken);
      return {
        items: result.data,
        totalItems: result.meta?.totalItems ?? result.data.length,
        totalPages: result.meta?.totalPages ?? 1,
      };
    };
  }, [accessToken, applied]);

  const list = usePaginatedList<ShipCategory>(loader);

  return (
    <div className="page">
      <Card>
        <h1>Kategori Kapal</h1>
        <p className="muted">
          Kategori awal mengikuti PRD seperti Bulk Carrier, Tanker, Container Ship, dan Passenger
          Ship. Taruna hanya melihat kategori yang tersedia sesuai enrollment dan aturan unlock dari
          backend.
        </p>
        <form
          className="form"
          aria-label="Filter kategori"
          onSubmit={(event) => {
            event.preventDefault();
            list.setPage(1);
            setApplied({
              search: search.trim() || undefined,
              status: (status as CategoryQuery["status"]) || undefined,
              pageSize: PAGE_SIZE,
            });
          }}
        >
          <div className="grid-two">
            <div className="form-field">
              <label htmlFor="category-search">Pencarian kategori</label>
              <input
                id="category-search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Contoh: Tanker"
              />
            </div>
            <div className="form-field">
              <label htmlFor="category-status">Status</label>
              <select id="category-status" value={status} onChange={(event) => setStatus(event.target.value)}>
                <option value="">Semua status</option>
                <option value="PUBLISHED">Terbit</option>
                <option value="DRAFT">Draf</option>
              </select>
            </div>
          </div>
          <div className="button-row">
            <Button type="submit" variant="primary">
              Terapkan filter
            </Button>
            {canManage ? <ButtonLink to="/konten/kategori/baru">Tambah kategori</ButtonLink> : null}
          </div>
        </form>
      </Card>

      {!accessToken || list.unauthorized ? (
        <ErrorState title="Sesi berakhir" description="Silakan masuk kembali." onRetry={list.reload} />
      ) : list.loading ? (
        <LoadingState label="Memuat kategori kapal..." />
      ) : list.error ? (
        <ErrorState
          title={list.forbidden ? "Akses ditolak" : "Gagal memuat kategori"}
          description={list.error}
          onRetry={list.reload}
        />
      ) : list.items.length === 0 ? (
        <EmptyState
          title="Belum ada kategori"
          description="Tambah kategori bila peran memiliki izin, atau ubah filter pencarian."
        />
      ) : (
        <div className="grid-two">
          {list.items.map((item) => (
            <Card key={item.id}>
              <h2>{item.name}</h2>
              <p className="muted">{item.description || "Belum ada deskripsi kategori."}</p>
              <p>
                <Badge tone={item.status === "PUBLISHED" ? "done" : "neutral"}>
                  {item.status === "PUBLISHED" ? "Terbit" : "Draf"}
                </Badge>
              </p>
              <div className="button-row">
                <ButtonLink to={`/belajar/kategori/${item.id}`}>Buka kursus</ButtonLink>
                {canManage ? <ButtonLink to={`/konten/kategori/${item.id}/ubah`}>Ubah</ButtonLink> : null}
                {canManage ? <DeleteCategoryButton categoryId={item.id} onDone={list.reload} /> : null}
              </div>
            </Card>
          ))}
        </div>
      )}
      {list.items.length > 0 ? (
        <Card>
          <div className="button-row">
            <Button variant="secondary" disabled={list.page <= 1} onClick={() => list.setPage(list.page - 1)}>
              Sebelumnya
            </Button>
            <span className="muted" aria-live="polite">
              Halaman {list.page} dari {Math.max(list.totalPages, 1)}, total {list.totalItems} kategori.
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
      ) : null}
    </div>
  );
}

function DeleteCategoryButton({ categoryId, onDone }: { categoryId: string; onDone: () => void }) {
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
      await deleteCategory(categoryId, accessToken);
      setConfirmOpen(false);
      onDone();
    } catch (requestError) {
      setError(requestError instanceof ApiError ? requestError.message : "Hapus kategori gagal.");
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
          title="Nonaktifkan kategori?"
          description="Tindakan ini mengikuti kebijakan backend dan dapat memengaruhi kursus terkait."
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
