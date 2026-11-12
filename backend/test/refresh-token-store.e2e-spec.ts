import type { NestExpressApplication } from '@nestjs/platform-express';
import { authenticationStoreContract } from '@nestjs/authentication/testing';
import { AuthenticationStorage } from '@nestjs/authentication';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { createTestApp } from './helpers.js';

/**
 * Roda a suíte de contrato do @nestjs/authentication contra o nosso armazenamento
 * de tokens no PostgreSQL. Inclui os casos de concorrência: duas requisições com o
 * mesmo token ao mesmo tempo, em que só uma pode vencer.
 */
describe('PrismaRefreshTokenStore (contrato)', () => {
  let app: NestExpressApplication;
  const startedAt = new Date();

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    // A suíte usa ids de usuário inventados: remove só o que ela criou nesta execução.
    const prisma = app.get(PrismaService);
    const users = await prisma.user.findMany({ select: { id: true } });
    await prisma.refreshToken.deleteMany({
      where: { userId: { notIn: users.map((user) => user.id) } },
    });
    await prisma.revokedTokenFamily.deleteMany({
      where: { revokedAt: { gte: startedAt } },
    });
    await app.close();
  });

  const cases = authenticationStoreContract(
    () => ({ refreshTokens: app.get(AuthenticationStorage).refreshTokens }),
    { contracts: ['refreshTokens'], concurrent: true },
  );

  it.each(cases.map((testCase) => [testCase.name, testCase] as const))(
    '%s',
    async (_name, testCase) => {
      await testCase.run();
    },
  );
});
