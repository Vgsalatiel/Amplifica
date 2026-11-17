import { Module } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import { UserThrottlerGuard } from '../reviews/user-throttler.guard.js';
import { ClipsController } from './clips.controller.js';
import { ClipsService } from './clips.service.js';
import { YouTubeOEmbed } from './youtube-oembed.js';

@Module({
  imports: [
    ThrottlerModule.forRoot({
      throttlers: [{ ttl: 60_000, limit: 10 }],
      // Os testes fazem várias gravações seguidas na mesma conta.
      skipIf: () => process.env['NODE_ENV'] === 'test',
    }),
  ],
  controllers: [ClipsController],
  providers: [ClipsService, YouTubeOEmbed, UserThrottlerGuard],
})
export class ClipsModule {}
