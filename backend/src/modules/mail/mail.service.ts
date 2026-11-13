import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../../config/env.js';

export interface MailMessage {
  to: string;
  subject: string;
  text: string;
  html: string;
}

/** Como as mensagens saem: pelo Resend (produção), no terminal (desenvolvimento), numa lista (testes) ou nunca. */
export type MailTransport = 'resend' | 'console' | 'outbox' | 'none';

/**
 * Envio de e-mails. Só existem dois textos no sistema (confirmar e-mail e redefinir senha), então
 * o serviço é pequeno: escolhe o transporte pela configuração e entrega a mensagem.
 *
 * - `resend`: a API HTTP do Resend, quando `RESEND_API_KEY` e `MAIL_FROM` estão definidos.
 * - `console`: em desenvolvimento, escreve a mensagem (com o link) no terminal da API.
 * - `outbox`: nos testes, guarda as mensagens em memória para o teste ler o link.
 * - `none`: produção sem configuração. Os recursos que dependem de e-mail ficam desligados.
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  readonly transport: MailTransport;
  /** Mensagens enviadas no transporte `outbox` (só existe em testes). */
  readonly outbox: MailMessage[] = [];
  private readonly apiKey?: string;
  private readonly from?: string;

  constructor(config: ConfigService<Env, true>) {
    this.apiKey = config.get('RESEND_API_KEY', { infer: true });
    this.from = config.get('MAIL_FROM', { infer: true });
    const nodeEnv = config.get('NODE_ENV', { infer: true });

    if (this.apiKey && this.from) {
      this.transport = 'resend';
    } else if (nodeEnv === 'test') {
      this.transport = 'outbox';
    } else if (nodeEnv === 'development') {
      this.transport = 'console';
    } else {
      this.transport = 'none';
    }
  }

  /** Existe algum jeito de a mensagem chegar? Sem isso, nada que dependa de e-mail pode ser exigido. */
  get canDeliver(): boolean {
    return this.transport !== 'none';
  }

  async send(message: MailMessage): Promise<void> {
    switch (this.transport) {
      case 'resend':
        await this.sendWithResend(message);
        return;
      case 'outbox':
        this.outbox.push(message);
        return;
      case 'console':
        this.logger.log(
          `E-mail para ${message.to}: "${message.subject}"\n${message.text}`,
        );
        return;
      case 'none':
        throw new Error('O envio de e-mails não está configurado.');
    }
  }

  private async sendWithResend(message: MailMessage): Promise<void> {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: this.from,
        to: [message.to],
        subject: message.subject,
        text: message.text,
        html: message.html,
      }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) {
      // O corpo do erro do Resend não traz segredo; o endereço do destinatário não é logado.
      throw new Error(
        `O Resend recusou o envio (${response.status}): ${(await response.text()).slice(0, 300)}`,
      );
    }
  }
}
