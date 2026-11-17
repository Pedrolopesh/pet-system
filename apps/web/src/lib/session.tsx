"use client";

import type { AuthResponse, Me, PERMISSIONS } from "@petsystem/contracts";
import { can as roleCan } from "@petsystem/contracts";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { authApi } from "./api";
import { refreshTokens, setSessionLostHandler, tokens } from "./http";

type Session = {
  me: Me | null;
  ready: boolean;
  start: (res: AuthResponse) => void;
  restore: () => Promise<boolean>;
  reload: () => Promise<void>;
  logout: () => Promise<void>;
  can: (action: keyof typeof PERMISSIONS) => boolean;
};

const SessionContext = createContext<Session | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [me, setMe] = useState<Me | null>(null);
  const [ready, setReady] = useState(false);

  const clear = useCallback(() => {
    tokens.clear();
    setMe(null);
  }, []);

  const start = useCallback((res: AuthResponse) => {
    tokens.set(res);
    setMe({ user: res.user, shop: res.shop });
    setReady(true);
  }, []);

  /** Recupera a sessão ao abrir o app (renova o token se precisar). */
  const restore = useCallback(async () => {
    try {
      if (!tokens.refresh()) return false;
      if (!tokens.access() && !(await refreshTokens())) return false;
      setMe(await authApi.me());
      return true;
    } catch {
      return false;
    } finally {
      setReady(true);
    }
  }, []);

  const reload = useCallback(async () => setMe(await authApi.me()), []);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      /* a sessão local sai de qualquer jeito */
    }
    clear();
  }, [clear]);

  // Refresh recusado em qualquer chamada: a sessão local sai e o layout manda para o login.
  // Chaves de propósito: o efeito não pode devolver o handler, senão o React o chama como limpeza.
  useEffect(() => {
    setSessionLostHandler(clear);
  }, [clear]);

  const value = useMemo<Session>(
    () => ({
      me,
      ready,
      start,
      restore,
      reload,
      logout,
      can: (action) => (me ? roleCan(me.user.role, action) : false),
    }),
    [me, ready, start, restore, reload, logout],
  );
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): Session {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession fora do SessionProvider");
  return ctx;
}
