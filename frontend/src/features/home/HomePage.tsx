import { ButtonLink, Card, InfoAlert } from "../../components/ui.tsx";

export function HomePage() {
  return (
    <div className="page">
      <Card>
        <h1>Fondasi aplikasi pembelajaran</h1>
        <p className="muted">
          Ini adalah shell fondasi tahap 1. Halaman fitur domain seperti dasbor per peran, materi,
          CBT, dan tiket akan dibangun pada tahap berikutnya setelah kontrak API final.
        </p>
        <div className="button-row">
          <ButtonLink to="/login" variant="primary">
            Ke halaman masuk
          </ButtonLink>
          <ButtonLink to="/komponen">Pratinjau komponen</ButtonLink>
        </div>
      </Card>
      <InfoAlert>
        Data pada halaman ini adalah placeholder fondasi. Jangan memperlakukannya sebagai data
        production.
      </InfoAlert>
    </div>
  );
}
