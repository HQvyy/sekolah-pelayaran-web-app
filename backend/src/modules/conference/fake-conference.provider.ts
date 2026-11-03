import { Injectable } from '@nestjs/common';
import {
  ConferenceProvider,
  JoinMaterial,
} from './conference.provider';

// Fake untuk dev/test: ruang deterministik dari lessonId.
@Injectable()
export class FakeConferenceProvider implements ConferenceProvider {
  readonly providerName = 'fake';

  async createRoom(
    lessonId: string,
    _title: string,
  ): Promise<{ roomReference: string }> {
    void _title;
    return { roomReference: `SPLI-${lessonId.slice(0, 8)}` };
  }

  async getJoinMaterial(
    roomReference: string,
    displayName: string,
  ): Promise<JoinMaterial> {
    return {
      roomName: roomReference,
      domain: 'fake-conference.local',
      displayName,
    };
  }
}
