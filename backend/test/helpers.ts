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

/** Remove os usuários de teste e as sessões deles. Nunca toca em dados de outras contas. */
export async function cleanTestData(
  app: NestExpressApplication,
): Promise<void> {
  const prisma = app.get(PrismaService);
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
