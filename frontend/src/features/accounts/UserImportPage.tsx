import { useState } from "react";
import { ApiError } from "../../services/apiClient.ts";
import {
  downloadImportLogUrl,
  downloadImportTemplateUrl,
  getImportStatus,
  importUsers,
} from "./accountService.ts";
import type { UserImportSummary } from "./accountTypes.ts";
import { useAccessToken } from "./useAccountList.ts";
import { Button, ButtonLink, Card, ErrorAlert, InfoAlert, LoadingState } from "../../components/ui.tsx";

const MAX_ROWS = 500;

function isXlsx(file: File): boolean {
  const nameOk = file.name.toLowerCase().endsWith(".xlsx");
  const typeOk =
    file.type === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
    file.type === "";
  return nameOk && typeOk;
}

export function UserImportPage() {
  const accessToken = useAccessToken();
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<UserImportSummary | null>(null);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState("");

  async function handleUpload(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setResult(null);
    if (!file) {
      setFileError("Pilih berkas .xlsx terlebih dahulu.");
      return;
    }
    if (!isXlsx(file)) {
      setFileError("Format berkas harus .xlsx, bukan CSV atau format lain.");
      return;
    }
    if (!accessToken) {
      setError("Sesi berakhir. Silakan masuk kembali.");
      return;
    }
    setUploading(true);
    try {
      const response = await importUsers(file, accessToken);
      setResult(response.data);
    } catch (requestError) {
      if (requestError instanceof ApiError) {
        setError(requestError.message);
      } else {
        setError("Tidak dapat mengunggah berkas. Periksa koneksi lalu coba lagi.");
      }
    } finally {
      setUploading(false);
    }
  }

  async function handleCheckStatus() {
    if (!result || !accessToken) return;
    setChecking(true);
    setError("");
    try {
      const response = await getImportStatus(result.importId, accessToken);
      setResult(response.data);
    } catch (requestError) {
      setError(requestError instanceof ApiError ? requestError.message : "Gagal memeriksa status impor.");
    } finally {
      setChecking(false);
    }
  }

  return (
    <div className="page">
      <Card>
        <h1>Impor Akun Taruna</h1>
        <p className="muted">
          Unggah berkas Excel (.xlsx) maksimal {MAX_ROWS} baris per berkas. Baris valid masuk,
          baris gagal dilaporkan tanpa membatalkan seluruh impor. Jangan menyatakan berhasil sebelum
          server mengembalikan hasil.
        </p>
        <div className="button-row">
          <a className="btn btn-secondary" href={downloadImportTemplateUrl()}>
            Unduh template .xlsx
          </a>
          <ButtonLink to="/admin/pengguna">Kembali ke pengguna</ButtonLink>
        </div>
        <InfoAlert>
          Template kolom final menunggu kesepakatan Fase 1. Validasi MIME, ukuran, dan malware
          dilakukan server.
        </InfoAlert>
      </Card>

      <Card>
        <h2>Unggah berkas</h2>
        <form className="form" onSubmit={handleUpload} aria-label="Formulir impor akun">
          <div className="form-field">
            <label htmlFor="import-file">Berkas .xlsx maksimal {MAX_ROWS} baris</label>
            <input
              id="import-file"
              type="file"
              accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              onChange={(event) => {
                setFile(event.target.files?.[0] ?? null);
                setFileError("");
              }}
              aria-invalid={fileError ? "true" : undefined}
              aria-describedby={fileError ? "import-file-error" : undefined}
            />
            {fileError ? (
              <p className="field-error" id="import-file-error" role="alert">
                {fileError}
              </p>
            ) : null}
            {file ? <span className="field-help">Berkas dipilih: {file.name}</span> : null}
          </div>
          {error ? <ErrorAlert>{error}</ErrorAlert> : null}
          <div className="button-row">
            <Button type="submit" variant="primary" disabled={uploading}>
              {uploading ? "Mengunggah..." : "Unggah dan proses"}
            </Button>
            {result ? (
              <Button type="button" variant="secondary" disabled={checking} onClick={() => void handleCheckStatus()}>
                {checking ? "Memeriksa..." : "Periksa status"}
              </Button>
            ) : null}
          </div>
        </form>
        {uploading ? <LoadingState label="Mengunggah berkas, mohon tunggu..." /> : null}
      </Card>

      {result ? (
        <Card>
          <h2>Hasil impor dari server</h2>
          <p className="muted">
            Total {result.totalRows} baris, {result.successRows} berhasil, {result.failedRows} gagal.
            Hasil ini berasal dari respons backend, bukan perhitungan lokal.
          </p>
          <div className="button-row">
            <a className="btn btn-secondary" href={downloadImportLogUrl(result)}>
              Unduh berkas log perbaikan
            </a>
          </div>
          <InfoAlert>
            Berkas log perbaikan menandai sel error dan keterangan per baris agar dapat diperbaiki
            lalu diunggah ulang.
          </InfoAlert>
        </Card>
      ) : null}
    </div>
  );
}
