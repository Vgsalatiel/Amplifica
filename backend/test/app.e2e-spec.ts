import { INestApplication, Logger } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { AppModule } from './../src/app.module.js';
import { setupApp } from './../src/app.setup.js';
import { PrismaService } from './../src/prisma/prisma.service.js';

describe('Health (e2e)', () => {
  const queryRaw = vi.fn();
  let app: INestApplication<App>;

  beforeEach(async () => {
    queryRaw.mockReset();
    // Silencia o log de erro esperado no cenário de banco fora do ar.
    vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    // O banco é substituído por um dublê: este teste verifica a rota e o contrato
    // HTTP, e precisa rodar no CI sem depender de um banco real.
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PrismaService)
      .useValue({ $queryRaw: queryRaw })
      .compile();

    app = moduleRef.createNestApplication();
    setupApp(app);
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('GET /api/v1/health responde 200 com o banco no ar', async () => {
    queryRaw.mockResolvedValue([{ '?column?': 1 }]);

    const response = await request(app.getHttpServer())
      .get('/api/v1/health')
      .expect(200);

    expect(response.body).toMatchObject({ status: 'ok', database: 'up' });
  });

  it('GET /api/v1/health responde 503 com o banco fora do ar', async () => {
    queryRaw.mockRejectedValue(new Error('connection refused'));

    const response = await request(app.getHttpServer())
      .get('/api/v1/health')
      .expect(503);

    expect(response.body).toMatchObject({ status: 'error', database: 'down' });
  });

  it('não expõe a rota fora do prefixo /api/v1', async () => {
    await request(app.getHttpServer()).get('/health').expect(404);
  });
});
