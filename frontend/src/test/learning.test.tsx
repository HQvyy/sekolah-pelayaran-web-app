import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SessionContext } from "../app/session.ts";
import { CategoryListPage } from "../features/learning/CategoryPages.tsx";
import { CourseDetailPage } from "../features/learning/CourseDetailPage.tsx";
import { MaterialDetailPage, VideoPlayer } from "../features/learning/MaterialPages.tsx";
import { validateThumbnailFile } from "../features/learning/learningValidation.ts";

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
    hasRole: () => true,
  };
}

beforeEach(() => {
  vi.unstubAllGlobals();
});

describe("navigasi pembelajaran", () => {
  it("menampilkan daftar kategori sesuai enrollment", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse(
          {
            data: [{ id: "cat-1", name: "Tanker", description: "Kapal tanker", status: "ACTIVE", createdAt: "2026-01-01T00:00:00Z" }],
            meta: { page: 1, pageSize: 20, totalItems: 1, totalPages: 1 },
          },
          200,
        ),
      ),
    );
    render(
      <MemoryRouter initialEntries={["/belajar"]}>
        <SessionContext.Provider value={tarunaSession()}>
          <CategoryListPage />
        </SessionContext.Provider>
      </MemoryRouter>,
    );
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /tanker/i })).toBeInTheDocument();
    });
    expect(screen.getByRole("link", { name: /buka kursus/i })).toHaveAttribute("href", "/belajar/kategori/cat-1");
  });

  it("menampilkan empty state bila belum ada kategori", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse({ data: [], meta: { page: 1, pageSize: 20, totalItems: 0, totalPages: 0 } }, 200)),
    );
    render(
      <MemoryRouter initialEntries={["/belajar"]}>
        <SessionContext.Provider value={tarunaSession()}>
          <CategoryListPage />
        </SessionContext.Provider>
      </MemoryRouter>,
    );
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /belum ada kategori/i })).toBeInTheDocument();
    });
  });

  it("menyembunyikan aksi kelola dari Taruna sebagai UX", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse(
          {
            data: [{ id: "cat-1", name: "Tanker", status: "ACTIVE", createdAt: "2026-01-01T00:00:00Z" }],
            meta: { page: 1, pageSize: 20, totalItems: 1, totalPages: 1 },
          },
          200,
        ),
      ),
    );
    render(
      <MemoryRouter initialEntries={["/belajar"]}>
        <SessionContext.Provider value={tarunaSession()}>
          <CategoryListPage />
        </SessionContext.Provider>
      </MemoryRouter>,
    );
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /tanker/i })).toBeInTheDocument();
    });
    expect(screen.queryByRole("link", { name: /tambah kategori/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /ubah/i })).not.toBeInTheDocument();
  });

  it("menampilkan error 403 tanpa memutar video", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse({ error: { code: "FORBIDDEN", message: "Tidak boleh." } }, 403)),
    );
    render(
      <MemoryRouter initialEntries={["/belajar/kursus/course-1"]}>
        <SessionContext.Provider value={tarunaSession()}>
          <CourseDetailPage courseId="course-1" />
        </SessionContext.Provider>
      </MemoryRouter>,
    );
    await waitFor(() => {
      expect(screen.getByText(/akun ini tidak memiliki akses kursus/i)).toBeInTheDocument();
    });
    expect(screen.queryByLabelText(/video /i)).not.toBeInTheDocument();
  });
});

describe("materi dan playback", () => {
  it("menampilkan pesan expired bila token playback kedaluwarsa", async () => {
    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (url.includes("/materials/")) {
        return Promise.resolve(
          jsonResponse(
            {
              data: {
                id: "mat-1",
                chapterId: "ch-1",
                title: "Materi Tanker 1",
                type: "VIDEO",
                status: "ACTIVE",
                isLocked: false,
                isCompleted: false,
                videoId: "vid-1",
                createdAt: "2026-01-01T00:00:00Z",
              },
            },
            200,
          ),
        );
      }
      return Promise.resolve(
        jsonResponse({ data: { playbackUrl: "https://contoh.invalid/video.m3u8", expiresAt: new Date().toISOString(), status: "EXPIRED" } }, 200),
      );
    });
    vi.stubGlobal("fetch", fetchMock);
    render(
      <MemoryRouter initialEntries={["/belajar/materi/mat-1"]}>
        <SessionContext.Provider value={tarunaSession()}>
          <MaterialDetailPage materialId="mat-1" />
        </SessionContext.Provider>
      </MemoryRouter>,
    );
    await waitFor(() => {
      expect(screen.getByText(/token playback kedaluwarsa/i)).toBeInTheDocument();
    });
    expect(screen.queryByLabelText(/video materi/i)).not.toBeInTheDocument();
  });

  it("menampilkan state gagal bila video error", () => {
    render(<VideoPlayer playbackUrl="https://contoh.invalid/video.m3u8" title="Contoh" />);
    const video = screen.getByLabelText(/video contoh/i) as HTMLVideoElement;
    fireEvent.error(video);
    expect(screen.getByRole("heading", { name: /video gagal diputar/i })).toBeInTheDocument();
  });

  it("menampilkan aksi kelola untuk Admin", async () => {
    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (url.includes("/materials/")) {
        return Promise.resolve(
          jsonResponse(
            {
              data: {
                id: "mat-1",
                chapterId: "ch-1",
                title: "Materi Tanker 1",
                type: "VIDEO",
                status: "ACTIVE",
                isLocked: false,
                isCompleted: true,
                createdAt: "2026-01-01T00:00:00Z",
              },
            },
            200,
          ),
        );
      }
      return Promise.resolve(jsonResponse({ error: { code: "NOT_FOUND", message: "Tidak ada." } }, 404));
    });
    vi.stubGlobal("fetch", fetchMock);
    render(
      <MemoryRouter initialEntries={["/belajar/materi/mat-1"]}>
        <SessionContext.Provider value={adminSession()}>
          <MaterialDetailPage materialId="mat-1" />
        </SessionContext.Provider>
      </MemoryRouter>,
    );
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /materi tanker 1/i })).toBeInTheDocument();
    });
    expect(screen.getByRole("link", { name: /ubah materi/i })).toBeInTheDocument();
  });
});

describe("validasi thumbnail", () => {
  it("menolak tipe selain JPG atau PNG", async () => {
    const file = new File(["x"], "thumb.gif", { type: "image/gif" });
    const result = await validateThumbnailFile(file);
    expect(result.ok).toBe(false);
    expect(result.message).toMatch(/jpg atau png/i);
  });

  it("menolak ukuran di atas 2 MB", async () => {
    const bytes = new Uint8Array(2 * 1024 * 1024 + 1);
    const file = new File([bytes], "thumb.png", { type: "image/png" });
    const result = await validateThumbnailFile(file);
    expect(result.ok).toBe(false);
    expect(result.message).toMatch(/2 mb/i);
  });
});
