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
  /** Lewati percobaan refresh otomatis (dipakai untuk endpoint refresh itu sendiri). */
  skipAutoRefresh?: boolean;
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

/** Callback yang diisi session store: ambil token aktif untuk retry, simpan token baru, hapus sesi. */
interface SessionHooks {
  getAccessToken: () => string | null;
  setSessionFromRefresh: (accessToken: string) => void;
  markSessionExpired: () => void;
}

let sessionHooks: SessionHooks | null = null;

export function registerSessionHooks(hooks: SessionHooks): void {
  sessionHooks = hooks;
}

export async function apiRequest<T>(
  path: string,
  options: ApiRequestOptions = {},
): Promise<T> {
  const { accessToken, idempotencyKey, skipAutoRefresh, headers, ...init } = options;
  const doFetch = async (token?: string): Promise<Response> => {
    const requestHeaders = new Headers(headers);
    if (init.body !== undefined && !requestHeaders.has("Content-Type")) {
      requestHeaders.set("Content-Type", "application/json");
    }
    requestHeaders.set("Accept", "application/json");
    if (token) requestHeaders.set("Authorization", `Bearer ${token}`);
    if (idempotencyKey) requestHeaders.set("Idempotency-Key", idempotencyKey);
    // credentials:include agar cookie refresh HttpOnly terkirim ke /auth/refresh & logout.
    return fetch(apiUrl(path), { ...init, headers: requestHeaders, credentials: "include" });
  };

  const parseBody = async (response: Response): Promise<unknown> => {
    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.includes("application/json")) return null;
    return (await response.json().catch(() => null)) as unknown;
  };

  const toError = (response: Response, body: unknown): ApiError => {
    const parsed = body as ApiErrorBody | null;
    return new ApiError(
      response.status,
      parsed?.error?.code ?? `HTTP_${response.status}`,
      errorMessageFor(response.status, parsed?.error?.message),
      parsed?.error?.details,
      parsed?.error?.requestId,
    );
  };

  let response = await doFetch(accessToken);

  // Auto-refresh sekali saat 401 (kecuali untuk endpoint refresh sendiri).
  if (
    response.status === 401 &&
    !skipAutoRefresh &&
    sessionHooks &&
    path !== "/auth/refresh" &&
    path !== "/auth/login" &&
    path !== "/auth/2fa/verify"
  ) {
    try {
      const refreshResponse = await fetch(apiUrl("/auth/refresh"), {
        method: "POST",
        headers: { Accept: "application/json" },
        credentials: "include",
      });
      const refreshBody = await parseBody(refreshResponse);
      if (refreshResponse.ok) {
        const next = (refreshBody as { data?: { accessToken?: string } } | null)?.data?.accessToken;
        if (next) {
          sessionHooks.setSessionFromRefresh(next);
          const retryToken = sessionHooks.getAccessToken() ?? next;
          response = await doFetch(retryToken);
        }
      } else {
        sessionHooks.markSessionExpired();
      }
    } catch {
      sessionHooks.markSessionExpired();
    }
  }

  if (response.status === 204) return undefined as T;

  const body = await parseBody(response);

  if (!response.ok) {
    throw toError(response, body);
  }

  return (body as T) ?? (undefined as T);
}
