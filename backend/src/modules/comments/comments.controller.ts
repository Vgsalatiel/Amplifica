import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
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
  createCommentSchema,
  listCommentsSchema,
  reportCommentSchema,
  type CreateCommentDto,
  type ListCommentsQuery,
  type ReportCommentDto,
} from './comments.schemas.js';
import {
  CommentsService,
  type CommentResponse,
  type ReportedCommentResponse,
} from './comments.service.js';

const WRITE_LIMIT = { default: { limit: 5, ttl: 60_000 } };

@Controller()
export class CommentsController {
  constructor(private readonly comments: CommentsService) {}

  @Public()
  @Get('shows/:slug/comments')
  list(
    @Param('slug') slug: string,
    @Query({ schema: listCommentsSchema }) query: ListCommentsQuery,
  ): Promise<CommentResponse[]> {
    return this.comments.list(slug, query);
  }

  @Can.Anyone()
  @UseGuards(UserThrottlerGuard)
  @Throttle(WRITE_LIMIT)
  @Post('shows/:slug/comments')
  create(
    @CurrentUser() user: AuthUser,
    @Param('slug') slug: string,
    @Body({ schema: createCommentSchema }) body: CreateCommentDto,
  ): Promise<CommentResponse> {
    return this.comments.create(user, slug, body);
  }

  /** A fila de denúncias. Fica antes das rotas com `:id`. */
  @Can(ModerationPolicy, 'moderate')
  @Get('comments/reported')
  reported(): Promise<ReportedCommentResponse[]> {
    return this.comments.listReported();
  }

  @Can.Anyone()
  @HttpCode(204)
  @Delete('comments/:id')
  remove(
    @CurrentUser() user: AuthUser,
    @Param('id', { schema: idParamSchema }) id: string,
  ): Promise<void> {
    return this.comments.remove(user, id);
  }

  @Can.Anyone()
  @UseGuards(UserThrottlerGuard)
  @Throttle(WRITE_LIMIT)
  @HttpCode(204)
  @Post('comments/:id/reports')
  report(
    @CurrentUser() user: AuthUser,
    @Param('id', { schema: idParamSchema }) id: string,
    @Body({ schema: reportCommentSchema }) body: ReportCommentDto,
  ): Promise<void> {
    return this.comments.report(user, id, body);
  }

  /** "Manter": dá as denúncias por vistas, sem apagar o comentário. */
  @Can(ModerationPolicy, 'moderate')
  @HttpCode(204)
  @Delete('comments/:id/reports')
  dismiss(
    @Param('id', { schema: idParamSchema }) id: string,
  ): Promise<void> {
    return this.comments.dismissReports(id);
  }
}
