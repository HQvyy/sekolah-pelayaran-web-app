import { useContext } from "react";
import { SessionContext, type SessionState } from "./session.ts";

export function useSession(): SessionState {
  const session = useContext(SessionContext);
  if (!session) throw new Error("useSession harus dipakai di dalam SessionProvider.");
  return session;
}
