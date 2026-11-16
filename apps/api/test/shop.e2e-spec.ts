import type { AuthResponse, Product } from '@petsystem/contracts';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { bearer, createTestApp, type Ctx, signup } from './helpers.js';

let ctx: Ctx;
let owner: AuthResponse;
let employeeId: string;

beforeAll(async () => {
  ctx = await createTestApp();
  owner = await signup(ctx);
  const emp = await ctx
    .http()
    .post('/v1/employees')
    .set(...bearer(owner))
    .send({ name: 'Leo', role: 'atendente' })
    .expect(201);
  employeeId = emp.body.id;
});
afterAll(async () => ctx.app.close());

const newProduct = async (body: Record<string, unknown> = {}): Promise<Product> =>
  (
    await ctx
      .http()
      .post('/v1/products')
      .set(...bearer(owner))
      .send({
        name: 'Ração 1 kg',
        category: 'racao',
        price: 3000,
        cost: 1800,
        stock: 5,
        minStock: 2,
        ...body,
      })
      .expect(201)
  ).body;

describe('produtos e estoque', () => {
  it('ajuste de estoque nunca deixa negativo', async () => {
    const p = await newProduct();
    const up = await ctx
      .http()
      .post(`/v1/products/${p.id}/stock`)
      .set(...bearer(owner))
      .send({ delta: 10, reason: 'entrada' })
      .expect(201);
    expect(up.body.stock).toBe(15);
    const neg = await ctx
      .http()
      .post(`/v1/products/${p.id}/stock`)
      .set(...bearer(owner))
      .send({ delta: -16, reason: 'perda' })
      .expect(409);
    expect(neg.body.code).toBe('OUT_OF_STOCK');
  });

  it('serviço não tem estoque e filtro de estoque baixo funciona', async () => {
    await ctx
      .http()
      .post('/v1/products')
      .set(...bearer(owner))
      .send({ name: 'Banho', category: 'servico', price: 5000, cost: 1000, stock: 4 })
      .expect(400);
    const low = await newProduct({ name: 'Petisco', category: 'petisco', stock: 1, minStock: 3 });
    const res = await ctx
      .http()
      .get('/v1/products?lowStock=true')
      .set(...bearer(owner))
      .expect(200);
    expect(res.body.map((p: Product) => p.id)).toContain(low.id);
  });
});

describe('vendas', () => {
  it('fecha a venda, baixa o estoque e numera em sequência', async () => {
    const p = await newProduct({ stock: 3 });
    const s1 = await ctx
      .http()
      .post('/v1/sales')
      .set(...bearer(owner))
      .send({ items: [{ productId: p.id, qty: 2 }], employeeId, payment: 'pix', discount: 500 })
      .expect(201);
    expect(s1.body.total).toBe(2 * 3000 - 500);
    const s2 = await ctx
      .http()
      .post('/v1/sales')
      .set(...bearer(owner))
      .send({ items: [{ productId: p.id, qty: 1 }], employeeId, payment: 'dinheiro' })
      .expect(201);
    expect(s2.body.number).toBe(s1.body.number + 1);
    const after = await ctx.prisma.product.findUniqueOrThrow({ where: { id: p.id } });
    expect(after.stock).toBe(0);
  });

  it('sem estoque: 409 e nada é gravado (nem a outra linha do carrinho)', async () => {
    const a = await newProduct({ stock: 5 });
    const b = await newProduct({ stock: 1 });
    const res = await ctx
      .http()
      .post('/v1/sales')
      .set(...bearer(owner))
      .send({
        items: [
          { productId: a.id, qty: 2 },
          { productId: b.id, qty: 2 },
        ],
        employeeId,
        payment: 'pix',
      })
      .expect(409);
    expect(res.body.code).toBe('OUT_OF_STOCK');
    expect((await ctx.prisma.product.findUniqueOrThrow({ where: { id: a.id } })).stock).toBe(5);
  });

  it('duas vendas simultâneas do último item: só uma passa', async () => {
    const p = await newProduct({ stock: 1 });
    const send = () =>
      ctx
        .http()
        .post('/v1/sales')
        .set(...bearer(owner))
        .send({ items: [{ productId: p.id, qty: 1 }], employeeId, payment: 'pix' });
    const results = await Promise.all([send(), send(), send()]);
    expect(results.map((r) => r.status).sort()).toEqual([201, 409, 409]);
    expect((await ctx.prisma.product.findUniqueOrThrow({ where: { id: p.id } })).stock).toBe(0);
  });

  it('desconto maior que o subtotal é recusado', async () => {
    const p = await newProduct();
    const res = await ctx
      .http()
      .post('/v1/sales')
      .set(...bearer(owner))
      .send({ items: [{ productId: p.id, qty: 1 }], employeeId, payment: 'pix', discount: 3001 })
      .expect(400);
    expect(res.body.code).toBe('INVALID_DISCOUNT');
  });
});

