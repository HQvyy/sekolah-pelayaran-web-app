import { Global, Module } from '@nestjs/common';
import { AuditService } from './audit.service';
import { AuditLogsController } from './audit-logs.controller';

@Global()
@Module({
  controllers: [AuditLogsController],
  providers: [AuditService],
  exports: [AuditService],
})
export class AuditModule {}
