import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SessionContext } from "../app/session.ts";
import { SessionProvider } from "../app/SessionContext.tsx";
import { AttendancePage } from "../features/live/AttendancePage.tsx";
import { LiveLessonDetailPage } from "../features/live/LiveLessonDetailPage.tsx";
import { LiveLessonFormPage } from "../features/live/LiveLessonFormPage.tsx";
import { LiveLessonListPage } from "../features/live/LiveLessonListPage.tsx";
import { formatLiveRange, validateLessonTime } from "../features/live/liveUtils.ts";

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

function mentorSession() {
  return {
    ...tarunaSession(),
    user: { id: "mentor-1", name: "Mentor", email: "mentor@example.com", role: "MENTOR" as const },
    accessToken: "token-mentor",
    hasRole: () => true,
  };
}

function lessonPayload() {
  return {
    id: "live-1",
    title: "Kelas Live Keselamatan",
    description: "Kelas wajib",
    cohortId: "cohort-1",
    mentorId: "mentor-1",
    mentorName: "Mentor Satu",
    startsAt: "2026-11-10T02:00:00.000Z",
    endsAt: "2026-11-10T03:00:00.000Z",
    status: "SCHEDULED" as const,
    isJoinable: true,
    createdAt: "2026-11-01T00:00:00.000Z",
    updatedAt: "2026-11-01T00:00:00.000Z",
  };
}

beforeEach(() => {
  vi.unstubAllGlobals();
});

describe("zona waktu live lesson", () => {
  it("menampilkan jadwal dalam WIB Asia/Jakarta", () => {
    const text = formatLiveRange("2026-11-10T02:00:00.000Z", "2026-11-10T03:00:00.000Z");
    expect(text).toMatch(/WIB/);
    expect(text).toMatch(/09\.00/);
    expect(text).toMatch(/10\.00/);
  });

  it("menolak waktu selesai sebelum mulai", () => {
    expect(validateLessonTime("2026-11-10T10:00", "2026-11-10T09:00")).toMatch(/setelah waktu mulai/i);
  });
});

describe("daftar dan join live lesson", () => {
  it("menampilkan jadwal Taruna dan tombol detail", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse({ data: [lessonPayload()], meta: { page: 1, pageSize: 20, totalItems: 1, totalPages: 1 } }, 200),
      ),
    );
    render(
      <MemoryRouter initialEntries={["/kelas-live"]}>
        <SessionContext.Provider value={tarunaSession()}>
          <LiveLessonListPage />
        </SessionContext.Provider>
      </MemoryRouter>,
    );
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /kelas live keselamatan/i })).toBeInTheDocument();
    });
    expect(screen.getByText(/09\.00/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /detail dan masuk kelas/i })).toHaveAttribute("href", "/kelas-live/live-1");
  });

  it("menampilkan pesan dibatalkan tanpa tombol join", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse({ data: { ...lessonPayload(), status: "CANCELLED", isJoinable: false } }, 200)),
    );
    render(
      <MemoryRouter initialEntries={["/kelas-live/live-1"]}>
        <SessionContext.Provider value={tarunaSession()}>
          <LiveLessonDetailPage liveLessonId="live-1" />
        </SessionContext.Provider>
      </MemoryRouter>,
    );
    await waitFor(() => {
      expect(screen.getByText(/jadwal dibatalkan/i)).toBeInTheDocument();
    });
    expect(screen.queryByRole("button", { name: /masuk kelas/i })).not.toBeInTheDocument();
  });

  it("menampilkan error forbidden join dari backend", async () => {
    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (url.includes("/join")) {
        return Promise.resolve(jsonResponse({ error: { code: "FORBIDDEN", message: "Tidak boleh." } }, 403));
      }
      return Promise.resolve(jsonResponse({ data: lessonPayload() }, 200));
    });
    vi.stubGlobal("fetch", fetchMock);
    render(
      <MemoryRouter initialEntries={["/kelas-live/live-1"]}>
        <SessionContext.Provider value={tarunaSession()}>
          <LiveLessonDetailPage liveLessonId="live-1" />
        </SessionContext.Provider>
      </MemoryRouter>,
    );
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /masuk kelas/i })).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole("button", { name: /masuk kelas/i }));
    await waitFor(() => {
      expect(screen.getByText(/akses ditolak backend/i)).toBeInTheDocument();
    });
    expect(fetchMock.mock.calls.some(([url]) => String(url).includes("/join"))).toBe(true);
  });

  it("tidak menampilkan tautan konferensi mentah", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((url: string) => {
        if (url.includes("/join")) {
          return Promise.resolve(
            jsonResponse({ data: { status: "JOIN_ALLOWED", redirectUrl: "https://provider.invalid/kelas/live-1", attendanceRecorded: true } }, 200),
          );
        }
        return Promise.resolve(jsonResponse({ data: lessonPayload() }, 200));
      }),
    );
    render(
      <MemoryRouter initialEntries={["/kelas-live/live-1"]}>
        <SessionContext.Provider value={tarunaSession()}>
          <LiveLessonDetailPage liveLessonId="live-1" />
        </SessionContext.Provider>
      </MemoryRouter>,
    );
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /masuk kelas/i })).toBeInTheDocument();
    });
    expect(screen.queryByText(/provider\.invalid/i)).not.toBeInTheDocument();
  });
});

