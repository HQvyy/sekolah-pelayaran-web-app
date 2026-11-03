import { useEffect, useMemo, useState } from "react";
import { ApiError } from "../../services/apiClient.ts";
import { useAccessToken, usePaginatedList } from "../accounts/useAccountList.ts";
import { useSession } from "../../app/useSession.ts";
import { getCategory, listCourses } from "./learningService.ts";
import type { Course, CourseQuery } from "./learningTypes.ts";
import {
  Badge,
  Button,
  ButtonLink,
  Card,
  EmptyState,
  ErrorState,
  LoadingState,
} from "../../components/ui.tsx";

const PAGE_SIZE = 20;

export function CategoryDetailPage({ categoryId }: { categoryId: string }) {
  const accessToken = useAccessToken();
  const { user } = useSession();
  const [categoryName, setCategoryName] = useState("");
  const [loadError, setLoadError] = useState("");
  const [search, setSearch] = useState("");
  const [applied, setApplied] = useState<CourseQuery>({ pageSize: PAGE_SIZE, categoryId });
  const canManage = user?.role === "ADMIN" || user?.role === "SUPERADMIN";

  useEffect(() => {
    async function load() {
      if (!accessToken) {
        setLoadError("Sesi berakhir. Silakan masuk kembali.");
        return;
      }
      try {
        const result = await getCategory(categoryId, accessToken);
        setCategoryName(result.data.name);
      } catch (requestError) {
        setLoadError(requestError instanceof ApiError ? requestError.message : "Gagal memuat kategori.");
      }
    }
    void load();
  }, [categoryId, accessToken]);

  const loader = useMemo(() => {
    return async (page: number) => {
      if (!accessToken) throw new ApiError(401, "UNAUTHENTICATED", "Sesi berakhir.");
      const result = await listCourses({ ...applied, categoryId, page, pageSize: PAGE_SIZE }, accessToken);
      return {
        items: result.data,
        totalItems: result.meta?.totalItems ?? result.data.length,
        totalPages: result.meta?.totalPages ?? 1,
      };
    };
  }, [accessToken, applied, categoryId]);

  const list = usePaginatedList<Course>(loader);

  return (
    <div className="page">
      <Card>
        <h1>{categoryName || "Detail Kategori"}</h1>
        <p className="muted">
          Daftar kursus dalam kategori ini sesuai enrollment dan aturan unlock dari backend. Taruna
          tidak melihat kursus yang tidak diizinkan.
        </p>
        {loadError ? <p className="field-error" role="alert">{loadError}</p> : null}
        <form
          className="form"
          aria-label="Filter kursus"
          onSubmit={(event) => {
            event.preventDefault();
            list.setPage(1);
            setApplied({ search: search.trim() || undefined, pageSize: PAGE_SIZE, categoryId });
          }}
        >
          <div className="form-field">
            <label htmlFor="course-search">Pencarian kursus</label>
            <input
              id="course-search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Contoh: Keselamatan dasar"
            />
          </div>
          <div className="button-row">
            <Button type="submit" variant="primary">
              Terapkan filter
            </Button>
            {canManage ? <ButtonLink to={`/konten/kategori/${categoryId}/kursus/baru`}>Tambah kursus</ButtonLink> : null}
            <ButtonLink to="/belajar">Kembali</ButtonLink>
          </div>
        </form>
      </Card>

      {!accessToken || list.unauthorized ? (
        <ErrorState title="Sesi berakhir" description="Silakan masuk kembali." onRetry={list.reload} />
      ) : list.loading ? (
        <LoadingState label="Memuat kursus..." />
      ) : list.error ? (
        <ErrorState
          title={list.forbidden ? "Akses ditolak" : "Gagal memuat kursus"}
          description={list.error}
          onRetry={list.reload}
        />
      ) : list.items.length === 0 ? (
        <EmptyState title="Belum ada kursus" description="Ubah filter atau tambah kursus bila berizin." />
      ) : (
        <div className="grid-two">
          {list.items.map((item) => (
            <Card key={item.id}>
              <h2>{item.title}</h2>
              <p className="muted">{item.description || "Belum ada deskripsi kursus."}</p>
              <p>
                <Badge tone={item.status === "PUBLISHED" ? "done" : "neutral"}>
                  {item.status === "PUBLISHED" ? "Terbit" : "Draf"}
                </Badge>
              </p>
              <div className="button-row">
                <ButtonLink to={`/belajar/kursus/${item.id}`}>Buka bab</ButtonLink>
                {canManage ? <ButtonLink to={`/konten/kursus/${item.id}/ubah`}>Ubah</ButtonLink> : null}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
