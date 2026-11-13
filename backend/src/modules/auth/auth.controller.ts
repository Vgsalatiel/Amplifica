import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CurrentUser, Public } from '@nestjs/authentication';
import { Can } from '@nestjs/authorization';
import { SkipThrottle, Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import type { Env } from '../../config/env.js';
import { ImagesService } from '../images/images.service.js';
import { MailService } from '../mail/mail.service.js';
import {
  toPrivateUser,
  type AuthUser,
  type PrivateUserResponse,
} from '../users/user.types.js';
import { AuthThrottlerGuard } from './auth-throttler.guard.js';
import {
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
  verifyEmailSchema,
  type ForgotPasswordDto,
  type LoginDto,
  type RegisterDto,
  type ResetPasswordDto,
  type VerifyEmailDto,
} from './auth.schemas.js';
import { AuthService, type AuthResult } from './auth.service.js';
import {
  clearRefreshCookie,
  readRefreshCookie,
  setRefreshCookie,
} from './refresh-cookie.js';

/** O que login, cadastro e renovação devolvem ao frontend. */
export interface SessionResponse {
  accessToken: string;
  /** Segundos até o token de acesso expirar. */
  expiresIn: number;
  user: PrivateUserResponse;
}

@Controller('auth')
@UseGuards(AuthThrottlerGuard)
export class AuthController {
  private readonly secureCookies: boolean;

  constructor(
    private readonly auth: AuthService,
    private readonly images: ImagesService,
    private readonly mail: MailService,
    config: ConfigService<Env, true>,
  ) {
    this.secureCookies =
      config.get('NODE_ENV', { infer: true }) === 'production';
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('register')
  async register(
    @Body({ schema: registerSchema }) body: RegisterDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<SessionResponse> {
    return this.startSession(await this.auth.register(body), response);
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @HttpCode(200)
  @Post('login')
  async login(
    @Body({ schema: loginSchema }) body: LoginDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<SessionResponse> {
    return this.startSession(await this.auth.login(body), response);
  }

  /** Renova a sessão a partir do cookie. É o que mantém o usuário logado ao recarregar a página. */
  @Public()
  @HttpCode(200)
  @Post('refresh')
  async refresh(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<SessionResponse> {
    try {
      const result = await this.auth.refresh(readRefreshCookie(request));
      return this.startSession(result, response);
    } catch (error) {
      clearRefreshCookie(response, this.secureCookies);
      throw error;
    }
  }

  @Public()
  @HttpCode(204)
  @Post('logout')
  async logout(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<void> {
    await this.auth.logout(readRefreshCookie(request));
    clearRefreshCookie(response, this.secureCookies);
  }

  /** Confirma o e-mail com o token do link recebido. */
  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @HttpCode(204)
  @Post('verify-email')
  async verifyEmail(
    @Body({ schema: verifyEmailSchema }) body: VerifyEmailDto,
  ): Promise<void> {
    await this.auth.verifyEmail(body.token);
  }

  /** Reenvia o link de confirmação para quem está logado. */
  @Can.Anyone()
  @Throttle({ default: { limit: 3, ttl: 600_000 } })
  @HttpCode(204)
  @Post('resend-verification')
  async resendVerification(@CurrentUser() user: AuthUser): Promise<void> {
    await this.auth.resendVerification(user);
  }

  /** "Esqueci a senha": a resposta é a mesma exista a conta ou não. */
  @Public()
  @Throttle({ default: { limit: 3, ttl: 600_000 } })
  @HttpCode(204)
  @Post('forgot-password')
  async forgotPassword(
    @Body({ schema: forgotPasswordSchema }) body: ForgotPasswordDto,
  ): Promise<void> {
    await this.auth.forgotPassword(body.email);
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @HttpCode(204)
  @Post('reset-password')
  async resetPassword(
    @Body({ schema: resetPasswordSchema }) body: ResetPasswordDto,
  ): Promise<void> {
    await this.auth.resetPassword(body.token, body.password);
  }

  @Can.Anyone()
  @SkipThrottle()
  @Get('me')
  me(@CurrentUser() user: AuthUser): PrivateUserResponse {
    return toPrivateUser(
      user,
      (path) => this.images.toSet(path),
      this.mail.canDeliver,
    );
  }

  private startSession(
    { user, tokens }: AuthResult,
    response: Response,
  ): SessionResponse {
    setRefreshCookie(response, tokens.refreshToken, this.secureCookies);
    return {
      accessToken: tokens.accessToken,
      expiresIn: tokens.expiresIn,
      user: toPrivateUser(
        user,
        (path) => this.images.toSet(path),
        this.mail.canDeliver,
      ),
    };
  }
}
