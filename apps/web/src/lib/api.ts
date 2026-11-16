import type {
  Account,
  ClinicalFile,
  ClinicalPet,
  DueVaccine,
  MedicalRecord,
  PetHealth,
  PrescriptionDoc,
  RecordInput,
  Vaccination,
  VaccinationInput,
  Appointment,
  AppointmentInput,
  AppointmentStatus,
  AppointmentUpdate,
  AuthResponse,
  Client,
  ClientDetail,
  ClientInput,
  Dashboard,
  Employee,
  EmployeeInput,
  InviteAccept,
  InviteLink,
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
  Shop,
  ShopSettings,
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
  invitePreview: (token: string) =>
    request<{ shopName: string; role: string }>(`/auth/invites/${encodeURIComponent(token)}`),
  acceptInvite: (body: InviteAccept) => request<AuthResponse>("/auth/invites/accept", json("POST", body)),
};

export const accountApi = {
  get: () => request<Account>("/account"),
  updateShop: (body: ShopSettings) => request<Shop>("/account/shop", json("PATCH", body)),
  changePlan: (plan: "basico" | "pro") => request<Shop>("/account/plan", json("POST", { plan })),
  invite: (role: "gerente" | "atendente") => request<InviteLink>("/account/invites", json("POST", { role })),
  revokeInvite: (id: string) => request<void>(`/account/invites/${id}`, json("DELETE")),
  changeRole: (id: string, role: "gerente" | "atendente") =>
    request<void>(`/account/members/${id}`, json("PATCH", { role })),
  removeMember: (id: string) => request<void>(`/account/members/${id}`, json("DELETE")),
};

export const agendaApi = {
  list: (from: string, days = 1, employeeId?: string) =>
    request<Appointment[]>(`/appointments${qs({ from, days, employeeId })}`),
  get: (id: string) => request<Appointment>(`/appointments/${id}`),
  create: (body: AppointmentInput) => request<Appointment>("/appointments", json("POST", body)),
  update: (id: string, body: AppointmentUpdate) => request<Appointment>(`/appointments/${id}`, json("PATCH", body)),
  setStatus: (id: string, status: AppointmentStatus) =>
    request<Appointment>(`/appointments/${id}/status`, json("POST", { status })),
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
  create: (text: string, priority: Note["priority"]) => request<Note>("/notes", json("POST", { text, priority })),
  update: (id: string, body: Partial<Pick<Note, "text" | "done" | "priority">>) =>
    request<Note>(`/notes/${id}`, json("PATCH", body)),
  remove: (id: string) => request<void>(`/notes/${id}`, json("DELETE")),
};

export const reportsApi = {
  dashboard: () => request<Dashboard>("/dashboard"),
  report: (days: number) => request<Report>(`/reports?days=${days}`),
};

export const clinicApi = {
  file: (petId: string) => request<ClinicalFile>(`/pets/${petId}/clinical`),
  updateHealth: (petId: string, body: PetHealth) => request<ClinicalPet>(`/pets/${petId}/health`, json("PATCH", body)),
  createRecord: (petId: string, body: RecordInput) => request<MedicalRecord>(`/pets/${petId}/records`, json("POST", body)),
  updateRecord: (id: string, body: RecordInput) => request<MedicalRecord>(`/records/${id}`, json("PUT", body)),
  prescription: (id: string) => request<PrescriptionDoc>(`/records/${id}/prescription`),
  addVaccination: (petId: string, body: VaccinationInput) =>
    request<Vaccination>(`/pets/${petId}/vaccinations`, json("POST", body)),
  removeVaccination: (id: string) => request<void>(`/vaccinations/${id}`, json("DELETE")),
  due: (days = 30) => request<DueVaccine[]>(`/vaccinations/due?days=${days}`),
};
