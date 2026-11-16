/** Utilitários de data da agenda. Os dias são sempre YYYY-MM-DD no fuso do navegador. */

export const toDay = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export const addDays = (day: string, n: number): string => {
  const d = new Date(`${day}T12:00:00`);
  d.setDate(d.getDate() + n);
  return toDay(d);
};

/** Segunda-feira da semana do dia. */
export const weekStart = (day: string): string => {
  const d = new Date(`${day}T12:00:00`);
  const dow = (d.getDay() + 6) % 7;
  return addDays(day, -dow);
};

export const minutesOf = (hhmm: string): number => {
  const [h = "0", m = "0"] = hhmm.split(":");
  return Number(h) * 60 + Number(m);
};

export const hhmm = (minutes: number): string =>
  `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;

/** Minutos desde a meia-noite local de um instante ISO. */
export const minuteOfDay = (iso: string): number => {
  const d = new Date(iso);
  return d.getHours() * 60 + d.getMinutes();
};

/** ISO com o fuso do navegador para um dia + minuto local ("2026-11-11T09:30:00-03:00"). */
export const localIso = (day: string, minutes: number): string => {
  const d = new Date(`${day}T${hhmm(minutes)}:00`);
  const off = -d.getTimezoneOffset();
  const sign = off >= 0 ? "+" : "-";
  const abs = Math.abs(off);
  return `${day}T${hhmm(minutes)}:00${sign}${hhmm(abs)}`;
};

const LONG = new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "numeric", month: "long" });
const SHORT = new Intl.DateTimeFormat("pt-BR", { weekday: "short", day: "numeric" });
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
export const longDay = (day: string) => cap(LONG.format(new Date(`${day}T12:00:00`)));
export const shortDay = (day: string) => cap(SHORT.format(new Date(`${day}T12:00:00`)).replace(".", ""));

/**
 * Distribui atendimentos sobrepostos em colunas lado a lado (como o Google Agenda): cada item
 * recebe a coluna e o total de colunas do seu grupo de sobreposição.
 */
export function layoutOverlaps<T extends { start: number; end: number }>(items: T[]): (T & { col: number; cols: number })[] {
  const sorted = [...items].sort((a, b) => a.start - b.start || b.end - a.end);
  const out: (T & { col: number; cols: number })[] = [];
  let group: (T & { col: number; cols: number })[] = [];
  let groupEnd = -1;
  const flush = () => {
    const cols = Math.max(1, ...group.map((g) => g.col + 1));
    for (const g of group) g.cols = cols;
    out.push(...group);
    group = [];
  };
  for (const item of sorted) {
    if (item.start >= groupEnd && group.length) flush();
    const used = new Set(group.filter((g) => g.end > item.start).map((g) => g.col));
    let col = 0;
    while (used.has(col)) col++;
    group.push({ ...item, col, cols: 1 });
    groupEnd = Math.max(groupEnd, item.end);
  }
  if (group.length) flush();
  return out;
}
