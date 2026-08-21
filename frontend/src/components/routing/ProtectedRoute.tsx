import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

function ProtectedRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-ink-600">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-coral-500 border-t-transparent" />
          <span className="text-sm">Checking your session…</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    // Preserve where the user was headed so we could send them back after login later.
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}

export default ProtectedRoute;