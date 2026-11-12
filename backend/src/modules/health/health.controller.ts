import {
  Controller,
  Get,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Public } from '@nestjs/authentication';
import { apiError } from '../../common/api-error.js';
import { PrismaService } from '../../prisma/prisma.service.js';

export interface HealthResponse {
  status: 'ok';
  database: 'up';
  timestamp: string;
}

/**
 * Health check: confirma que a API está no ar e que consegue falar com o banco.
 * É usado pelo guia visual do frontend e, no deploy, pelo Render.
 */
@Public()
@Controller('health')
export class HealthController {
  private readonly logger = new Logger(HealthController.name);

  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async check(): Promise<HealthResponse> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch (error) {
      // O detalhe do erro fica só no log do servidor; a resposta não expõe dados da conexão.
      this.logger.error('Banco de dados indisponível', error);
      throw new ServiceUnavailableException(
        apiError('database_unavailable', 'O banco de dados está indisponível.'),
      );
    }

    return {
      status: 'ok',
      database: 'up',
      timestamp: new Date().toISOString(),
    };
  }
}
