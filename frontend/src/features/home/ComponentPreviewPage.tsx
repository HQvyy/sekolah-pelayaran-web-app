import { useState } from "react";
import {
  Badge,
  Button,
  Card,
  ConfirmDialog,
  EmptyState,
  ErrorAlert,
  ErrorState,
  FieldError,
  InfoAlert,
  LoadingState,
  SuccessAlert,
} from "../../components/ui.tsx";

export function ComponentPreviewPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  return (
    <div className="page">
      <Card>
        <h1>Pratinjau komponen fondasi</h1>
        <p className="muted">
          Placeholder visual tahap 1. Semua teks dan angka di halaman ini bukan data production.
        </p>
      </Card>

      <div className="grid-two">
        <Card>
          <h2>Formulir</h2>
          <form
            className="form"
            onSubmit={(event) => event.preventDefault()}
            aria-label="Contoh formulir fondasi"
          >
            <div className="form-field">
              <label htmlFor="contoh-nama">Nama lengkap</label>
              <input id="contoh-nama" name="nama" autoComplete="name" placeholder="Nama Taruna" />
              <span className="field-help">Contoh bantuan input.</span>
            </div>
            <div className="form-field">
              <label htmlFor="contoh-email">Email</label>
              <input
                id="contoh-email"
                name="email"
                type="email"
                aria-invalid="true"
                aria-describedby="contoh-email-error"
                placeholder="nama@example.com"
              />
              <FieldError id="contoh-email-error" message="Contoh pesan error validasi." />
            </div>
            <div className="button-row">
              <Button type="submit" variant="primary">
                Simpan contoh
              </Button>
              <Button type="button" variant="secondary" disabled>
                Nonaktif selama memuat
              </Button>
            </div>
          </form>
        </Card>

        <Card>
          <h2>Status dan badge</h2>
          <div className="button-row">
            <Badge tone="open">Open</Badge>
            <Badge tone="progress">In Progress</Badge>
            <Badge tone="done">Resolved</Badge>
            <Badge tone="neutral">Netral</Badge>
          </div>
          <SuccessAlert>Contoh pesan berhasil dalam Bahasa Indonesia.</SuccessAlert>
          <ErrorAlert>Contoh pesan error dalam Bahasa Indonesia.</ErrorAlert>
          <InfoAlert>Contoh informasi atau placeholder fondasi.</InfoAlert>
          <Button variant="secondary" onClick={() => setDialogOpen(true)}>
            Buka dialog konfirmasi
          </Button>
          {confirmed ? <SuccessAlert>Contoh konfirmasi diterima.</SuccessAlert> : null}
        </Card>
      </div>

      <div className="grid-two">
        <Card>
          <h2>Tabel</h2>
          <div className="table-wrap">
            <table className="data-table">
              <caption>Contoh tabel placeholder, bukan data produksi.</caption>
              <thead>
                <tr>
                  <th scope="col">Nama</th>
                  <th scope="col">Peran</th>
                  <th scope="col">Status</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Contoh Taruna</td>
                  <td>Taruna</td>
                  <td>
                    <Badge tone="progress">Menunggu verifikasi</Badge>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </Card>

        <Card>
          <h2>Status halaman</h2>
          <LoadingState label="Contoh status memuat..." />
          <EmptyState
            title="Belum ada data contoh"
            description="Empty state menjelaskan langkah berikutnya kepada pengguna."
          />
          <ErrorState
            title="Contoh error"
            description="Pesan error membantu pengguna memahami tindakan berikutnya."
          />
        </Card>
      </div>

      {dialogOpen ? (
        <ConfirmDialog
          title="Contoh konfirmasi tindakan penting"
          description="Dialog ini memastikan pengguna memahami tindakan yang akan dilakukan."
          onClose={() => setDialogOpen(false)}
          onConfirm={() => {
            setConfirmed(true);
            setDialogOpen(false);
          }}
        />
      ) : null}
    </div>
  );
}
