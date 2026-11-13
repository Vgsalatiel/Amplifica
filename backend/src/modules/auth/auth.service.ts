import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  PasswordHasher,
  RefreshTokenError,
  TokenService,
  type TokenPair,
} from '@nestjs/authentication';
import { apiError } from '../../common/api-error.js';
import type { Env } from '../../config/env.js';
import { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { MailService } from '../mail/mail.service.js';
import {
  resetPasswordMessage,
  verifyEmailMessage,
} from '../mail/mail.templates.js';
import type { AuthUser } from '../users/user.types.js';
import { userSelect, UsersService } from '../users/users.service.js';
import type { LoginDto, RegisterDto } from './auth.schemas.js';
import { EmailTokensService } from './email-tokens.service.js';

export interface AuthResult {
  user: AuthUser;
  tokens: TokenPair;
}

const INVALID_CREDENTIALS = apiError(
  'invalid_credentials',
  'E-mail ou senha incorretos.',
);

const INVALID_LINK = apiError(
  'invalid_token',
  'Esse link venceu ou já foi usado. Peça um novo.',
);

const EMAIL_UNAVAILABLE = apiError(
  'email_unavailable',
  'O envio de e-mails não está disponível agora.',
);

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

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
  private readonly logger = new Logger(AuthService.name);
  /** Endereço do site, de onde saem os links dos e-mails. É a mesma origem autorizada no CORS. */
  private readonly siteOrigin: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly users: UsersService,
    private readonly hasher: PasswordHasher,
    private readonly tokens: TokenService,
    private readonly mail: MailService,
    private readonly emailTokens: EmailTokensService,
    config: ConfigService<Env, true>,
  ) {
    this.siteOrigin = config
      .get('CORS_ORIGIN', { infer: true })
      .replace(/\/+$/, '');
  }

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

    if (this.mail.canDeliver) {
      // Em segundo plano: a resposta do cadastro não espera o provedor de e-mail.
      this.inBackground('e-mail de confirmação', () =>
        this.sendVerification(user),
      );
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

  /** Envia (ou reenvia) o link de confirmação. Quem já confirmou não recebe nada. */
  async resendVerification(user: AuthUser): Promise<void> {
    if (user.emailVerifiedAt) {
      return;
    }
    if (!this.mail.canDeliver) {
      throw new ServiceUnavailableException(EMAIL_UNAVAILABLE);
    }
    try {
      await this.sendVerification(user);
    } catch (error) {
      this.logger.error(`Falha ao enviar a confirmação: ${errorText(error)}`);
      throw new ServiceUnavailableException(
        apiError(
          'email_send_failed',
          'Não foi possível enviar o e-mail agora. Tente de novo em instantes.',
        ),
      );
    }
  }

  /** Confirma o e-mail a partir do link recebido. */
  async verifyEmail(token: string): Promise<void> {
    const userId = await this.emailTokens.consume(token, 'VERIFY_EMAIL');
    if (!userId) {
      throw new BadRequestException(INVALID_LINK);
    }
    await this.prisma.user.updateMany({
      where: { id: userId, emailVerifiedAt: null },
      data: { emailVerifiedAt: new Date() },
    });
  }

  /**
   * Pedido de "esqueci a senha". A resposta é sempre a mesma, exista a conta ou não, e o envio
   * acontece em segundo plano: nem o texto nem o tempo de resposta revelam quais e-mails têm conta.
   */
  async forgotPassword(email: string): Promise<void> {
    if (!this.mail.canDeliver) {
      throw new ServiceUnavailableException(EMAIL_UNAVAILABLE);
    }
    const account = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, displayName: true },
    });
    if (!account) {
      return;
    }
    this.inBackground('e-mail de redefinição de senha', async () => {
      const token = await this.emailTokens.create(account.id, 'RESET_PASSWORD');
      await this.mail.send(
        resetPasswordMessage(
          account.email,
          account.displayName,
          this.link('/redefinir-senha', token),
        ),
      );
    });
  }

  /**
   * Define a nova senha com o link recebido. Encerra todas as sessões da conta (quem tinha a senha
   * antiga, inclusive um invasor, perde o acesso) e conta o e-mail como confirmado, já que a pessoa
   * acabou de provar que lê essa caixa de entrada.
   */
  async resetPassword(token: string, password: string): Promise<void> {
    const userId = await this.emailTokens.consume(token, 'RESET_PASSWORD');
    if (!userId) {
      throw new BadRequestException(INVALID_LINK);
    }
    const passwordHash = await this.hasher.hash(password);
    const verified = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { emailVerifiedAt: true },
    });
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash, emailVerifiedAt: verified?.emailVerifiedAt ?? new Date() },
    });
    await this.tokens.revokeAll(userId);
  }

  private async sendVerification(
    user: Pick<AuthUser, 'id' | 'email' | 'displayName'>,
  ): Promise<void> {
    const token = await this.emailTokens.create(user.id, 'VERIFY_EMAIL');
    await this.mail.send(
      verifyEmailMessage(
        user.email,
        user.displayName,
        this.link('/confirmar-email', token),
      ),
    );
  }

  private link(path: string, token: string): string {
    return `${this.siteOrigin}${path}?token=${encodeURIComponent(token)}`;
  }

  /** Roda sem bloquear a resposta; uma falha vai para o log, nunca para quem fez o pedido. */
  private inBackground(what: string, task: () => Promise<void>): void {
    void task().catch((error: unknown) =>
      this.logger.error(`Falha no envio do ${what}: ${errorText(error)}`),
    );
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
