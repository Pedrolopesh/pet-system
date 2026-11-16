import type { AuthResponse, TutorMe, TutorSession } from '@petsystem/contracts';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { bearer, createTestApp, type Ctx, NOW, signup, uniqueEmail } from './helpers.js';

let ctx: Ctx;
let owner: AuthResponse;
let slug: string;
let groomer: string;
let bath: string;

// O relógio de teste está em 10/11/2026 às 12h de Brasília. Amanhã é dia 11.
const TOMORROW = '2026-11-11';
const at = (hhmm: string, day = TOMORROW) => `${day}T${hhmm}:00-03:00`;

beforeAll(async () => {
  ctx = await createTestApp();
  owner = await signup(ctx);
  slug = `loja-${Date.now().toString(36)}`;
  await ctx
    .http()
    .patch('/v1/account/booking')
    .set(...bearer(owner))
    .send({ slug, bookingEnabled: true })
    .expect(200);
  groomer = (
    await ctx
      .http()
      .post('/v1/employees')
      .set(...bearer(owner))
      .send({ name: 'Caio', role: 'banho' })
      .expect(201)
  ).body.id;
  bath = (
    await ctx
      .http()
      .post('/v1/products')
      .set(...bearer(owner))
      .send({
        name: 'Banho',
        category: 'servico',
        price: 5000,
        cost: 1000,
        stock: null,
        durationMinutes: 60,
        onlineBooking: true,
        performerRole: 'banho',
      })
      .expect(201)
  ).body.id;
  // Serviço que não aparece online
  await ctx
    .http()
    .post('/v1/products')
    .set(...bearer(owner))
    .send({
      name: 'Tosa artística',
      category: 'servico',
      price: 9000,
      cost: 2000,
      stock: null,
      durationMinutes: 90,
    })
    .expect(201);
});
beforeEach(() => ctx.clock.set(NOW));
afterAll(async () => ctx.app.close());

/** Entra no portal por código e completa o cadastro se for um e-mail novo. */
async function tutorLogin(
  email = uniqueEmail('tutor'),
): Promise<{ token: string; email: string; me: TutorMe }> {
  await ctx.http().post(`/v1/public/shops/${slug}/code`).send({ email }).expect(202);
  const code = ctx.mailer.lastCode(email)!;
  let session = (
    await ctx.http().post(`/v1/public/shops/${slug}/verify`).send({ email, code }).expect(200)
  ).body as TutorSession;
  if (!session.registered) {
    session = (
      await ctx
        .http()
        .post('/v1/tutor/profile')
        .set('Authorization', `Bearer ${session.token}`)
        .send({
          name: 'Rita Tutora',
          phone: '(48) 99999-1111',
          pet: { name: 'Bidu', species: 'cao' },
        })
        .expect(200)
    ).body;
  }
  const me = (
    await ctx.http().get('/v1/tutor/me').set('Authorization', `Bearer ${session.token}`).expect(200)
  ).body as TutorMe;
  return { token: session.token, email, me };
}

const book = (token: string, petId: string, startsAt: string, serviceId = bath) =>
  ctx
    .http()
    .post('/v1/tutor/appointments')
    .set('Authorization', `Bearer ${token}`)
    .send({ petId, serviceId, startsAt });

