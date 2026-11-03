import { Module } from '@nestjs/common';
import { AssessmentsController } from './assessments.controller';
import { AttemptsService } from './attempts.service';
import { AssessmentsService } from './assessments.service';
import { GradingService } from './grading.service';
import { BankImportService } from './bank-import.service';
import { BankTemplateService } from './bank-template.service';

@Module({
  controllers: [AssessmentsController],
  providers: [
    AttemptsService,
    AssessmentsService,
    GradingService,
    BankImportService,
    BankTemplateService,
  ],
  exports: [AttemptsService, AssessmentsService, GradingService],
})
export class AssessmentsModule {}
