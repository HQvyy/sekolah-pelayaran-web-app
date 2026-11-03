import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import {
  BunnyProvider,
  BunnyVideoReference,
  PlaybackGrant,
} from './bunny.provider';

// Fake untuk dev/test. Token yang dihasilkan JELAS-JELAS penanda
// (prefix FAKE-) — jangan pernah disangka token sungguhan.
@Injectable()
export class FakeBunnyProvider implements BunnyProvider {
  readonly providerName = 'fake';
  private readonly logger = new Logger(FakeBunnyProvider.name);

  async createReference(title: string): Promise<BunnyVideoReference> {
    const id = randomUUID();
    this.logger.log(`[fake-bunny] createReference "${title}" → ${id}`);
    return { providerVideoId: id, libraryId: 'fake-library' };
  }

  async signPlayback(
    userId: string,
    videoId: string,
    ttlSeconds: number,
  ): Promise<PlaybackGrant> {
    const playbackToken = `FAKE-PLAYBACK-${userId.slice(0, 8)}-${videoId.slice(0, 8)}-${Date.now()}`;
    return {
      playbackToken,
      expiresAt: new Date(Date.now() + ttlSeconds * 1000),
    };
  }
}
