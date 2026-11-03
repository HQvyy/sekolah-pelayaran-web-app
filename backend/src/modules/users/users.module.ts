import { Module, forwardRef } from '@nestjs/common';
import { UserProgressController, UsersController } from './users.controller';
import { UsersService } from './users.service';
import { ImportService } from './import.service';
import { ImportTemplateService } from './import-template.service';
import { AuthModule } from '../auth/auth.module';
import { ProgressService } from '../services/progress.service';

@Module({
  imports: [forwardRef(() => AuthModule)],
  controllers: [UsersController, UserProgressController],
  providers: [UsersService, ImportService, ImportTemplateService, ProgressService],
  exports: [UsersService],
})
export class UsersModule {}
