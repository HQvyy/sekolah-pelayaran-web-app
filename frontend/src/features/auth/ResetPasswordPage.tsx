import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ApiError } from "../../services/apiClient.ts";
import { resetPassword } from "./authService.ts";
import { passwordError } from "./authUtils.ts";
import { Button, Card, ErrorAlert, FieldError, SuccessAlert } from "../../components/ui.tsx";

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!token) {
      setSubmitError("Tautan reset tidak valid. Minta tautan baru melalui halaman lupa password.");
      return;
    }
    const nextErrors: Record<string, string> = {};
    const passwordValidation = passwordError(password);
    if (passwordValidation) nextErrors.password = passwordValidation;
    if (confirmPassword !== password) nextErrors.confirmPassword = "Konfirmasi password tidak sama.";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setLoading(true);
    setSubmitError("");
    try {
      await resetPassword({ token, password });
      setSuccess(true);
      window.setTimeout(() => navigate("/login", { replace: true }), 1200);
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.status === 400 || error.status === 404 || error.status === 422) {
          setSubmitError("Tautan reset tidak valid atau sudah dipakai. Minta tautan baru.");
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
        <h1>Atur ulang password</h1>
        <p className="muted">
          Tautan reset hanya berlaku 1 jam dan satu kali pakai. Buat password baru minimal 8
          karakter dengan huruf dan angka.
        </p>
        {!token ? (
          <ErrorAlert>
            Tautan reset tidak lengkap. Minta tautan baru melalui{" "}
            <Link to="/forgot-password">halaman lupa password</Link>.
          </ErrorAlert>
        ) : null}
        {success ? <SuccessAlert>Password berhasil diubah. Mengalihkan ke halaman masuk.</SuccessAlert> : null}
        <form className="form" onSubmit={handleSubmit} aria-label="Formulir reset password" noValidate>
          <div className="form-field">
            <label htmlFor="reset-password">Password baru</label>
            <input
              id="reset-password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              aria-invalid={errors.password ? "true" : undefined}
              aria-describedby={errors.password ? "reset-password-error" : undefined}
              placeholder="Password baru"
            />
            <FieldError id="reset-password-error" message={errors.password} />
          </div>
          <div className="form-field">
            <label htmlFor="reset-confirm-password">Konfirmasi password baru</label>
            <input
              id="reset-confirm-password"
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              aria-invalid={errors.confirmPassword ? "true" : undefined}
              aria-describedby={errors.confirmPassword ? "reset-confirm-password-error" : undefined}
              placeholder="Ulangi password baru"
            />
            <FieldError id="reset-confirm-password-error" message={errors.confirmPassword} />
          </div>
          {submitError ? <ErrorAlert>{submitError}</ErrorAlert> : null}
          <div className="button-row">
            <Button type="submit" variant="primary" disabled={loading || !token}>
              {loading ? "Menyimpan..." : "Simpan password baru"}
            </Button>
            <Link to="/login">Kembali masuk</Link>
          </div>
        </form>
      </Card>
    </div>
  );
}
