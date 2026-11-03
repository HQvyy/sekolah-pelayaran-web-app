import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ApiError } from "../../services/apiClient.ts";
import { resendOtp, verifyOtp } from "./authService.ts";
import {
  OTP_LENGTH,
  RESEND_COOLDOWN_SECONDS,
  formatCountdown,
  isLockedOutError,
  normalizeOtp,
  otpErrorMessage,
  otpExpirySeconds,
} from "./authUtils.ts";
import { useSession } from "../../app/useSession.ts";
import { Button, Card, ErrorAlert, FieldError, InfoAlert, SuccessAlert } from "../../components/ui.tsx";

interface VerifyLocationState {
  challengeId?: string;
  expiresAt?: string;
  email?: string;
}

export function OtpPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = (location.state ?? {}) as VerifyLocationState;
  const { authChallengeId, startChallenge, setSession, loadMe } = useSession();
  const challengeId = state.challengeId ?? authChallengeId;
  const [code, setCode] = useState("");
  const [formError, setFormError] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendMessage, setResendMessage] = useState("");
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN_SECONDS);
  const [expiresIn, setExpiresIn] = useState(() =>
    state.expiresAt ? otpExpirySeconds(state.expiresAt) : 5 * 60,
  );
  const timer = useRef<number | null>(null);

  const hasChallenge = useMemo(() => Boolean(challengeId), [challengeId]);

  useEffect(() => {
    if (!hasChallenge) return;
    timer.current = window.setInterval(() => {
      setCooldown((value) => Math.max(0, value - 1));
      setExpiresIn((value) => Math.max(0, value - 1));
    }, 1000);
    return () => {
      if (timer.current) {
        window.clearInterval(timer.current);
        timer.current = null;
      }
    };
  }, [hasChallenge]);

  async function handleVerify(event: React.FormEvent) {
    event.preventDefault();
    const normalized = normalizeOtp(code);
    if (normalized.length !== OTP_LENGTH) {
      setFormError("Masukkan 6 digit kode OTP yang dikirim ke email.");
      return;
    }
    if (!challengeId) {
      setSubmitError("Sesi verifikasi tidak ditemukan. Ulangi proses masuk dari awal.");
      return;
    }
    setFormError("");
    setSubmitError("");
    setSuccess("");
    setLoading(true);
    try {
      const result = await verifyOtp({ challengeId, code: normalized });
      const user = await loadMe(result.data.accessToken);
      setSession(user, result.data.accessToken);
      setSuccess("Verifikasi berhasil. Mengalihkan ke dasbor.");
      window.setTimeout(() => navigate("/dashboard", { replace: true }), 700);
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.status === 401 && isLockedOutError(error.code)) {
          setSubmitError(otpErrorMessage(error.code, error.message));
        } else {
          setSubmitError(otpErrorMessage(error.code, error.message));
        }
      } else {
        setSubmitError("Tidak dapat menghubungi server. Periksa koneksi lalu coba lagi.");
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    if (!challengeId || cooldown > 0) return;
    setResendLoading(true);
    setResendMessage("");
    setSubmitError("");
    try {
      const result = await resendOtp({ challengeId });
      startChallenge(result.data.challengeId);
      setExpiresIn(otpExpirySeconds(result.data.expiresAt));
      setCooldown(result.data.retryAfterSeconds || RESEND_COOLDOWN_SECONDS);
      setResendMessage("Kode OTP baru telah dikirim ke email. Periksa kotak masuk dan spam.");
    } catch (error) {
      if (error instanceof ApiError) {
        setSubmitError(otpErrorMessage(error.code, error.message));
        if (error.status === 429) setCooldown(RESEND_COOLDOWN_SECONDS);
      } else {
        setSubmitError("Tidak dapat mengirim ulang OTP. Periksa koneksi lalu coba lagi.");
      }
    } finally {
      setResendLoading(false);
    }
  }

  if (!hasChallenge) {
    return (
      <div className="page">
        <Card>
          <h1>Verifikasi OTP</h1>
          <ErrorAlert>
            Sesi verifikasi tidak ditemukan. Ulangi proses masuk dari halaman login.
          </ErrorAlert>
          <p className="muted">
            Kembali ke <Link to="/login">halaman masuk</Link>.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="page">
      <Card>
        <h1>Verifikasi OTP email</h1>
        <p className="muted">
          Masukkan 6 digit kode yang dikirim ke email{state.email ? ` ${state.email}` : ""}. Kode
          berlaku 5 menit dengan maksimal 5 percobaan per kode.
        </p>
        <p className="muted" role="status" aria-live="polite">
          Sisa waktu kode: {formatCountdown(expiresIn)}.{" "}
          {cooldown > 0
            ? `Kirim ulang tersedia dalam ${cooldown} detik.`
            : "Anda dapat meminta kode baru."}
        </p>
        <form className="form" onSubmit={handleVerify} aria-label="Formulir verifikasi OTP" noValidate>
          <div className="form-field">
            <label htmlFor="otp-code">Kode OTP 6 digit</label>
            <input
              id="otp-code"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={OTP_LENGTH}
              value={code}
              onChange={(event) => setCode(normalizeOtp(event.target.value))}
              aria-invalid={formError ? "true" : undefined}
              aria-describedby={formError ? "otp-code-error" : undefined}
              placeholder="Contoh: 123456"
            />
            <FieldError id="otp-code-error" message={formError} />
          </div>
          {submitError ? <ErrorAlert>{submitError}</ErrorAlert> : null}
          {success ? <SuccessAlert>{success}</SuccessAlert> : null}
          {resendMessage ? (
            <div className="alert alert-info" role="status">
              {resendMessage}
            </div>
          ) : null}
          <div className="button-row">
            <Button type="submit" variant="primary" disabled={loading || expiresIn === 0}>
              {loading ? "Memverifikasi..." : "Verifikasi kode"}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={handleResend}
              disabled={resendLoading || cooldown > 0}
            >
              {resendLoading
                ? "Mengirim..."
                : cooldown > 0
                  ? `Kirim ulang (${cooldown})`
                  : "Kirim ulang kode"}
            </Button>
          </div>
        </form>
        {expiresIn === 0 ? (
          <ErrorAlert>Kode kedaluwarsa. Minta kode baru menggunakan tombol kirim ulang.</ErrorAlert>
        ) : null}
        <InfoAlert>
          Kode OTP hanya dipakai sekali dan tidak disimpan di browser. Jangan membagikan kode kepada
          siapa pun.
        </InfoAlert>
      </Card>
    </div>
  );
}
