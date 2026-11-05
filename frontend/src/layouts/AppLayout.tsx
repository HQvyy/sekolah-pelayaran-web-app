import { Link, NavLink } from "react-router-dom";
import { LogoutButton } from "../features/auth/LogoutButton.tsx";
import { useSession } from "../app/useSession.ts";
import type { UserRole } from "../types/api.ts";

interface NavItem {
  to: string;
  label: string;
  roles?: UserRole[];
  end?: boolean;
}

const PUBLIC_NAV: NavItem[] = [
  { to: "/login", label: "Masuk" },
  { to: "/register", label: "Pendaftaran Taruna" },
];

const APP_NAV: NavItem[] = [
  { to: "/dashboard", label: "Dasbor", end: true },
  { to: "/belajar", label: "Pembelajaran" },
  { to: "/konten", label: "Kelola Konten", roles: ["ADMIN", "SUPERADMIN", "MENTOR"] },
  { to: "/kelas-live", label: "Kelas Live" },
  { to: "/asesmen", label: "Asesmen" },
  { to: "/progres", label: "Progres", roles: ["TARUNA"] },
  { to: "/rating", label: "Rating", roles: ["TARUNA"] },
  { to: "/sertifikat", label: "Sertifikat", roles: ["TARUNA"] },
  { to: "/tiket", label: "Tiket Bantuan" },
  { to: "/enrollment-saya", label: "Enrollment Saya", roles: ["TARUNA"] },
  { to: "/admin/pengguna", label: "Pengguna", roles: ["ADMIN", "SUPERADMIN"] },
  { to: "/admin/angkatan", label: "Angkatan", roles: ["ADMIN", "SUPERADMIN"] },
  { to: "/admin/impor", label: "Impor Akun", roles: ["ADMIN", "SUPERADMIN"] },
  { to: "/mentor/koreksi-esai", label: "Koreksi Esai", roles: ["MENTOR", "ADMIN", "SUPERADMIN"] },
];

export function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="app-shell">
      <a className="skip-link" href="#konten">
        Lewati ke konten
      </a>
      <header className="app-header">
        <div className="app-header-inner">
          <Link className="brand" to="/">
            <span className="brand-badge" aria-hidden="true">
              SP
            </span>
            <span>
              <span className="brand-title">Sekolah Pelaut Indonesia</span>
              <p className="brand-subtitle">Platform pembelajaran taruna maritim</p>
            </span>
          </Link>
          <nav aria-label="Navigasi publik" className="header-meta">
            {PUBLIC_NAV.map((item) => (
              <NavLink key={item.to} to={item.to} className="nav-link" style={{ color: "#fff" }}>
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>
      <main id="konten" className="app-body" style={{ gridTemplateColumns: "minmax(0, 1fr)" }}>
        <div className="app-main">{children}</div>
      </main>
      <footer className="footer">
        <div className="footer-inner">
          <span>Sekolah Pelaut Indonesia</span>
          <span>Fondasi UI tahap 1, bukan layanan production final.</span>
        </div>
      </footer>
    </div>
  );
}

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { user } = useSession();
  const visibleNav = APP_NAV.filter((item) => {
    if (!item.roles) return true;
    if (!user) return true;
    return item.roles.includes(user.role);
  });

  return (
    <div className="app-shell">
      <a className="skip-link" href="#konten">
        Lewati ke konten
      </a>
      <header className="app-header">
        <div className="app-header-inner">
          <Link className="brand" to="/dashboard">
            <span className="brand-badge" aria-hidden="true">
              SP
            </span>
            <span>
              <span className="brand-title">Sekolah Pelaut Indonesia</span>
              <p className="brand-subtitle">Dasbor pembelajaran</p>
            </span>
          </Link>
          <div className="header-meta">
            <span className="brand-subtitle">
              {user ? `${user.name ?? user.email} (${user.role})` : "Belum masuk"}
            </span>
            <LogoutButton />
          </div>
        </div>
      </header>
      <div className="app-body">
        <nav className="app-nav" aria-label="Navigasi utama">
          <h2>Menu</h2>
          <ul>
            {visibleNav.map((item) => (
              <li key={item.to}>
                <NavLink to={item.to} end={item.end} className="nav-link">
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
          <p className="nav-note">
            Menu menyesuaikan peran untuk UX. Otorisasi tetap dilakukan backend pada setiap request.
          </p>
        </nav>
        <main id="konten" className="app-main">
          {children}
        </main>
      </div>
      <footer className="footer">
        <div className="footer-inner">
          <span>Sekolah Pelaut Indonesia</span>
          <span>Gunakan Bahasa Indonesia dan patuhi hak akses backend.</span>
        </div>
      </footer>
    </div>
  );
}
