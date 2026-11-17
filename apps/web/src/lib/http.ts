import type { ApiError as ApiErrorBody, AuthResponse } from "@petsystem/contracts";

/** Cliente HTTP da API: base URL, tokens, refresh automático e erros num lugar só. */
export const API_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:3340").replace(/\/$/, "");

const ACCESS = "petsystem.access";
const REFRESH = "petsystem.refresh";

/**
 * O access token (15 min) fica no sessionStorage, só desta aba. O refresh fica no localStorage para
 * manter a sessão; ele é rotativo e de uso único: se alguém reusar um token antigo, a API encerra a
 * sessão inteira.
 */
const store = (kind: "session" | "local"): Storage | null => {
  if (typeof window === "undefined") return null;
  try {
    return kind === "session" ? window.sessionStorage : window.localStorage;
  } catch {
    return null;
  }
};

/** Sempre lido do armazenamento (sem cópia em memória): todas as partes do app veem o mesmo token. */
export const tokens = {
  access: () => store("session")?.getItem(ACCESS) ?? null,
  refresh: () => store("local")?.getItem(REFRESH) ?? null,
  set(res: Pick<AuthResponse, "accessToken" | "refreshToken">) {
    store("session")?.setItem(ACCESS, res.accessToken);
    store("local")?.setItem(REFRESH, res.refreshToken);
  },
  clear() {
    store("session")?.removeItem(ACCESS);
    store("local")?.removeItem(REFRESH);
  },
};

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: Record<string, unknown>,
  ) {
    super(message);
  }
}

let onSessionLost: () => void = () => {};
export function setSessionLostHandler(fn: () => void): void {
  onSessionLost = fn;
}

/** Uma renovação por vez: várias requisições com token vencido esperam a mesma troca. */
let refreshing: Promise<boolean> | null = null;
async function refreshTokens(): Promise<boolean> {
  const refreshToken = tokens.refresh();
  if (!refreshToken) return false;
  refreshing ??= (async () => {
    try {
      const res = await fetch(`${API_URL}/v1/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
      });
      if (!res.ok) return false;
      tokens.set((await res.json()) as AuthResponse);
      return true;
    } catch {
      return false;
    } finally {
      setTimeout(() => (refreshing = null));
    }
  })();
  return refreshing;
}

async function send(path: string, init: RequestInit): Promise<Response> {
  const headers = new Headers(init.headers);
  const token = tokens.access();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (init.body) headers.set("Content-Type", "application/json");
  try {
    return await fetch(`${API_URL}/v1${path}`, { ...init, headers });
  } catch {
    throw new ApiError(0, "NETWORK", "Sem conexão com o servidor. Confira a internet e tente de novo.");
  }
}

export async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  let res = await send(path, init);
  // Token vencido: renova uma vez e repete a chamada.
  if (res.status === 401 && !path.startsWith("/auth/") && tokens.refresh()) {
    if (await refreshTokens()) res = await send(path, init);
  }
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  let body: unknown;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = null;
  }
  if (!res.ok) {
    const err = (body ?? {}) as Partial<ApiErrorBody>;
    if (res.status === 401 && !path.startsWith("/auth/login") && !path.startsWith("/auth/signup")) {
      tokens.clear();
      onSessionLost();
    }
    throw new ApiError(res.status, err.code ?? "UNKNOWN", err.message ?? "Algo deu errado.", err.details);
  }
  return body as T;
}

export { refreshTokens };

export const json = (method: string, data?: unknown): RequestInit => ({
  method,
  body: data === undefined ? undefined : JSON.stringify(data),
});
