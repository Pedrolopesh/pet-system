/** Dia local (YYYY-MM-DD) de uma data no fuso da loja. */
export function localDay(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

/** Lista de dias locais terminando em `end`, do mais antigo para o mais novo. */
export function lastDays(end: Date, count: number, timeZone: string): string[] {
  const days: string[] = [];
  for (let i = count - 1; i >= 0; i--) {
    days.push(localDay(new Date(end.getTime() - i * 86_400_000), timeZone));
  }
  // Na virada do horário de verão, dois instantes podem cair no mesmo dia: remove repetidos.
  return [...new Set(days)];
}

/** Início do dia local de `date` (instante UTC), para filtrar por "hoje" no fuso da loja. */
export function startOfLocalDay(date: Date, timeZone: string): Date {
  const day = localDay(date, timeZone);
  // Tenta os deslocamentos possíveis até achar o instante em que o dia local começa.
  for (let offset = -14; offset <= 14; offset++) {
    const candidate = new Date(`${day}T00:00:00Z`);
    candidate.setUTCHours(candidate.getUTCHours() - offset);
    const before = new Date(candidate.getTime() - 1);
    if (localDay(candidate, timeZone) === day && localDay(before, timeZone) !== day)
      return candidate;
  }
  return new Date(`${day}T00:00:00Z`);
}

/** Início do mês local corrente. */
export function startOfLocalMonth(date: Date, timeZone: string): Date {
  const [year, month] = localDay(date, timeZone).split('-');
  return startOfLocalDay(new Date(`${year}-${month}-01T12:00:00Z`), timeZone);
}
