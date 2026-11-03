import { Link } from "react-router-dom";
import { Button, Card, InfoAlert } from "../../components/ui.tsx";
import { useSession } from "../../app/useSession.ts";

export function SessionExpiredPage() {
  const { markSessionExpired } = useSession();

  return (
    <div className="page">
      <Card>
        <h1>Sesi berakhir</h1>
        <p className="muted">
          Sesi login berakhir atau tidak valid. Masuk kembali untuk melanjutkan. Data password dan
          OTP tidak disimpan di browser.
        </p>
        <div className="button-row">
          <Button
            variant="primary"
            onClick={() => {
              markSessionExpired();
            }}
          >
            Tandai sesi berakhir
          </Button>
          <Link className="btn btn-secondary" to="/login">
            Masuk kembali
          </Link>
        </div>
        <InfoAlert>
          Halaman ini untuk UX sesi kedaluwarsa. Backend tetap menolak token yang kedaluwarsa pada
          setiap request.
        </InfoAlert>
      </Card>
    </div>
  );
}
