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

// Status permintaan detail: satu state alih-alih loading/error/forbidden
// terpisah yang harus di-reset manual (react/set-state-in-effect).
type DetailRequest =
  | { kind: "loading" }
  | { kind: "ready"; detail: AdminUser }
  | {
      kind: "error";
      error: { message: string; kind: "forbidden" | "generic" };
    };

export function useUserDetail(userId: string): DetailState {
  const accessToken = useAccessToken();
  const [request, setRequest] = useState<DetailRequest>({ kind: "loading" });
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;
    async function load() {
      setRequest({ kind: "loading" });
      if (!accessToken) {
        setRequest({
          kind: "error",
          error: {
            message: "Sesi berakhir. Silakan masuk kembali.",
            kind: "generic",
          },
        });
        return;
      }
      try {
        const result = await getUser(userId, accessToken);
        if (!active) return;
        setRequest({ kind: "ready", detail: result.data });
      } catch (requestError) {
        if (!active) return;
        if (requestError instanceof ApiError && requestError.status === 403) {
          setRequest({
            kind: "error",
            error: {
              message:
                "Akun ini tidak memiliki akses. Otorisasi resmi ditentukan backend.",
              kind: "forbidden",
            },
          });
        } else if (requestError instanceof ApiError) {
          setRequest({
            kind: "error",
            error: { message: requestError.message, kind: "generic" },
          });
        } else {
          setRequest({
            kind: "error",
            error: { message: "Tidak dapat menghubungi server.", kind: "generic" },
          });
        }
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, [userId, accessToken, reloadKey]);

  return {
    detail: request.kind === "ready" ? request.detail : null,
    loading: request.kind === "loading",
    error: request.kind === "error" ? request.error.message : "",
    forbidden: request.kind === "error" && request.error.kind === "forbidden",
    reload: () => setReloadKey((value) => value + 1),
  };
}
