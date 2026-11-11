import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service.js';

/**
 * Módulo global: qualquer módulo de domínio pode injetar o PrismaService
 * sem precisar importar o PrismaModule.
 */
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
