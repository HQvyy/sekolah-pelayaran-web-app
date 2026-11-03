import { useEffect, useState } from "react";
import { ApiError } from "../../services/apiClient.ts";
import { useAccessToken } from "./useAccountList.ts";
import type { AdminUser } from "./accountTypes.ts";
import { getUser } from "./accountService.ts";

interface DetailState {
  detail: AdminUser | null;
  loading: boolean;
  error: string;
  forbidden: boolean;
  reload: () => void;
}

export function useUserDetail(userId: string): DetailState {
  const accessToken = useAccessToken();
  const [detail, setDetail] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [forbidden, setForbidden] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;
    async function load() {
      if (!accessToken) {
        setLoading(false);
        setError("Sesi berakhir. Silakan masuk kembali.");
        return;
      }
      setLoading(true);
      setError("");
      setForbidden(false);
      try {
        const result = await getUser(userId, accessToken);
        if (!active) return;
        setDetail(result.data);
      } catch (requestError) {
        if (!active) return;
        if (requestError instanceof ApiError && requestError.status === 403) {
          setForbidden(true);
          setError("Akun ini tidak memiliki akses. Otorisasi resmi ditentukan backend.");
        } else if (requestError instanceof ApiError) {
          setError(requestError.message);
        } else {
          setError("Tidak dapat menghubungi server.");
        }
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, [userId, accessToken, reloadKey]);

  return {
    detail,
    loading,
    error,
    forbidden,
    reload: () => setReloadKey((value) => value + 1),
  };
}
