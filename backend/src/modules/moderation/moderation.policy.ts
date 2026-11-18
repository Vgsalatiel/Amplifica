import { Policy } from '@nestjs/authorization';
import type { AuthUser } from '../users/user.types.js';

/**
 * Quem pode moderar o que a comunidade produz (clipes sugeridos, comentários, denúncias, links de
 * grupo): administradores e moderadores. Não dá poder sobre o catálogo, que segue na `CatalogPolicy`,
 * só de administradores.
 */
@Policy()
export class ModerationPolicy {
  moderate(user: AuthUser | null): boolean {
    return user?.role === 'ADMIN' || user?.role === 'MODERATOR';
  }
}
