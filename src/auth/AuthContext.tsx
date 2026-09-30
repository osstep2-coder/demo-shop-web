import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ApiError, getToken, setToken, setUnauthorizedHandler } from "../api/client";
import { authApi } from "../api/endpoints";
import { toast } from "../lib/toast";
import type { User } from "../api/types";

interface AuthState {
  user: User | null;
  /** True until the saved token is checked against /auth/me. */
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  logout: () => void;
  isCustomer: boolean;
  isStaff: boolean;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(() => Boolean(getToken()));

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    queryClient.clear();
  }, [queryClient]);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      logout();
      toast.warning("Сессия истекла", { description: "Войдите снова, чтобы продолжить" });
    });
    return () => setUnauthorizedHandler(null);
  }, [logout]);

  useEffect(() => {
    if (!getToken()) return;
    authApi
      .me()
      .then(setUser)
      // Only a rejected token is dropped; if the API is down the session survives a reload.
      .catch((e) => e instanceof ApiError && e.status === 401 && setToken(null))
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      const result = await authApi.login({ email, password });
      queryClient.clear();
      setToken(result.token);
      setUser(result.user);
      return result.user;
    },
    [queryClient],
  );

  const value = useMemo<AuthState>(
    () => ({
      user,
      loading,
      login,
      logout,
      isCustomer: user?.role === "customer",
      isStaff: user?.role === "manager" || user?.role === "admin",
      isAdmin: user?.role === "admin",
    }),
    [user, loading, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
