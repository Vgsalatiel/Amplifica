import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser, Public } from '@nestjs/authentication';
import { Can } from '@nestjs/authorization';
import { Throttle } from '@nestjs/throttler';
import { idParamSchema } from '../../common/id-param.js';
import { ModerationPolicy } from '../moderation/moderation.policy.js';
import { UserThrottlerGuard } from '../reviews/user-throttler.guard.js';
import type { AuthUser } from '../users/user.types.js';
import {
  reviewGroupSchema,
  reviewListSchema,
  suggestGroupSchema,
  type ReviewGroupDto,
  type ReviewListQuery,
  type SuggestGroupDto,
} from './groups.schemas.js';
import {
  GroupsService,
  type GroupResponse,
  type MyGroupResponse,
  type ReviewGroupResponse,
} from './groups.service.js';

const WRITE_LIMIT = { default: { limit: 5, ttl: 60_000 } };

@Controller()
export class GroupsController {
  constructor(private readonly groups: GroupsService) {}

  @Public()
  @Get('shows/:slug/groups')
  list(@Param('slug') slug: string): Promise<GroupResponse[]> {
    return this.groups.list(slug);
  }

  @Can.Anyone()
  @UseGuards(UserThrottlerGuard)
  @Throttle(WRITE_LIMIT)
  @Post('shows/:slug/groups')
  suggest(
    @CurrentUser() user: AuthUser,
    @Param('slug') slug: string,
    @Body({ schema: suggestGroupSchema }) body: SuggestGroupDto,
  ): Promise<MyGroupResponse> {
    return this.groups.suggest(user, slug, body);
  }

  /** Fica antes das rotas com `:id`. */
  @Can(ModerationPolicy, 'moderate')
  @Get('groups/review')
  listForReview(
    @Query({ schema: reviewListSchema }) query: ReviewListQuery,
  ): Promise<ReviewGroupResponse[]> {
    return this.groups.listForReview(query);
  }

  @Can(ModerationPolicy, 'moderate')
  @HttpCode(204)
  @Patch('groups/:id')
  review(
    @Param('id', { schema: idParamSchema }) id: string,
    @Body({ schema: reviewGroupSchema }) body: ReviewGroupDto,
  ): Promise<void> {
    return this.groups.review(id, body);
  }

  @Can(ModerationPolicy, 'moderate')
  @HttpCode(204)
  @Delete('groups/:id')
  remove(@Param('id', { schema: idParamSchema }) id: string): Promise<void> {
    return this.groups.remove(id);
  }
}
