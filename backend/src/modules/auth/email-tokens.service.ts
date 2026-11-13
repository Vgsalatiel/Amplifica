import { createHash, randomBytes } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import type { EmailTokenPurpose } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';

const HOUR_MS = 60 * 60 * 1000;

/** Quanto tempo cada link vale. */
export const TOKEN_TTL_MS: Record<EmailTokenPurpose, number> = {
  VERIFY_EMAIL: 24 * HOUR_MS,
  RESET_PASSWORD: HOUR_MS,
};

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/**
 * Links de uso único enviados por e-mail. O token sorteado só existe na mensagem: no banco fica o
 * SHA-256 dele, então um vazamento da tabela não entrega links utilizáveis.
 */
@Injectable()
export class EmailTokensService {
  constructor(private readonly prisma: PrismaService) {}

  /** Cria um token novo e invalida os anteriores ainda não usados da mesma pessoa e finalidade. */
  async create(userId: string, purpose: EmailTokenPurpose): Promise<string> {
    const token = randomBytes(32).toString('base64url');
    await this.prisma.$transaction([
      this.prisma.emailToken.deleteMany({
        where: { userId, purpose, usedAt: null },
      }),
      this.prisma.emailToken.create({
        data: {
          userId,
          purpose,
          tokenHash: hashToken(token),
          expiresAt: new Date(Date.now() + TOKEN_TTL_MS[purpose]),
        },
      }),
    ]);
    // Aproveita para limpar o que já venceu.
    await this.prisma.emailToken.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    });
    return token;
  }

  /**
   * Gasta o token: devolve o id da pessoa se ele existe, é desta finalidade, não venceu e ainda não
   * foi usado, ou `null`. É uma única atualização condicional, então dois cliques ao mesmo tempo
   * não passam os dois.
   */
  async consume(
    token: string,
    purpose: EmailTokenPurpose,
  ): Promise<string | null> {
    const tokenHash = hashToken(token);
    const { count } = await this.prisma.emailToken.updateMany({
      where: {
        tokenHash,
        purpose,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
      data: { usedAt: new Date() },
    });
    if (count === 0) {
      return null;
    }
    const row = await this.prisma.emailToken.findUnique({
      where: { tokenHash },
      select: { userId: true },
    });
    return row?.userId ?? null;
  }
}
