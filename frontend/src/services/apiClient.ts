import { apiUrl } from "../lib/config.ts";
import type { ApiErrorBody } from "../types/api.ts";

export class ApiError extends Error {
  status: number;
  code: string;
  details: ApiErrorBody["error"]["details"];
  requestId?: string;

  constructor(
    status: number,
    code: string,
    message: string,
    details?: ApiErrorBody["error"]["details"],
    requestId?: string,
  ) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
    this.requestId = requestId;
  }
}

interface ApiRequestOptions extends RequestInit {
  accessToken?: string;
  idempotencyKey?: string;
}

const ERROR_MESSAGE_BY_STATUS: Record<number, string> = {
  400: "Permintaan tidak valid. Periksa kembali data yang dikirim.",
  401: "Sesi berakhir atau belum login. Silakan login kembali.",
  403: "Akun ini tidak memiliki akses untuk tindakan tersebut.",
  404: "Data tidak ditemukan.",
  409: "Terjadi konflik data. Muat ulang lalu coba lagi.",
  413: "Ukuran berkas terlalu besar.",
  415: "Jenis berkas tidak didukung.",
  422: "Permintaan ditolak oleh aturan sistem.",
  429: "Terlalu banyak permintaan. Tunggu sebentar lalu coba lagi.",
  500: "Terjadi gangguan server. Coba lagi nanti.",
  503: "Layanan sedang tidak tersedia. Coba lagi nanti.",
};

export function errorMessageFor(status: number, fallback?: string): string {
  if (fallback && fallback.trim().length > 0) return fallback;
  return (
    ERROR_MESSAGE_BY_STATUS[status] ??
    "Terjadi kesalahan. Coba lagi atau hubungi admin."
  );
}

export async function apiRequest<T>(
  path: string,
  options: ApiRequestOptions = {},
): Promise<T> {
  const { accessToken, idempotencyKey, headers, ...init } = options;
  const requestHeaders = new Headers(headers);

  if (init.body !== undefined && !requestHeaders.has("Content-Type")) {
    requestHeaders.set("Content-Type", "application/json");
  }
  requestHeaders.set("Accept", "application/json");
  if (accessToken) requestHeaders.set("Authorization", `Bearer ${accessToken}`);
  if (idempotencyKey) requestHeaders.set("Idempotency-Key", idempotencyKey);

  const response = await fetch(apiUrl(path), { ...init, headers: requestHeaders });

  if (response.status === 204) return undefined as T;

  const contentType = response.headers.get("content-type") ?? "";
  const isJson = contentType.includes("application/json");
  const body = isJson
    ? ((await response.json().catch(() => null)) as unknown)
    : null;

  if (!response.ok) {
    const parsed = body as ApiErrorBody | null;
    throw new ApiError(
      response.status,
      parsed?.error?.code ?? `HTTP_${response.status}`,
      errorMessageFor(response.status, parsed?.error?.message),
      parsed?.error?.details,
      parsed?.error?.requestId,
    );
  }

  return (body as T) ?? (undefined as T);
}
