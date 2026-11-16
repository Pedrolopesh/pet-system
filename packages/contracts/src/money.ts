const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

/** Centavos → "R$ 1.299,90" (espaço comum, não o não separável do Intl). */
export function brl(cents: number): string {
  return BRL.format(cents / 100).replace(/\u00a0/g, ' ');
}

/** O que a pessoa digitou ("12,50", "R$ 1.299,90", "8") → centavos. null se inválido. */
export function parseMoney(input: string): number | null {
  const clean = input.replace(/[R$\s]/g, '');
  if (!/^\d{1,3}(\.\d{3})+(,\d{1,2})?$|^\d+(,\d{1,2})?$/.test(clean)) return null;
  const [int = '0', dec = ''] = clean.replace(/\./g, '').split(',');
  return Number(int) * 100 + Number(dec.padEnd(2, '0'));
}

/** Centavos → texto para um campo ("1299,90"). */
export function toMoneyInput(cents: number): string {
  return (cents / 100).toFixed(2).replace('.', ',');
}
