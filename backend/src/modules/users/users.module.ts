import { Module, forwardRef } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { ImportService } from './import.service';
import { ImportTemplateService } from './import-template.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [forwardRef(() => AuthModule)],
  controllers: [UsersController],
  providers: [UsersService, ImportService, ImportTemplateService],
  exports: [UsersService],
})
export class UsersModule {}
