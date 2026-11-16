import type { Category } from './catalog.js';
import type { ROLES, SPECIES } from './people.js';
import type { Payment } from './sales.js';

export const LABELS = {
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
  role: { gerente: 'Gerente', atendente: 'Atendente', banho: 'Banho e tosa' } satisfies Record<
    (typeof ROLES)[number],
    string
  >,
};
