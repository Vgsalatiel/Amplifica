import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

/**
 * Limita tentativas nas rotas de autenticação.
 *
 * Quando a requisição traz um e-mail (login e cadastro), o limite é contado por
 * e-mail: é o que protege uma conta de tentativas de adivinhar a senha, venham de
 * onde vierem. Nas demais rotas, conta por endereço IP.
 */
@Injectable()
export class AuthThrottlerGuard extends ThrottlerGuard {
  protected getTracker(request: Record<string, any>): Promise<string> {
    const email: unknown = request.body?.email;
    if (typeof email === 'string' && email.length > 0) {
      return Promise.resolve(`email:${email.trim().toLowerCase()}`);
    }
    return Promise.resolve(`ip:${String(request.ip)}`);
  }
}
