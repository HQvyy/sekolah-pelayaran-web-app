import type { ReactNode } from "react";
import { SessionContext, type SessionState } from "./session.ts";
import { useSessionState } from "./useSessionState.ts";

export type { SessionState };

export function SessionProvider({ children }: { children: ReactNode }) {
  const value = useSessionState();
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}
