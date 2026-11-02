// Kode error yang dikunci sebagai kontrak kerja backend (Tahap 1).
// Daftar ini mengikuti tabel status HTTP api-spec §1.5 + §6.1 butir 1
// pada docs/backend-implementation-plan.md (status: keputusan backend,
// menunggu pengesahan FE). Menambah kode baru = revisi dokumen + persetujuan.
export enum ErrorCode {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  NOT_FOUND = 'NOT_FOUND',
  CONFLICT = 'CONFLICT',
  PAYLOAD_TOO_LARGE = 'PAYLOAD_TOO_LARGE',
  UNSUPPORTED_MEDIA_TYPE = 'UNSUPPORTED_MEDIA_TYPE',
  UNPROCESSABLE = 'UNPROCESSABLE',
  RATE_LIMITED = 'RATE_LIMITED',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
}

export interface ErrorDetail {
  field?: string;
  code: string;
  message: string;
}

export interface ErrorBody {
  code: ErrorCode | string;
  message: string;
  details: ErrorDetail[];
  requestId: string;
}

/** Respons sukses objek tunggal: `{ data, meta: null }`. */
export interface SuccessEnvelope<T> {
  data: T;
  meta: null;
}

export interface PaginationMeta {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

/** Respons sukses daftar: `{ data: [], meta: { page, pageSize, totalItems, totalPages } }`. */
export interface PaginatedEnvelope<T> {
  data: T[];
  meta: PaginationMeta;
}

export type ApiResponse<T> = SuccessEnvelope<T> | PaginatedEnvelope<T>;

export interface ErrorEnvelope {
  error: ErrorBody;
}

export function ok<T>(data: T): SuccessEnvelope<T> {
  return { data, meta: null };
}

export function paginated<T>(
  data: T[],
  page: number,
  pageSize: number,
  totalItems: number,
): PaginatedEnvelope<T> {
  return {
    data,
    meta: {
      page,
      pageSize,
      totalItems,
      totalPages: Math.ceil(totalItems / pageSize),
    },
  };
}

export function fail(
  code: ErrorCode | string,
  message: string,
  requestId: string,
  details: ErrorDetail[] = [],
): ErrorEnvelope {
  return { error: { code, message, details, requestId } };
}
