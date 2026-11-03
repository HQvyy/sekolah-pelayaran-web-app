import {
  ArgumentsHost,
  BadRequestException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { AllExceptionsFilter } from '../src/common/filters/all-exceptions.filter';
import { ErrorCode } from '../src/common/envelope';

function hostWith(
  overrides: Record<string, unknown> = {},
): ArgumentsHost {
  const json = jest.fn();
  const status = jest.fn().mockReturnValue({ json });
  const req = {
    method: 'GET',
    url: '/api/v1/contoh',
    headers: {},
    ...overrides,
  };
  return {
    switchToHttp: () => ({
      getRequest: () => req,
      getResponse: () => ({ status }),
    }),
    getArgs: () => [],
    getArgByIndex: () => undefined,
    switchToRpc: () => null,
    switchToWs: () => null,
    getType: () => 'http',
  } as unknown as ArgumentsHost;
}

describe('AllExceptionsFilter', () => {
  const filter = new AllExceptionsFilter();

  it('memformat HttpException ke envelope error kontrak', () => {
    const host = hostWith({ requestId: 'req-abc' });
    filter.catch(new NotFoundException('Data tidak ada.'), host);
    const res = host.switchToHttp().getResponse() as {
      status: jest.Mock;
    };
    const json = res.status.mock.results[0].value.json as jest.Mock;
    expect(res.status).toHaveBeenCalledWith(404);
    expect(json).toHaveBeenCalledWith({
      error: {
        code: ErrorCode.NOT_FOUND,
        message: 'Data tidak ada.',
        details: [],
        requestId: 'req-abc',
      },
    });
  });

  it('mempertahankan details validasi dari ContractValidationPipe', () => {
    const host = hostWith({ requestId: 'req-val' });
    filter.catch(
      new BadRequestException({
        code: ErrorCode.VALIDATION_ERROR,
        message: 'Data yang dikirim tidak valid.',
        details: [{ field: 'email', code: 'REQUIRED', message: 'Wajib.' }],
      }),
      host,
    );
    const res = host.switchToHttp().getResponse() as {
      status: jest.Mock;
    };
    const json = res.status.mock.results[0].value.json as jest.Mock;
    expect(json).toHaveBeenCalledWith({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Data yang dikirim tidak valid.',
        details: [{ field: 'email', code: 'REQUIRED', message: 'Wajib.' }],
        requestId: 'req-val',
      },
    });
  });

  it('menyamarkan error tak terduga tanpa stack trace', () => {
    const host = hostWith({ requestId: 'req-500' });
    filter.catch(new Error('postgres://secret-connection'), host);
    const res = host.switchToHttp().getResponse() as {
      status: jest.Mock;
    };
    const json = res.status.mock.results[0].value.json as jest.Mock;
    const body = json.mock.calls[0][0] as {
      error: { message: string; requestId: string };
    };
    expect(res.status).toHaveBeenCalledWith(500);
    expect(body.error.message).not.toContain('postgres');
    expect(body.error.requestId).toBe('req-500');
    expect(JSON.stringify(body)).not.toContain('stack');
  });

  it('memetakan 503 ke SERVICE_UNAVAILABLE', () => {
    const host = hostWith({ requestId: 'req-503' });
    filter.catch(new ServiceUnavailableException('DB down.'), host);
    const res = host.switchToHttp().getResponse() as {
      status: jest.Mock;
    };
    const json = res.status.mock.results[0].value.json as jest.Mock;
    expect(json).toHaveBeenCalledWith({
      error: {
        code: 'SERVICE_UNAVAILABLE',
        message: 'DB down.',
        details: [],
        requestId: 'req-503',
      },
    });
  });
});
