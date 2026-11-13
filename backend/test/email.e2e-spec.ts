import { createHash } from 'node:crypto';
import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { MailService, type MailMessage } from '../src/modules/mail/mail.service.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import {
  cleanTestData,
  createSession,
  createTestApp,
  newAccount,
} from './helpers.js';

const AUTH = '/api/v1/auth';
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe('Confirmação de e-mail e redefinição de senha (e2e)', () => {
  let app: NestExpressApplication;
  let prisma: PrismaService;
  let mail: MailService;
  const server = () => app.getHttpServer();

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
    mail = app.get(MailService);
    await cleanTestData(app);
    const admin = await createSession(app, { admin: true });
    const artist = await request(server())
      .post('/api/v1/artists')
      .set(admin.auth)
      .send({ name: 'E2E Email', slug: 'e2e-email' })
      .expect(201);
    await request(server())
      .post('/api/v1/releases')
      .set(admin.auth)
      .send({
        title: 'Disco Email',
        slug: 'e2e-email-disco',
        type: 'ALBUM',
        releaseDate: '2020-01-01',
        artists: [{ artistId: artist.body.id }],
      })
      .expect(201);
  });

  afterAll(async () => {
    await cleanTestData(app);
    await app.close();
  });

  /** Os envios acontecem em segundo plano: espera a mensagem para o endereço aparecer na caixa de teste. */
  const SUBJECTS = { verify: /Confirme seu e-mail/, reset: /Redefina sua senha/ };
  async function mailTo(
    address: string,
    kind: keyof typeof SUBJECTS = 'verify',
    nth = 1,
  ): Promise<MailMessage> {
    for (let i = 0; i < 100; i += 1) {
      const found = mail.outbox.filter(
        (m) => m.to === address && SUBJECTS[kind].test(m.subject),
      );
      if (found.length >= nth) {
        return found[nth - 1];
      }
      await sleep(20);
    }
    throw new Error(`Nenhum e-mail (${kind}) chegou para ${address}`);
  }
  const tokenIn = (message: MailMessage): string => {
    const match = /token=([A-Za-z0-9_-]+)/.exec(message.text);
    if (!match) {
      throw new Error('O e-mail não trouxe um link com token');
    }
    return match[1];
  };

  async function signUp() {
    const account = newAccount();
    const response = await request(server())
      .post(`${AUTH}/register`)
      .send(account)
      .expect(201);
    const token = response.body.accessToken as string;
    return {
      ...account,
      id: response.body.user.id as string,
      auth: { Authorization: `Bearer ${token}` },
      body: response.body,
    };
  }
  const rate = (auth: Record<string, string>, rating = 8) =>
    request(server())
      .put('/api/v1/releases/e2e-email-disco/reviews/me')
      .set(auth)
      .send({ rating });

  describe('confirmação de e-mail', () => {
    it('o cadastro envia o link, e a conta fica pendente até confirmar', async () => {
      const user = await signUp();

      expect(user.body.user.needsEmailVerification).toBe(true);
      const message = await mailTo(user.email);
      expect(message.subject).toMatch(/Confirme seu e-mail/);
      expect(message.text).toMatch(/\/confirmar-email\?token=/);
      expect(message.text).toContain('http://localhost:5173');
    });

    it('enquanto não confirma, não pode avaliar (403), mas pode ler e apagar', async () => {
      const user = await signUp();

      const blocked = await rate(user.auth).expect(403);
      expect(blocked.body.code).toBe('email_not_verified');
      await request(server())
        .get('/api/v1/releases/e2e-email-disco/reviews')
        .expect(200);
      await request(server())
        .delete('/api/v1/releases/e2e-email-disco/reviews/me')
        .set(user.auth)
        .expect(404);
    });

    it('confirma pelo link, e a partir daí pode avaliar', async () => {
      const user = await signUp();
      const token = tokenIn(await mailTo(user.email));

      await request(server()).post(`${AUTH}/verify-email`).send({ token }).expect(204);

      const me = await request(server()).get(`${AUTH}/me`).set(user.auth).expect(200);
      expect(me.body.needsEmailVerification).toBe(false);
      await rate(user.auth).expect(200);
    });

    it('o link só funciona uma vez, e dois cliques simultâneos não passam os dois', async () => {
      const user = await signUp();
      const token = tokenIn(await mailTo(user.email));

      const results = await Promise.all([
        request(server()).post(`${AUTH}/verify-email`).send({ token }),
        request(server()).post(`${AUTH}/verify-email`).send({ token }),
      ]);
      expect(results.map((r) => r.status).sort((a, b) => a - b)).toEqual([204, 400]);
      const again = await request(server()).post(`${AUTH}/verify-email`).send({ token }).expect(400);
      expect(again.body.code).toBe('invalid_token');
    });

    it('recusa token inventado, vencido ou de outra finalidade', async () => {
      const user = await signUp();
      const token = tokenIn(await mailTo(user.email));

      await request(server()).post(`${AUTH}/verify-email`).send({ token: 'x'.repeat(43) }).expect(400);
      await request(server()).post(`${AUTH}/verify-email`).send({ token: 'curto' }).expect(400);

      // Vencido: volta o prazo no banco.
      await prisma.emailToken.updateMany({ where: { userId: user.id }, data: { expiresAt: new Date(Date.now() - 1000) } });
      await request(server()).post(`${AUTH}/verify-email`).send({ token }).expect(400);

      // Um token de confirmação não serve para redefinir a senha.
      const fresh = await signUp();
      const freshToken = tokenIn(await mailTo(fresh.email));
      await request(server())
        .post(`${AUTH}/reset-password`)
        .send({ token: freshToken, password: 'outra-senha-123' })
        .expect(400);
      const still = await request(server()).get(`${AUTH}/me`).set(fresh.auth).expect(200);
      expect(still.body.needsEmailVerification).toBe(true);
    });

    it('guarda só o hash do token no banco', async () => {
      const user = await signUp();
      const token = tokenIn(await mailTo(user.email));

      const rows = await prisma.emailToken.findMany({ where: { userId: user.id } });
      expect(rows).toHaveLength(1);
      expect(rows[0].tokenHash).toBe(createHash('sha256').update(token).digest('hex'));
      expect(rows[0].tokenHash).not.toContain(token);
    });

    it('reenviar exige login, manda um link novo e invalida o anterior', async () => {
      const user = await signUp();
      const first = tokenIn(await mailTo(user.email));

      await request(server()).post(`${AUTH}/resend-verification`).expect(401);
      await request(server()).post(`${AUTH}/resend-verification`).set(user.auth).expect(204);
      const second = tokenIn(await mailTo(user.email, 'verify', 2));

      expect(second).not.toBe(first);
      await request(server()).post(`${AUTH}/verify-email`).send({ token: first }).expect(400);
      await request(server()).post(`${AUTH}/verify-email`).send({ token: second }).expect(204);
    });

    it('quem já confirmou não recebe outro e-mail ao pedir reenvio', async () => {
      const user = await signUp();
      await mailTo(user.email);
      await prisma.user.update({ where: { id: user.id }, data: { emailVerifiedAt: new Date() } });
      const before = mail.outbox.length;

      await request(server()).post(`${AUTH}/resend-verification`).set(user.auth).expect(204);
      await sleep(100);

      expect(mail.outbox.length).toBe(before);
    });

    it('administradores não precisam confirmar para avaliar', async () => {
      const admin = await createSession(app, { admin: true, unverified: true });

      const me = await request(server()).get(`${AUTH}/me`).set(admin.auth).expect(200);
      expect(me.body.needsEmailVerification).toBe(false);
      await rate(admin.auth).expect(200);
    });

    it('contas antigas (já confirmadas pela migração) seguem avaliando', async () => {
      const user = await createSession(app);
      await rate(user.auth).expect(200);
    });
  });

  describe('esqueci a senha', () => {
    it('a resposta é idêntica para e-mail com e sem conta, e só quem tem conta recebe o e-mail', async () => {
      const user = await signUp();
      const unknown = `ninguem.${Date.now()}@e2e.amplifica.test`;
      await mailTo(user.email);
      const before = mail.outbox.length;

      const known = await request(server()).post(`${AUTH}/forgot-password`).send({ email: user.email });
      const missing = await request(server()).post(`${AUTH}/forgot-password`).send({ email: unknown });

      expect(known.status).toBe(204);
      expect(missing.status).toBe(204);
      expect(known.body).toEqual(missing.body);
      const message = await mailTo(user.email, 'reset');
      expect(message.subject).toMatch(/Redefina sua senha/);
      await sleep(150);
      expect(mail.outbox.filter((m) => m.to === unknown)).toHaveLength(0);
      // Só o e-mail de senha de quem tem conta; nenhum para o desconhecido.
      expect(mail.outbox.length - before).toBe(1);
    });

    it('redefine a senha: a nova funciona, a antiga não, e as sessões abertas caem', async () => {
      const user = await signUp();
      const cookie = (await request(server()).post(`${AUTH}/login`).send({ email: user.email, password: user.password }).expect(200)).headers['set-cookie'] as unknown as string[];
      await request(server()).post(`${AUTH}/forgot-password`).send({ email: user.email }).expect(204);
      const token = tokenIn(await mailTo(user.email, 'reset'));

      await request(server()).post(`${AUTH}/reset-password`).send({ token, password: 'senha-nova-456' }).expect(204);

      await request(server()).post(`${AUTH}/login`).send({ email: user.email, password: user.password }).expect(401);
      await request(server()).post(`${AUTH}/login`).send({ email: user.email, password: 'senha-nova-456' }).expect(200);
      // O cookie de renovação de antes da troca já não vale.
      await request(server()).post(`${AUTH}/refresh`).set('Cookie', cookie.map((c) => c.split(';')[0])).expect(401);
    });

    it('o link só funciona uma vez, e a senha nova segue as regras de sempre', async () => {
      const user = await signUp();
      await request(server()).post(`${AUTH}/forgot-password`).send({ email: user.email }).expect(204);
      const token = tokenIn(await mailTo(user.email, 'reset'));

      const weak = await request(server()).post(`${AUTH}/reset-password`).send({ token, password: '123' }).expect(400);
      expect(weak.body.details[0].field).toBe('password');
      // A tentativa recusada por validação não gasta o link.
      await request(server()).post(`${AUTH}/reset-password`).send({ token, password: 'senha-nova-456' }).expect(204);
      const reused = await request(server()).post(`${AUTH}/reset-password`).send({ token, password: 'outra-senha-789' }).expect(400);
      expect(reused.body.code).toBe('invalid_token');
    });

    it('um segundo pedido invalida o link anterior', async () => {
      const user = await signUp();
      await request(server()).post(`${AUTH}/forgot-password`).send({ email: user.email }).expect(204);
      const first = tokenIn(await mailTo(user.email, 'reset'));
      await request(server()).post(`${AUTH}/forgot-password`).send({ email: user.email }).expect(204);
      const second = tokenIn(await mailTo(user.email, 'reset', 2));

      await request(server()).post(`${AUTH}/reset-password`).send({ token: first, password: 'senha-nova-456' }).expect(400);
      await request(server()).post(`${AUTH}/reset-password`).send({ token: second, password: 'senha-nova-456' }).expect(204);
    });

    it('redefinir a senha também confirma o e-mail, porque a pessoa provou que lê a caixa', async () => {
      const user = await signUp();
      await request(server()).post(`${AUTH}/forgot-password`).send({ email: user.email }).expect(204);
      const token = tokenIn(await mailTo(user.email, 'reset'));

      await request(server()).post(`${AUTH}/reset-password`).send({ token, password: 'senha-nova-456' }).expect(204);

      const login = await request(server()).post(`${AUTH}/login`).send({ email: user.email, password: 'senha-nova-456' }).expect(200);
      expect(login.body.user.needsEmailVerification).toBe(false);
    });

    it('o e-mail é comparado sem diferenciar maiúsculas', async () => {
      const user = await signUp();
      await request(server()).post(`${AUTH}/forgot-password`).send({ email: user.email.toUpperCase() }).expect(204);

      expect((await mailTo(user.email, 'reset')).subject).toMatch(/Redefina/);
    });

    it('recusa e-mail malformado', async () => {
      await request(server()).post(`${AUTH}/forgot-password`).send({ email: 'sem-arroba' }).expect(400);
    });
  });

  it('excluir a conta apaga os tokens de e-mail dela (ON DELETE CASCADE)', async () => {
    const user = await signUp();
    await mailTo(user.email);
    expect(await prisma.emailToken.count({ where: { userId: user.id } })).toBe(1);

    await prisma.user.delete({ where: { id: user.id } });

    expect(await prisma.emailToken.count({ where: { userId: user.id } })).toBe(0);
  });
});
