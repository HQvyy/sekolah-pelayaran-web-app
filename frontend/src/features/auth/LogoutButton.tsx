import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { logout } from "./authService.ts";
import { useSession } from "../../app/useSession.ts";
import { Button, ConfirmDialog, ErrorAlert } from "../../components/ui.tsx";

export function LogoutButton({ label = "Keluar" }: { label?: string }) {
  const navigate = useNavigate();
  const { accessToken, clearSession } = useSession();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogout() {
    setLoading(true);
    setError("");
    try {
      await logout(accessToken);
    } catch {
      setError("Logout server gagal, sesi lokal tetap dihapus agar token tidak tertinggal.");
    } finally {
      clearSession();
      setLoading(false);
      setConfirmOpen(false);
      navigate("/login", { replace: true });
    }
  }

  return (
    <>
      <Button variant="secondary" onClick={() => setConfirmOpen(true)}>
        {label}
      </Button>
      {confirmOpen ? (
        <ConfirmDialog
          title="Keluar dari aplikasi?"
          description="Sesi lokal dihapus dan refresh token dicabut melalui server bila tersedia."
          confirmLabel={loading ? "Memproses..." : "Ya, keluar"}
          onClose={() => {
            if (!loading) setConfirmOpen(false);
          }}
          onConfirm={() => {
            void handleLogout();
          }}
        />
      ) : null}
      {error ? <ErrorAlert>{error}</ErrorAlert> : null}
    </>
  );
}
