import {
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser, Public } from '@nestjs/authentication';
import { Can } from '@nestjs/authorization';
import { Throttle } from '@nestjs/throttler';
import { UserThrottlerGuard } from '../reviews/user-throttler.guard.js';
import type { AuthUser, PublicUserResponse } from '../users/user.types.js';
import { FeedService, type FeedResponse } from './feed.service.js';
import {
  FollowsService,
  type FollowCounts,
  type FollowState,
} from './follows.service.js';
import { feedQuerySchema, type FeedQuery } from './social.schemas.js';

const WRITE_LIMIT = { default: { limit: 30, ttl: 60_000 } };

/** Seguir e deixar de seguir uma pessoa. */
@Controller('users/:username/follow')
export class FollowController {
  constructor(private readonly follows: FollowsService) {}

  @Can.Anyone()
  @Get()
  state(
    @CurrentUser() user: AuthUser,
    @Param('username') username: string,
  ): Promise<FollowState> {
    return this.follows.state(user, username);
  }

  @Can.Anyone()
  @UseGuards(UserThrottlerGuard)
  @Throttle(WRITE_LIMIT)
  @Put()
  follow(
    @CurrentUser() user: AuthUser,
    @Param('username') username: string,
  ): Promise<FollowState> {
    return this.follows.follow(user, username);
  }

  @Can.Anyone()
  @UseGuards(UserThrottlerGuard)
  @Throttle(WRITE_LIMIT)
  @HttpCode(204)
  @Delete()
  unfollow(
    @CurrentUser() user: AuthUser,
    @Param('username') username: string,
  ): Promise<void> {
    return this.follows.unfollow(user, username);
  }
}

/** Números e listas públicas de seguidores, como o perfil. */
@Controller('users/:username')
export class FollowListsController {
  constructor(private readonly follows: FollowsService) {}

  @Public()
  @Get('follows')
  counts(@Param('username') username: string): Promise<FollowCounts> {
    return this.follows.counts(username);
  }

  @Public()
  @Get('followers')
  followers(@Param('username') username: string): Promise<PublicUserResponse[]> {
    return this.follows.followers(username);
  }

  @Public()
  @Get('following')
  following(@Param('username') username: string): Promise<PublicUserResponse[]> {
    return this.follows.following(username);
  }
}

/** O feed de atividade de quem a pessoa segue. */
@Controller('feed')
export class FeedController {
  constructor(private readonly feed: FeedService) {}

  @Can.Anyone()
  @Get()
  mine(
    @CurrentUser() user: AuthUser,
    @Query({ schema: feedQuerySchema }) query: FeedQuery,
  ): Promise<FeedResponse> {
    return this.feed.forUser(user, query);
  }
}
