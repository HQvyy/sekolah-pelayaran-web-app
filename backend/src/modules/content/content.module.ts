import { Module } from '@nestjs/common';
import { ContentController } from './content.controller';
import { ThumbnailController } from './thumbnail.controller';
import { ContentService } from './content.service';
import { VideosModule } from '../videos/videos.module';

@Module({
  imports: [VideosModule],
  controllers: [ContentController, ThumbnailController],
  providers: [ContentService],
  exports: [ContentService],
})
export class ContentModule {}