describe('configuração e página pública', () => {
  it('endereço único; atendente não mexe na configuração', async () => {
    const other = await signup(ctx);
    const taken = await ctx
      .http()
      .patch('/v1/account/booking')
      .set(...bearer(other))
      .send({ slug })
      .expect(409);
    expect(taken.body.code).toBe('SLUG_TAKEN');
    await ctx
      .http()
      .patch('/v1/account/booking')
      .set(...bearer(other))
      .send({ slug: 'Com Espaço' })
      .expect(400);
  });

  it('loja com agendamento desligado não aparece; ligada mostra só os serviços online', async () => {
    const off = await signup(ctx);
    const offShop = (
      await ctx
        .http()
        .get('/v1/auth/me')
        .set(...bearer(off))
    ).body.shop;
    const res = await ctx.http().get(`/v1/public/shops/${offShop.slug}`).expect(404);
    expect(res.body.code).toBe('BOOKING_DISABLED');
    const shop = await ctx.http().get(`/v1/public/shops/${slug}`).expect(200);
    expect(shop.body.services.map((s: { name: string }) => s.name)).toEqual(['Banho']);
  });

  it('horários respeitam antecedência, funcionamento, agenda ocupada e a janela de dias', async () => {
    const today = await ctx
      .http()
      .get(`/v1/public/shops/${slug}/slots?serviceId=${bath}&day=2026-11-10`)
      .expect(200);
    expect(today.body.slots[0]).toBe('14:00'); // agora são 12h + 2h de antecedência
    expect(today.body.slots.at(-1)).toBe('18:00'); // fecha às 19h e o banho dura 1h

    const c = await ctx
      .http()
      .post('/v1/clients')
      .set(...bearer(owner))
      .send({ name: 'Ana', pets: [{ name: 'Thor', species: 'cao' }] });
    await ctx
      .http()
      .post('/v1/appointments')
      .set(...bearer(owner))
      .send({
        clientId: c.body.id,
        petId: c.body.pets[0].id,
        serviceId: bath,
        employeeId: groomer,
        startsAt: at('09:00'),
      })
      .expect(201);
    const tomorrow = await ctx
      .http()
      .get(`/v1/public/shops/${slug}/slots?serviceId=${bath}&day=${TOMORROW}`)
      .expect(200);
    expect(tomorrow.body.slots.slice(0, 3)).toEqual(['08:00', '10:00', '10:30']);

    const far = await ctx
      .http()
      .get(`/v1/public/shops/${slug}/slots?serviceId=${bath}&day=2027-01-20`)
      .expect(200);
    expect(far.body.slots).toEqual([]);
  });
});

describe('login do tutor por código', () => {
  it('responde igual para qualquer e-mail e só aceita o código certo, uma vez', async () => {
    const email = uniqueEmail('novo');
    await ctx.http().post(`/v1/public/shops/${slug}/code`).send({ email }).expect(202);
    const code = ctx.mailer.lastCode(email)!;
    expect(code).toMatch(/^\d{6}$/);
    const wrong = code === '000000' ? '111111' : '000000';
    const bad = await ctx
      .http()
      .post(`/v1/public/shops/${slug}/verify`)
      .send({ email, code: wrong })
      .expect(400);
    expect(bad.body.code).toBe('INVALID_CODE');
    const ok = await ctx
      .http()
      .post(`/v1/public/shops/${slug}/verify`)
      .send({ email, code })
      .expect(200);
    expect(ok.body.registered).toBe(false);
    await ctx.http().post(`/v1/public/shops/${slug}/verify`).send({ email, code }).expect(400);
  });

  it('5 tentativas erradas inutilizam o código; código vence em 10 minutos', async () => {
    const email = uniqueEmail('forca');
    await ctx.http().post(`/v1/public/shops/${slug}/code`).send({ email });
    const code = ctx.mailer.lastCode(email)!;
    const wrong = code === '000000' ? '111111' : '000000';
    for (let i = 0; i < 5; i++)
      await ctx
        .http()
        .post(`/v1/public/shops/${slug}/verify`)
        .send({ email, code: wrong })
        .expect(400);
    await ctx.http().post(`/v1/public/shops/${slug}/verify`).send({ email, code }).expect(400);

    const late = uniqueEmail('tarde');
    await ctx.http().post(`/v1/public/shops/${slug}/code`).send({ email: late });
    const lateCode = ctx.mailer.lastCode(late)!;
    ctx.clock.set('2026-11-10T15:10:01Z');
    await ctx
      .http()
      .post(`/v1/public/shops/${slug}/verify`)
      .send({ email: late, code: lateCode })
      .expect(400);
  });

  it('e-mail de cliente já cadastrado entra direto; e-mail novo completa o cadastro', async () => {
    const email = uniqueEmail('cliente');
    await ctx
      .http()
      .post('/v1/clients')
      .set(...bearer(owner))
      .send({ name: 'Bia Cliente', email, pets: [{ name: 'Mel', species: 'gato' }] });
    const known = await tutorLogin(email);
    expect(known.me.client.name).toBe('Bia Cliente');
    expect(known.me.pets.map((p) => p.name)).toEqual(['Mel']);
    const fresh = await tutorLogin();
    expect(fresh.me.client.phone).toBe('48999991111');
    expect(fresh.me.pets.map((p) => p.name)).toEqual(['Bidu']);
  });

  it('token do tutor não abre a área da loja e vice-versa', async () => {
    const { token } = await tutorLogin();
    await ctx.http().get('/v1/products').set('Authorization', `Bearer ${token}`).expect(401);
    await ctx
      .http()
      .get('/v1/tutor/me')
      .set(...bearer(owner))
      .expect(401);
  });
});

