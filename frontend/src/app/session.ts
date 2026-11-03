import { createContext } from "react";
import type { SessionUser, UserRole } from "../types/api.ts";

export interface SessionState {
  user: SessionUser | null;
  accessToken: string | null;
  authChallengeId: string | null;
  sessionExpired: boolean;
  setSession: (user: SessionUser, accessToken: string) => void;
  clearSession: () => void;
  startChallenge: (challengeId: string) => void;
  markSessionExpired: () => void;
  loadMe: (accessToken: string) => Promise<SessionUser>;
  hasRole: (roles: UserRole[]) => boolean;
}

export const SessionContext = createContext<SessionState | null>(null);
