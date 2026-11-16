import type {
  PublicShop,
  Slots,
  TutorBookingInput,
  TutorMe,
  TutorProfileInput,
  TutorSession,
} from "@petsystem/contracts";
import { API_URL, ApiError } from "./http";

/**
 * Cliente do portal do tutor. O token é outro (só serve no portal) e fica guardado por loja, para
 * a mesma pessoa poder ser cliente de duas lojas sem misturar.
 */
const key = (slug: string) => `petsystem.tutor.${slug}`;
export const tutorToken = {
  get: (slug: string) => (typeof window === "undefined" ? null : localStorage.getItem(key(slug))),
  set: (slug: string, token: string) => localStorage.setItem(key(slug), token),
  clear: (slug: string) => localStorage.removeItem(key(slug)),
};

async function call<T>(path: string, init: RequestInit & { slug?: string } = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body) headers.set("Content-Type", "application/json");
  const token = init.slug ? tutorToken.get(init.slug) : null;
  if (token) headers.set("Authorization", `Bearer ${token}`);
  let res: Response;
  try {
    res = await fetch(`${API_URL}/v1${path}`, { ...init, headers });
  } catch {
    throw new ApiError(0, "NETWORK", "Sem conexão. Confira a internet e tente de novo.");
  }
  const text = await res.text();
  const body = text ? (JSON.parse(text) as Record<string, unknown>) : null;
  if (!res.ok) {
    if (res.status === 401 && init.slug) tutorToken.clear(init.slug);
    throw new ApiError(res.status, String(body?.code ?? "UNKNOWN"), String(body?.message ?? "Algo deu errado."), body?.details as Record<string, unknown> | undefined);
  }
  return body as T;
}

const post = (body?: unknown): RequestInit => ({ method: "POST", body: body === undefined ? undefined : JSON.stringify(body) });

export const publicApi = {
  shop: (slug: string) => call<PublicShop>(`/public/shops/${encodeURIComponent(slug)}`),
  slots: (slug: string, serviceId: string, day: string) =>
    call<Slots>(`/public/shops/${encodeURIComponent(slug)}/slots?serviceId=${serviceId}&day=${day}`),
  requestCode: (slug: string, email: string) => call<{ ok: true }>(`/public/shops/${encodeURIComponent(slug)}/code`, post({ email })),
  verify: (slug: string, email: string, code: string) =>
    call<TutorSession>(`/public/shops/${encodeURIComponent(slug)}/verify`, post({ email, code })),
  demo: (slug: string) => call<TutorSession>(`/public/shops/${encodeURIComponent(slug)}/demo`, post()),
};

export const tutorApi = {
  me: (slug: string) => call<TutorMe>("/tutor/me", { slug }),
  profile: (slug: string, body: TutorProfileInput) => call<TutorSession>("/tutor/profile", { ...post(body), slug }),
  addPet: (slug: string, body: { name: string; species: "cao" | "gato" | "outro"; breed: string }) =>
    call<TutorMe>("/tutor/pets", { ...post(body), slug }),
  book: (slug: string, body: TutorBookingInput) => call<TutorMe>("/tutor/appointments", { ...post(body), slug }),
  cancel: (slug: string, id: string) => call<TutorMe>(`/tutor/appointments/${id}/cancel`, { ...post(), slug }),
};
