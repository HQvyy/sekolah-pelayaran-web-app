import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError } from "../../services/apiClient.ts";
import { useSession } from "../../app/useSession.ts";

interface AsyncListState<T> {
  items: T[];
  totalItems: number;
  totalPages: number;
  loading: boolean;
  error: string;
  forbidden: boolean;
  unauthorized: boolean;
  reload: () => void;
}

export function useAccessToken(): string | null {
  const { accessToken } = useSession();
  return accessToken;
}

export function fieldErrors(error: unknown): Record<string, string> {
  if (error instanceof ApiError && error.details) {
    const mapped: Record<string, string> = {};
    for (const detail of error.details) {
      if (detail.field && !mapped[detail.field]) mapped[detail.field] = detail.message;
    }
    return mapped;
  }
  return {};
}

// Pesan error yang aman ditampilkan: memetakan status HTTP ke kalimat
// berbahasa Indonesia (status yang sama ditangani seragam di semua halaman).
function describeError(requestError: unknown): {
  message: string;
  kind: "unauthorized" | "forbidden" | "generic";
} {
  if (requestError instanceof ApiError) {
    if (requestError.status === 401) {
      return {
        message: "Sesi berakhir. Silakan masuk kembali.",
        kind: "unauthorized",
      };
    }
    if (requestError.status === 403) {
      return {
        message:
          "Akun ini tidak memiliki akses. Otorisasi resmi ditentukan backend.",
        kind: "forbidden",
      };
    }
    return { message: requestError.message, kind: "generic" };
  }
  return {
    message: "Tidak dapat menghubungi server. Periksa koneksi lalu coba lagi.",
    kind: "generic",
  };
}

// Satu sumber kebenaran untuk hasil permintaan: "ready" saat data datang,
// "error" saat gagal. Status "loading" dilacak terpisah lewat penanda
// permintaan aktif — bukan di-reset manual setiap permintaan dimulai
// (react/set-state-in-effect).
type ListRequest<T> =
  | { kind: "empty" }
  | {
      kind: "ready";
      items: T[];
      totalItems: number;
      totalPages: number;
    }
  | {
      kind: "error";
      error: {
        message: string;
        kind: "unauthorized" | "forbidden" | "generic";
      };
    };

export function usePaginatedList<T>(
  loader: (page: number) => Promise<{ items: T[]; totalItems: number; totalPages: number }>,
  initialPage = 1,
): AsyncListState<T> & { page: number; setPage: (page: number) => void } {
  const [page, setPage] = useState(initialPage);
  const [reloadKey, setReloadKey] = useState(0);
  const [request, setRequest] = useState<ListRequest<T>>({ kind: "empty" });
  // Nomor urut permintaan terbaru — menjaga agar respons lama (yang datang
  // setelah halaman berubah atau reload) tidak menimpa data yang lebih baru.
  const requestIdRef = useRef(0);
  // Nomor urut permintaan yang sedang berjalan; "loading" = ada permintaan
  // aktif (bukan state terpisah), sehingga efek tidak perlu setState di awal.
  const [activeRequest, setActiveRequest] = useState(0);

  useEffect(() => {
    let active = true;
    const requestId = ++requestIdRef.current;
    setActiveRequest(requestId);
    loader(page)
      .then((result) => {
        if (!active || requestId !== requestIdRef.current) return;
        setRequest({
          kind: "ready",
          items: result.items,
          totalItems: result.totalItems,
          totalPages: result.totalPages,
        });
      })
      .catch((requestError: unknown) => {
        if (!active || requestId !== requestIdRef.current) return;
        setRequest({ kind: "error", error: describeError(requestError) });
      })
      .finally(() => {
        if (active && requestId === requestIdRef.current) setActiveRequest(0);
      });
    return () => {
      active = false;
    };
  }, [loader, page, reloadKey]);

  const reload = useCallback(() => {
    setReloadKey((value) => value + 1);
  }, []);

  return {
    items: request.kind === "ready" ? request.items : [],
    totalItems: request.kind === "ready" ? request.totalItems : 0,
    totalPages: request.kind === "ready" ? request.totalPages : 0,
    loading: activeRequest > 0,
    error: request.kind === "error" ? request.error.message : "",
    forbidden:
      request.kind === "error" && request.error.kind === "forbidden",
    unauthorized:
      request.kind === "error" && request.error.kind === "unauthorized",
    reload,
    page,
    setPage,
  };
}
