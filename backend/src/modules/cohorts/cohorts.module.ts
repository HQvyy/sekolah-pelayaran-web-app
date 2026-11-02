import { Module } from '@nestjs/common';
import { CohortsController } from './cohorts.controller';
import { MeController } from './me.controller';
import { CohortsService } from './cohorts.service';

@Module({
  controllers: [CohortsController, MeController],
  providers: [CohortsService],
  exports: [CohortsService],
})
export class CohortsModule {}
