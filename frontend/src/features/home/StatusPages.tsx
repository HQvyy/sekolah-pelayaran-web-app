import { Link } from "react-router-dom";
import { ButtonLink, Card } from "../../components/ui.tsx";

export function NotFoundPage() {
  return (
    <div className="page">
      <Card>
        <h1>Halaman tidak ditemukan</h1>
        <p className="muted">
          Alamat yang diminta tidak tersedia. Periksa kembali tautan atau kembali ke halaman utama.
        </p>
        <div className="button-row">
          <ButtonLink to="/" variant="primary">
            Kembali ke beranda
          </ButtonLink>
          <ButtonLink to="/dashboard">Ke dasbor</ButtonLink>
        </div>
      </Card>
    </div>
  );
}

export function ForbiddenPage() {
  return (
    <div className="page">
      <Card>
        <h1>Akses ditolak</h1>
        <p className="muted">
          Peran akun ini tidak diizinkan membuka halaman tersebut untuk pratinjau UX. Otorisasi
          resmi tetap ditentukan oleh backend.
        </p>
        <div className="button-row">
          <ButtonLink to="/dashboard" variant="primary">
            Kembali ke dasbor
          </ButtonLink>
          <ButtonLink to="/login">Ganti sesi pratinjau</ButtonLink>
        </div>
      </Card>
    </div>
  );
}

export function PlaceholderPage({ title, description }: { title: string; description: string }) {
  return (
    <div className="page">
      <Card>
        <h1>{title}</h1>
        <p className="muted">{description}</p>
        <p className="muted">
          Rute ini disiapkan sebagai fondasi dan akan diisi pada tahap fitur yang sesuai. Kembali
          ke <Link to="/dashboard">dasbor</Link>.
        </p>
      </Card>
    </div>
  );
}
