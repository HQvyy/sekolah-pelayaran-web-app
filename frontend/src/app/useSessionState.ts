import { useCallback, useMemo, useState } from "react";
import type { SessionUser } from "../types/api.ts";
import { fetchMe } from "../features/auth/authService.ts";
import { ApiError } from "../services/apiClient.ts";
import type { SessionState } from "./session.ts";

export function useSessionState(): SessionState {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [authChallengeId, setAuthChallengeId] = useState<string | null>(null);
  const [sessionExpired, setSessionExpired] = useState(false);

  const setSession = useCallback((nextUser: SessionUser, token: string) => {
    setUser(nextUser);
    setAccessToken(token);
    setAuthChallengeId(null);
    setSessionExpired(false);
  }, []);

  const clearSession = useCallback(() => {
    setUser(null);
    setAccessToken(null);
    setAuthChallengeId(null);
    setSessionExpired(false);
  }, []);

  const startChallenge = useCallback((challengeId: string) => {
    setUser(null);
    setAccessToken(null);
    setAuthChallengeId(challengeId);
    setSessionExpired(false);
  }, []);

  const markSessionExpired = useCallback(() => {
    setUser(null);
    setAccessToken(null);
    setSessionExpired(true);
  }, []);

  const loadMe = useCallback(
    async (token: string): Promise<SessionUser> => {
      try {
        const result = await fetchMe(token);
        setSession(result.data.user, token);
        return result.data.user;
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) {
          markSessionExpired();
        }
        throw error;
      }
    },
    [markSessionExpired, setSession],
  );

  return useMemo<SessionState>(
    () => ({
      user,
      accessToken,
      authChallengeId,
      sessionExpired,
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
      setSession,
      clearSession,
      startChallenge,
      markSessionExpired,
      loadMe,
    ],
  );
}
