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
});
