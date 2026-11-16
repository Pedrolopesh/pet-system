import type { AuthResponse, InviteLink } from '@petsystem/contracts';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { bearer, createTestApp, type Ctx, PASSWORD, signup, uniqueEmail } from './helpers.js';

let ctx: Ctx;
beforeAll(async () => (ctx = await createTestApp()));
afterAll(async () => ctx.app.close());

const invite = async (owner: AuthResponse, role: 'gerente' | 'atendente'): Promise<InviteLink> =>
  (
    await ctx
      .http()
      .post('/v1/account/invites')
      .set(...bearer(owner))
      .send({ role })
      .expect(201)
  ).body;

const accept = (token: string, email = uniqueEmail('equipe')) =>
  ctx
    .http()
    .post('/v1/auth/invites/accept')
    .send({ token, name: 'Pessoa', email, password: PASSWORD });

describe('cadastro de SaaS', () => {
  it('loja nova começa no teste de 14 dias, com o tipo de negócio escolhido', async () => {
    const res = await ctx
      .http()
      .post('/v1/auth/signup')
      .send({
        shopName: 'Clínica Vida',
        name: 'Dra. Ana',
        email: uniqueEmail(),
        password: PASSWORD,
        businessTypes: ['clinica'],
      })
      .expect(201);
    expect(res.body.user.role).toBe('dono');
    expect(res.body.shop).toMatchObject({
      plan: 'teste',
      businessTypes: ['clinica'],
      opensAt: '08:00',
    });
    expect(new Date(res.body.shop.trialEndsAt).getTime() - ctx.clock.now().getTime()).toBe(
      14 * 86_400_000,
    );
  });

  it('dados de exemplo seguem o tipo de negócio', async () => {
    const res = await ctx
      .http()
      .post('/v1/auth/signup')
      .send({
        shopName: 'Creche Au',
        name: 'Lia',
        email: uniqueEmail(),
        password: PASSWORD,
        businessTypes: ['creche'],
      })
      .expect(201);
    const products = await ctx
      .http()
      .get('/v1/products')
      .set(...bearer(res.body))
      .expect(200);
    const services = products.body
      .filter((p: { category: string }) => p.category === 'servico')
      .map((p: { name: string }) => p.name);
    expect(services).toContain('Diária de Creche');
    expect(services).not.toContain('Consulta Clínica');
    expect(products.body.some((p: { category: string }) => p.category === 'racao')).toBe(false);
  });
});

describe('convites e papéis', () => {
  it('convite vale uma vez e entra com o papel definido', async () => {
    const owner = await signup(ctx);
    const link = await invite(owner, 'atendente');
    const preview = await ctx.http().get(`/v1/auth/invites/${link.token}`).expect(200);
    expect(preview.body).toEqual({ shopName: 'Loja Teste', role: 'atendente' });
    const joined = await accept(link.token).expect(201);
    expect(joined.body.user.role).toBe('atendente');
    expect(joined.body.shop.id).toBe(owner.shop.id);
    const again = await accept(link.token).expect(400);
    expect(again.body.code).toBe('INVALID_INVITE');
  });

  it('convite vencido não vale', async () => {
    const owner = await signup(ctx);
    const link = await invite(owner, 'gerente');
    ctx.clock.set('2026-11-18T15:00:01Z');
    await accept(link.token).expect(400);
    ctx.clock.set('2026-11-10T15:00:00Z');
  });

  it('atendente vende, mas não cadastra produto, não vê relatório nem convida', async () => {
    const owner = await signup(ctx);
    const staff = (await accept((await invite(owner, 'atendente')).token).expect(201))
      .body as AuthResponse;
    await ctx
      .http()
      .get('/v1/products')
      .set(...bearer(staff))
      .expect(200);
    const denied = await ctx
      .http()
      .post('/v1/products')
      .set(...bearer(staff))
      .send({ name: 'X', category: 'racao', price: 100, cost: 50, stock: 1 })
      .expect(403);
    expect(denied.body.code).toBe('FORBIDDEN');
    await ctx
      .http()
      .get('/v1/reports?days=7')
      .set(...bearer(staff))
      .expect(403);
    await ctx
      .http()
      .post('/v1/account/invites')
      .set(...bearer(staff))
      .send({ role: 'atendente' })
      .expect(403);
  });

  it('o dono remove alguém e a sessão dessa pessoa cai na hora; o dono não pode ser removido', async () => {
    const owner = await signup(ctx);
    const staff = (await accept((await invite(owner, 'gerente')).token).expect(201))
      .body as AuthResponse;
    await ctx
      .http()
      .delete(`/v1/account/members/${staff.user.id}`)
      .set(...bearer(owner))
      .expect(204);
    await ctx
      .http()
      .get('/v1/auth/me')
      .set(...bearer(staff))
      .expect(401);
    await ctx
      .http()
      .delete(`/v1/account/members/${owner.user.id}`)
      .set(...bearer(owner))
      .expect(400);
  });
});

