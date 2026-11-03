import { Link } from "react-router-dom";
import { ButtonLink, Card, InfoAlert } from "../../components/ui.tsx";
import { useSession } from "../../app/useSession.ts";

export function ContentDashboardPage() {
  const { user } = useSession();
  const canManageCategory = user?.role === "ADMIN" || user?.role === "SUPERADMIN";
  const canManageCourse = canManageCategory || user?.role === "MENTOR";

  return (
    <div className="page">
      <Card>
        <h1>Kelola Konten</h1>
        <p className="muted">
          Pengelolaan Kategori Kapal, kursus, bab, materi, dan video mengikuti izin backend.
          Permission rinci masih menunggu matriks final, guard ini hanya UX.
        </p>
        <div className="button-row">
          <ButtonLink to="/belajar">Lihat sisi Taruna</ButtonLink>
          {canManageCategory ? <ButtonLink to="/konten/kategori/baru">Tambah kategori</ButtonLink> : null}
        </div>
      </Card>
      <div className="grid-two">
        <Card>
          <h2>Kategori dan Kursus</h2>
          <p className="muted">Alur Kategori Kapal ke kursus ke bab ke materi video.</p>
          <div className="button-row">
            <ButtonLink to="/belajar">Buka kategori</ButtonLink>
          </div>
        </Card>
        <Card>
          <h2>Materi dan Video</h2>
          <p className="muted">
            {canManageCourse
              ? "Kelola metadata materi, thumbnail, dan ID video backend."
              : "Akses materi mengikuti enrollment dan aturan unlock dari backend."}
          </p>
          <div className="button-row">
            <Link to="/belajar">Buka materi</Link>
          </div>
        </Card>
      </div>
      <InfoAlert>
        Frontend tidak memanggil Bunny Stream langsung, tidak menyusun URL privat, dan tidak
        menampilkan video bila API menyatakan akses ditolak.
      </InfoAlert>
    </div>
  );
}
