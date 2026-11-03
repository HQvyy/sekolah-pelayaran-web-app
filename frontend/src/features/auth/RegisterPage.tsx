import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ApiError } from "../../services/apiClient.ts";
import { registerTaruna } from "./authService.ts";
import { isValidEmail, passwordError } from "./authUtils.ts";
import { Button, Card, ErrorAlert, FieldError, InfoAlert, SuccessAlert } from "../../components/ui.tsx";

export function RegisterPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [consent, setConsent] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const nextErrors: Record<string, string> = {};
    if (!isValidEmail(email)) nextErrors.email = "Masukkan email yang valid.";
    const passwordValidation = passwordError(password);
    if (passwordValidation) nextErrors.password = passwordValidation;
    if (confirmPassword !== password) nextErrors.confirmPassword = "Konfirmasi password tidak sama.";
    if (!consent) nextErrors.consent = "Persetujuan pemrosesan data pribadi wajib dicentang.";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setLoading(true);
    setSubmitError("");
    try {
      await registerTaruna({
        email: email.trim(),
        password,
        consent: true,
      });
      setSuccess(true);
      window.setTimeout(() => navigate("/login", { replace: true }), 1200);
    } catch (error) {
      if (error instanceof ApiError) {
        const fieldError = error.details?.find((detail) => detail.field)?.message;
        setSubmitError(fieldError ?? error.message);
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
        <h1>Pendaftaran Taruna</h1>
        <p className="muted">
          Pendaftaran publik hanya untuk Taruna. Akun Taruna nonaktif sampai diverifikasi Admin,
          sesuai PRD. Akun Mentor, Admin, atau Superadmin dibuat oleh pihak berwenang dan tidak
          tersedia di halaman ini.
        </p>
        {success ? (
          <SuccessAlert>
            Pendaftaran berhasil. Akun menunggu verifikasi Admin sebelum dapat dipakai masuk.
          </SuccessAlert>
        ) : null}
        <form className="form" onSubmit={handleSubmit} aria-label="Formulir pendaftaran Taruna" noValidate>
          <div className="form-field">
            <label htmlFor="register-email">Email</label>
            <input
              id="register-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              aria-invalid={errors.email ? "true" : undefined}
              aria-describedby={errors.email ? "register-email-error" : undefined}
              placeholder="nama@example.com"
            />
            <FieldError id="register-email-error" message={errors.email} />
          </div>
          <div className="form-field">
            <label htmlFor="register-password">Password</label>
            <input
              id="register-password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              aria-invalid={errors.password ? "true" : undefined}
              aria-describedby={errors.password ? "register-password-error" : undefined}
              placeholder="Minimal 8 karakter, huruf dan angka"
            />
            <FieldError id="register-password-error" message={errors.password} />
          </div>
          <div className="form-field">
            <label htmlFor="register-confirm-password">Konfirmasi password</label>
            <input
              id="register-confirm-password"
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              aria-invalid={errors.confirmPassword ? "true" : undefined}
              aria-describedby={errors.confirmPassword ? "register-confirm-password-error" : undefined}
              placeholder="Ulangi password"
            />
            <FieldError id="register-confirm-password-error" message={errors.confirmPassword} />
          </div>
          <div className="form-field">
            <label htmlFor="register-consent">
              <input
                id="register-consent"
                type="checkbox"
                checked={consent}
                onChange={(event) => setConsent(event.target.checked)}
                aria-invalid={errors.consent ? "true" : undefined}
                aria-describedby={errors.consent ? "register-consent-error" : undefined}
              />{" "}
              Saya menyetujui pemrosesan data pribadi untuk keperluan pendaftaran dan layanan
              pembelajaran sesuai ketentuan yang berlaku.
            </label>
            <FieldError id="register-consent-error" message={errors.consent} />
          </div>
          {submitError ? <ErrorAlert>{submitError}</ErrorAlert> : null}
          <div className="button-row">
            <Button type="submit" variant="primary" disabled={loading}>
              {loading ? "Mendaftar..." : "Daftar sebagai Taruna"}
            </Button>
            <Link to="/login">Sudah punya akun? Masuk</Link>
          </div>
        </form>
        <InfoAlert>
          Password dan data pendaftaran tidak disimpan di browser. Hanya data yang dibutuhkan yang
          dikirim ke server melalui koneksi aman.
        </InfoAlert>
      </Card>
    </div>
  );
}
