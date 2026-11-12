import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import {
  PasswordHasher,
  RefreshTokenError,
  TokenService,
  type TokenPair,
} from '@nestjs/authentication';
import { apiError } from '../../common/api-error.js';
import { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { AuthUser } from '../users/user.types.js';
import { userSelect, UsersService } from '../users/users.service.js';
import type { LoginDto, RegisterDto } from './auth.schemas.js';

export interface AuthResult {
  user: AuthUser;
  tokens: TokenPair;
}

const INVALID_CREDENTIALS = apiError(
  'invalid_credentials',
  'E-mail ou senha incorretos.',
);

const SESSION_EXPIRED = apiError(
  'session_expired',
  'Sua sessão expirou. Entre de novo.',
);

/**
 * Regras de cadastro, login e sessão. O controller cuida de HTTP e cookies;
 * este service não sabe que eles existem.
 */
@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly users: UsersService,
    private readonly hasher: PasswordHasher,
    private readonly tokens: TokenService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthResult> {
    await this.assertAvailable(dto.email, dto.username);

    const passwordHash = await this.hasher.hash(dto.password);

    let user: AuthUser;
    try {
      user = await this.prisma.user.create({
        data: {
          email: dto.email,
          username: dto.username,
          displayName: dto.displayName ?? dto.username,
          passwordHash,
        },
        select: userSelect,
      });
    } catch (error) {
      // Duas requisições simultâneas podem passar pela checagem acima; quem decide
      // de verdade é o índice único do banco.
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          apiError('account_taken', 'E-mail ou nome de usuário já em uso.'),
        );
      }
      throw error;
    }

    return { user, tokens: await this.issue(user.id) };
  }

  async login(dto: LoginDto): Promise<AuthResult> {
    const account = await this.prisma.user.findUnique({
      where: { email: dto.email },
      select: { ...userSelect, passwordHash: true },
    });

    // Para um e-mail desconhecido, `verify` confere um hash fictício: a resposta leva
    // o mesmo tempo e traz a mesma mensagem, sem revelar quais e-mails têm conta.
    const valid = await this.hasher.verify(dto.password, account?.passwordHash);
    if (!account || !valid) {
      throw new UnauthorizedException(INVALID_CREDENTIALS);
    }

    // Se o custo do hash foi aumentado desde o cadastro, regrava com o custo atual
    // enquanto temos a senha em mãos.
    if (this.hasher.needsRehash(account.passwordHash)) {
      await this.prisma.user.update({
        where: { id: account.id },
        data: { passwordHash: await this.hasher.hash(dto.password) },
      });
    }

    const { passwordHash: _passwordHash, ...user } = account;
    return { user, tokens: await this.issue(user.id) };
  }

  /**
   * Troca um token de renovação por um novo par. O token apresentado deixa de valer;
   * se ele já tinha sido usado, o TokenService revoga a sessão inteira (sinal de roubo).
   */
  async refresh(refreshToken: string | undefined): Promise<AuthResult> {
    if (!refreshToken) {
      throw new UnauthorizedException(SESSION_EXPIRED);
    }

    let tokens: TokenPair;
    try {
      tokens = await this.tokens.refresh(refreshToken);
    } catch (error) {
      if (error instanceof RefreshTokenError) {
        throw new UnauthorizedException(SESSION_EXPIRED);
      }
      throw error;
    }

    const user = await this.users.findById(readSubject(tokens.accessToken));
    if (!user) {
      // Conta excluída com uma sessão ainda aberta.
      await this.tokens.revoke(tokens.refreshToken);
      throw new UnauthorizedException(SESSION_EXPIRED);
    }

    return { user, tokens };
  }

  /** Encerra a sessão deste dispositivo. Não revela se o token existia. */
  async logout(refreshToken: string | undefined): Promise<void> {
    if (refreshToken) {
      await this.tokens.revoke(refreshToken);
    }
  }

  private issue(userId: string): Promise<TokenPair> {
    return this.tokens.issue(userId, { method: 'password' });
  }

  private async assertAvailable(
    email: string,
    username: string,
  ): Promise<void> {
    const existing = await this.prisma.user.findMany({
      where: { OR: [{ email }, { username }] },
      select: { email: true, username: true },
    });
    if (existing.length === 0) {
      return;
    }

    const details = [];
    if (existing.some((user) => user.email === email)) {
      details.push({
        field: 'email',
        message: 'Já existe uma conta com esse e-mail.',
      });
    }
    if (existing.some((user) => user.username === username)) {
      details.push({
        field: 'username',
        message: 'Esse nome de usuário já está em uso.',
      });
    }
    throw new ConflictException(
      apiError(
        'account_taken',
        'E-mail ou nome de usuário já em uso.',
        details,
      ),
    );
  }
}

/**
 * Lê o `sub` (id do usuário) de um token de acesso que acabamos de emitir.
 * Não há verificação de assinatura aqui porque o token não veio de fora: foi
 * criado pelo TokenService nesta mesma chamada.
 */
function readSubject(accessToken: string): string {
  const payload = accessToken.split('.')[1] ?? '';
  const claims = JSON.parse(
    Buffer.from(payload, 'base64url').toString('utf8'),
  ) as { sub?: unknown };
  return typeof claims.sub === 'string' ? claims.sub : '';
}
