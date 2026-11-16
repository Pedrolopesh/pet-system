import type { BusinessType, Category, Payment } from '@petsystem/contracts';

/** Produtos de exemplo: nome, categoria, preço e custo em centavos, estoque inicial e mínimo. */
export const SAMPLE_PRODUCTS: {
  name: string;
  category: Category;
  price: number;
  cost: number;
  stock: number | null;
  minStock: number;
  /** Peso relativo de saída nas vendas geradas. */
  weight: number;
  /** Duração na agenda (serviços). */
  durationMinutes?: number;
  /** Tipo de negócio que oferece o serviço (produtos de prateleira valem para todos). */
  business?: BusinessType;
}[] = [
  {
    name: 'Ração Premium Cães Adultos 15 kg',
    category: 'racao',
    price: 22990,
    cost: 15800,
    stock: 40,
    minStock: 8,
    weight: 6,
  },
  {
    name: 'Ração Filhotes Raças Pequenas 3 kg',
    category: 'racao',
    price: 8990,
    cost: 5900,
    stock: 30,
    minStock: 6,
    weight: 5,
  },
  {
    name: 'Ração Gatos Castrados 10 kg',
    category: 'racao',
    price: 18990,
    cost: 12900,
    stock: 28,
    minStock: 6,
    weight: 5,
  },
  {
    name: 'Ração Úmida Sachê Gatos 85 g',
    category: 'racao',
    price: 390,
    cost: 210,
    stock: 260,
    minStock: 60,
    weight: 9,
  },
  {
    name: 'Ração Sênior Cães 7 kg',
    category: 'racao',
    price: 14990,
    cost: 9800,
    stock: 14,
    minStock: 4,
    weight: 2,
  },
  {
    name: 'Bifinho de Carne 65 g',
    category: 'petisco',
    price: 1290,
    cost: 640,
    stock: 120,
    minStock: 30,
    weight: 8,
  },
  {
    name: 'Osso Natural Defumado',
    category: 'petisco',
    price: 1890,
    cost: 900,
    stock: 70,
    minStock: 20,
    weight: 5,
  },
  {
    name: 'Petisco Dental Bastão',
    category: 'petisco',
    price: 2490,
    cost: 1300,
    stock: 60,
    minStock: 15,
    weight: 4,
  },
  {
    name: 'Areia Sanitária Grãos Finos 4 kg',
    category: 'higiene',
    price: 2990,
    cost: 1700,
    stock: 90,
    minStock: 20,
    weight: 7,
  },
  {
    name: 'Tapete Higiênico 30 unidades',
    category: 'higiene',
    price: 6490,
    cost: 3900,
    stock: 45,
    minStock: 10,
    weight: 5,
  },
  {
    name: 'Shampoo Neutro 500 ml',
    category: 'higiene',
    price: 3290,
    cost: 1600,
    stock: 34,
    minStock: 8,
    weight: 3,
  },
  {
    name: 'Escova Rasqueadeira',
    category: 'higiene',
    price: 3990,
    cost: 1900,
    stock: 18,
    minStock: 5,
    weight: 2,
  },
  {
    name: 'Coleira Ajustável Nylon M',
    category: 'acessorio',
    price: 3490,
    cost: 1500,
    stock: 26,
    minStock: 6,
    weight: 3,
  },
  {
    name: 'Guia Retrátil 5 m',
    category: 'acessorio',
    price: 7990,
    cost: 4200,
    stock: 12,
    minStock: 4,
    weight: 2,
  },
  {
    name: 'Cama Redonda Pelúcia M',
    category: 'acessorio',
    price: 12990,
    cost: 7100,
    stock: 8,
    minStock: 3,
    weight: 1,
  },
  {
    name: 'Brinquedo Bola Mordedor',
    category: 'acessorio',
    price: 2290,
    cost: 980,
    stock: 55,
    minStock: 12,
    weight: 4,
  },
  {
    name: 'Arranhador Torre 60 cm',
    category: 'acessorio',
    price: 15990,
    cost: 9200,
    stock: 6,
    minStock: 2,
    weight: 1,
  },
  {
    name: 'Comedouro Inox Duplo',
    category: 'acessorio',
    price: 4590,
    cost: 2300,
    stock: 20,
    minStock: 5,
    weight: 2,
  },
  {
    name: 'Antipulgas Cães 10 a 25 kg',
    category: 'farmacia',
    price: 8990,
    cost: 6100,
    stock: 22,
    minStock: 6,
    weight: 3,
  },
  {
    name: 'Vermífugo Cães e Gatos',
    category: 'farmacia',
    price: 3590,
    cost: 2100,
    stock: 30,
    minStock: 8,
    weight: 3,
  },
  {
    name: 'Suplemento Articular 60 cp',
    category: 'farmacia',
    price: 11990,
    cost: 7400,
    stock: 9,
    minStock: 3,
    weight: 1,
  },
  {
    name: 'Banho Porte Pequeno',
    category: 'servico',
    price: 5500,
    cost: 1800,
    stock: null,
    minStock: 0,
    weight: 6,
    durationMinutes: 60,
    business: 'petshop',
  },
  {
    name: 'Banho e Tosa Porte Médio',
    category: 'servico',
    price: 9500,
    cost: 3200,
    stock: null,
    minStock: 0,
    weight: 4,
    durationMinutes: 90,
    business: 'petshop',
  },
  {
    name: 'Tosa Higiênica',
    category: 'servico',
    price: 4000,
    cost: 1200,
    stock: null,
    minStock: 0,
    weight: 3,
    durationMinutes: 40,
    business: 'petshop',
  },
  {
    name: 'Diária de Creche',
    category: 'servico',
    price: 7500,
    cost: 2500,
    stock: null,
    minStock: 0,
    weight: 4,
    durationMinutes: 540,
    business: 'creche',
  },
  {
    name: 'Meia Diária de Creche',
    category: 'servico',
    price: 4500,
    cost: 1500,
    stock: null,
    minStock: 0,
    weight: 2,
    durationMinutes: 300,
    business: 'creche',
  },
  {
    name: 'Consulta Clínica',
    category: 'servico',
    price: 15000,
    cost: 4000,
    stock: null,
    minStock: 0,
    weight: 3,
    durationMinutes: 30,
    business: 'clinica',
  },
  {
    name: 'Vacina V10',
    category: 'servico',
    price: 9000,
    cost: 4500,
    stock: null,
    minStock: 0,
    weight: 2,
    durationMinutes: 20,
    business: 'clinica',
  },
  {
    name: 'Vacina Antirrábica',
    category: 'servico',
    price: 7000,
    cost: 3000,
    stock: null,
    minStock: 0,
    weight: 2,
    durationMinutes: 20,
    business: 'clinica',
  },
];

