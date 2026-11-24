import { createHash, randomBytes, randomInt, timingSafeEqual } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import type { EmailTokenPurpose } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';

const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;

/** Quanto tempo cada link ou código vale. */
export const TOKEN_TTL_MS: Record<EmailTokenPurpose, number> = {
  VERIFY_EMAIL: 24 * HOUR_MS,
  RESET_PASSWORD: 30 * MINUTE_MS,
};

/** Quantas vezes dá para digitar um código de 6 números antes de ele ser descartado. */
export const MAX_CODE_ATTEMPTS = 8;

/** O hash leva o id da pessoa junto: um código curto sozinho seria fácil de reverter. */
export function hashCode(userId: string, code: string): string {
  return createHash('sha256').update(`code:${userId}:${code}`).digest('hex');
}

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

  /**
   * Cria um código de 6 números (redefinição de senha) e invalida os anteriores ainda não usados.
   * No banco fica só o hash dele, junto com o id da pessoa.
   */
  async createCode(userId: string, purpose: EmailTokenPurpose): Promise<string> {
    const code = randomInt(0, 1_000_000).toString().padStart(6, '0');
    await this.prisma.$transaction([
      this.prisma.emailToken.deleteMany({
        where: { userId, purpose, usedAt: null },
      }),
      this.prisma.emailToken.create({
        data: {
          userId,
          purpose,
          tokenHash: hashCode(userId, code),
          expiresAt: new Date(Date.now() + TOKEN_TTL_MS[purpose]),
        },
      }),
    ]);
    await this.prisma.emailToken.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    });
    return code;
  }

  /**
   * Confere o código da pessoa. Cada conferência gasta uma das tentativas (a conta é feita no banco,
   * antes de comparar, então chutes em paralelo também respeitam o limite). Com `consume`, um código
   * certo é gasto e não vale de novo.
   */
  async verifyCode(
    userId: string,
    purpose: EmailTokenPurpose,
    code: string,
    options: { consume: boolean },
  ): Promise<boolean> {
    const row = await this.prisma.emailToken.findFirst({
      where: { userId, purpose, usedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
    });
    if (!row) {
      return false;
    }
    const { count } = await this.prisma.emailToken.updateMany({
      where: {
        id: row.id,
        usedAt: null,
        attempts: { lt: MAX_CODE_ATTEMPTS },
      },
      data: { attempts: { increment: 1 } },
    });
    if (count === 0) {
      return false;
    }
    const given = Buffer.from(hashCode(userId, code));
    const stored = Buffer.from(row.tokenHash);
    if (given.length !== stored.length || !timingSafeEqual(given, stored)) {
      return false;
    }
    if (!options.consume) {
      return true;
    }
    const { count: used } = await this.prisma.emailToken.updateMany({
      where: { id: row.id, usedAt: null },
      data: { usedAt: new Date() },
    });
    return used === 1;
  }
}
