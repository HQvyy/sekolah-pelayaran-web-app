import { Module } from '@nestjs/common';
import { FakeConferenceProvider } from './fake-conference.provider';
import { JitsiConferenceProvider } from './jitsi-conference.provider';

@Module({
  providers: [
    FakeConferenceProvider,
    JitsiConferenceProvider,
    { provide: 'CONFERENCE_PROVIDER', useExisting: JitsiConferenceProvider },
  ],
  exports: [JitsiConferenceProvider, FakeConferenceProvider, 'CONFERENCE_PROVIDER'],
})
export class ConferenceModule {}
