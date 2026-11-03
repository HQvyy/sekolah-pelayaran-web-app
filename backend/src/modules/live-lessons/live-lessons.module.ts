import { Module } from '@nestjs/common';
import { LiveLessonsController } from './live-lessons.controller';
import { LiveLessonsService } from './live-lessons.service';
import { ConferenceModule } from '../conference/conference.module';

@Module({
  imports: [ConferenceModule],
  controllers: [LiveLessonsController],
  providers: [LiveLessonsService],
  exports: [LiveLessonsService],
})
export class LiveLessonsModule {}
