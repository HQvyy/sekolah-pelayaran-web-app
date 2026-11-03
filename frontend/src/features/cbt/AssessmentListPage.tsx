import { useMemo, useState } from "react";
import { ApiError } from "../../services/apiClient.ts";
import { useAccessToken, usePaginatedList } from "../accounts/useAccountList.ts";
import { useSession } from "../../app/useSession.ts";
import { listAssessments } from "./cbtService.ts";
import type { Assessment, AssessmentQuery } from "./cbtTypes.ts";
import {
  Badge,
  Button,
  ButtonLink,
  Card,
  EmptyState,
  ErrorState,
  InfoAlert,
  LoadingState,
} from "../../components/ui.tsx";

const PAGE_SIZE = 20;

export function AssessmentListPage() {
  const accessToken = useAccessToken();
  const { user } = useSession();
  const [search, setSearch] = useState("");
  const [level, setLevel] = useState("");
  const [applied, setApplied] = useState<AssessmentQuery>({ pageSize: PAGE_SIZE });

  const loader = useMemo(() => {
    return async (page: number) => {
      if (!accessToken) throw new ApiError(401, "UNAUTHENTICATED", "Sesi berakhir.");
      const result = await listAssessments({ ...applied, page, pageSize: PAGE_SIZE }, accessToken);
      return {
        items: result.data,
        totalItems: result.meta?.totalItems ?? result.data.length,
        totalPages: result.meta?.totalPages ?? 1,
      };
    };
  }, [accessToken, applied]);

  const list = usePaginatedList<Assessment>(loader);

  return (
    <div className="page">
      <Card>
        <h1>Asesmen Level 1 sampai 5</h1>
        <p className="muted">
          Daftar assessment sesuai enrollment dan aturan unlock dari backend. Aturan passing grade
          70, maksimal 3 attempt, jeda 24 jam, dan remedial masih perlu konfirmasi dan tidak
          ditampilkan sebagai aturan final.
        </p>
        <form
          className="form"
          aria-label="Filter assessment"
          onSubmit={(event) => {
            event.preventDefault();
            list.setPage(1);
            setApplied({
              search: search.trim() || undefined,
              level: level || undefined,
              pageSize: PAGE_SIZE,
            });
          }}
        >
          <div className="grid-two">
            <div className="form-field">
              <label htmlFor="cbt-search">Pencarian assessment</label>
              <input
                id="cbt-search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Contoh: Level 1 Tanker"
              />
            </div>
            <div className="form-field">
              <label htmlFor="cbt-level">Level</label>
              <select id="cbt-level" value={level} onChange={(event) => setLevel(event.target.value)}>
                <option value="">Semua level</option>
                <option value="1">Level 1</option>
                <option value="2">Level 2</option>
                <option value="3">Level 3</option>
                <option value="4">Level 4</option>
                <option value="5">Level 5</option>
              </select>
            </div>
          </div>
          <div className="button-row">
            <Button type="submit" variant="primary">
              Terapkan filter
            </Button>
            {user?.role === "TARUNA" ? <ButtonLink to="/asesmen/saya">Attempt saya</ButtonLink> : null}
          </div>
        </form>
      </Card>

      {!accessToken || list.unauthorized ? (
        <ErrorState title="Sesi berakhir" description="Silakan masuk kembali." onRetry={list.reload} />
      ) : list.loading ? (
        <LoadingState label="Memuat assessment..." />
      ) : list.error ? (
        <ErrorState
          title={list.forbidden ? "Akses ditolak" : "Gagal memuat assessment"}
          description={list.error}
          onRetry={list.reload}
        />
      ) : list.items.length === 0 ? (
        <EmptyState
          title="Belum ada assessment"
          description="Assessment muncul bila enrollment dan aturan unlock backend mengizinkan."
        />
      ) : (
        <div className="grid-two">
          {list.items.map((assessment) => (
            <Card key={assessment.id}>
              <h2>{assessment.title}</h2>
              <p className="muted">{assessment.description || "Belum ada deskripsi assessment."}</p>
              <p>
                <Badge tone="open">Level {assessment.level}</Badge>{" "}
                <Badge tone="neutral">{assessment.durationMinutes} menit</Badge>
              </p>
              <div className="button-row">
                <ButtonLink to={`/asesmen/${assessment.id}`}>Instruksi dan mulai</ButtonLink>
              </div>
            </Card>
          ))}
        </div>
      )}
      <InfoAlert>
        Kelulusan, nilai akhir, kesempatan tersisa, dan unlock level selalu dari backend. Frontend
        tidak menghitung aturan tersebut.
      </InfoAlert>
    </div>
  );
}
