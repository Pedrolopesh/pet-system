import type { BusinessType } from "@petsystem/contracts";
import type { IconName } from "@/components/Icon";

export type Segment = {
  slug: "pet-shop" | "creche" | "clinica";
  type: BusinessType;
  icon: IconName;
  name: string;
  title: string;
  lead: string;
  features: { icon: IconName; title: string; text: string }[];
  /** Linhas da agenda de exemplo mostrada no topo da página. */
  agenda: { time: string; pet: string; service: string; who: string; status: "ok" | "now" | "next" }[];
};

export const SEGMENTS: Segment[] = [
  {
    slug: "pet-shop",
    type: "petshop",
    icon: "scissors",
    name: "Pet shop e banho e tosa",
    title: "Banho, tosa e balcão sem caderninho.",
    lead: "Agenda por profissional, caixa rápido com estoque que avisa e o histórico de cada pet a um toque.",
    features: [
      { icon: "calendar", title: "Agenda por tosador", text: "Cada profissional com sua coluna. O sistema não deixa marcar dois banhos no mesmo horário." },
      { icon: "bell", title: "Status do atendimento", text: "Agendado, em atendimento, pronto para buscar. A recepção sabe quando chamar o tutor." },
      { icon: "cart", title: "Cobrar em um clique", text: "Do atendimento concluído direto para o caixa, junto com a ração que o tutor levou." },
      { icon: "box", title: "Estoque que avisa", text: "Defina o mínimo de cada produto e veja no painel o que precisa repor antes de faltar." },
    ],
    agenda: [
      { time: "09:00", pet: "Thor · Golden", service: "Banho e tosa", who: "Caio", status: "ok" },
      { time: "10:30", pet: "Mel · Shih Tzu", service: "Banho", who: "Caio", status: "now" },
      { time: "11:30", pet: "Fred · Bulldog", service: "Tosa higiênica", who: "Caio", status: "next" },
    ],
  },
  {
    slug: "creche",
    type: "creche",
    icon: "home2",
    name: "Creche e hotel",
    title: "Quem está na creche hoje, num relance.",
    lead: "Diárias e meias diárias na agenda, entrada e saída de cada pet e a ocupação do dia sem planilha.",
    features: [
      { icon: "calendar", title: "Ocupação do dia", text: "Veja quantos pets estão na creche agora e quem chega amanhã, sem contar na mão." },
      { icon: "clock", title: "Entrada e saída", text: "Marque a chegada e o “pronto para buscar” de cada pet. O histórico fica salvo." },
      { icon: "paw", title: "Ficha do pet", text: "Raça, espécie, observações de alimentação e alergia e o tutor responsável." },
      { icon: "receipt", title: "Diárias cobradas", text: "Cobre as diárias do dia no caixa e acompanhe a receita da creche nos relatórios." },
    ],
    agenda: [
      { time: "07:45", pet: "Amora · Spitz", service: "Diária de creche", who: "Bianca", status: "ok" },
      { time: "08:15", pet: "Duke · Border Collie", service: "Diária de creche", who: "Bianca", status: "now" },
      { time: "08:30", pet: "Paçoca · SRD", service: "Meia diária", who: "Bianca", status: "next" },
    ],
  },
  {
    slug: "clinica",
    type: "clinica",
    icon: "stethoscope",
    name: "Clínica veterinária",
    title: "Prontuário, vacinas e agenda da clínica no mesmo lugar.",
    lead: "Prontuário com receita para imprimir, vacinas com lembrete de reforço pelo WhatsApp e agenda por veterinário.",
    features: [
      { icon: "stethoscope", title: "Prontuário completo", text: "Queixa, exame, diagnóstico e conduta, com peso e temperatura. Alergias aparecem em destaque." },
      { icon: "receipt", title: "Receita pronta", text: "Monte a receita no atendimento e imprima ou salve em PDF com os dados do pet e do tutor." },
      { icon: "bell", title: "Lembrete de vacina", text: "Veja os reforços vencidos e a vencer e avise o tutor pelo WhatsApp com a mensagem pronta." },
      { icon: "calendar", title: "Agenda por veterinário", text: "Consultas e vacinas sem encaixe por cima. Da agenda, um toque abre o prontuário." },
    ],
    agenda: [
      { time: "09:00", pet: "Luna · Siamês", service: "Consulta clínica", who: "Dra. Helena", status: "ok" },
      { time: "09:30", pet: "Bob · Beagle", service: "Vacina V10", who: "Dra. Helena", status: "now" },
      { time: "10:00", pet: "Nina · Persa", service: "Vacina antirrábica", who: "Dra. Helena", status: "next" },
    ],
  },
];
