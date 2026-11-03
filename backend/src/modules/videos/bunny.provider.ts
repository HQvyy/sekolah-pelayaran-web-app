// Kontrak adapter Bunny Stream. Implementasi real disuntik belakangan via
// environment (BUNNY_*); FakeBunnyProvider untuk dev/test.
// Backend menyimpan metadata + referensi; berkas tidak lewat server aplikasi.
export interface BunnyVideoReference {
  providerVideoId: string;
  libraryId: string;
}

export interface PlaybackGrant {
  // Token/URL playback terikat user+video, umur ≤2 jam.
  // Fake: string penanda JELAS-JELAS bukan token sungguhan.
  playbackToken: string;
  expiresAt: Date;
}

export interface BunnyProvider {
  readonly providerName: string;
  createReference(title: string): Promise<BunnyVideoReference>;
  signPlayback(
    userId: string,
    videoId: string,
    ttlSeconds: number,
  ): Promise<PlaybackGrant>;
}
