import { Injectable } from '@nestjs/common';
import {
  AuthenticationRegistry,
  JwtBearerProvider,
  type JwtClaims,
} from '@nestjs/authentication';
import type { AuthUser } from '../users/user.types.js';
import { UsersService } from '../users/users.service.js';

/**
 * Autentica requisições que trazem `Authorization: Bearer <token de acesso>`.
 *
 * A classe base confere assinatura, validade, emissor e público do JWT. Aqui só
 * dizemos como chegar do token ao usuário: o `sub` é o id. Carregar o usuário do
 * banco a cada requisição garante que uma conta excluída perca o acesso na hora
 * e que o papel (USER/ADMIN) esteja sempre atualizado.
 */
@Injectable()
export class JwtAuth extends JwtBearerProvider<AuthUser> {
  constructor(
    private readonly users: UsersService,
    registry: AuthenticationRegistry,
  ) {
    super();
    registry.registerProvider(this);
  }

  protected validate({ sub }: JwtClaims): Promise<AuthUser | null> | null {
    return sub ? this.users.findById(sub) : null;
  }
}
