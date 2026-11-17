import type { AuthResponse } from '@petsystem/contracts';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import {
  bearer,
  createTestApp,
  type Ctx,
  OTHER_PASSWORD,
  PASSWORD,
  signup,
  uniqueEmail,
} from './helpers.js';

let ctx: Ctx;
beforeAll(async () => (ctx = await createTestApp()));
afterAll(async () => ctx.app.close());

describe('autenticação', () => {
  it('cadastro cria loja e conta; e-mail repetido dá 409', async () => {
    const email = uniqueEmail();
    const body = {
      shopName: 'Patinhas',
      name: 'Rita',
      email,
      password: PASSWORD,
      withSampleData: false,
    }; // scan-allow: fake
    const res = await ctx.http().post('/v1/auth/signup').send(body).expect(201);
    expect(res.body.shop).toMatchObject({ name: 'Patinhas', isDemo: false });
    expect(res.body.user.email).toBe(email);
    expect(res.body.passwordHash).toBeUndefined();
    const again = await ctx
      .http()
      .post('/v1/auth/signup')
      .send({ ...body, email: email.toUpperCase() })
      .expect(409);
    expect(again.body.code).toBe('EMAIL_TAKEN');
  });

  it('login: senha certa entra; errada e conta inexistente dão a mesma resposta', async () => {
    const email = uniqueEmail();
    await ctx.http().post('/v1/auth/signup').send({
      shopName: 'L',
      name: 'N',
      email,
      password: PASSWORD,
      withSampleData: false,
    }); // scan-allow: fake
    await ctx.http().post('/v1/auth/login').send({ email, password: PASSWORD }).expect(200); // scan-allow: fake
    const wrong = await ctx
      .http()
      .post('/v1/auth/login')
      .send({ email, password: OTHER_PASSWORD })
      .expect(401); // scan-allow: fake
    const missing = await ctx
      .http()
      .post('/v1/auth/login')
      .send({ email: uniqueEmail(), password: OTHER_PASSWORD })
      .expect(401); // scan-allow: fake
    expect(wrong.body).toMatchObject({
      code: 'INVALID_CREDENTIALS',
      message: missing.body.message,
    });
  });

  it('validação não devolve a senha recebida', async () => {
    const res = await ctx
      .http()
      .post('/v1/auth/signup')
      .send({ email: 'x', password: 'abc' })
      .expect(400); // scan-allow: fake
    expect(JSON.stringify(res.body)).not.toContain('abc');
  });

  it('rotas protegidas exigem token válido', async () => {
    await ctx.http().get('/v1/products').expect(401);
    await ctx.http().get('/v1/products').set('Authorization', 'Bearer lixo').expect(401);
    await ctx.http().get('/health').expect(200);
  });

  it('refresh roda o token; reusar o antigo derruba a sessão inteira', async () => {
    const s = await signup(ctx);
    const r1 = await ctx
      .http()
      .post('/v1/auth/refresh')
      .send({ refreshToken: s.refreshToken })
      .expect(200);
    const r1Body = r1.body as AuthResponse;
    expect(r1Body.refreshToken).not.toBe(s.refreshToken);
    await ctx.http().post('/v1/auth/refresh').send({ refreshToken: s.refreshToken }).expect(401);
    await ctx
      .http()
      .get('/v1/auth/me')
      .set(...bearer(r1Body))
      .expect(401);
  });

  it('logout encerra a sessão na hora', async () => {
    const s = await signup(ctx);
    await ctx
      .http()
      .get('/v1/auth/me')
      .set(...bearer(s))
      .expect(200);
    await ctx
      .http()
      .post('/v1/auth/logout')
      .set(...bearer(s))
      .expect(204);
    await ctx
      .http()
      .get('/v1/auth/me')
      .set(...bearer(s))
      .expect(401);
  });

  it('demo: entra sem senha na loja de demonstração com dados', async () => {
    const res = await ctx.http().post('/v1/auth/demo').expect(200);
    expect(res.body.shop.isDemo).toBe(true);
    const products = await ctx
      .http()
      .get('/v1/products')
      .set(...bearer(res.body))
      .expect(200);
    expect(products.body.length).toBeGreaterThan(10);
    // O link público da demo não pode ser trocado nem desligado por visitantes
    const locked = await ctx
      .http()
      .patch('/v1/account/booking')
      .set(...bearer(res.body))
      .send({ bookingEnabled: false })
      .expect(403);
    expect(locked.body.code).toBe('DEMO_READ_ONLY');
    // Ninguém cadastra o e-mail reservado da demo
    await ctx
      .http()
      .post('/v1/auth/signup')
      .send({ shopName: 'X', name: 'X', email: res.body.user.email, password: PASSWORD }) // scan-allow: fake
      .expect(409);
  });
});
