import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { cleanTestData, createTestApp, newAccount } from './helpers.js';

describe('Usuários (e2e)', () => {
  let app: NestExpressApplication;
  const server = () => app.getHttpServer();

  const account = newAccount();
  let accessToken: string;

  beforeAll(async () => {
    app = await createTestApp();
    await cleanTestData(app);
    const session = await request(server())
      .post('/api/v1/auth/register')
      .send({ ...account, displayName: 'Marina F.' })
      .expect(201);
    accessToken = session.body.accessToken;
  });

  afterAll(async () => {
    await cleanTestData(app);
    await app.close();
  });

  it('mostra o perfil público sem login e sem dados privados', async () => {
    const response = await request(server())
      .get(`/api/v1/users/${account.username}`)
      .expect(200);

    expect(response.body).toEqual({
      username: account.username,
      displayName: 'Marina F.',
      bio: null,
      avatar: null,
      createdAt: expect.any(String),
    });
  });

  it('responde 404 para perfil inexistente', async () => {
    const response = await request(server())
      .get('/api/v1/users/ninguem_com_esse_nome')
      .expect(404);

    expect(response.body.code).toBe('user_not_found');
  });

  it('exige login para editar o perfil', async () => {
    await request(server())
      .patch('/api/v1/users/me')
      .send({ displayName: 'Outro nome' })
      .expect(401);
  });

  it('edita nome e bio de quem está logado', async () => {
    const response = await request(server())
      .patch('/api/v1/users/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ displayName: '  Marina Faz  ', bio: 'Ouço discos inteiros.' })
      .expect(200);

    expect(response.body).toMatchObject({
      displayName: 'Marina Faz',
      bio: 'Ouço discos inteiros.',
    });
  });

  it('bio vazia remove a bio', async () => {
    const response = await request(server())
      .patch('/api/v1/users/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ bio: '' })
      .expect(200);

    expect(response.body.bio).toBeNull();
  });

  it('não deixa trocar e-mail, usuário ou papel pela edição de perfil', async () => {
    const response = await request(server())
      .patch('/api/v1/users/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        displayName: 'Marina',
        role: 'ADMIN',
        email: 'x@y.z',
        username: 'outro',
      })
      .expect(200);

    expect(response.body).toMatchObject({
      role: 'USER',
      email: account.email,
      username: account.username,
    });
  });

  it('valida os limites dos campos', async () => {
    const response = await request(server())
      .patch('/api/v1/users/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ bio: 'x'.repeat(281) })
      .expect(400);

    expect(response.body.details[0].field).toBe('bio');
  });
});
