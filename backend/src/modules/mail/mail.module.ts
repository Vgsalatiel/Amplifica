import { Global, Module } from '@nestjs/common';
import { MailService } from './mail.service.js';

/** Global: tanto a autenticação quanto as avaliações precisam saber se há como enviar e-mails. */
@Global()
@Module({ providers: [MailService], exports: [MailService] })
export class MailModule {}
