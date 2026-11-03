import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LESSON_RULES } from '../live-lessons/live-lessons.rules';
import {
  ConferenceProvider,
  JoinMaterial,
} from './conference.provider';
import { FakeConferenceProvider } from './fake-conference.provider';

// Jitsi Meet (keputusan Tahap 5: termurah/gratis + embed).
// Penggunaan dasar tanpa kredensial: ruang = slug unik di domain publik.
// Tanpa JWT Jitsi (self-host) backend tidak bisa mengunci ruang — kehadiran
// tetap dicatat dari tombol join aplikasi (sesuai PRD).
@Injectable()
export class JitsiConferenceProvider implements ConferenceProvider {
  readonly providerName = 'jitsi';

  constructor(
    private readonly config: ConfigService,
    private readonly fake: FakeConferenceProvider,
  ) {}

  private get useFake(): boolean {
    const raw = this.config.get<string | boolean>('CONFERENCE_USE_FAKE');
    return raw === undefined || raw === '' || raw === true || raw === 'true';
  }

  private get domain(): string {
    return (
      this.config.get<string>('JITSI_DOMAIN') || LESSON_RULES.JITSI_BASE_URL
    );
  }

  async createRoom(
    lessonId: string,
    _title: string,
  ): Promise<{ roomReference: string }> {
    void _title;
    if (this.useFake) return this.fake.createRoom(lessonId, _title);
    const slug = `SPLI-${lessonId.replace(/-/g, '').slice(0, 12)}`;
    return { roomReference: slug };
  }

  async getJoinMaterial(
    roomReference: string,
    displayName: string,
  ): Promise<JoinMaterial> {
    if (this.useFake) {
      return this.fake.getJoinMaterial(roomReference, displayName);
    }
    return { roomName: roomReference, domain: this.domain, displayName };
  }
}
