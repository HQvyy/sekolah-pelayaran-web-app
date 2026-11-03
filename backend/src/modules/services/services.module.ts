import { Module } from '@nestjs/common';
import { ServicesController } from './services.controller';
import { RatingsService } from './ratings.service';
import { CertificatesService } from './certificates.service';
import { CertificatePdfService } from './certificate-pdf.service';
import { TicketsService } from './tickets.service';

@Module({
  controllers: [ServicesController],
  providers: [
    RatingsService,
    CertificatesService,
    CertificatePdfService,
    TicketsService,
  ],
  exports: [RatingsService, CertificatesService, TicketsService],
})
export class ServicesModule {}
