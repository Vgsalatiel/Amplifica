import { Module } from '@nestjs/common';
import { AuthenticationModule } from '@nestjs/authentication';
import { ConfigService } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import type { Env } from '../../config/env.js';
import { UsersModule } from '../users/users.module.js';
import { AuthThrottlerGuard } from './auth-throttler.guard.js';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { JwtAuth } from './jwt-auth.provider.js';
import { PrismaRefreshTokenStore } from './prisma-refresh-token.store.js';

@Module({
  imports: [
    UsersModule,
    // Registra um guard global: toda rota exige usuário autenticado, a não ser que
    // seja marcada com @Public(). Esquecer a anotação deixa a rota fechada, não aberta.
    AuthenticationModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => {
        const isTest = config.get('NODE_ENV', { infer: true }) === 'test';
        return {
          accessToken: {
            key: config.get('JWT_ACCESS_SECRET', { infer: true }),
            issuer: 'amplifica-api',
            audience: 'amplifica-web',
            ttl: '15m',
          },
          refreshToken: { ttl: '30d', absoluteTtl: '90d' },
          // scrypt com N=2^15, r=8, p=3: uma das configurações recomendadas pela OWASP,
          // escolhida por usar ~32 MiB por hash (a padrão do pacote usa ~128 MiB, demais
          // para os 512 MB do plano gratuito do Render). Nos testes, o custo mínimo.
          password: isTest ? { logN: 10 } : { logN: 15, r: 8, p: 3 },
        };
      },
    }),
    ThrottlerModule.forRoot({
      throttlers: [{ ttl: 60_000, limit: 30 }],
      // Os testes fazem dezenas de chamadas seguidas às mesmas rotas.
      skipIf: () => process.env['NODE_ENV'] === 'test',
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtAuth,
    PrismaRefreshTokenStore,
    AuthThrottlerGuard,
  ],
})
export class AuthModule {}
