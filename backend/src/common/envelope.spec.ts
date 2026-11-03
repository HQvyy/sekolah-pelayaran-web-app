import { ok, paginated, fail, ErrorCode } from './envelope';

describe('envelope', () => {
  it('membungkus objek tunggal tanpa pembungkusan ganda', () => {
    expect(ok({ id: '1' })).toEqual({ data: { id: '1' }, meta: null });
  });

  it('menghitung meta pagination dengan benar', () => {
    expect(paginated([1, 2, 3], 2, 2, 5)).toEqual({
      data: [1, 2, 3],
      meta: { page: 2, pageSize: 2, totalItems: 5, totalPages: 3 },
    });
  });

  it('membulatkan totalPages ke atas untuk sisa baris', () => {
    const result = paginated([], 1, 20, 21);
    expect(result.meta.totalPages).toBe(2);
  });

  it('membentuk envelope error kontrak', () => {
    expect(fail(ErrorCode.NOT_FOUND, 'Tidak ditemukan.', 'req-1')).toEqual({
      error: {
        code: 'NOT_FOUND',
        message: 'Tidak ditemukan.',
        details: [],
        requestId: 'req-1',
      },
    });
  });
});
