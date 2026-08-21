import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { apiClient, AUTH_TOKEN_STORAGE_KEY } from '../lib/apiClient';
import type { User } from '../types/auth';

interface AuthResponse {
  token: string;
  user: User;
}

interface MeResponse {
  user: User;
}

interface AuthContextValue {
  /** The currently authenticated user, or null if not logged in. */
  user: User | null;
  /** True while restoring a session from a stored token on app startup. */
  isLoading: boolean;
  /** Convenience flag: true once `user` is populated. */
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  // Only start in a "loading" state if there's actually a token to verify.
  // This avoids an unnecessary synchronous setState in the effect below
  // for the common case of a fresh, logged-out visitor.
  const [isLoading, setIsLoading] = useState(
    () => localStorage.getItem(AUTH_TOKEN_STORAGE_KEY) !== null
  );

  // On startup, if a token was persisted from a previous session, verify it
  // against the backend and restore the user. If it's missing, invalid, or
  // expired, make sure we end up in a clean logged-out state.
  useEffect(() => {
    const token = localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);

    if (!token) {
      return;
    }

    let cancelled = false;

    apiClient
      .get<MeResponse>('/auth/me')
      .then((data) => {
        if (!cancelled) {
          setUser(data.user);
        }
      })
      .catch(() => {
        // Token invalid/expired (or backend unreachable) — drop it and stay logged out.
        localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
        if (!cancelled) {
          setUser(null);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const login = async (email: string, password: string) => {
    const data = await apiClient.post<AuthResponse>('/auth/login', { email, password });
    localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, data.token);
    setUser(data.user);
  };

  const register = async (name: string, email: string, password: string) => {
    const data = await apiClient.post<AuthResponse>('/auth/register', { name, email, password });
    localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, data.token);
    setUser(data.user);
  };

  const logout = () => {
    localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
    setUser(null);
  };

  const value: AuthContextValue = {
    user,
    isLoading,
    isAuthenticated: user !== null,
    login,
    register,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// The hook and its provider are intentionally colocated; this only affects
// Vite's fast-refresh granularity, not correctness.
// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}