export const SAMPLE_EMPLOYEES: {
  name: string;
  role: 'gerente' | 'atendente' | 'banho' | 'veterinario' | 'cuidador';
  business?: BusinessType;
}[] = [
  { name: 'Marina Costa', role: 'gerente' },
  { name: 'Diego Ramos', role: 'atendente' },
  { name: 'Lívia Nunes', role: 'atendente' },
  { name: 'Caio Martins', role: 'banho', business: 'petshop' },
  { name: 'Bianca Rocha', role: 'cuidador', business: 'creche' },
  { name: 'Dra. Helena Prado', role: 'veterinario', business: 'clinica' },
];

export const SAMPLE_CLIENTS: {
  name: string;
  pets: [string, 'cao' | 'gato' | 'outro', string][];
}[] = [
  { name: 'Ana Beatriz Souza', pets: [['Thor', 'cao', 'Golden Retriever']] },
  {
    name: 'Bruno Carvalho',
    pets: [
      ['Mel', 'cao', 'Shih Tzu'],
      ['Pipoca', 'gato', 'SRD'],
    ],
  },
  { name: 'Carla Mendes', pets: [['Luna', 'gato', 'Siamês']] },
  { name: 'Daniel Ferreira', pets: [['Bob', 'cao', 'Beagle']] },
  {
    name: 'Eduarda Lima',
    pets: [
      ['Nina', 'gato', 'Persa'],
      ['Frajola', 'gato', 'SRD'],
    ],
  },
  { name: 'Felipe Rocha', pets: [['Max', 'cao', 'Labrador']] },
  { name: 'Gabriela Alves', pets: [['Amora', 'cao', 'Spitz Alemão']] },
  { name: 'Henrique Barbosa', pets: [['Zeca', 'outro', 'Calopsita']] },
  { name: 'Isabela Teixeira', pets: [['Toddy', 'cao', 'Dachshund']] },
  { name: 'João Pedro Moreira', pets: [['Simba', 'gato', 'Maine Coon']] },
  {
    name: 'Larissa Duarte',
    pets: [
      ['Paçoca', 'cao', 'SRD'],
      ['Cookie', 'cao', 'Poodle'],
    ],
  },
  { name: 'Mateus Cardoso', pets: [['Fred', 'cao', 'Bulldog Francês']] },
  { name: 'Natália Pires', pets: [['Mimi', 'gato', 'SRD']] },
  { name: 'Otávio Freitas', pets: [['Rex', 'cao', 'Pastor Alemão']] },
  { name: 'Paula Ribeiro', pets: [['Belinha', 'cao', 'Yorkshire']] },
  { name: 'Rafael Gomes', pets: [['Tom', 'gato', 'Angorá']] },
  { name: 'Sabrina Castro', pets: [['Chico', 'outro', 'Coelho']] },
  { name: 'Vinícius Araújo', pets: [['Duke', 'cao', 'Border Collie']] },
];

export const SAMPLE_NOTES = [
  'Conferir a entrega da ração na quinta',
  'Ligar para a Ana sobre o banho do Thor',
  'Repor sachês de gato na vitrine',
];

export const PAYMENT_WEIGHTS: [Payment, number][] = [
  ['pix', 45],
  ['credito', 30],
  ['debito', 18],
  ['dinheiro', 7],
];
