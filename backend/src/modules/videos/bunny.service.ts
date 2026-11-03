import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BunnyProvider } from './bunny.provider';
import { FakeBunnyProvider } from './fake-bunny.provider';

// Adapter Bunny Stream nyata memakai BUNNY_API_KEY + BUNNY_LIBRARY_ID +
// BUNNY_CDN_HOSTNAME. Selama kredensial belum tersedia, semua operasi
// integrasi GAGAL AMAN (503, terdokumentasi) — bukan token palsu.
@Injectable()
export class BunnyService implements BunnyProvider {
  readonly providerName = 'bunny';

  constructor(
    private readonly config: ConfigService,
    private readonly fake: FakeBunnyProvider,
  ) {}

  private get useFake(): boolean {
    // Nilai bisa boolean (hasil validasi Joi) atau string dari environment.
    // undefined/kosong berarti fake (aman untuk dev/test).
    const raw = this.config.get<string | boolean>('BUNNY_USE_FAKE');
    return raw === undefined || raw === '' || raw === true || raw === 'true';
  }

  private get apiKey(): string {
    return this.config.get<string>('BUNNY_API_KEY') ?? '';
  }

  private get libraryId(): string {
    return this.config.get<string>('BUNNY_LIBRARY_ID') ?? '';
  }

  get isConfigured(): boolean {
    return this.apiKey.length > 0 && this.libraryId.length > 0;
  }

  private requireConfigured(): void {
    if (!this.isConfigured) {
      throw new ServiceUnavailableException(
        'Integrasi video belum dikonfigurasi (kredensial Bunny Stream belum tersedia).',
      );
    }
  }

  async createReference(title: string) {
    // Tahap 4: kontrak adapter dikunci; pemanggilan API Bunny nyata
    // diimplementasikan saat kredensial + paket disepakati (lihat rencana §6.1.6).
    // Sementara: fake bila BUNNY_USE_FAKE=true (dev/test), gagal aman bila tidak.
    if (this.useFake) {
      return this.fake.createReference(title);
    }
    this.requireConfigured();
    throw new ServiceUnavailableException(
      'Pembuatan referensi video Bunny belum diimplementasikan.',
    );
  }

  async signPlayback(userId: string, videoId: string, ttlSeconds: number) {
    if (this.useFake) {
      return this.fake.signPlayback(userId, videoId, ttlSeconds);
    }
    this.requireConfigured();
    throw new ServiceUnavailableException(
      'Penandatanganan playback Bunny belum diimplementasikan.',
    );
  }
}
