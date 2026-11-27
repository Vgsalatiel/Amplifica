import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module.js';
import { setupApp } from './app.setup.js';
import { initMonitoring } from './common/monitoring.js';
import type { Env } from './config/env.js';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  setupApp(app);

  const config = app.get<ConfigService<Env, true>>(ConfigService);
  const port = config.get('PORT', { infer: true });
  if (
    initMonitoring(
      config.get('SENTRY_DSN', { infer: true }),
      config.get('NODE_ENV', { infer: true }),
    )
  ) {
    new Logger('Bootstrap').log('Aviso de erros (Sentry) ligado.');
  }

  await app.listen(port);
  new Logger('Bootstrap').log(`API em http://localhost:${port}/api/v1`);
}
await bootstrap();
