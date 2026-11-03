import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ApiError } from "../../services/apiClient.ts";
import { login } from "./authService.ts";
import { isValidEmail } from "./authUtils.ts";
import { useSession } from "../../app/useSession.ts";
import { Button, Card, ErrorAlert, FieldError, InfoAlert } from "../../components/ui.tsx";

interface LocationState {
  expired?: boolean;
  message?: string;
}

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = (location.state ?? {}) as LocationState;
  const { startChallenge, sessionExpired } = useSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [submitError, setSubmitError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const nextErrors: { email?: string; password?: string } = {};
    if (!isValidEmail(email)) nextErrors.email = "Masukkan email yang valid.";
    if (!password) nextErrors.password = "Password wajib diisi.";
    setErrors(nextErrors);
    if (nextErrors.email || nextErrors.password) return;

    setLoading(true);
    setSubmitError("");
    try {
      const result = await login({ email: email.trim(), password });
      startChallenge(result.data.challengeId);
      navigate("/auth/verify-otp", {
        replace: true,
        state: { challengeId: result.data.challengeId, expiresAt: result.data.expiresAt },
      });
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.status === 401) {
          if (error.code === "OTP_REQUIRED") {
            setSubmitError("Akun membutuhkan verifikasi OTP. Silakan lanjutkan ke halaman verifikasi.");
          } else {
            setSubmitError("Email atau password salah, atau akun belum aktif.");
          }
        } else if (error.status === 429) {
          setSubmitError(
            "Terlalu banyak percobaan masuk. Tunggu 15 menit sebelum mencoba lagi.",
          );
        } else {
          setSubmitError(error.message);
        }
      } else {
        setSubmitError("Tidak dapat menghubungi server. Periksa koneksi lalu coba lagi.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page">
      <Card>
        <h1>Masuk</h1>
        <p className="muted">
          Masuk menggunakan email dan password. Jika akun memakai verifikasi dua langkah, sistem
          meminta kode OTP setelah password benar.
        </p>
        {sessionExpired || state.expired ? (
          <ErrorAlert>
            {state.message ?? "Sesi berakhir. Silakan masuk kembali untuk melanjutkan."}
          </ErrorAlert>
        ) : null}
        <form className="form" onSubmit={handleSubmit} aria-label="Formulir masuk" noValidate>
          <div className="form-field">
            <label htmlFor="login-email">Email</label>
            <input
              id="login-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              aria-invalid={errors.email ? "true" : undefined}
              aria-describedby={errors.email ? "login-email-error" : undefined}
              placeholder="nama@example.com"
            />
            <FieldError id="login-email-error" message={errors.email} />
          </div>
          <div className="form-field">
            <label htmlFor="login-password">Password</label>
            <input
              id="login-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              aria-invalid={errors.password ? "true" : undefined}
              aria-describedby={errors.password ? "login-password-error" : undefined}
              placeholder="Password akun"
            />
            <FieldError id="login-password-error" message={errors.password} />
          </div>
          {submitError ? <ErrorAlert>{submitError}</ErrorAlert> : null}
          <div className="button-row">
            <Button type="submit" variant="primary" disabled={loading}>
              {loading ? "Memeriksa..." : "Masuk"}
            </Button>
            <Link to="/forgot-password">Lupa password?</Link>
          </div>
        </form>
        <p className="muted">
          Belum punya akun Taruna? <Link to="/register">Daftar sebagai Taruna</Link>.
        </p>
        <InfoAlert>
          Access token hanya disimpan di memori aplikasi. Refresh token dikelola browser melalui
          cookie HttpOnly.
        </InfoAlert>
      </Card>
    </div>
  );
}

