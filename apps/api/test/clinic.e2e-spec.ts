import type { AuthResponse } from '@petsystem/contracts';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { bearer, createTestApp, type Ctx, NOW, signup } from './helpers.js';

let ctx: Ctx;
let owner: AuthResponse;
let vet: string;
let pet: string;

beforeAll(async () => {
  ctx = await createTestApp();
  owner = await signup(ctx);
  vet = (
    await ctx
      .http()
      .post('/v1/employees')
      .set(...bearer(owner))
      .send({ name: 'Dra. Helena', role: 'veterinario' })
      .expect(201)
  ).body.id;
  const c = await ctx
    .http()
    .post('/v1/clients')
    .set(...bearer(owner))
    .send({
      name: 'Ana',
      phone: '48999990000',
      pets: [{ name: 'Thor', species: 'cao', breed: 'Golden' }],
    })
    .expect(201);
  pet = c.body.pets[0].id;
});
afterAll(async () => ctx.app.close());

const record = (body: Record<string, unknown> = {}) =>
  ctx
    .http()
    .post(`/v1/pets/${pet}/records`)
    .set(...bearer(owner))
    .send({
      vetId: vet,
      weightKg: 28.45,
      temperatureC: 38.6,
      complaint: 'Coceira nas orelhas',
      diagnosis: 'Otite externa',
      prescription: [
        {
          medication: 'Solução otológica',
          dosage: '3 gotas',
          frequency: '12/12h',
          duration: '7 dias',
        },
      ],
      ...body,
    });

describe('ficha de saúde', () => {
  it('guarda nascimento, sexo, castração e alergias', async () => {
    const res = await ctx
      .http()
      .patch(`/v1/pets/${pet}/health`)
      .set(...bearer(owner))
      .send({
        birthDate: '2021-03-10',
        sex: 'macho',
        neutered: true,
        allergies: 'Alergia a frango',
      })
      .expect(200);
    expect(res.body).toMatchObject({
      birthDate: '2021-03-10',
      sex: 'macho',
      neutered: true,
      allergies: 'Alergia a frango',
    });
    await ctx
      .http()
      .patch(`/v1/pets/${pet}/health`)
      .set(...bearer(owner))
      .send({ birthDate: '10/03/2021' })
      .expect(400);
  });
});

describe('prontuário', () => {
  it('registra atendimento com receita e guarda peso e temperatura sem perder precisão', async () => {
    const res = await record().expect(201);
    expect(res.body).toMatchObject({
      weightKg: 28.45,
      temperatureC: 38.6,
      editable: true,
      kind: 'consulta',
    });
    expect(res.body.vet.name).toBe('Dra. Helena');
    expect(res.body.author.name).toBe('Dona');
    expect(res.body.prescription).toHaveLength(1);
    const file = await ctx
      .http()
      .get(`/v1/pets/${pet}/clinical`)
      .set(...bearer(owner))
      .expect(200);
    expect(file.body.records[0].id).toBe(res.body.id);
    expect(file.body.weights.at(-1)).toMatchObject({ kg: 28.45 });
    expect(file.body.pet.client.name).toBe('Ana');
  });

  it('corrige dentro de 24 horas; depois fica travado', async () => {
    const res = await record().expect(201);
    const fixed = await ctx
      .http()
      .put(`/v1/records/${res.body.id}`)
      .set(...bearer(owner))
      .send({ vetId: vet, diagnosis: 'Otite externa bilateral', prescription: [] })
      .expect(200);
    expect(fixed.body.diagnosis).toBe('Otite externa bilateral');
    expect(fixed.body.prescription).toEqual([]);
    ctx.clock.set('2026-11-11T15:00:01Z');
    const late = await ctx
      .http()
      .put(`/v1/records/${res.body.id}`)
      .set(...bearer(owner))
      .send({ diagnosis: 'x' })
      .expect(409);
    expect(late.body.code).toBe('RECORD_LOCKED');
    const file = await ctx
      .http()
      .get(`/v1/pets/${pet}/clinical`)
      .set(...bearer(owner));
    expect(file.body.records.find((r: { id: string }) => r.id === res.body.id).editable).toBe(
      false,
    );
    ctx.clock.set(NOW);
  });

  it('receita para imprimir traz loja, pet e tutor', async () => {
    const res = await record().expect(201);
    const doc = await ctx
      .http()
      .get(`/v1/records/${res.body.id}/prescription`)
      .set(...bearer(owner))
      .expect(200);
    expect(doc.body.shop.name).toBe('Loja Teste');
    expect(doc.body.pet.name).toBe('Thor');
    expect(doc.body.record.prescription[0].medication).toBe('Solução otológica');
  });

  it('não aceita veterinário nem atendimento de outra loja', async () => {
    const other = await signup(ctx);
    const otherVet = await ctx
      .http()
      .post('/v1/employees')
      .set(...bearer(other))
      .send({ name: 'X', role: 'veterinario' });
    await record({ vetId: otherVet.body.id }).expect(400);
    await record({ appointmentId: '0b6f1f3e-6a8e-4d3c-9f55-2b1f8e0c9a11' }).expect(400);
  });
});

