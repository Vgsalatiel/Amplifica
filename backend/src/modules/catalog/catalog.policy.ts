import { Policy } from '@nestjs/authorization';
import type { AuthUser } from '../users/user.types.js';

/**
 * Quem pode alterar o catálogo (gêneros, artistas, lançamentos e faixas).
 *
 * As rotas de escrita declaram `@Can(CatalogPolicy, 'manage')`. A regra fica em um
 * único lugar: se um dia existir um papel de "editor", muda-se só este método.
 */
@Policy()
export class CatalogPolicy {
  manage(user: AuthUser | null): boolean {
    return user?.role === 'ADMIN';
  }
}
