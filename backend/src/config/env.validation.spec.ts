import { validationSchema } from './env.validation';

const JWT_SECRET = 'test-secret-minimal-32-karakter-xxxxxx';

describe('validasi environment', () => {
  it('menerima konfigurasi minimal yang valid', () => {
    const { error, value } = validationSchema.validate(
      { JWT_SECRET },
      { allowUnknown: true },
    );
    expect(error).toBeUndefined();
    expect(value.API_PREFIX).toBe('api/v1');
    expect(value.PASSING_GRADE).toBe(70);
  });

  it('mewajibkan JWT_SECRET minimal 32 karakter', () => {
    const missing = validationSchema.validate({});
    expect(missing.error).toBeDefined();
    expect(missing.error?.message).toMatch(/JWT_SECRET/i);
    const short = validationSchema.validate({ JWT_SECRET: 'terlalu-pendek' });
    expect(short.error).toBeDefined();
  });

  it('menolak NODE_ENV yang tidak dikenal', () => {
    const { error } = validationSchema.validate({
      NODE_ENV: 'prod',
      JWT_SECRET,
    });
    expect(error).toBeDefined();
  });

  it('mewajibkan DATABASE_URL di staging/production', () => {
    const { error } = validationSchema.validate({
      NODE_ENV: 'production',
      JWT_SECRET,
    });
    expect(error).toBeDefined();
    expect(error?.message).toMatch(/DATABASE_URL/i);
  });

  it('mengizinkan DATABASE_URL kosong di dev/test', () => {
    for (const env of ['development', 'test']) {
      const { error } = validationSchema.validate({
        NODE_ENV: env,
        JWT_SECRET,
      });
      expect(error).toBeUndefined();
    }
  });

  it('menolak PASSING_GRADE di luar 0-100', () => {
    const { error } = validationSchema.validate({
      PASSING_GRADE: 101,
      JWT_SECRET,
    });
    expect(error).toBeDefined();
  });

  // Guard start-up (keputusan pengguna): aplikasi TIDAK boleh start dengan
  // provider palsu di staging/production.
  it('menolak EMAIL_PROVIDER=fake di staging/production', () => {
    for (const env of ['staging', 'production']) {
      const { error } = validationSchema.validate({
        NODE_ENV: env,
        JWT_SECRET,
        DATABASE_URL: 'postgresql://postgres:postgres@127.0.0.1:5432/spli?schema=public',
        EMAIL_PROVIDER: 'fake',
        BUNNY_USE_FAKE: false,
        CONFERENCE_USE_FAKE: false,
        BUNNY_API_KEY: 'k',
        BUNNY_LIBRARY_ID: 'l',
        BUNNY_CDN_HOSTNAME: 'cdn.example.com',
      });
      expect(error?.message).toMatch(/EMAIL_PROVIDER/i);
    }
  });

  it('menolak BUNNY_USE_FAKE/CONFERENCE_USE_FAKE true di staging/production', () => {
    for (const flag of ['BUNNY_USE_FAKE', 'CONFERENCE_USE_FAKE']) {
      const { error } = validationSchema.validate({
        NODE_ENV: 'production',
        JWT_SECRET,
        DATABASE_URL: 'postgresql://postgres:postgres@127.0.0.1:5432/spli?schema=public',
        EMAIL_PROVIDER: 'smtp',
        BUNNY_USE_FAKE: false,
        CONFERENCE_USE_FAKE: false,
        BUNNY_API_KEY: 'k',
        BUNNY_LIBRARY_ID: 'l',
        BUNNY_CDN_HOSTNAME: 'cdn.example.com',
        [flag]: true,
      });
      expect(error?.message).toMatch(new RegExp(flag, 'i'));
    }
  });

  it('mewajibkan kredensial Bunny di staging/production', () => {
    const { error } = validationSchema.validate({
      NODE_ENV: 'production',
      JWT_SECRET,
      DATABASE_URL: 'postgresql://postgres:postgres@127.0.0.1:5432/spli?schema=public',
      EMAIL_PROVIDER: 'smtp',
      BUNNY_USE_FAKE: false,
      CONFERENCE_USE_FAKE: false,
      BUNNY_CDN_HOSTNAME: 'cdn.example.com',
    });
    expect(error?.message).toMatch(/BUNNY_API_KEY/i);
  });

  it('menerima konfigurasi staging/production yang lengkap', () => {
    const { error, value } = validationSchema.validate({
      NODE_ENV: 'production',
      JWT_SECRET,
      DATABASE_URL: 'postgresql://postgres:postgres@127.0.0.1:5432/spli?schema=public',
      EMAIL_PROVIDER: 'smtp',
      BUNNY_USE_FAKE: false,
      CONFERENCE_USE_FAKE: false,
      BUNNY_API_KEY: 'k',
      BUNNY_LIBRARY_ID: 'l',
      BUNNY_CDN_HOSTNAME: 'cdn.example.com',
    });
    expect(error).toBeUndefined();
    expect(value.EMAIL_PROVIDER).toBe('smtp');
    expect(value.BUNNY_USE_FAKE).toBe(false);
  });

  it('tetap mengizinkan fake provider di development', () => {
    const { error, value } = validationSchema.validate({
      NODE_ENV: 'development',
      JWT_SECRET,
      EMAIL_PROVIDER: 'fake',
      BUNNY_USE_FAKE: true,
      CONFERENCE_USE_FAKE: true,
    });
    expect(error).toBeUndefined();
    expect(value.BUNNY_USE_FAKE).toBe(true);
  });
});
