import type { AuthResponse } from '@petsystem/contracts';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { bearer, createTestApp, type Ctx, signup } from './helpers.js';

let ctx: Ctx;
let owner: AuthResponse;
let groomer: string;
let service: string;
let client: string;
let pet: string;

// 10/11/2026, uma terça; o relógio de teste está às 12h de Brasília desse dia.
const slot = (hour: number, minute = 0) =>
  `2026-11-11T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00-03:00`;

beforeAll(async () => {
  ctx = await createTestApp();
  owner = await signup(ctx);
  const http = () => ctx.http();
  groomer = (
    await http()
      .post('/v1/employees')
      .set(...bearer(owner))
      .send({ name: 'Caio', role: 'banho' })
      .expect(201)
  ).body.id;
  service = (
    await http()
      .post('/v1/products')
      .set(...bearer(owner))
      .send({
        name: 'Banho',
        category: 'servico',
        price: 5000,
        cost: 1500,
        stock: null,
        durationMinutes: 60,
      })
      .expect(201)
  ).body.id;
  const c = await http()
    .post('/v1/clients')
    .set(...bearer(owner))
    .send({ name: 'Ana', pets: [{ name: 'Thor', species: 'cao' }] })
    .expect(201);
  client = c.body.id;
  pet = c.body.pets[0].id;
});
afterAll(async () => ctx.app.close());

const book = (body: Record<string, unknown>) =>
  ctx
    .http()
    .post('/v1/appointments')
    .set(...bearer(owner))
    .send({ clientId: client, petId: pet, serviceId: service, employeeId: groomer, ...body });

describe('agenda', () => {
  it('agenda com a duração do serviço e lista pelo dia local', async () => {
    const a = await book({ startsAt: slot(9) }).expect(201);
    expect(a.body.endsAt).toBe('2026-11-11T13:00:00.000Z');
    expect(a.body.price).toBe(5000);
    expect(a.body.pet.name).toBe('Thor');
    const day = await ctx
      .http()
      .get('/v1/appointments?from=2026-11-11')
      .set(...bearer(owner))
      .expect(200);
    expect(day.body.map((x: { id: string }) => x.id)).toContain(a.body.id);
    const other = await ctx
      .http()
      .get('/v1/appointments?from=2026-11-12')
      .set(...bearer(owner))
      .expect(200);
    expect(other.body.map((x: { id: string }) => x.id)).not.toContain(a.body.id);
  });

  it('não deixa o profissional ter dois atendimentos ao mesmo tempo', async () => {
    await book({ startsAt: slot(14) }).expect(201);
    const clash = await book({ startsAt: slot(14, 30) }).expect(409);
    expect(clash.body.code).toBe('SLOT_TAKEN');
    // Encostado no fim do outro pode; sem profissional também pode.
    await book({ startsAt: slot(15) }).expect(201);
    await book({ startsAt: slot(14, 30), employeeId: null }).expect(201);
  });

  it('pedidos simultâneos para o mesmo horário: só um entra', async () => {
    const results = await Promise.all([1, 2, 3].map(() => book({ startsAt: slot(17) })));
    expect(results.map((r) => r.status).sort()).toEqual([201, 409, 409]);
  });

  it('remarcar respeita o conflito, e cancelado libera o horário', async () => {
    const a = await book({ startsAt: slot(10, 30) }).expect(201);
    const b = await book({ startsAt: slot(11, 30) }).expect(201);
    await ctx
      .http()
      .patch(`/v1/appointments/${b.body.id}`)
      .set(...bearer(owner))
      .send({ startsAt: slot(10, 45) })
      .expect(409);
    await ctx
      .http()
      .post(`/v1/appointments/${a.body.id}/status`)
      .set(...bearer(owner))
      .send({ status: 'cancelado' })
      .expect(201);
    await ctx
      .http()
      .patch(`/v1/appointments/${b.body.id}`)
      .set(...bearer(owner))
      .send({ startsAt: slot(10, 45) })
      .expect(200);
  });

  it('segue o fluxo de status e recusa voltar atrás', async () => {
    const a = await book({ startsAt: slot(8) }).expect(201);
    const go = (status: string) =>
      ctx
        .http()
        .post(`/v1/appointments/${a.body.id}/status`)
        .set(...bearer(owner))
        .send({ status });
    await go('confirmado').expect(201);
    await go('em_atendimento').expect(201);
    await go('pronto').expect(201);
    const back = await go('agendado').expect(409);
    expect(back.body.code).toBe('INVALID_STATUS');
  });

  it('pet de outro cliente ou serviço que não é serviço são recusados', async () => {
    const other = await ctx
      .http()
      .post('/v1/clients')
      .set(...bearer(owner))
      .send({ name: 'Bia', pets: [{ name: 'Mel', species: 'gato' }] });
    await book({ startsAt: slot(16), petId: other.body.pets[0].id }).expect(400);
    const product = await ctx
      .http()
      .post('/v1/products')
      .set(...bearer(owner))
      .send({ name: 'Ração', category: 'racao', price: 1000, cost: 500, stock: 3 });
    await book({ startsAt: slot(16), serviceId: product.body.id }).expect(400);
  });

  it('cobrar no caixa conclui o atendimento e liga à venda; não cobra duas vezes', async () => {
    const a = await book({ startsAt: slot(12) }).expect(201);
    const sale = await ctx
      .http()
      .post('/v1/sales')
      .set(...bearer(owner))
      .send({
        items: [{ productId: service, qty: 1 }],
        clientId: client,
        employeeId: groomer,
        payment: 'pix',
        appointmentIds: [a.body.id],
      })
      .expect(201);
    const day = await ctx
      .http()
      .get('/v1/appointments?from=2026-11-11')
      .set(...bearer(owner));
    const billed = day.body.find((x: { id: string }) => x.id === a.body.id);
    expect(billed).toMatchObject({ status: 'concluido', saleId: sale.body.id });
    await ctx
      .http()
      .post('/v1/sales')
      .set(...bearer(owner))
      .send({
        items: [{ productId: service, qty: 1 }],
        employeeId: groomer,
        payment: 'pix',
        appointmentIds: [a.body.id],
      })
      .expect(409);
  });

  it('outra loja não vê nem mexe na agenda desta', async () => {
    const a = await book({ startsAt: slot(18) }).expect(201);
    const intruder = await signup(ctx);
    const list = await ctx
      .http()
      .get('/v1/appointments?from=2026-11-11')
      .set(...bearer(intruder))
      .expect(200);
    expect(list.body).toEqual([]);
    await ctx
      .http()
      .post(`/v1/appointments/${a.body.id}/status`)
      .set(...bearer(intruder))
      .send({ status: 'cancelado' })
      .expect(404);
    await ctx
      .http()
      .post('/v1/appointments')
      .set(...bearer(intruder))
      .send({ clientId: client, petId: pet, serviceId: service, startsAt: slot(19) })
      .expect(400);
  });
});
