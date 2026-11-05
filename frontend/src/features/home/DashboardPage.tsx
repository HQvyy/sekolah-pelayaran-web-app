import { Link } from "react-router-dom";
import { ButtonLink, Card, InfoAlert } from "../../components/ui.tsx";
import { useSession } from "../../app/useSession.ts";

interface DashboardLink {
  to: string;
  title: string;
  description: string;
}

const ROLE_LINKS: Record<string, DashboardLink[]> = {
  TARUNA: [
    { to: "/belajar", title: "Pembelajaran", description: "Materi kategori kapal, kursus, bab, dan video sesuai enrollment." },
    { to: "/kelas-live", title: "Kelas Live", description: "Jadwal kelas dan tombol Masuk Kelas untuk peserta terdaftar." },
    { to: "/asesmen", title: "Asesmen", description: "Daftar assessment, attempt CBT, hasil, dan status penilaian." },
    { to: "/progres", title: "Progres", description: "Progres materi dan level dari respons backend." },
    { to: "/rating", title: "Rating", description: "Beri dan kelola rating kelas atau mentor." },
    { to: "/sertifikat", title: "Sertifikat", description: "Daftar dan unduh sertifikat program internal." },
    { to: "/tiket", title: "Tiket Bantuan", description: "Buat dan pantau tiket milik sendiri." },
  ],
  MENTOR: [
    { to: "/kelas-live", title: "Kelas Live", description: "Jadwal kelas yang ditugaskan dan rekap kehadiran." },
    { to: "/mentor/koreksi-esai", title: "Koreksi Esai", description: "Antrean penilaian esai sesuai assignment." },
    { to: "/asesmen", title: "Pemantauan Asesmen", description: "Hasil peserta yang berwenang diakses." },
  ],
  ADMIN: [
    { to: "/admin/pengguna", title: "Pengguna", description: "Daftar, verifikasi, dan impor Taruna." },
    { to: "/admin/angkatan", title: "Angkatan", description: "Kelola Angkatan atau Kelas dan enrollment." },
    { to: "/admin/impor", title: "Impor Akun", description: "Impor .xlsx maksimal 500 baris dengan log perbaikan." },
    { to: "/kelas-live", title: "Kelas Live", description: "Jadwal operasional dan absensi." },
    { to: "/tiket", title: "Tiket Bantuan", description: "Dukungan operasional sesuai izin." },
  ],
  SUPERADMIN: [
    { to: "/admin/pengguna", title: "Pengguna dan Hak Akses", description: "Kelola akun dan hak akses utama sesuai audit." },
    { to: "/admin/angkatan", title: "Angkatan", description: "Kelola Angkatan atau Kelas dan enrollment." },
    { to: "/admin/impor", title: "Impor Akun", description: "Impor .xlsx maksimal 500 baris dengan log perbaikan." },
    { to: "/tiket", title: "Tiket Bantuan", description: "Administrasi tiket dan riwayat penanganan." },
  ],
};

export function DashboardPage() {
  const { user } = useSession();
  const role = user?.role ?? "TARUNA";
  const links = ROLE_LINKS[role] ?? ROLE_LINKS.TARUNA;

  return (
    <div className="page">
      <Card>
        <h1>
          Dasbor {role === "TARUNA" ? "Taruna" : role === "MENTOR" ? "Mentor" : role === "ADMIN" ? "Admin" : "Superadmin"}
        </h1>
        <p className="muted">
          {user
            ? `Masuk sebagai ${user.name ?? user.email} (${user.role}). Halaman ini hanya menampilkan navigasi sesuai peran. Angka ringkasan menunggu endpoint backend final dan tidak dikarang di frontend.`
            : "Masuk untuk melihat dasbor sesuai peran. Guard ini hanya UX, otorisasi resmi tetap di backend."}
        </p>
        {!user ? (
          <div className="button-row">
            <ButtonLink to="/login" variant="primary">
              Masuk
            </ButtonLink>
          </div>
        ) : null}
      </Card>
      <div className="grid-two">
        {links.map((link) => (
          <Card key={link.to + link.title}>
            <h2>{link.title}</h2>
            <p className="muted">{link.description}</p>
            <div className="button-row">
              <ButtonLink to={link.to}>Buka</ButtonLink>
            </div>
          </Card>
        ))}
      </div>
      <InfoAlert>
        Tidak ada KPI, progres, nilai, atau status yang ditampilkan sebelum backend menyediakan data
        resmi. Kembali ke <Link to="/komponen">pratinjau komponen</Link> bila perlu.
      </InfoAlert>
    </div>
  );
}
