import { Logger } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { createTestApp } from './helpers.js';

describe('Health (e2e)', () => {
  let app: NestExpressApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /api/v1/health responde 200 com o banco no ar, sem exigir login', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/health')
      .expect(200);

    expect(response.body).toMatchObject({ status: 'ok', database: 'up' });
  });

  it('responde 503 no formato de erro da API quando o banco falha', async () => {
    vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    vi.spyOn(app.get(PrismaService), '$queryRaw').mockRejectedValueOnce(
      new Error('connection refused'),
    );

    const response = await request(app.getHttpServer())
      .get('/api/v1/health')
      .expect(503);

    expect(response.body).toEqual({
      statusCode: 503,
      code: 'database_unavailable',
      message: 'O banco de dados está indisponível.',
    });
  });

  it('responde 404 em português para rota inexistente', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/nao-existe')
      .expect(404);

    expect(response.body.code).toBe('not_found');
  });
});
