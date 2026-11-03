import { Throttle } from '@nestjs/throttler';

// Throttle auth yang longgar di NODE_ENV=test agar E2E tidak saling
// menghabiskan kuota dari IP yang sama. Di env lain memakai batas produksi
// (AUTH_THROTTLE). Proteksi rate limit nyata diuji via test header 429.
export function AuthThrottle(limit: number, ttlMs: number) {
  return Throttle({
    default: {
      limit: process.env.NODE_ENV === 'test' ? 10000 : limit,
      ttl: ttlMs,
    },
  });
}
