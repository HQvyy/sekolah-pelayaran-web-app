import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SessionContext } from "../app/session.ts";
import { MyProgressPage } from "../features/services/ProgressPage.tsx";
import { RatingPage } from "../features/services/RatingPage.tsx";
import { CertificateDetailPage, CertificateListPage } from "../features/services/CertificatePages.tsx";
import { TicketDetailPage, TicketFormPage, TicketListPage } from "../features/services/TicketPages.tsx";
import { assertRatingScore } from "../features/services/serviceHub.ts";
import { isEditableRating } from "../features/services/serviceUtils.ts";

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function tarunaSession() {
  return {
    user: { id: "taruna-1", name: "Taruna", email: "taruna@example.com", role: "TARUNA" as const },
    accessToken: "token-taruna",
    authChallengeId: null,
    sessionExpired: false,
    setSession: vi.fn(),
    clearSession: vi.fn(),
    startChallenge: vi.fn(),
    markSessionExpired: vi.fn(),
    loadMe: vi.fn(),
    hasRole: () => false,
  };
}

function adminSession() {
  return {
    ...tarunaSession(),
    user: { id: "admin-1", name: "Admin", email: "admin@example.com", role: "ADMIN" as const },
    accessToken: "token-admin",
    hasRole: () => true,
  };
}

beforeEach(() => {
  vi.unstubAllGlobals();
});

describe("aturan rating", () => {
  it("menolak skor di luar 1 sampai 5", () => {
    expect(() => assertRatingScore(0)).toThrow(/1 sampai 5/i);
    expect(() => assertRatingScore(6)).toThrow(/1 sampai 5/i);
  });

  it("menolak edit kedua dan edit lewat batas waktu", () => {
    expect(isEditableRating(1, new Date(Date.now() + 86400000).toISOString())).toBe(false);
    expect(isEditableRating(0, new Date(Date.now() - 1000).toISOString())).toBe(false);
    expect(isEditableRating(0, new Date(Date.now() + 86400000).toISOString())).toBe(true);
  });
});

describe("progres Taruna", () => {
  it("menampilkan angka dari backend tanpa perhitungan lokal", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse(
          { data: { completedMaterials: 3, totalMaterials: 10, completedAssessments: 1, totalAssessments: 5, percent: 30, unlockedLevel: 2 } },
          200,
        ),
      ),
    );
    render(
      <MemoryRouter initialEntries={["/progres"]}>
        <SessionContext.Provider value={tarunaSession()}>
          <MyProgressPage />
        </SessionContext.Provider>
      </MemoryRouter>,
    );
    await waitFor(() => {
      expect(screen.getByText(/materi selesai 3 dari 10/i)).toBeInTheDocument();
    });
    expect(screen.getByText(/progres keseluruhan: 30 persen/i)).toBeInTheDocument();
  });
});

describe("rating dan feedback", () => {
  it("memvalidasi rating 1 sampai 5", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ data: [] }, 200)));
    render(
      <MemoryRouter initialEntries={["/rating"]}>
        <SessionContext.Provider value={tarunaSession()}>
          <RatingPage />
        </SessionContext.Provider>
      </MemoryRouter>,
    );
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /belum ada rating/i })).toBeInTheDocument();
    });
  });

  it("menampilkan batas edit satu kali dalam 7 hari", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse(
          {
            data: [
              {
                id: "rating-1",
                score: 5,
                feedback: "Bagus",
                createdAt: "2026-11-01T00:00:00.000Z",
                updatedAt: "2026-11-01T00:00:00.000Z",
                editableUntil: new Date(Date.now() - 1000).toISOString(),
                editCount: 1,
              },
            ],
          },
          200,
        ),
      ),
    );
    render(
      <MemoryRouter initialEntries={["/rating"]}>
        <SessionContext.Provider value={tarunaSession()}>
          <RatingPage />
        </SessionContext.Provider>
      </MemoryRouter>,
    );
    await waitFor(() => {
      expect(screen.getByText(/batas edit tercapai/i)).toBeInTheDocument();
    });
  });
});

