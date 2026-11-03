import { Module } from '@nestjs/common';
import { ServicesController } from './services.controller';
import { RatingsService } from './ratings.service';
import { CertificatesService } from './certificates.service';
import { CertificatePdfService } from './certificate-pdf.service';
import { ProgressService } from './progress.service';
import { TicketsService } from './tickets.service';

@Module({
  controllers: [ServicesController],
  providers: [
    RatingsService,
    CertificatesService,
    CertificatePdfService,
    ProgressService,
    TicketsService,
  ],
  exports: [RatingsService, CertificatesService, ProgressService, TicketsService],
})
export class ServicesModule {}
