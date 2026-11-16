import { describe, expect, it } from 'vitest';

import {
  brl,
  clientInputSchema,
  parseMoney,
  productInputSchema,
  saleInputSchema,
  signupSchema,
  stockAdjustSchema,
  toMoneyInput,
} from './index.js';

const PASSWORD = '12345678'; // scan-allow: fake
const uuid = '0b6f1f3e-6a8e-4d3c-9f55-2b1f8e0c9a11';

describe('money', () => {
  it('formata centavos em reais', () => {
    expect(brl(129990)).toBe('R$ 1.299,90');
    expect(brl(0)).toBe('R$ 0,00');
  });
  it('lê o que a pessoa digita', () => {
    expect(parseMoney('12,5')).toBe(1250);
    expect(parseMoney('R$ 1.299,90')).toBe(129990);
    expect(parseMoney('8')).toBe(800);
    expect(parseMoney('1299,90')).toBe(129990);
  });
  it('recusa formatos inválidos', () => {
    for (const bad of ['', 'abc', '1,234', '12.5', '-3', '1.29,90'])
      expect(parseMoney(bad)).toBeNull();
  });
  it('ida e volta', () => {
    expect(parseMoney(toMoneyInput(4590))).toBe(4590);
  });
});

describe('schemas', () => {
  it('normaliza o e-mail do cadastro', () => {
    const r = signupSchema.parse({
      shopName: 'Loja',
      name: 'Ana',
      email: '  ANA@Ex.com ',
      password: PASSWORD,
    });
    expect(r.email).toBe('ana@ex.com');
    expect(r.withSampleData).toBe(true);
  });
  it('exige senha de 8 caracteres', () => {
    expect(
      signupSchema.safeParse({ shopName: 'L', name: 'A', email: 'a@b.co', password: '123' })
        .success,
    ).toBe(false);
  });
  it('serviço não pode ter estoque', () => {
    const base = { name: 'Banho', category: 'servico', price: 5000, cost: 1000 } as const;
    expect(productInputSchema.safeParse({ ...base, stock: 3 }).success).toBe(false);
    expect(productInputSchema.safeParse({ ...base, stock: null }).success).toBe(true);
  });
  it('limpa o telefone e aceita campos opcionais vazios', () => {
    const r = clientInputSchema.parse({ name: 'Bia', phone: '(48) 99999-0000' });
    expect(r.phone).toBe('48999990000');
    expect(r.email).toBe('');
    expect(r.pets).toEqual([]);
    expect(clientInputSchema.safeParse({ name: 'Bia', phone: '123' }).success).toBe(false);
  });
  it('venda: carrinho sem itens repetidos e com quantidade inteira', () => {
    const ok = { items: [{ productId: uuid, qty: 2 }], employeeId: uuid, payment: 'pix' };
    expect(saleInputSchema.parse(ok).discount).toBe(0);
    expect(saleInputSchema.safeParse({ ...ok, items: [] }).success).toBe(false);
    expect(saleInputSchema.safeParse({ ...ok, items: [ok.items[0], ok.items[0]] }).success).toBe(
      false,
    );
    expect(
      saleInputSchema.safeParse({ ...ok, items: [{ productId: uuid, qty: 1.5 }] }).success,
    ).toBe(false);
  });
  it('ajuste de estoque não aceita zero', () => {
    expect(stockAdjustSchema.safeParse({ delta: 0, reason: 'entrada' }).success).toBe(false);
  });
});
