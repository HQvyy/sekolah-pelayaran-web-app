import { validationSchema } from './env.validation';

describe('validasi environment', () => {
  it('menerima konfigurasi minimal yang valid', () => {
    const { error, value } = validationSchema.validate(
      {},
      { allowUnknown: true },
    );
    expect(error).toBeUndefined();
    expect(value.API_PREFIX).toBe('api/v1');
    expect(value.PASSING_GRADE).toBe(70);
  });

  it('menolak NODE_ENV yang tidak dikenal', () => {
    const { error } = validationSchema.validate({ NODE_ENV: 'prod' });
    expect(error).toBeDefined();
  });

  it('mewajibkan DATABASE_URL di staging/production', () => {
    const { error } = validationSchema.validate({ NODE_ENV: 'production' });
    expect(error).toBeDefined();
    expect(error?.message).toMatch(/DATABASE_URL/i);
  });

  it('mengizinkan DATABASE_URL kosong di dev/test', () => {
    for (const env of ['development', 'test']) {
      const { error } = validationSchema.validate({ NODE_ENV: env });
      expect(error).toBeUndefined();
    }
  });

  it('menolak PASSING_GRADE di luar 0-100', () => {
    const { error } = validationSchema.validate({ PASSING_GRADE: 101 });
    expect(error).toBeDefined();
  });
});
