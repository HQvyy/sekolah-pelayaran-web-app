import { Module } from '@nestjs/common';
import { BunnyService } from './bunny.service';
import { FakeBunnyProvider } from './fake-bunny.provider';

@Module({
  providers: [
    FakeBunnyProvider,
    BunnyService,
    { provide: 'BUNNY_PROVIDER', useExisting: BunnyService },
  ],
  exports: [BunnyService, FakeBunnyProvider, 'BUNNY_PROVIDER'],
})
export class VideosModule {}
