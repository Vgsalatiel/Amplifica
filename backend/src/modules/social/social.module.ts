import { Module } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import { ArtistsModule } from '../artists/artists.module.js';
import { UserThrottlerGuard } from '../reviews/user-throttler.guard.js';
import { FeedService } from './feed.service.js';
import { FollowsService } from './follows.service.js';
import {
  FeedController,
  FollowController,
  FollowListsController,
} from './social.controller.js';

@Module({
  imports: [
    ArtistsModule,
    ThrottlerModule.forRoot({
      throttlers: [{ ttl: 60_000, limit: 30 }],
      skipIf: () => process.env['NODE_ENV'] === 'test',
    }),
  ],
  controllers: [FollowController, FollowListsController, FeedController],
  providers: [FollowsService, FeedService, UserThrottlerGuard],
})
export class SocialModule {}