describe("form dan pembatalan mentor", () => {
  it("memvalidasi judul dan waktu", async () => {
    render(
      <MemoryRouter initialEntries={["/kelas-live/baru"]}>
        <SessionContext.Provider value={mentorSession()}>
          <LiveLessonFormPage />
        </SessionContext.Provider>
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByRole("button", { name: /simpan jadwal/i }));
    expect(await screen.findByText(/judul kelas wajib diisi/i)).toBeInTheDocument();
  });

  it("meminta konfirmasi sebelum membatalkan kelas", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ data: lessonPayload() }, 200)));
    render(
      <MemoryRouter initialEntries={["/kelas-live/live-1"]}>
        <SessionContext.Provider value={mentorSession()}>
          <LiveLessonDetailPage liveLessonId="live-1" />
        </SessionContext.Provider>
      </MemoryRouter>,
    );
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /batalkan kelas/i })).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole("button", { name: /batalkan kelas/i }));
    expect(screen.getByRole("alertdialog", { name: /batalkan kelas/i })).toBeInTheDocument();
  });
});

describe("absensi live lesson", () => {
  it("menampilkan rekap server dan menyimpan koreksi", async () => {
    const fetchMock = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
      if (url.includes("/attendance/") && init?.method === "PATCH") {
        return Promise.resolve(jsonResponse({ data: { ok: true } }, 200));
      }
      if (url.includes("/attendance")) {
        return Promise.resolve(
          jsonResponse(
            {
              data: [
                {
                  participantId: "part-1",
                  userId: "taruna-1",
                  userName: "Taruna Satu",
                  userEmail: "satu@example.com",
                  status: "PENDING",
                  updatedAt: "2026-11-10T04:00:00.000Z",
                },
              ],
            },
            200,
          ),
        );
      }
      return Promise.resolve(jsonResponse({ data: lessonPayload() }, 200));
    });
    vi.stubGlobal("fetch", fetchMock);
    render(
      <MemoryRouter initialEntries={["/kelas-live/live-1/absensi"]}>
        <SessionContext.Provider value={mentorSession()}>
          <AttendancePage liveLessonId="live-1" />
        </SessionContext.Provider>
      </MemoryRouter>,
    );
    await waitFor(() => {
      expect(screen.getByText(/taruna satu/i)).toBeInTheDocument();
    });
    fireEvent.change(screen.getByLabelText(/status koreksi/i), { target: { value: "PRESENT" } });
    fireEvent.click(screen.getByRole("button", { name: /simpan koreksi/i }));
    await waitFor(() => {
      expect(screen.getByText(/koreksi untuk taruna satu tersimpan/i)).toBeInTheDocument();
    });
    expect(fetchMock.mock.calls.some(([url, init]) => String(url).includes("/attendance/part-1") && init?.method === "PATCH")).toBe(true);
  });

  it("menyembunyikan koreksi dari Taruna sebagai hanya baca", async () => {
    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (url.includes("/attendance")) {
        return Promise.resolve(
          jsonResponse(
            {
              data: [
                {
                  participantId: "part-1",
                  userId: "taruna-1",
                  userName: "Taruna Satu",
                  userEmail: "satu@example.com",
                  status: "PRESENT",
                  updatedAt: "2026-11-10T04:00:00.000Z",
                },
              ],
            },
            200,
          ),
        );
      }
      return Promise.resolve(jsonResponse({ data: lessonPayload() }, 200));
    });
    vi.stubGlobal("fetch", fetchMock);
    render(
      <MemoryRouter initialEntries={["/kelas-live/live-1/absensi"]}>
        <SessionProvider>
          <AttendancePage liveLessonId="live-1" />
        </SessionProvider>
      </MemoryRouter>,
    );
    expect(screen.queryByRole("button", { name: /simpan koreksi/i })).not.toBeInTheDocument();
  });
});
