import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SessionContext } from "../app/session.ts";
import { AssessmentListPage } from "../features/cbt/AssessmentListPage.tsx";
import { AttemptPage } from "../features/cbt/AttemptPage.tsx";
import { EssayGradingPage } from "../features/cbt/EssayGradingPage.tsx";
import { assertNoAnswerKey } from "../features/cbt/cbtService.ts";
import { formatDuration, remainingSeconds } from "../features/cbt/cbtUtils.ts";

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

function attemptPayload() {
  return {
    attemptId: "attempt-1",
    assessmentId: "assessment-1",
    status: "IN_PROGRESS" as const,
    serverNow: new Date(Date.now()).toISOString(),
    startedAt: new Date(Date.now() - 60_000).toISOString(),
    expiresAt: new Date(Date.now() + 30 * 60_000).toISOString(),
    questions: [
      { questionId: "q1", type: "MULTIPLE_CHOICE" as const, prompt: "Ibukota pelayaran?", options: [{ id: "a", label: "Jakarta" }, { id: "b", label: "Surabaya" }] },
      { questionId: "q2", type: "ESSAY" as const, prompt: "Jelaskan keselamatan." },
    ],
  };
}

beforeEach(() => {
  vi.unstubAllGlobals();
});

describe("util timer CBT", () => {
  it("menghitung sisa waktu dari timestamp server", () => {
    expect(remainingSeconds("2026-11-10T07:00:00Z", "2026-11-10T07:30:00Z")).toBe(1800);
    expect(formatDuration(65)).toBe("01:05");
  });

  it("menolak payload berisi answer key", () => {
    expect(() => assertNoAnswerKey({ answer: "a", answerKey: "a" })).toThrow(/kunci jawaban/i);
  });
});

describe("navigasi assessment", () => {
  it("menampilkan daftar level tanpa angka final", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse(
          {
            data: [{ id: "assessment-1", title: "Level 1 Tanker", description: "Dasar", level: 1, durationMinutes: 45, status: "ACTIVE", createdAt: "2026-01-01T00:00:00Z" }],
            meta: { page: 1, pageSize: 20, totalItems: 1, totalPages: 1 },
          },
          200,
        ),
      ),
    );
    render(
      <MemoryRouter initialEntries={["/asesmen"]}>
        <SessionContext.Provider value={tarunaSession()}>
          <AssessmentListPage />
        </SessionContext.Provider>
      </MemoryRouter>,
    );
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /level 1 tanker/i })).toBeInTheDocument();
    });
    expect(screen.getByText(/masih perlu konfirmasi/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /instruksi dan mulai/i })).toHaveAttribute("href", "/asesmen/assessment-1");
  });

  it("membuka layar attempt dan navigasi soal", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ data: attemptPayload() }, 200)));
    render(
      <MemoryRouter initialEntries={["/asesmen/attempt/attempt-1"]}>
        <SessionContext.Provider value={tarunaSession()}>
          <AttemptPage attemptId="attempt-1" />
        </SessionContext.Provider>
      </MemoryRouter>,
    );
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /attempt cbt/i })).toBeInTheDocument();
    });
    expect(screen.getByRole("timer")).toHaveTextContent(/sisa waktu server/i);
    fireEvent.click(screen.getByRole("button", { name: /soal 2/i }));
    expect(screen.getByLabelText(/soal 2 esai/i)).toBeInTheDocument();
  });

  it("menampilkan konfirmasi sebelum submit", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ data: attemptPayload() }, 200)));
    render(
      <MemoryRouter initialEntries={["/asesmen/attempt/attempt-1"]}>
        <SessionContext.Provider value={tarunaSession()}>
          <AttemptPage attemptId="attempt-1" />
        </SessionContext.Provider>
      </MemoryRouter>,
    );
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /submit final/i })).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole("button", { name: /submit final/i }));
    expect(screen.getByRole("alertdialog", { name: /submit attempt/i })).toBeInTheDocument();
  });

  it("menampilkan status expired dari server", async () => {
    const expired = {
      ...attemptPayload(),
      status: "EXPIRED" as const,
      serverNow: new Date(Date.now()).toISOString(),
      expiresAt: new Date(Date.now() - 1000).toISOString(),
    };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ data: expired }, 200)));
    render(
      <MemoryRouter initialEntries={["/asesmen/attempt/attempt-1"]}>
        <SessionContext.Provider value={tarunaSession()}>
          <AttemptPage attemptId="attempt-1" />
        </SessionContext.Provider>
      </MemoryRouter>,
    );
    await waitFor(() => {
      expect(screen.getByText(/waktu habis menurut server/i)).toBeInTheDocument();
    });
  });
});

