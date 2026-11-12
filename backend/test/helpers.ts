import { Test } from '@nestjs/testing';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from '../src/app.module.js';
import { setupApp } from '../src/app.setup.js';
import { PrismaService } from '../src/prisma/prisma.service.js';

/** Todo usuário criado pelos testes usa este domínio, para que a limpeza só apague o que é deles. */
export const TEST_EMAIL_DOMAIN = '@e2e.amplifica.test';

export async function createTestApp(): Promise<NestExpressApplication> {
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleRef.createNestApplication<NestExpressApplication>();
  setupApp(app);
  await app.init();
  return app;
}

/** Todo item de catálogo criado pelos testes tem este prefixo no endereço (slug). */
export const TEST_SLUG_PREFIX = 'e2e-';

/**
 * Remove o que os testes criaram: usuários `@e2e.amplifica.test`, as sessões deles e os
 * itens de catálogo com slug `e2e-...`. Nunca toca em dados cadastrados de verdade.
 */
export async function cleanTestData(
  app: NestExpressApplication,
): Promise<void> {
  const prisma = app.get(PrismaService);

  const slug = { startsWith: TEST_SLUG_PREFIX };
  await prisma.release.deleteMany({ where: { slug } });
  await prisma.artist.deleteMany({ where: { slug } });
  // Gêneros têm ON DELETE RESTRICT para o pai: solta a árvore antes de apagar.
  await prisma.genre.updateMany({ where: { slug }, data: { parentId: null } });
  await prisma.genre.deleteMany({ where: { slug } });

  const users = await prisma.user.findMany({
    where: { email: { endsWith: TEST_EMAIL_DOMAIN } },
    select: { id: true },
  });
  const ids = users.map((user) => user.id);
  await prisma.refreshToken.deleteMany({ where: { userId: { in: ids } } });
  await prisma.user.deleteMany({ where: { id: { in: ids } } });
}

let counter = 0;

/** Dados de cadastro únicos por chamada. */
export function newAccount() {
  counter += 1;
  const suffix = `${Date.now().toString(36)}${counter}`;
  return {
    email: `pessoa.${suffix}${TEST_EMAIL_DOMAIN}`,
    username: `t_${suffix}`.slice(0, 20),
    password: 'senha-de-teste-123',
  };
}

/** Cria uma conta pela API. Com `admin`, promove a conta direto no banco (não há rota para isso). */
export async function createSession(
  app: NestExpressApplication,
  options: { admin?: boolean } = {},
): Promise<{ token: string; id: string; auth: { Authorization: string } }> {
  const { default: request } = await import('supertest');
  const response = await request(app.getHttpServer())
    .post('/api/v1/auth/register')
    .send(newAccount())
    .expect(201);

  const id = response.body.user.id as string;
  if (options.admin) {
    await app
      .get(PrismaService)
      .user.update({ where: { id }, data: { role: 'ADMIN' } });
  }
  const token = response.body.accessToken as string;
  return { token, id, auth: { Authorization: `Bearer ${token}` } };
}
