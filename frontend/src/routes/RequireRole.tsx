import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useSession } from "../app/useSession.ts";
import type { UserRole } from "../types/api.ts";

function RestoringSession() {
  return (
    <div className="page">
      <p className="muted" role="status">
        Memulihkan sesi...
      </p>
    </div>
  );
}

export function RequireAuth({ children }: { children: ReactNode }) {
  const location = useLocation();
  const { user, restoring } = useSession();
  if (restoring) return <RestoringSession />;
  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  return <>{children}</>;
}

export function RequireRole({
  roles,
  children,
}: {
  roles: UserRole[];
  children: ReactNode;
}) {
  const { user, restoring } = useSession();

  if (restoring) return <RestoringSession />;
  if (!user) return <Navigate to="/login" replace />;
  if (!roles.includes(user.role)) return <Navigate to="/403" replace />;
  return <>{children}</>;
}
