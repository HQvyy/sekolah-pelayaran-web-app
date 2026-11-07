import { HttpException, HttpStatus } from '@nestjs/common';
import { ExecutionContext } from '@nestjs/common';
import { UploadThrottleGuard } from './upload-throttle.guard';
import { UPLOAD_THROTTLE_RULES } from './upload.rules';

// Suite khusus: memverifikasi batas 10/jam/pengguna untuk impor/unggahan.
// Berjalan di NODE_ENV=test, tempat guard sengaja melonggarkan batas untuk
// suite E2E lain — sehingga mekanismenya diuji lewat panggilan langsung
// (bukan via HTTP) agar tidak bergantung pada NODE_ENV.
describe('UploadThrottleGuard', () => {
  const originalNodeEnv = process.env.NODE_ENV;

  function contextFor(userId?: string) {
    const headers: Record<string, string | number> = {};
    const context = {
      switchToHttp: () => ({
        getRequest: () => ({ user: userId ? { id: userId } : undefined }),
        getResponse: () => ({
          header: (name: string, value: string | number) => {
            headers[name] = value;
          },
        }),
      }),
    } as unknown as ExecutionContext;
    return { context, headers };
  }

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
  });

  it('meneruskan permintaan di bawah batas', () => {
    process.env.NODE_ENV = 'production';
    const guard = new UploadThrottleGuard();
    for (let index = 0; index < UPLOAD_THROTTLE_RULES.LIMIT; index += 1) {
      const { context } = contextFor('user-1');
      expect(guard.canActivate(context)).toBe(true);
    }
  });

  it('menolak permintaan ke-11 dengan 429 + Retry-After', () => {
    process.env.NODE_ENV = 'production';
    const guard = new UploadThrottleGuard();
    for (let index = 0; index < UPLOAD_THROTTLE_RULES.LIMIT; index += 1) {
      const { context } = contextFor('user-2');
      guard.canActivate(context);
    }
    const { context, headers } = contextFor('user-2');
    try {
      guard.canActivate(context);
      throw new Error('seharusnya menolak');
    } catch (error) {
      expect(error).toBeInstanceOf(HttpException);
      const status = (error as HttpException).getStatus();
      expect(status).toBe(HttpStatus.TOO_MANY_REQUESTS);
      expect(headers['Retry-After']).toBeGreaterThan(0);
    }
  });

  it('kuota terpisah per pengguna', () => {
    process.env.NODE_ENV = 'production';
    const guard = new UploadThrottleGuard();
    for (let index = 0; index < UPLOAD_THROTTLE_RULES.LIMIT; index += 1) {
      const { context } = contextFor('user-a');
      guard.canActivate(context);
    }
    const { context } = contextFor('user-b');
    expect(guard.canActivate(context)).toBe(true);
  });

  it('menolak bila identitas pengguna tidak tersedia', () => {
    process.env.NODE_ENV = 'production';
    const guard = new UploadThrottleGuard();
    const { context } = contextFor();
    try {
      guard.canActivate(context);
      throw new Error('seharusnya menolak');
    } catch (error) {
      expect((error as HttpException).getStatus()).toBe(HttpStatus.UNAUTHORIZED);
    }
  });
});