describe('vacinas e lembretes', () => {
  it('registra a vacina e mostra o reforço vencido ou a vencer, ignorando o já reforçado', async () => {
    const add = (vaccine: string, appliedAt: string, nextDoseAt: string | null) =>
      ctx
        .http()
        .post(`/v1/pets/${pet}/vaccinations`)
        .set(...bearer(owner))
        .send({ vaccine, appliedAt, nextDoseAt, vetId: vet, batch: 'L1' });
    await add('Antirrábica', '2025-11-01', '2026-11-01').expect(201); // vencida (hoje é 10/11/2026)
    await add('V10 (polivalente canina)', '2025-11-20', '2026-11-20').expect(201); // vence em 10 dias
    await add('Giárdia', '2025-01-01', '2026-01-01').expect(201); // vencida, mas reforçada abaixo
    await add('Giárdia', '2026-01-05', '2027-01-05').expect(201);
    await add('Leishmaniose', '2026-01-05', '2026-01-04').expect(400); // reforço antes da aplicação

    const due = await ctx
      .http()
      .get('/v1/vaccinations/due?days=30')
      .set(...bearer(owner))
      .expect(200);
    const names = due.body.map(
      (d: { vaccine: string; overdue: boolean }) => `${d.vaccine}:${d.overdue}`,
    );
    expect(names).toEqual(['Antirrábica:true', 'V10 (polivalente canina):false']);
    expect(due.body[0].client.phone).toBe('48999990000');
  });

  it('lançamento errado pode ser apagado só nas primeiras 24 horas', async () => {
    const v = await ctx
      .http()
      .post(`/v1/pets/${pet}/vaccinations`)
      .set(...bearer(owner))
      .send({ vaccine: 'Gripe canina (tosse dos canis)', appliedAt: '2026-11-10' })
      .expect(201);
    ctx.clock.set('2026-11-12T15:00:00Z');
    await ctx
      .http()
      .delete(`/v1/vaccinations/${v.body.id}`)
      .set(...bearer(owner))
      .expect(409);
    ctx.clock.set(NOW);
    await ctx
      .http()
      .delete(`/v1/vaccinations/${v.body.id}`)
      .set(...bearer(owner))
      .expect(204);
  });

  it('outra loja não vê a ficha nem os lembretes', async () => {
    const intruder = await signup(ctx);
    await ctx
      .http()
      .get(`/v1/pets/${pet}/clinical`)
      .set(...bearer(intruder))
      .expect(404);
    await ctx
      .http()
      .post(`/v1/pets/${pet}/records`)
      .set(...bearer(intruder))
      .send({ complaint: 'x' })
      .expect(404);
    const due = await ctx
      .http()
      .get('/v1/vaccinations/due')
      .set(...bearer(intruder))
      .expect(200);
    expect(due.body).toEqual([]);
  });
});
