import { useEffect, useState } from "react";
import { ApiError } from "../../services/apiClient.ts";
import { useAccessToken } from "../accounts/useAccountList.ts";
import { certificatePdfUrl, getCertificate, listMyCertificates } from "./serviceHub.ts";
import { formatWib } from "../../lib/config.ts";
import { Button, ButtonLink, Card, EmptyState, ErrorAlert, InfoAlert, LoadingState } from "../../components/ui.tsx";
import type { Certificate } from "./serviceTypes.ts";

export function CertificateListPage() {
  const accessToken = useAccessToken();
  const [items, setItems] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    if (!accessToken) {
      setLoading(false);
      setError("Sesi berakhir. Silakan masuk kembali.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const result = await listMyCertificates(accessToken);
      setItems(result.data);
    } catch (requestError) {
      setError(requestError instanceof ApiError ? requestError.message : "Gagal memuat sertifikat.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken]);

  if (loading) return <LoadingState label="Memuat sertifikat..." />;
  if (error) {
    return (
      <div className="page">
        <Card>
          <h1>Sertifikat Saya</h1>
          <ErrorAlert>{error}</ErrorAlert>
          <div className="button-row">
            <Button variant="secondary" onClick={() => void load()}>
              Muat ulang
            </Button>
            <ButtonLink to="/dashboard">Kembali</ButtonLink>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="page">
      <Card>
        <h1>Sertifikat Saya</h1>
        <p className="muted">
          Sertifikat program internal Sekolah Pelaut Indonesia, bukan sertifikat resmi STCW. Daftar
          ini hanya berisi sertifikat yang diizinkan backend.
        </p>
        {items.length === 0 ? (
          <EmptyState
            title="Belum ada sertifikat"
            description="Sertifikat diterbitkan bila syarat kelulusan terpenuhi menurut server."
          />
        ) : (
          items.map((item) => (
            <Card key={item.id}>
              <h2>{item.title}</h2>
              <p className="muted">Nomor: {item.certificateNumber}</p>
              <p className="muted">Diterbitkan {formatWib(item.issuedAt)}.</p>
              <div className="button-row">
                <ButtonLink to={`/sertifikat/${item.id}`}>Detail</ButtonLink>
                <a className="btn btn-secondary" href={certificatePdfUrl(item.id)}>
                  Unduh PDF
                </a>
              </div>
            </Card>
          ))
        )}
        <InfoAlert>Tidak ada halaman verifikasi publik atau QR pada tahap ini.</InfoAlert>
      </Card>
    </div>
  );
}

export function CertificateDetailPage({ certificateId }: { certificateId: string }) {
  const accessToken = useAccessToken();
  const [certificate, setCertificate] = useState<Certificate | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [forbidden, setForbidden] = useState(false);

  async function load() {
    if (!accessToken) {
      setLoading(false);
      setError("Sesi berakhir. Silakan masuk kembali.");
      return;
    }
    setLoading(true);
    setError("");
    setForbidden(false);
    try {
      const result = await getCertificate(certificateId, accessToken);
      setCertificate(result.data);
    } catch (requestError) {
      if (requestError instanceof ApiError && requestError.status === 403) {
        setForbidden(true);
        setError("Akun ini tidak memiliki akses sertifikat. Otorisasi resmi ditentukan backend.");
      } else if (requestError instanceof ApiError) {
        setError(requestError.message);
      } else {
        setError("Gagal memuat sertifikat.");
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [certificateId, accessToken]);

  if (loading) return <LoadingState label="Memuat detail sertifikat..." />;
  if (error || !certificate) {
    return (
      <div className="page">
        <Card>
          <h1>Detail Sertifikat</h1>
          <ErrorAlert>{error || "Sertifikat tidak ditemukan."}</ErrorAlert>
          {forbidden ? <p className="muted">Unduhan disembunyikan karena akses ditolak.</p> : null}
          <div className="button-row">
            <ButtonLink to="/sertifikat">Kembali</ButtonLink>
            {!forbidden ? (
              <Button variant="secondary" onClick={() => void load()}>
                Coba lagi
              </Button>
            ) : null}
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="page">
      <Card>
        <h1>{certificate.title}</h1>
        <p className="muted">Nomor: {certificate.certificateNumber}</p>
        <p className="muted">Diterbitkan {formatWib(certificate.issuedAt)}.</p>
        {certificate.ownerName ? <p className="muted">Pemilik: {certificate.ownerName}</p> : null}
        <p className="muted">
          Sertifikat program internal Sekolah Pelaut Indonesia, bukan sertifikat resmi STCW.
        </p>
        <div className="button-row">
          <a className="btn btn-primary" href={certificatePdfUrl(certificate.id)}>
            Unduh PDF
          </a>
          <ButtonLink to="/sertifikat">Kembali</ButtonLink>
        </div>
      </Card>
    </div>
  );
}
