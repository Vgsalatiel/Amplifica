import type { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import type { Env } from './config/env.js';

/**
 * Configuração HTTP compartilhada entre a aplicação real (main.ts) e os testes e2e,
 * para que os testes exercitem as mesmas rotas e os mesmos cabeçalhos da produção.
 */
export function setupApp(app: INestApplication): void {
  const config = app.get<ConfigService<Env, true>>(ConfigService);

  app.setGlobalPrefix('api/v1');
  app.use(helmet());
  app.enableCors({
    origin: config.get('CORS_ORIGIN', { infer: true }),
    credentials: true,
  });
  // Permite que o Nest feche as conexões do banco quando o processo recebe SIGTERM (deploy).
  app.enableShutdownHooks();
}