describe('isolamento entre lojas', () => {
  it('outra loja não vê nem altera nada desta', async () => {
    const p = await newProduct();
    const client = await ctx
      .http()
      .post('/v1/clients')
      .set(...bearer(owner))
      .send({ name: 'Bia', pets: [{ name: 'Rex', species: 'cao' }] })
      .expect(201);
    const intruder = await signup(ctx);
    await ctx
      .http()
      .patch(`/v1/products/${p.id}`)
      .set(...bearer(intruder))
      .send({ name: 'x' })
      .expect(404);
    await ctx
      .http()
      .post(`/v1/products/${p.id}/stock`)
      .set(...bearer(intruder))
      .send({ delta: 1, reason: 'entrada' })
      .expect(404);
    await ctx
      .http()
      .get(`/v1/clients/${client.body.id}`)
      .set(...bearer(intruder))
      .expect(404);
    await ctx
      .http()
      .delete(`/v1/clients/${client.body.id}`)
      .set(...bearer(intruder))
      .expect(404);
    // Vender produto de outra loja, com funcionário da outra loja
    const emp = await ctx
      .http()
      .post('/v1/employees')
      .set(...bearer(intruder))
      .send({ name: 'Zé', role: 'atendente' })
      .expect(201);
    const sale = await ctx
      .http()
      .post('/v1/sales')
      .set(...bearer(intruder))
      .send({ items: [{ productId: p.id, qty: 1 }], employeeId: emp.body.id, payment: 'pix' })
      .expect(409);
    expect(sale.body.code).toBe('PRODUCT_UNAVAILABLE');
    await ctx
      .http()
      .post('/v1/sales')
      .set(...bearer(intruder))
      .send({ items: [{ productId: p.id, qty: 1 }], employeeId, payment: 'pix' })
      .expect(400);
    expect(
      (
        await ctx
          .http()
          .get('/v1/products')
          .set(...bearer(intruder))
      ).body,
    ).toEqual([]);
  });
});

describe('clientes e relatórios', () => {
  it('sincroniza os pets ao editar o cliente', async () => {
    const c = await ctx
      .http()
      .post('/v1/clients')
      .set(...bearer(owner))
      .send({
        name: 'Caio',
        phone: '(48) 99999-1234',
        pets: [
          { name: 'Mel', species: 'gato' },
          { name: 'Bob', species: 'cao' },
        ],
      })
      .expect(201);
    expect(c.body.phone).toBe('48999991234');
    const mel = c.body.pets.find((p: { name: string }) => p.name === 'Mel');
    const up = await ctx
      .http()
      .put(`/v1/clients/${c.body.id}`)
      .set(...bearer(owner))
      .send({
        name: 'Caio',
        pets: [
          { id: mel.id, name: 'Mel', species: 'gato', breed: 'Siamês' },
          { name: 'Nina', species: 'gato' },
        ],
      })
      .expect(200);
    expect(up.body.pets.map((p: { name: string }) => p.name)).toEqual(['Mel', 'Nina']);
    const search = await ctx
      .http()
      .get('/v1/clients?q=nina')
      .set(...bearer(owner))
      .expect(200);
    expect(search.body[0].id).toBe(c.body.id);
  });

  it('relatório e painel batem com as vendas da loja', async () => {
    const shop = await signup(ctx, true);
    const report = await ctx
      .http()
      .get('/v1/reports?days=30')
      .set(...bearer(shop))
      .expect(200);
    const byDay = report.body.byDay as { revenue: number; sales: number }[];
    expect(report.body.sales).toBe(byDay.reduce((s, d) => s + d.sales, 0));
    const count = await ctx.prisma.sale.count({
      where: { shopId: shop.shop.id, at: { gte: new Date(report.body.from) } },
    });
    expect(report.body.sales).toBe(count);
    expect(report.body.byDay).toHaveLength(30);
    expect(report.body.revenue).toBe(
      report.body.byDay.reduce((s: number, d: { revenue: number }) => s + d.revenue, 0),
    );
    const dash = await ctx
      .http()
      .get('/v1/dashboard')
      .set(...bearer(shop))
      .expect(200);
    expect(dash.body.lowStock.length).toBeGreaterThan(0);
    expect(dash.body.recentSales).toHaveLength(6);
    await ctx
      .http()
      .get('/v1/reports?days=12')
      .set(...bearer(shop))
      .expect(400);
  });
});
