import { Injectable } from '@nestjs/common';
import {
  AuthenticationStorage,
  type RefreshTokenRecord,
  type RefreshTokenStore,
} from '@nestjs/authentication';
import type { Prisma, RefreshToken } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';

/** Registros de revogação mais antigos que isto já não protegem nenhum token vivo. */
const REVOCATION_RETENTION_MS = 100 * 24 * 60 * 60 * 1000;

/**
 * Guarda os tokens de renovação no PostgreSQL, via Prisma.
 *
 * O @nestjs/authentication decide QUANDO emitir, girar e revogar tokens; esta classe só
 * sabe COMO gravá-los. Ela se registra no construtor, e a partir daí o TokenService
 * passa a usar o banco no lugar do armazenamento em memória.
 */
@Injectable()
export class PrismaRefreshTokenStore implements RefreshTokenStore {
  constructor(
    private readonly prisma: PrismaService,
    storage: AuthenticationStorage,
  ) {
    storage.registerSource({ refreshTokens: this });
  }

  async getRefreshToken(id: string): Promise<RefreshTokenRecord | undefined> {
    const row = await this.prisma.refreshToken.findUnique({ where: { id } });
    return row ? toRecord(row) : undefined;
  }

  async saveRefreshToken(record: RefreshTokenRecord): Promise<void> {
    await this.prisma.refreshToken.create({
      data: {
        id: record.id,
        familyId: record.familyId,
        userId: record.userId,
        createdAt: record.createdAt,
        expiresAt: record.expiresAt,
        familyExpiresAt: record.familyExpiresAt,
        usedAt: record.usedAt,
        claims: record.claims as Prisma.InputJsonObject | undefined,
      },
    });

    // Aproveita a escrita para remover o que já venceu e manter as tabelas pequenas.
    await this.prisma.refreshToken.deleteMany({
      where: { familyExpiresAt: { lt: record.createdAt } },
    });
    await this.prisma.revokedTokenFamily.deleteMany({
      where: {
        revokedAt: {
          lt: new Date(record.createdAt.getTime() - REVOCATION_RETENTION_MS),
        },
      },
    });
  }

  /**
   * Marca o token como usado em UMA escrita condicional. Se duas requisições
   * apresentarem o mesmo token ao mesmo tempo, o banco garante que só uma delas
   * altera a linha; a outra recebe `false` e é tratada como reuso.
   */
  async markRefreshTokenUsed(id: string, at: Date): Promise<boolean> {
    const { count } = await this.prisma.refreshToken.updateMany({
      where: { id, usedAt: null },
      data: { usedAt: at },
    });
    return count === 1;
  }

  async revokeRefreshTokenFamily(familyId: string): Promise<void> {
    await this.prisma.revokedTokenFamily.createMany({
      data: [{ familyId }],
      skipDuplicates: true,
    });
  }

  async isRefreshTokenFamilyRevoked(familyId: string): Promise<boolean> {
    const row = await this.prisma.revokedTokenFamily.findUnique({
      where: { familyId },
    });
    return row !== null;
  }

  async revokeUserRefreshTokens(userId: string): Promise<void> {
    const families = await this.prisma.refreshToken.findMany({
      where: { userId },
      select: { familyId: true },
      distinct: ['familyId'],
    });
    if (families.length === 0) {
      return;
    }
    await this.prisma.revokedTokenFamily.createMany({
      data: families,
      skipDuplicates: true,
    });
  }
}

function toRecord(row: RefreshToken): RefreshTokenRecord {
  return {
    id: row.id,
    familyId: row.familyId,
    userId: row.userId,
    createdAt: row.createdAt,
    expiresAt: row.expiresAt,
    familyExpiresAt: row.familyExpiresAt,
    // O contrato pede campos opcionais ausentes, nunca `null`.
    ...(row.usedAt ? { usedAt: row.usedAt } : {}),
    ...(row.claims ? { claims: row.claims as Record<string, unknown> } : {}),
  };
}
