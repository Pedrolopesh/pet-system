import type {
  AuthResponse,
  Client,
  ClientDetail,
  ClientInput,
  Dashboard,
  Employee,
  EmployeeInput,
  LoginInput,
  Me,
  Note,
  Page,
  Product,
  ProductInput,
  ProductUpdate,
  Report,
  Sale,
  SaleInput,
  SignupInput,
  StockAdjust,
} from "@petsystem/contracts";
import { json, request } from "./http";

const qs = (params: Record<string, string | number | boolean | undefined>) => {
  const s = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== "" && v !== false) s.set(k, String(v));
  const out = s.toString();
  return out ? `?${out}` : "";
};

export const authApi = {
  login: (body: LoginInput) => request<AuthResponse>("/auth/login", json("POST", body)),
  signup: (body: SignupInput) => request<AuthResponse>("/auth/signup", json("POST", body)),
  demo: () => request<AuthResponse>("/auth/demo", json("POST")),
  me: () => request<Me>("/auth/me"),
  logout: () => request<void>("/auth/logout", json("POST")),
};

export const productsApi = {
  list: (q: { q?: string; category?: string; lowStock?: boolean; includeInactive?: boolean } = {}) =>
    request<Product[]>(`/products${qs(q)}`),
  create: (body: ProductInput) => request<Product>("/products", json("POST", body)),
  update: (id: string, body: ProductUpdate) => request<Product>(`/products/${id}`, json("PATCH", body)),
  adjust: (id: string, body: StockAdjust) => request<Product>(`/products/${id}/stock`, json("POST", body)),
};

export const clientsApi = {
  list: (q = "") => request<Client[]>(`/clients${qs({ q })}`),
  get: (id: string) => request<ClientDetail>(`/clients/${id}`),
  create: (body: ClientInput) => request<Client>("/clients", json("POST", body)),
  update: (id: string, body: ClientInput) => request<Client>(`/clients/${id}`, json("PUT", body)),
  remove: (id: string) => request<void>(`/clients/${id}`, json("DELETE")),
};

export const employeesApi = {
  list: () => request<Employee[]>("/employees"),
  create: (body: EmployeeInput) => request<Employee>("/employees", json("POST", body)),
  update: (id: string, body: EmployeeInput) => request<Employee>(`/employees/${id}`, json("PUT", body)),
};

export const salesApi = {
  list: (q: { days?: number; clientId?: string; page?: number; pageSize?: number } = {}) =>
    request<Page<Sale>>(`/sales${qs(q)}`),
  create: (body: SaleInput) => request<Sale>("/sales", json("POST", body)),
};

export const notesApi = {
  list: () => request<Note[]>("/notes"),
  create: (text: string) => request<Note>("/notes", json("POST", { text })),
  update: (id: string, body: Partial<Pick<Note, "text" | "done">>) =>
    request<Note>(`/notes/${id}`, json("PATCH", body)),
  remove: (id: string) => request<void>(`/notes/${id}`, json("DELETE")),
};

export const reportsApi = {
  dashboard: () => request<Dashboard>("/dashboard"),
  report: (days: number) => request<Report>(`/reports?days=${days}`),
};
