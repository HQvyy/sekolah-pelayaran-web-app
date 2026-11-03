import { Injectable } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import { SERVICE_RULES } from './services.rules';

// Generator PDF sertifikat internal SPLI. Disclaimer non-STCW WAJIB tercetak
// (PRD §4.5). Tanpa QR/verifikasi publik (di luar MVP — keputusan Tahap 7).
export interface CertificateData {
  number: string;
  fullName: string;
  cohortName: string;
  issuedAt: Date;
}

@Injectable()
export class CertificatePdfService {
  async render(data: CertificateData): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 60 });
      const chunks: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', (error: Error) => reject(error));

      doc
        .fontSize(28)
        .text('Sekolah Pelaut Indonesia', { align: 'center' });
      doc.moveDown(0.5);
      doc.fontSize(20).text('Sertifikat Penyelesaian Program', { align: 'center' });
      doc.moveDown(1);
      doc.fontSize(14).text('Diberikan kepada:', { align: 'center' });
      doc.moveDown(0.3);
      doc.fontSize(24).text(data.fullName, { align: 'center', underline: true });
      doc.moveDown(0.5);
      doc
        .fontSize(14)
        .text(
          `Atas penyelesaian program pada ${data.cohortName}.`,
          { align: 'center' },
        );
      doc.moveDown(0.5);
      doc.fontSize(12).text(`Nomor sertifikat: ${data.number}`, { align: 'center' });
      doc
        .fontSize(12)
        .text(
          `Diterbitkan: ${data.issuedAt.toISOString().slice(0, 10)} (UTC)`,
          { align: 'center' },
        );
      doc.moveDown(1.5);
      doc
        .fontSize(11)
        .text(
          'Sertifikat ini adalah sertifikat program internal Sekolah Pelaut Indonesia dan bukan sertifikat resmi STCW.',
          { align: 'center' },
        );
      doc
        .fontSize(9)
        .fillColor('#555555')
        .text(
          `Kode pelacakan internal: ${SERVICE_RULES.CERT_NUMBER_PREFIX}-${data.number} (tanpa verifikasi publik)`,
          { align: 'center' },
        );
      doc.end();
    });
  }
}
