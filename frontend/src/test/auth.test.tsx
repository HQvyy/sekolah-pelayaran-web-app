import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SessionProvider } from "../app/SessionContext.tsx";
import { ForgotPasswordPage } from "../features/auth/ForgotPasswordPage.tsx";
import { LoginPage } from "../features/auth/LoginPage.tsx";
import { OtpPage } from "../features/auth/OtpPage.tsx";
import { RegisterPage } from "../features/auth/RegisterPage.tsx";
import { ResetPasswordPage } from "../features/auth/ResetPasswordPage.tsx";

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function renderStandalone(ui: React.ReactNode, path = "/") {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <SessionProvider>{ui}</SessionProvider>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.unstubAllGlobals();
});

describe("halaman masuk", () => {
  it("menolak email dan password kosong", async () => {
    const user = userEvent.setup();
    renderStandalone(<LoginPage />, "/login");
    const form = screen.getByRole("form", { name: /formulir masuk/i });
    await user.click(within(form).getByRole("button", { name: /^masuk$/i }));
    expect(screen.getByText(/email yang valid/i)).toBeInTheDocument();
    expect(screen.getByText(/password wajib diisi/i)).toBeInTheDocument();
  });

  it("menampilkan loading lalu error login 401", async () => {
    const user = userEvent.setup();
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse({ error: { code: "INVALID_CREDENTIALS", message: "Kredensial salah." } }, 401));
    vi.stubGlobal("fetch", fetchMock);
    renderStandalone(<LoginPage />, "/login");
    const form = screen.getByRole("form", { name: /formulir masuk/i });

    await user.type(within(form).getByLabelText(/email/i), "taruna@example.com");
    await user.type(within(form).getByLabelText(/password/i), "Contoh123");
    await user.click(within(form).getByRole("button", { name: /^masuk$/i }));

    await waitFor(() => {
      expect(screen.getByText(/email atau password salah/i)).toBeInTheDocument();
    });
  });
});

describe("halaman pendaftaran Taruna", () => {
  it("mewajibkan persetujuan data pribadi", async () => {
    const user = userEvent.setup();
    renderStandalone(<RegisterPage />, "/register");
    const form = screen.getByRole("form", { name: /formulir pendaftaran/i });
    await user.type(within(form).getByLabelText(/nama lengkap/i), "Taruna Contoh");
    await user.type(within(form).getByLabelText(/^email$/i), "taruna@example.com");
    await user.type(within(form).getByLabelText(/^password$/i), "Contoh123");
    await user.type(within(form).getByLabelText(/konfirmasi password/i), "Contoh123");
    await user.click(within(form).getByRole("button", { name: /daftar sebagai taruna/i }));
    expect(screen.getByText(/persetujuan pemrosesan data/i)).toBeInTheDocument();
  });

  it("menolak password lemah", async () => {
    const user = userEvent.setup();
    renderStandalone(<RegisterPage />, "/register");
    const form = screen.getByRole("form", { name: /formulir pendaftaran/i });
    await user.type(within(form).getByLabelText(/^password$/i), "lemah");
    await user.click(within(form).getByRole("button", { name: /daftar sebagai taruna/i }));
    expect(screen.getByText(/minimal 8 karakter/i)).toBeInTheDocument();
  });
});

describe("halaman OTP", () => {
  it("menolak akses tanpa challenge OTP", () => {
    renderStandalone(<OtpPage />, "/auth/verify-otp");
    expect(screen.getByText(/sesi verifikasi tidak ditemukan/i)).toBeInTheDocument();
  });

  it("menampilkan error kode salah", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (url.includes("/auth/2fa/verify")) {
        return Promise.resolve(jsonResponse({ error: { code: "OTP_INVALID", message: "Kode salah." } }, 401));
      }
      return Promise.resolve(jsonResponse({ data: { user: { id: "1", name: "Taruna", email: "a@b.c", role: "TARUNA" } } }, 200));
    });
    vi.stubGlobal("fetch", fetchMock);
    render(
      <MemoryRouter initialEntries={[{ pathname: "/auth/verify-otp", state: { challengeId: "challenge-1", expiresAt: new Date(Date.now() + 300000).toISOString() } }]}>
        <SessionProvider>
          <OtpPage />
        </SessionProvider>
      </MemoryRouter>,
    );

    await user.type(screen.getByLabelText(/kode otp/i), "123456");
    await user.click(screen.getByRole("button", { name: /verifikasi kode/i }));
    await waitFor(() => {
      expect(screen.getByText(/kode otp salah/i)).toBeInTheDocument();
    });
  });

  it("menampilkan pesan kedaluwarsa saat waktu habis", () => {
    render(
      <MemoryRouter initialEntries={[{ pathname: "/auth/verify-otp", state: { challengeId: "challenge-1", expiresAt: new Date(Date.now() - 1000).toISOString() } }]}>
        <SessionProvider>
          <OtpPage />
        </SessionProvider>
      </MemoryRouter>,
    );
    expect(screen.getByText(/kode kedaluwarsa/i)).toBeInTheDocument();
  });
});

describe("lupa dan reset password", () => {
  it("tidak membocorkan apakah email terdaftar", async () => {
    const user = userEvent.setup();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ data: null }, 200)));
    renderStandalone(<ForgotPasswordPage />, "/forgot-password");
    const form = screen.getByRole("form", { name: /formulir lupa password/i });
    await user.type(within(form).getByLabelText(/email akun/i), "taruna@example.com");
    await user.click(within(form).getByRole("button", { name: /kirim tautan reset/i }));
    await waitFor(() => {
      expect(screen.getByText(/jika email terdaftar/i)).toBeInTheDocument();
    });
  });

  it("menolak tautan reset tanpa token", () => {
    renderStandalone(<ResetPasswordPage />, "/reset-password");
    expect(screen.getByText(/tautan reset tidak lengkap/i)).toBeInTheDocument();
  });
});

describe("guard UX dan keamanan penyimpanan", () => {
  it("tidak menyimpan password di localStorage saat login", async () => {
    const user = userEvent.setup();
    vi.stubGlobal("fetch", vi.fn());
    renderStandalone(<LoginPage />, "/login");
    const form = screen.getByRole("form", { name: /formulir masuk/i });
    await user.type(within(form).getByLabelText(/email/i), "taruna@example.com");
    await user.type(within(form).getByLabelText(/password/i), "Contoh123");
    expect(localStorage.length).toBe(0);
  });

  it("tidak menyimpan OTP di localStorage", () => {
    renderStandalone(<OtpPage />, "/auth/verify-otp");
    expect(localStorage.length).toBe(0);
  });
});
