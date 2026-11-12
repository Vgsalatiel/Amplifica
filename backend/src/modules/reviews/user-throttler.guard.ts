import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

/**
 * Limita gravações por pessoa, não por endereço IP: quem está logado é identificado pelo id,
 * então trocar de rede não zera o limite, e várias pessoas atrás do mesmo IP não se atrapalham.
 * Roda depois do guard de autenticação, então `request.user` já existe aqui.
 */
@Injectable()
export class UserThrottlerGuard extends ThrottlerGuard {
  protected getTracker(request: Record<string, any>): Promise<string> {
    const id: unknown = request.user?.id;
    return Promise.resolve(
      typeof id === 'string' ? `user:${id}` : `ip:${String(request.ip)}`,
    );
  }
}
