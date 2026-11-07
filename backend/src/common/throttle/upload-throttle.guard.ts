import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { Request } from 'express';
import { UPLOAD_THROTTLE_RULES } from './upload.rules';

// Guard khusus endpoint impor/unggahan: 10 permintaan per jam PER PENGGUNA
// (kontrak §6.1 butir 1). Didaftarkan lewat @UseGuards() pada route, sehingga
// berjalan SETELAH JwtAuthGuard/RolesGuard global — pada titik ini
// `req.user.id` sudah tersedia dan kuota benar-benar per-pengguna.
//
// Penyimpanan in-memory (Map) sudah cukup untuk satu instance backend. Untuk
// beberapa instance perlu store bersama (Redis) — batasan ini konsisten dengan
// ThrottlerStorageService bawaan @nestjs/throttler.
//
// Di NODE_ENV=test batas dilonggarkan agar E2E lain tidak saling menghabiskan
// kuota pengguna yang sama; proteksi nyata diuji di suite throttling khusus
// (yang meng-override NODE_ENV saat pemanggilan — karena itu pemeriksaan
// dilakukan per-permintaan, bukan sekali saat modul dimuat).
const skipInTest = () => process.env.NODE_ENV === 'test';

interface Bucket {
  count: number;
  expiresAt: number;
}

@Injectable()
export class UploadThrottleGuard implements CanActivate {
  private readonly buckets = new Map<string, Bucket>();

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<
      Request & { user?: { id?: string } }
    >();
    const userId = req.user?.id;
    if (!userId) {
      // Tanpa identitas (seharusnya tidak terjadi — guard global menolak
      // lebih dulu) → jaga-jaga: tolak alih-alih memakai tracker anonim.
      throw new HttpException(
        'Autentikasi diperlukan.',
        HttpStatus.UNAUTHORIZED,
      );
    }
    if (skipInTest()) return true;
    const now = Date.now();
    const key = `upload:${userId}`;
    const bucket = this.buckets.get(key);
    if (!bucket || bucket.expiresAt <= now) {
      this.buckets.set(key, {
        count: 1,
        expiresAt: now + UPLOAD_THROTTLE_RULES.TTL_MS,
      });
      return true;
    }
    bucket.count += 1;
    if (bucket.count > UPLOAD_THROTTLE_RULES.LIMIT) {
      const retryAfter = Math.max(1, Math.ceil((bucket.expiresAt - now) / 1000));
      const res = context.switchToHttp().getResponse<{
        header?: (name: string, value: string | number) => void;
        setHeader?: (name: string, value: string | number) => void;
      }>();
      if (typeof res.header === 'function') {
        res.header('Retry-After', retryAfter);
      } else if (typeof res.setHeader === 'function') {
        res.setHeader('Retry-After', retryAfter);
      }
      throw new HttpException(
        `Batas ${UPLOAD_THROTTLE_RULES.LIMIT} impor/unggahan per jam terlampaui.`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    return true;
  }
}
