import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { cleanTestData, createTestApp, newAccount } from './helpers.js';

const AUTH = '/api/v1/auth';

/** Extrai o par "nome=valor" do cookie de renovação a partir do Set-Cookie. */
function refreshCookie(response: request.Response): string {
  const header = response.headers['set-cookie'] as unknown as
    string[] | undefined;
  const cookie = header?.find((value) =>
    value.startsWith('amplifica_refresh='),
  );
  if (!cookie) {
    throw new Error('A resposta não definiu o cookie de renovação');
  }
  return cookie.split(';')[0];
}

describe('Autenticação (e2e)', () => {
  let app: NestExpressApplication;
  const server = () => app.getHttpServer();

  beforeAll(async () => {
    app = await createTestApp();
    await cleanTestData(app);
  });

  afterAll(async () => {
    await cleanTestData(app);
    await app.close();
  });

  describe('cadastro', () => {
    it('cria a conta, devolve o token de acesso e define o cookie protegido', async () => {
      const account = newAccount();

      const response = await request(server())
        .post(`${AUTH}/register`)
        .send(account)
        .expect(201);

      expect(response.body.accessToken).toEqual(expect.any(String));
      expect(response.body.user).toMatchObject({
        email: account.email,
        username: account.username,
        displayName: account.username,
        role: 'USER',
      });
      expect(response.body.user).not.toHaveProperty('passwordHash');

      const cookie = (response.headers['set-cookie'] as unknown as string[])[0];
      expect(cookie).toContain('HttpOnly');
      expect(cookie).toContain('SameSite=Strict');
      expect(cookie).toContain('Path=/api/v1/auth');
    });

    it('grava o e-mail em minúsculas', async () => {
      const account = newAccount();

      const response = await request(server())
        .post(`${AUTH}/register`)
        .send({ ...account, email: account.email.toUpperCase() })
        .expect(201);

      expect(response.body.user.email).toBe(account.email);
    });

    it('recusa e-mail e nome de usuário já em uso, dizendo qual campo', async () => {
      const account = newAccount();
      await request(server())
        .post(`${AUTH}/register`)
        .send(account)
        .expect(201);

      const sameEmail = await request(server())
        .post(`${AUTH}/register`)
        .send({ ...newAccount(), email: account.email })
        .expect(409);
      expect(sameEmail.body.code).toBe('account_taken');
      expect(sameEmail.body.details).toEqual([
        expect.objectContaining({ field: 'email' }),
      ]);

      const sameUsername = await request(server())
        .post(`${AUTH}/register`)
        .send({ ...newAccount(), username: account.username })
        .expect(409);
      expect(sameUsername.body.details).toEqual([
        expect.objectContaining({ field: 'username' }),
      ]);
    });

    it('valida os campos e lista cada problema', async () => {
      const response = await request(server())
        .post(`${AUTH}/register`)
        .send({
          email: 'nao-e-email',
          username: 'Nome Com Espaço',
          password: '123',
        })
        .expect(400);

      expect(response.body.code).toBe('validation_error');
      const fields = response.body.details.map(
        (detail: { field: string }) => detail.field,
      );
      expect(fields).toEqual(
        expect.arrayContaining(['email', 'username', 'password']),
      );
    });

    it('recusa nomes de usuário reservados', async () => {
      await request(server())
        .post(`${AUTH}/register`)
        .send({ ...newAccount(), username: 'admin' })
        .expect(400);
    });

    it('ignora campos que o cliente não pode definir, como o papel', async () => {
      const response = await request(server())
        .post(`${AUTH}/register`)
        .send({ ...newAccount(), role: 'ADMIN' })
        .expect(201);

      expect(response.body.user.role).toBe('USER');
    });
  });

  describe('login', () => {
    const account = newAccount();

    beforeAll(async () => {
      await request(server())
        .post(`${AUTH}/register`)
        .send(account)
        .expect(201);
    });

    it('entra com e-mail e senha corretos', async () => {
      const response = await request(server())
        .post(`${AUTH}/login`)
        .send({ email: account.email, password: account.password })
        .expect(200);

      expect(response.body.user.username).toBe(account.username);
      expect(refreshCookie(response)).toContain('amplifica_refresh=');
    });

    it('dá a mesma resposta para senha errada e para e-mail inexistente', async () => {
      const wrongPassword = await request(server())
        .post(`${AUTH}/login`)
        .send({ email: account.email, password: 'senha-errada-000' })
        .expect(401);

      const unknownEmail = await request(server())
        .post(`${AUTH}/login`)
        .send({ email: newAccount().email, password: account.password })
        .expect(401);

      expect(wrongPassword.body).toEqual(unknownEmail.body);
      expect(wrongPassword.body.code).toBe('invalid_credentials');
    });
  });

  describe('sessão', () => {
    it('GET /me exige token e devolve a conta de quem chamou', async () => {
      const account = newAccount();
      const session = await request(server())
        .post(`${AUTH}/register`)
        .send(account);

      await request(server()).get(`${AUTH}/me`).expect(401);
      await request(server())
        .get(`${AUTH}/me`)
        .set('Authorization', 'Bearer token-invalido')
        .expect(401);

      const me = await request(server())
        .get(`${AUTH}/me`)
        .set('Authorization', `Bearer ${session.body.accessToken}`)
        .expect(200);
      expect(me.body.email).toBe(account.email);
    });

    it('renova a sessão pelo cookie e troca o token de renovação', async () => {
      const session = await request(server())
        .post(`${AUTH}/register`)
        .send(newAccount());
      const firstCookie = refreshCookie(session);

      const renewed = await request(server())
        .post(`${AUTH}/refresh`)
        .set('Cookie', firstCookie)
        .expect(200);

      expect(renewed.body.accessToken).toEqual(expect.any(String));
      expect(renewed.body.user.id).toBe(session.body.user.id);
      expect(refreshCookie(renewed)).not.toBe(firstCookie);
    });

    it('encerra a sessão inteira quando um token de renovação é reapresentado', async () => {
      const session = await request(server())
        .post(`${AUTH}/register`)
        .send(newAccount());
      const stolen = refreshCookie(session);

      const renewed = await request(server())
        .post(`${AUTH}/refresh`)
        .set('Cookie', stolen)
        .expect(200);
      const current = refreshCookie(renewed);

      // Alguém reapresenta o token antigo: sinal de que duas partes o possuem.
      const reuse = await request(server())
        .post(`${AUTH}/refresh`)
        .set('Cookie', stolen)
        .expect(401);
      expect(reuse.body.code).toBe('session_expired');

      // O token legítimo mais recente também deixa de valer.
      await request(server())
        .post(`${AUTH}/refresh`)
        .set('Cookie', current)
        .expect(401);
    });

    it('responde 401 ao renovar sem cookie', async () => {
      const response = await request(server())
        .post(`${AUTH}/refresh`)
        .expect(401);
      expect(response.body.code).toBe('session_expired');
    });

    it('logout invalida o token de renovação e limpa o cookie', async () => {
      const session = await request(server())
        .post(`${AUTH}/register`)
        .send(newAccount());
      const cookie = refreshCookie(session);

      const logout = await request(server())
        .post(`${AUTH}/logout`)
        .set('Cookie', cookie)
        .expect(204);
      expect((logout.headers['set-cookie'] as unknown as string[])[0]).toMatch(
        /amplifica_refresh=;/,
      );

      await request(server())
        .post(`${AUTH}/refresh`)
        .set('Cookie', cookie)
        .expect(401);
    });
  });
  describe('excluir a conta', () => {
    const register = async () => {
      const account = newAccount();
      const response = await request(server())
        .post(`${AUTH}/register`)
        .send(account)
        .expect(201);
      return {
        account,
        auth: { Authorization: `Bearer ${response.body.accessToken}` },
        cookie: refreshCookie(response),
        id: response.body.user.id as string,
      };
    };
    const remove = (auth: Record<string, string>, password: unknown) =>
      request(server()).post(`${AUTH}/delete-account`).set(auth).send({ password });

    it('exige login e a senha certa', async () => {
      const me = await register();
      await request(server())
        .post(`${AUTH}/delete-account`)
        .send({ password: me.account.password })
        .expect(401);
      const wrong = await remove(me.auth, 'senha-errada-000').expect(400);
      expect(wrong.body.code).toBe('invalid_password');
      expect(wrong.body.details[0].field).toBe('password');
      await remove(me.auth, '').expect(400);
      await request(server()).get('/api/v1/users/' + me.account.username).expect(200);
    });

    it('apaga a conta e tudo dela: o login deixa de funcionar e o perfil some', async () => {
      const me = await register();
      await remove(me.auth, me.account.password).expect(204);

      await request(server())
        .post(`${AUTH}/login`)
        .send({ email: me.account.email, password: me.account.password })
        .expect(401);
      await request(server())
        .get('/api/v1/users/' + me.account.username)
        .expect(404);
      await request(server())
        .post(`${AUTH}/refresh`)
        .set('Cookie', me.cookie)
        .expect(401);
    });

    it('administradores não se excluem', async () => {
      const me = await register();
      await app
        .get(PrismaService)
        .user.update({ where: { id: me.id }, data: { role: 'ADMIN' } });
      const response = await remove(me.auth, me.account.password).expect(403);
      expect(response.body.code).toBe('admin_cannot_delete');
    });
  });
});
