import { useState } from "react";
import { Link } from "react-router-dom";
import { ApiError } from "../../services/apiClient.ts";
import { forgotPassword } from "./authService.ts";
import { isValidEmail } from "./authUtils.ts";
import { Button, Card, ErrorAlert, FieldError, SuccessAlert } from "../../components/ui.tsx";

export function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!isValidEmail(email)) {
      setError("Masukkan email yang valid.");
      return;
    }
    setError("");
    setSubmitError("");
    setLoading(true);
    try {
      await forgotPassword({ email: email.trim() });
      setSuccess(true);
    } catch (requestError) {
      if (requestError instanceof ApiError) {
        if (requestError.status === 429) {
          setSubmitError("Terlalu sering meminta tautan. Tunggu sebentar lalu coba lagi.");
        } else {
          setSubmitError(requestError.message);
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
        <h1>Lupa password</h1>
        {success ? (
          <SuccessAlert>
            Jika email terdaftar, tautan reset password telah dikirim. Periksa kotak masuk dan spam.
          </SuccessAlert>
        ) : (
          <p className="muted">
            Masukkan email akun. Sistem mengirim tautan reset bila akun memenuhi syarat, tanpa
            memberi tahu apakah email terdaftar.
          </p>
        )}
        <form className="form" onSubmit={handleSubmit} aria-label="Formulir lupa password" noValidate>
          <div className="form-field">
            <label htmlFor="forgot-email">Email akun</label>
            <input
              id="forgot-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              aria-invalid={error ? "true" : undefined}
              aria-describedby={error ? "forgot-email-error" : undefined}
              placeholder="nama@example.com"
            />
            <FieldError id="forgot-email-error" message={error} />
          </div>
          {submitError ? <ErrorAlert>{submitError}</ErrorAlert> : null}
          <div className="button-row">
            <Button type="submit" variant="primary" disabled={loading}>
              {loading ? "Mengirim..." : "Kirim tautan reset"}
            </Button>
            <Link to="/login">Kembali masuk</Link>
          </div>
        </form>
      </Card>
    </div>
  );
}
