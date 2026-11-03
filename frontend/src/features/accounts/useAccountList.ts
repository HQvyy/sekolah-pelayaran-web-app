import { useCallback, useEffect, useState } from "react";
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

export function usePaginatedList<T>(
  loader: (page: number) => Promise<{ items: T[]; totalItems: number; totalPages: number }>,
  initialPage = 1,
): AsyncListState<T> & { page: number; setPage: (page: number) => void } {
  const [page, setPage] = useState(initialPage);
  const [items, setItems] = useState<T[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [forbidden, setForbidden] = useState(false);
  const [unauthorized, setUnauthorized] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    setForbidden(false);
    setUnauthorized(false);
    loader(page)
      .then((result) => {
        if (!active) return;
        setItems(result.items);
        setTotalItems(result.totalItems);
        setTotalPages(result.totalPages);
      })
      .catch((requestError: unknown) => {
        if (!active) return;
        if (requestError instanceof ApiError) {
          if (requestError.status === 401) {
            setUnauthorized(true);
            setError("Sesi berakhir. Silakan masuk kembali.");
          } else if (requestError.status === 403) {
            setForbidden(true);
            setError("Akun ini tidak memiliki akses. Otorisasi resmi ditentukan backend.");
          } else {
            setError(requestError.message);
          }
        } else {
          setError("Tidak dapat menghubungi server. Periksa koneksi lalu coba lagi.");
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [loader, page, reloadKey]);

  const reload = useCallback(() => {
    setReloadKey((value) => value + 1);
  }, []);

  return { items, totalItems, totalPages, loading, error, forbidden, unauthorized, reload, page, setPage };
}
