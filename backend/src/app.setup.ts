import type { NestExpressApplication } from '@nestjs/platform-express';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import { ApiExceptionFilter } from './common/api-exception.filter.js';
import { createValidationPipe } from './common/validation.js';
import type { Env } from './config/env.js';
import {
  LOCAL_FILES_ROUTE,
  LOCAL_STORAGE_ROOT,
  resolveStorageMode,
} from './modules/images/storage.config.js';

/**
 * Configuração HTTP compartilhada entre a aplicação real (main.ts) e os testes e2e,
 * para que os testes exercitem as mesmas rotas, validações e erros da produção.
 */
export function setupApp(app: NestExpressApplication): void {
  const config = app.get<ConfigService<Env, true>>(ConfigService);

  app.setGlobalPrefix('api/v1');
  app.use(helmet());
  app.enableCors({
    origin: config.get('CORS_ORIGIN', { infer: true }),
    credentials: true,
  });
  // A API fica atrás do proxy do Render: confia em um salto para ler o IP de origem.
  app.set('trust proxy', 1);
  // Em desenvolvimento, as imagens enviadas ficam em backend/storage e a própria API
  // as serve. Em produção elas vêm direto do bucket, sem passar por aqui.
  const storageMode = resolveStorageMode({
    NODE_ENV: config.get('NODE_ENV', { infer: true }),
    STORAGE_S3_BUCKET: config.get('STORAGE_S3_BUCKET', { infer: true }),
  } as Env);
  if (storageMode === 'local') {
    app.useStaticAssets(LOCAL_STORAGE_ROOT, {
      prefix: `${LOCAL_FILES_ROUTE}/`,
      // O site roda em outra porta: sem isto o navegador recusa exibir as imagens.
      setHeaders: (response) =>
        response.setHeader('Cross-Origin-Resource-Policy', 'cross-origin'),
    });
  }
  app.useGlobalPipes(createValidationPipe());
  app.useGlobalFilters(new ApiExceptionFilter());
  // Permite que o Nest feche as conexões do banco quando o processo recebe SIGTERM (deploy).
  app.enableShutdownHooks();
}
