import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { SessionProvider } from "../app/SessionContext.tsx";
import { AppRoutes } from "../routes/AppRoutes.tsx";

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <SessionProvider>
        <AppRoutes />
      </SessionProvider>
    </MemoryRouter>,
  );
}

describe("routing autentikasi", () => {
  it("menampilkan beranda publik", () => {
    renderAt("/");
    expect(screen.getByRole("heading", { name: /fondasi aplikasi/i })).toBeInTheDocument();
  });

  it("menampilkan halaman masuk", () => {
    renderAt("/login");
    expect(screen.getByRole("form", { name: /formulir masuk/i })).toBeInTheDocument();
  });

  it("menampilkan pendaftaran Taruna tanpa pilihan signup peran lain", () => {
    renderAt("/register");
    expect(screen.getByRole("heading", { name: /pendaftaran taruna/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /daftar sebagai taruna/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /daftar sebagai admin/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /daftar sebagai mentor/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /daftar sebagai superadmin/i })).not.toBeInTheDocument();
  });

  it("mengarahkan dasbor tanpa sesi ke halaman masuk", () => {
    renderAt("/dashboard");
    expect(screen.getAllByRole("form", { name: /formulir masuk/i }).length).toBeGreaterThan(0);
  });

  it("mengarahkan rute admin tanpa sesi ke halaman masuk", () => {
    renderAt("/admin/pengguna");
    expect(screen.getAllByRole("form", { name: /formulir masuk/i }).length).toBeGreaterThan(0);
  });

  it("menampilkan halaman 404 untuk rute tak dikenal", () => {
    renderAt("/rute-tidak-ada");
    expect(screen.getByRole("heading", { name: /tidak ditemukan/i })).toBeInTheDocument();
  });
});

describe("routing akun tahap 3", () => {
  it("mengarahkan impor akun tanpa sesi ke halaman masuk", () => {
    renderAt("/admin/impor");
    expect(screen.getAllByRole("form", { name: /formulir masuk/i }).length).toBeGreaterThan(0);
  });

  it("mengarahkan enrollment Taruna tanpa sesi ke halaman masuk", () => {
    renderAt("/enrollment-saya");
    expect(screen.getAllByRole("form", { name: /formulir masuk/i }).length).toBeGreaterThan(0);
  });
});

describe("routing pembelajaran tahap 4", () => {
  it("mengarahkan pembelajaran tanpa sesi ke halaman masuk", () => {
    renderAt("/belajar");
    expect(screen.getAllByRole("form", { name: /formulir masuk/i }).length).toBeGreaterThan(0);
  });

  it("mengarahkan kelola konten tanpa sesi ke halaman masuk", () => {
    renderAt("/konten");
    expect(screen.getAllByRole("form", { name: /formulir masuk/i }).length).toBeGreaterThan(0);
  });
});

describe("routing live lesson tahap 5", () => {
  it("mengarahkan detail live tanpa sesi ke halaman masuk", () => {
    renderAt("/kelas-live/live-1");
    expect(screen.getAllByRole("form", { name: /formulir masuk/i }).length).toBeGreaterThan(0);
  });

  it("mengarahkan absensi tanpa sesi ke halaman masuk", () => {
    renderAt("/kelas-live/live-1/absensi");
    expect(screen.getAllByRole("form", { name: /formulir masuk/i }).length).toBeGreaterThan(0);
  });
});

describe("routing CBT tahap 6", () => {
  it("mengarahkan attempt tanpa sesi ke halaman masuk", () => {
    renderAt("/asesmen/attempt/attempt-1");
    expect(screen.getAllByRole("form", { name: /formulir masuk/i }).length).toBeGreaterThan(0);
  });

  it("mengarahkan grading tanpa sesi ke halaman masuk", () => {
    renderAt("/mentor/koreksi-esai");
    expect(screen.getAllByRole("form", { name: /formulir masuk/i }).length).toBeGreaterThan(0);
  });
});

describe("routing layanan tahap 7", () => {
  it("mengarahkan progres tanpa sesi ke halaman masuk", () => {
    renderAt("/progres");
    expect(screen.getAllByRole("form", { name: /formulir masuk/i }).length).toBeGreaterThan(0);
  });

  it("mengarahkan tiket tanpa sesi ke halaman masuk", () => {
    renderAt("/tiket");
    expect(screen.getAllByRole("form", { name: /formulir masuk/i }).length).toBeGreaterThan(0);
  });
});
