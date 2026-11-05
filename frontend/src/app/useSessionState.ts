import { useCallback, useEffect, useMemo, useState } from "react";
import type { SessionUser } from "../types/api.ts";
import { fetchMe } from "../features/auth/authService.ts";
import { ApiError, registerSessionHooks } from "../services/apiClient.ts";
import type { SessionState } from "./session.ts";

const TOKEN_STORAGE_KEY = "spli.accessToken";

function readStoredToken(): string | null {
  try {
    return window.sessionStorage.getItem(TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

function writeStoredToken(token: string | null): void {
  try {
    if (token) window.sessionStorage.setItem(TOKEN_STORAGE_KEY, token);
    else window.sessionStorage.removeItem(TOKEN_STORAGE_KEY);
  } catch {
    // Abaikan kegagalan storage (mode privat dsb): sesi tetap jalan di memori.
  }
}

export function useSessionState(): SessionState {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(() => readStoredToken());
  const [authChallengeId, setAuthChallengeId] = useState<string | null>(null);
  const [sessionExpired, setSessionExpired] = useState(false);
  const [restoring, setRestoring] = useState(() => Boolean(readStoredToken()));
  // Mencegah double restore saat StrictMode me-mount ulang.
  const [restored, setRestored] = useState(false);

  const setSession = useCallback((nextUser: SessionUser, token: string) => {
    setUser(nextUser);
    setAccessToken(token);
    writeStoredToken(token);
    setAuthChallengeId(null);
    setSessionExpired(false);
  }, []);

  const setTokenOnly = useCallback((token: string) => {
    setAccessToken(token);
    writeStoredToken(token);
  }, []);

  const clearSession = useCallback(() => {
    setUser(null);
    setAccessToken(null);
    writeStoredToken(null);
    setAuthChallengeId(null);
    setSessionExpired(false);
  }, []);

  const startChallenge = useCallback((challengeId: string) => {
    setUser(null);
    setAccessToken(null);
    writeStoredToken(null);
    setAuthChallengeId(challengeId);
    setSessionExpired(false);
  }, []);

  const markSessionExpired = useCallback(() => {
    setUser(null);
    setAccessToken(null);
    writeStoredToken(null);
    setSessionExpired(true);
  }, []);

  const loadMe = useCallback(
    async (token: string): Promise<SessionUser> => {
      try {
        const result = await fetchMe(token);
        setSession(result.data, token);
        return result.data;
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) {
          markSessionExpired();
        }
        throw error;
      }
    },
    [markSessionExpired, setSession],
  );

  // Daftarkan hooks agar apiClient bisa auto-refresh memakai token terbaru.
  useEffect(() => {
    registerSessionHooks({
      getAccessToken: () => readStoredToken(),
      setSessionFromRefresh: (token: string) => setTokenOnly(token),
      markSessionExpired: () => markSessionExpired(),
    });
  }, [markSessionExpired, setTokenOnly]);

  // Restore sesi saat reload: token tersimpan -> panggil /auth/me sekali.
  useEffect(() => {
    if (restored) return;
    setRestored(true);
    const stored = readStoredToken();
    if (!stored) {
      setRestoring(false);
      return;
    }
    void loadMe(stored)
      .catch(() => {
        // loadMe sudah menandai expired bila 401; abaikan error di sini.
      })
      .finally(() => setRestoring(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return useMemo<SessionState>(
    () => ({
      user,
      accessToken,
      authChallengeId,
      sessionExpired,
      restoring,
      setSession,
      clearSession,
      startChallenge,
      markSessionExpired,
      loadMe,
      hasRole: (roles) => (user ? roles.includes(user.role) : false),
    }),
    [
      user,
      accessToken,
      authChallengeId,
      sessionExpired,
      restoring,
      setSession,
      clearSession,
      startChallenge,
      markSessionExpired,
      loadMe,
    ],
  );
}
