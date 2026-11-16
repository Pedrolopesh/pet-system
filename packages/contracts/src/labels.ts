import type { AppointmentStatus } from './agenda.js';
import type { Category } from './catalog.js';
import type { ROLES, SPECIES } from './people.js';
import type { BusinessType, UserRole } from './saas.js';
import type { NOTE_PRIORITIES, Payment } from './sales.js';

export const LABELS = {
  business: {
    petshop: 'Pet shop',
    creche: 'Creche e hotel',
    clinica: 'Clínica veterinária',
  } satisfies Record<BusinessType, string>,
  userRole: { dono: 'Dono', gerente: 'Gerente', atendente: 'Atendente' } satisfies Record<
    UserRole,
    string
  >,
  status: {
    agendado: 'Agendado',
    confirmado: 'Confirmado',
    em_atendimento: 'Em atendimento',
    pronto: 'Pronto para buscar',
    concluido: 'Concluído',
    cancelado: 'Cancelado',
    faltou: 'Faltou',
  } satisfies Record<AppointmentStatus, string>,
  priority: { urgente: 'Urgente', importante: 'Importante', normal: 'Normal' } satisfies Record<
    (typeof NOTE_PRIORITIES)[number],
    string
  >,
  category: {
    racao: 'Ração',
    petisco: 'Petiscos',
    higiene: 'Higiene',
    acessorio: 'Acessórios',
    farmacia: 'Farmácia',
    servico: 'Serviços',
  } satisfies Record<Category, string>,
  payment: {
    pix: 'Pix',
    credito: 'Crédito',
    debito: 'Débito',
    dinheiro: 'Dinheiro',
  } satisfies Record<Payment, string>,
  species: { cao: 'Cão', gato: 'Gato', outro: 'Outro' } satisfies Record<
    (typeof SPECIES)[number],
    string
  >,
  role: {
    gerente: 'Gerente',
    atendente: 'Atendente',
    banho: 'Banho e tosa',
    veterinario: 'Veterinário(a)',
    cuidador: 'Cuidador(a) da creche',
  } satisfies Record<(typeof ROLES)[number], string>,
};
