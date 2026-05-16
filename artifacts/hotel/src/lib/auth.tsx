import { createContext, useContext, type ReactNode } from "react";
import { useMe, useLogin, useLogout, useRegister, getMeQueryKey } from "@workspace/api-client-react";
import type { User } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";

interface AuthCtx {
  user: User | null | undefined;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string, phone?: string) => Promise<void>;
  logout: () => Promise<void>;
}

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient();
  const me = useMe({ query: { queryKey: getMeQueryKey(), retry: false, staleTime: 30_000 } });
  const login = useLogin();
  const register = useRegister();
  const logout = useLogout();

  const value: AuthCtx = {
    user: me.isError ? null : me.data,
    isLoading: me.isLoading,
    async login(email, password) {
      await login.mutateAsync({ data: { email, password } });
      await qc.invalidateQueries({ queryKey: getMeQueryKey() });
    },
    async register(name, email, password, phone) {
      await register.mutateAsync({ data: { name, email, password, phone } });
      await qc.invalidateQueries({ queryKey: getMeQueryKey() });
    },
    async logout() {
      await logout.mutateAsync();
      await qc.invalidateQueries({ queryKey: getMeQueryKey() });
    },
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
