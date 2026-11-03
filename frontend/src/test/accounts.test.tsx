import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SessionProvider } from "../app/SessionContext.tsx";
import { SessionContext } from "../app/session.ts";
import { CohortFormPage, CohortListPage } from "../features/accounts/CohortPages.tsx";
import { UserImportPage } from "../features/accounts/UserImportPage.tsx";
import { UserListPage } from "../features/accounts/UserPages.tsx";

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function adminSession() {
  return {
    user: { id: "admin-1", name: "Admin", email: "admin@example.com", role: "ADMIN" as const },
    accessToken: "token-admin",
    authChallengeId: null,
    sessionExpired: false,
    setSession: vi.fn(),
    clearSession: vi.fn(),
    startChallenge: vi.fn(),
    markSessionExpired: vi.fn(),
    loadMe: vi.fn(),
    hasRole: () => true,
  };
}

function renderWithSession(ui: React.ReactNode) {
  return render(
    <MemoryRouter initialEntries={["/admin/pengguna"]}>
      <SessionContext.Provider value={adminSession()}>
        {ui}
      </SessionContext.Provider>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.unstubAllGlobals();
});

describe("halaman pengguna", () => {
  it("memfilter daftar dan menampilkan pagination dari meta backend", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse(
        {
          data: [
            { id: "1", name: "Taruna Satu", email: "satu@example.com", role: "TARUNA", status: "PENDING_VERIFICATION" },
          ],
          meta: { page: 1, pageSize: 20, totalItems: 1, totalPages: 3 },
        },
        200,
      ),
    );
    vi.stubGlobal("fetch", fetchMock);
    renderWithSession(<UserListPage />);

    await waitFor(() => {
      expect(screen.getByText(/taruna satu/i)).toBeInTheDocument();
    });
    expect(screen.getAllByText(/halaman 1 dari 3/i).length).toBeGreaterThan(0);

    fireEvent.change(screen.getByLabelText(/pencarian nama atau email/i), { target: { value: "satu" } });
    fireEvent.click(screen.getByRole("button", { name: /terapkan filter/i }));
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });
    expect(fetchMock.mock.calls[1][0]).toContain("search=satu");
  });

  it("menampilkan error 403 apa adanya", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse({ error: { code: "FORBIDDEN", message: "Tidak boleh." } }, 403)),
    );
    renderWithSession(<UserListPage />);
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /akses ditolak/i })).toBeInTheDocument();
    });
  });

  it("menampilkan sesi berakhir pada 401", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse({ error: { code: "UNAUTHENTICATED", message: "Sesi habis." } }, 401)),
    );
    renderWithSession(<UserListPage />);
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /sesi berakhir/i })).toBeInTheDocument();
    });
  });
});

describe("halaman impor akun", () => {
  it("menolak berkas bukan xlsx", async () => {
    render(
      <MemoryRouter initialEntries={["/admin/impor"]}>
        <SessionProvider>
          <UserImportPage />
        </SessionProvider>
      </MemoryRouter>,
    );
    const input = screen.getByLabelText(/berkas .xlsx/i) as HTMLInputElement;
    const file = new File(["a,b"], "akun.csv", { type: "text/csv" });
    fireEvent.change(input, { target: { files: [file] } });
    fireEvent.click(screen.getByRole("button", { name: /unggah dan proses/i }));
    expect(screen.getByText(/harus .xlsx/i)).toBeInTheDocument();
  });

  it("menampilkan ringkasan sukses atau gagal dari server", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse(
          { data: { importId: "imp-1", totalRows: 10, successRows: 8, failedRows: 2, logDownloadUrl: "/log.xlsx" } },
          200,
        ),
      ),
    );
    render(
      <MemoryRouter initialEntries={["/admin/impor"]}>
        <SessionContext.Provider value={adminSession()}>
          <UserImportPage />
        </SessionContext.Provider>
      </MemoryRouter>,
    );
    const input = screen.getByLabelText(/berkas .xlsx/i) as HTMLInputElement;
    const file = new File(["xlsx"], "akun.xlsx", {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    fireEvent.change(input, { target: { files: [file] } });
    fireEvent.click(screen.getByRole("button", { name: /unggah dan proses/i }));
    await waitFor(() => {
      expect(screen.getByText(/8 berhasil, 2 gagal/i)).toBeInTheDocument();
      expect(screen.getByRole("link", { name: /unduh berkas log perbaikan/i })).toBeInTheDocument();
    });
  });
});

describe("halaman Angkatan", () => {
  it("memvalidasi nama wajib diisi", async () => {
    render(
      <MemoryRouter initialEntries={["/admin/angkatan/baru"]}>
        <SessionContext.Provider value={adminSession()}>
          <CohortFormPage />
        </SessionContext.Provider>
      </MemoryRouter>,
    );
    const form = screen.getByRole("form", { name: /formulir angkatan/i });
    fireEvent.click(within(form).getByRole("button", { name: /simpan angkatan/i }));
    expect(await screen.findByText(/nama angkatan wajib diisi/i)).toBeInTheDocument();
  });

  it("menampilkan daftar Angkatan dan pagination", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse(
          {
            data: [{ id: "c1", name: "Angkatan 2026 A", status: "ACTIVE", createdAt: "2026-01-01T00:00:00Z" }],
            meta: { page: 1, pageSize: 20, totalItems: 1, totalPages: 1 },
          },
          200,
        ),
      ),
    );
    renderWithSession(<CohortListPage />);
    await waitFor(() => {
      expect(screen.getByText(/angkatan 2026 a/i)).toBeInTheDocument();
    });
  });
});
