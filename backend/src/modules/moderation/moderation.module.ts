import { Global, Module } from '@nestjs/common';
import { ModerationPolicy } from './moderation.policy.js';

/** Disponibiliza a política de moderação para os módulos que têm conteúdo da comunidade. */
@Global()
@Module({
  providers: [ModerationPolicy],
  exports: [ModerationPolicy],
})
export class ModerationModule {}