describe('planos', () => {
  it('Básico limita profissionais e usuários e não tem relatórios completos', async () => {
    const owner = await signup(ctx);
    await ctx
      .http()
      .post('/v1/account/plan')
      .set(...bearer(owner))
      .send({ plan: 'basico' })
      .expect(200);
    for (const name of ['A', 'B', 'C']) {
      await ctx
        .http()
        .post('/v1/employees')
        .set(...bearer(owner))
        .send({ name, role: 'atendente' })
        .expect(201);
    }
    const fourth = await ctx
      .http()
      .post('/v1/employees')
      .set(...bearer(owner))
      .send({ name: 'D', role: 'atendente' })
      .expect(403);
    expect(fourth.body.code).toBe('PLAN_LIMIT');
    // Inativo não conta
    await ctx
      .http()
      .post('/v1/employees')
      .set(...bearer(owner))
      .send({ name: 'E', role: 'atendente', active: false })
      .expect(201);

    await accept((await invite(owner, 'atendente')).token).expect(201);
    const third = await ctx
      .http()
      .post('/v1/account/invites')
      .set(...bearer(owner))
      .send({ role: 'atendente' })
      .expect(403);
    expect(third.body.code).toBe('PLAN_LIMIT');

    const reports = await ctx
      .http()
      .get('/v1/reports?days=7')
      .set(...bearer(owner))
      .expect(403);
    expect(reports.body.code).toBe('PLAN_LIMIT');
    await ctx
      .http()
      .post('/v1/account/plan')
      .set(...bearer(owner))
      .send({ plan: 'pro' })
      .expect(200);
    await ctx
      .http()
      .get('/v1/reports?days=7')
      .set(...bearer(owner))
      .expect(200);
  });

  it('teste vencido passa a valer como Básico', async () => {
    const owner = await signup(ctx);
    await ctx
      .http()
      .get('/v1/reports?days=7')
      .set(...bearer(owner))
      .expect(200);
    ctx.clock.set('2026-11-25T15:00:00Z');
    await ctx
      .http()
      .get('/v1/reports?days=7')
      .set(...bearer(owner))
      .expect(403);
    ctx.clock.set('2026-11-10T15:00:00Z');
  });

  it('não desce para o Básico acima do limite', async () => {
    const owner = await signup(ctx);
    for (const name of ['A', 'B', 'C', 'D']) {
      await ctx
        .http()
        .post('/v1/employees')
        .set(...bearer(owner))
        .send({ name, role: 'atendente' })
        .expect(201);
    }
    await ctx
      .http()
      .post('/v1/account/plan')
      .set(...bearer(owner))
      .send({ plan: 'basico' })
      .expect(409);
  });
});

describe('avisos com prioridade', () => {
  it('urgentes primeiro', async () => {
    const owner = await signup(ctx);
    for (const [text, priority] of [
      ['a', 'normal'],
      ['b', 'urgente'],
      ['c', 'importante'],
    ]) {
      await ctx
        .http()
        .post('/v1/notes')
        .set(...bearer(owner))
        .send({ text, priority })
        .expect(201);
    }
    const list = await ctx
      .http()
      .get('/v1/notes')
      .set(...bearer(owner))
      .expect(200);
    expect(list.body.map((n: { text: string }) => n.text)).toEqual(['b', 'c', 'a']);
  });
});