describe("sertifikat internal", () => {
  it("menampilkan disclaimer bukan STCW", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse(
          {
            data: [{ id: "cert-1", certificateNumber: "SPLI-1", title: "Dasar Pelayaran", issuedAt: "2026-11-01T00:00:00.000Z" }],
          },
          200,
        ),
      ),
    );
    render(
      <MemoryRouter initialEntries={["/sertifikat"]}>
        <SessionContext.Provider value={tarunaSession()}>
          <CertificateListPage />
        </SessionContext.Provider>
      </MemoryRouter>,
    );
    await waitFor(() => {
      expect(screen.getByText(/bukan sertifikat resmi stcw/i)).toBeInTheDocument();
    });
    expect(screen.queryByRole("link", { name: /verifikasi/i })).not.toBeInTheDocument();
  });

  it("menyembunyikan unduhan saat 403", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse({ error: { code: "FORBIDDEN", message: "Tidak boleh." } }, 403)),
    );
    render(
      <MemoryRouter initialEntries={["/sertifikat/cert-1"]}>
        <SessionContext.Provider value={tarunaSession()}>
          <CertificateDetailPage certificateId="cert-1" />
        </SessionContext.Provider>
      </MemoryRouter>,
    );
    await waitFor(() => {
      expect(screen.getByText(/akses sertifikat/i)).toBeInTheDocument();
    });
    expect(screen.queryByRole("link", { name: /unduh pdf/i })).not.toBeInTheDocument();
  });
});

describe("ticketing dan izin", () => {
  it("membuat tiket dengan validasi judul dan deskripsi", async () => {
    render(
      <MemoryRouter initialEntries={["/tiket/baru"]}>
        <SessionContext.Provider value={tarunaSession()}>
          <TicketFormPage />
        </SessionContext.Provider>
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByRole("button", { name: /kirim tiket/i }));
    expect(await screen.findByText(/judul tiket wajib diisi/i)).toBeInTheDocument();
  });

  it("menolak tiket lintas pengguna dengan 403", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse({ error: { code: "FORBIDDEN", message: "Bukan milikmu." } }, 403)),
    );
    render(
      <MemoryRouter initialEntries={["/tiket/ticket-1"]}>
        <SessionContext.Provider value={tarunaSession()}>
          <TicketDetailPage ticketId="ticket-1" />
        </SessionContext.Provider>
      </MemoryRouter>,
    );
    await waitFor(() => {
      expect(screen.getByText(/tiket lintas pengguna ditolak/i)).toBeInTheDocument();
    });
  });

  it("menampilkan konfirmasi sebelum ubah status", async () => {
    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (url.includes("/history")) return Promise.resolve(jsonResponse({ data: [] }, 200));
      return Promise.resolve(
        jsonResponse(
          {
            data: {
              id: "ticket-1",
              title: "Video macet",
              description: "Tidak bisa diputar",
              status: "OPEN",
              ownerId: "taruna-1",
              createdAt: "2026-11-01T00:00:00.000Z",
              updatedAt: "2026-11-01T00:00:00.000Z",
            },
          },
          200,
        ),
      );
    });
    vi.stubGlobal("fetch", fetchMock);
    render(
      <MemoryRouter initialEntries={["/tiket/ticket-1"]}>
        <SessionContext.Provider value={adminSession()}>
          <TicketDetailPage ticketId="ticket-1" />
        </SessionContext.Provider>
      </MemoryRouter>,
    );
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /video macet/i })).toBeInTheDocument();
    });
    fireEvent.change(screen.getByLabelText(/ubah status/i), { target: { value: "RESOLVED" } });
    fireEvent.click(screen.getByRole("button", { name: /simpan status/i }));
    expect(screen.getByRole("alertdialog", { name: /ubah status tiket/i })).toBeInTheDocument();
  });

  it("menampilkan daftar tiket dengan status backend", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse(
          {
            data: [
              {
                id: "ticket-1",
                title: "Video macet",
                description: "Tidak bisa diputar",
                status: "IN_PROGRESS",
                ownerId: "taruna-1",
                createdAt: "2026-11-01T00:00:00.000Z",
                updatedAt: "2026-11-01T00:00:00.000Z",
              },
            ],
            meta: { page: 1, pageSize: 20, totalItems: 1, totalPages: 1 },
          },
          200,
        ),
      ),
    );
    render(
      <MemoryRouter initialEntries={["/tiket"]}>
        <SessionContext.Provider value={tarunaSession()}>
          <TicketListPage />
        </SessionContext.Provider>
      </MemoryRouter>,
    );
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /video macet/i })).toBeInTheDocument();
    });
    expect(screen.getByText(/in progress/i, { selector: "span" })).toBeInTheDocument();
  });
});
