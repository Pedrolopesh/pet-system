import type { DueVaccine } from "@petsystem/contracts";

/** Idade a partir da data de nascimento: "3 anos e 2 meses", "5 meses". */
export function age(birthDate: string | null, now = new Date()): string {
  if (!birthDate) return "idade não informada";
  const b = new Date(`${birthDate}T12:00:00`);
  let months = (now.getFullYear() - b.getFullYear()) * 12 + (now.getMonth() - b.getMonth());
  if (now.getDate() < b.getDate()) months--;
  if (months < 1) return "menos de 1 mês";
  const y = Math.floor(months / 12);
  const m = months % 12;
  const ys = y ? `${y} ${y === 1 ? "ano" : "anos"}` : "";
  const ms = m ? `${m} ${m === 1 ? "mês" : "meses"}` : "";
  return [ys, ms].filter(Boolean).join(" e ");
}

const DATE = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
export const brDate = (day: string) => DATE.format(new Date(`${day}T12:00:00`));

/** Link do WhatsApp com a mensagem de lembrete pronta (o envio é feito pela própria pessoa). */
export function reminderLink(d: DueVaccine, shopName: string): string | null {
  const digits = d.client.phone.replace(/\D/g, "");
  if (digits.length < 10) return null;
  const first = d.client.name.split(" ")[0];
  const when = d.overdue ? `venceu em ${brDate(d.nextDoseAt)}` : `vence em ${brDate(d.nextDoseAt)}`;
  const text = `Olá, ${first}! Aqui é da ${shopName}. O reforço da vacina ${d.vaccine} do ${d.pet.name} ${when}. Quer agendar um horário?`;
  return `https://wa.me/55${digits}?text=${encodeURIComponent(text)}`;
}

/** "28,45" → 28.45; vazio → null; inválido → NaN. */
export function parseDecimal(input: string): number | null {
  const t = input.trim().replace(",", ".");
  if (!t) return null;
  return /^\d+(\.\d+)?$/.test(t) ? Number(t) : Number.NaN;
}

/** Peso para exibir: "30,6 kg" (uma casa decimal; abaixo de 1 kg, em gramas). */
export function kg(value: number): string {
  if (value < 1) return `${Math.round(value * 1000)} g`;
  return `${value.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} kg`;
}
