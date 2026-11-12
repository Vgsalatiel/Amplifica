import { Policy } from '@nestjs/authorization';
import type { AuthUser } from '../users/user.types.js';

/**
 * Quem pode apagar uma avaliação: o autor, ou um administrador (moderação). A regra fica
 * aqui, em um lugar só; o service a consulta depois de carregar a avaliação, porque ela
 * depende de quem é o dono do registro.
 */
@Policy()
export class ReviewPolicy {
  delete(user: AuthUser | null, review: { userId: string }): boolean {
    return (
      user !== null && (user.id === review.userId || user.role === 'ADMIN')
    );
  }
}