describe("autosave dan submit", () => {
  it("mengirim jawaban hanya sebagai answer tanpa answer key", async () => {
    const fetchMock = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
      if (url.includes("/answers/")) {
        expect(String(init?.body)).not.toMatch(/answerKey|correctAnswer/);
        expect(init?.headers).toBeDefined();
        return Promise.resolve(jsonResponse({ data: { ok: true } }, 200));
      }
      return Promise.resolve(jsonResponse({ data: attemptPayload() }, 200));
    });
    vi.stubGlobal("fetch", fetchMock);
    render(
      <MemoryRouter initialEntries={["/asesmen/attempt/attempt-1"]}>
        <SessionContext.Provider value={tarunaSession()}>
          <AttemptPage attemptId="attempt-1" />
        </SessionContext.Provider>
      </MemoryRouter>,
    );
    await waitFor(() => {
      expect(screen.getByText(/soal 1 pilihan ganda/i)).toBeInTheDocument();
    });
    fireEvent.click(screen.getByLabelText(/jakarta/i));
    fireEvent.click(screen.getByRole("button", { name: /simpan sekarang/i }));
    await waitFor(() => {
      expect(fetchMock.mock.calls.some(([url]) => String(url).includes("/answers/q1"))).toBe(true);
    });
  });

  it("menangani autosave gagal lalu retry", async () => {
    let calls = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((url: string) => {
        if (url.includes("/answers/")) {
          calls += 1;
          if (calls === 1) return Promise.resolve(jsonResponse({ error: { code: "NETWORK", message: "Putus." } }, 503));
          return Promise.resolve(jsonResponse({ data: { ok: true } }, 200));
        }
        return Promise.resolve(jsonResponse({ data: attemptPayload() }, 200));
      }),
    );
    render(
      <MemoryRouter initialEntries={["/asesmen/attempt/attempt-1"]}>
        <SessionContext.Provider value={tarunaSession()}>
          <AttemptPage attemptId="attempt-1" />
        </SessionContext.Provider>
      </MemoryRouter>,
    );
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /simpan sekarang/i })).toBeInTheDocument();
    });
    fireEvent.click(screen.getByLabelText(/jakarta/i));
    fireEvent.click(screen.getByRole("button", { name: /simpan sekarang/i }));
    await waitFor(() => {
      expect(screen.getByText(/autosave.*gagal/i)).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole("button", { name: /simpan sekarang/i }));
    await waitFor(() => {
      expect(screen.getByText(/tersimpan/i)).toBeInTheDocument();
    });
  });
});

describe("grading esai", () => {
  it("menampilkan antrean dan deadline SLA", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse(
          {
            data: [
              {
                answerId: "ans-1",
                attemptId: "attempt-1",
                questionId: "q2",
                participantName: "Taruna Satu",
                answerText: "Keselamatan utama.",
                submittedAt: "2026-11-01T00:00:00.000Z",
                dueAt: "2026-11-08T00:00:00.000Z",
                isOverdue: false,
              },
            ],
          },
          200,
        ),
      ),
    );
    render(
      <MemoryRouter initialEntries={["/mentor/koreksi-esai"]}>
        <SessionContext.Provider value={mentorSession()}>
          <EssayGradingPage />
        </SessionContext.Provider>
      </MemoryRouter>,
    );
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /taruna satu/i })).toBeInTheDocument();
    });
    expect(screen.getByText(/batas nilai/i)).toBeInTheDocument();
  });

  it("memvalidasi rentang nilai esai", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse(
          {
            data: [
              {
                answerId: "ans-1",
                attemptId: "attempt-1",
                questionId: "q2",
                participantName: "Taruna Satu",
                answerText: "Keselamatan utama.",
                submittedAt: "2026-11-01T00:00:00.000Z",
              },
            ],
          },
          200,
        ),
      ),
    );
    render(
      <MemoryRouter initialEntries={["/mentor/koreksi-esai"]}>
        <SessionContext.Provider value={mentorSession()}>
          <EssayGradingPage />
        </SessionContext.Provider>
      </MemoryRouter>,
    );
    await waitFor(() => {
      expect(screen.getByLabelText(/nilai 0 sampai 100/i)).toBeInTheDocument();
    });
    fireEvent.change(screen.getByLabelText(/nilai 0 sampai 100/i), { target: { value: "150" } });
    fireEvent.click(screen.getByRole("button", { name: /simpan nilai/i }));
    expect(await screen.findByText(/nilai esai 0 sampai 100/i)).toBeInTheDocument();
  });
});