describe('agendamento pelo tutor', () => {
  it('agenda num horário livre e aparece na agenda da loja como online', async () => {
    const { token, me } = await tutorLogin();
    const res = await book(token, me.pets[0]!.id, at('11:00')).expect(201);
    const appt = (res.body as TutorMe).upcoming[0]!;
    expect(appt).toMatchObject({
      service: 'Banho',
      professional: 'Caio',
      status: 'agendado',
      cancellable: true,
    });
    const agenda = await ctx
      .http()
      .get(`/v1/appointments?from=${TOMORROW}`)
      .set(...bearer(owner))
      .expect(200);
    expect(agenda.body.find((a: { id: string }) => a.id === appt.id).source).toBe('online');
  });

  it('não agenda horário ocupado, fora da grade, antes da antecedência nem serviço que não é online', async () => {
    const a = await tutorLogin();
    const b = await tutorLogin();
    await book(a.token, a.me.pets[0]!.id, at('15:00')).expect(201);
    const taken = await book(b.token, b.me.pets[0]!.id, at('15:00')).expect(409);
    expect(taken.body.code).toBe('SLOT_TAKEN');
    await book(b.token, b.me.pets[0]!.id, at('15:10')).expect(409); // fora da grade de 30 min
    await book(b.token, b.me.pets[0]!.id, at('13:00', '2026-11-10')).expect(409); // antes das 14h de hoje
    const offline = (
      await ctx
        .http()
        .get('/v1/products')
        .set(...bearer(owner))
    ).body.find((p: { name: string }) => p.name === 'Tosa artística');
    await book(b.token, b.me.pets[0]!.id, at('16:00'), offline.id).expect(400);
    // pet de outro tutor
    await book(b.token, a.me.pets[0]!.id, at('16:00')).expect(400);
  });

  it('pedidos simultâneos para o mesmo horário: só um entra', async () => {
    const tutors = await Promise.all([1, 2, 3].map(() => tutorLogin()));
    const results = await Promise.all(
      tutors.map((t) => book(t.token, t.me.pets[0]!.id, at('17:00'))),
    );
    expect(results.map((r) => r.status).sort()).toEqual([201, 409, 409]);
  });

  it('com dois profissionais, o segundo pedido vai para o outro', async () => {
    await ctx
      .http()
      .post('/v1/employees')
      .set(...bearer(owner))
      .send({ name: 'Dora', role: 'banho' })
      .expect(201);
    const a = await tutorLogin();
    const b = await tutorLogin();
    const first = await book(a.token, a.me.pets[0]!.id, at('12:00')).expect(201);
    const second = await book(b.token, b.me.pets[0]!.id, at('12:00')).expect(201);
    const names = [
      first.body.upcoming[0].professional,
      second.body.upcoming[0].professional,
    ].sort();
    expect(names).toEqual(['Caio', 'Dora']);
  });

  it('cancela pelo portal só até o prazo da loja', async () => {
    const { token, me } = await tutorLogin();
    const booked = (await book(token, me.pets[0]!.id, at('16:30', '2026-11-10')).expect(201))
      .body as TutorMe;
    const appt = booked.upcoming.find((u) => u.startsAt.startsWith('2026-11-10'))!;
    expect(appt.cancellable).toBe(true); // faltam 4h30 e o prazo padrão é 4h: ainda dá
    // às 13h faltam 3h30: passou do prazo de 4h
    ctx.clock.set('2026-11-10T16:00:00Z');
    const late = await ctx
      .http()
      .post(`/v1/tutor/appointments/${appt.id}/cancel`)
      .set('Authorization', `Bearer ${token}`)
      .expect(409);
    expect(late.body.code).toBe('TOO_LATE');
    ctx.clock.set(NOW);
    const other = (await book(token, me.pets[0]!.id, at('09:30', '2026-11-12')).expect(201))
      .body as TutorMe;
    const next = other.upcoming.find((u) => u.startsAt.startsWith('2026-11-12'))!;
    const ok = await ctx
      .http()
      .post(`/v1/tutor/appointments/${next.id}/cancel`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect((ok.body as TutorMe).upcoming.some((u) => u.id === next.id)).toBe(false);
  });

  it('demonstração: atalho de tutor só funciona na loja demo', async () => {
    await ctx.http().post(`/v1/public/shops/${slug}/demo`).expect(404);
  });
});
