export { brl } from "@petsystem/contracts";

const DATE = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" });
const DATETIME = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});
const TIME = new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" });
const WEEKDAY = new Intl.DateTimeFormat("pt-BR", { weekday: "short" });

export const shortDate = (iso: string) => DATE.format(new Date(iso)).replace(".", "");
export const dateTime = (iso: string) => DATETIME.format(new Date(iso));

/** "hoje, 14:20", "ontem, 09:10" ou "12/11, 18:00". */
export function when(iso: string, now = new Date()): string {
  const d = new Date(iso);
  const day = (x: Date) => x.toLocaleDateString("pt-BR");
  const yesterday = new Date(now.getTime() - 86_400_000);
  if (day(d) === day(now)) return `hoje, ${TIME.format(d)}`;
  if (day(d) === day(yesterday)) return `ontem, ${TIME.format(d)}`;
  return DATETIME.format(d).replace(" ", ", ");
}

/** Rótulo curto de um dia YYYY-MM-DD para gráficos ("seg 10"). */
export function dayLabel(day: string): string {
  const d = new Date(`${day}T12:00:00Z`);
  return `${WEEKDAY.format(d).replace(".", "")} ${d.getUTCDate()}`;
}

export function phone(digits: string): string {
  if (digits.length === 11) return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  if (digits.length === 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return digits;
}

export const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");

export const percent = (n: number) => `${n > 0 ? "+" : ""}${n.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;
