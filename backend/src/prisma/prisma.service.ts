import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaPg } from '@prisma/adapter-pg';
import type { Env } from '../config/env.js';
import { PrismaClient } from '../generated/prisma/client.js';

/**
 * Único ponto de acesso ao banco. Os services de cada domínio recebem este
 * PrismaService por injeção de dependência e nunca criam um PrismaClient próprio:
 * cada instância abre um pool de conexões.
 *
 * A conexão é aberta na primeira consulta, não na inicialização. Assim a API sobe
 * mesmo que o Neon esteja "dormindo" (o plano gratuito suspende o banco após
 * inatividade), e a rota de health informa o estado real.
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleDestroy {
  constructor(config: ConfigService<Env, true>) {
    super({
      adapter: new PrismaPg({
        connectionString: config.get('DATABASE_URL', { infer: true }),
      }),
    });
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
