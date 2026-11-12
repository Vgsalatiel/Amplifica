import {
  Body,
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
import { idParamSchema } from '../../common/id-param.js';
import type { Paginated } from '../../common/pagination.js';
import type { AuthUser } from '../users/user.types.js';
import type { ReviewResponse, UserReviewResponse } from './reviews.mappers.js';
import {
  listReviewsSchema,
  upsertReviewSchema,
  type ListReviewsQuery,
  type UpsertReviewDto,
} from './reviews.schemas.js';
import { ReviewsService } from './reviews.service.js';
import { UserThrottlerGuard } from './user-throttler.guard.js';

/** Vinte gravações por minuto e por pessoa: sobra para uso normal e barra automação. */
const WRITE_LIMIT = { default: { limit: 20, ttl: 60_000 } };

/**
 * As rotas "me" valem para qualquer pessoa logada (`@Can.Anyone()`): quem faz a requisição só
 * alcança a própria avaliação, porque o id vem do token. Ler é público.
 */
@Controller()
export class ReviewsController {
  constructor(private readonly reviews: ReviewsService) {}

  @Public()
  @Get('releases/:slug/reviews')
  list(
    @Param('slug') slug: string,
    @Query({ schema: listReviewsSchema }) query: ListReviewsQuery,
  ): Promise<Paginated<ReviewResponse>> {
    return this.reviews.list(slug, query);
  }

  @Can.Anyone()
  @Get('releases/:slug/reviews/me')
  mine(
    @CurrentUser() user: AuthUser,
    @Param('slug') slug: string,
  ): Promise<ReviewResponse> {
    return this.reviews.getMine(user, slug);
  }

  @Can.Anyone()
  @UseGuards(UserThrottlerGuard)
  @Throttle(WRITE_LIMIT)
  @Put('releases/:slug/reviews/me')
  upsert(
    @CurrentUser() user: AuthUser,
    @Param('slug') slug: string,
    @Body({ schema: upsertReviewSchema }) body: UpsertReviewDto,
  ): Promise<ReviewResponse> {
    return this.reviews.upsertMine(user, slug, body);
  }

  @Can.Anyone()
  @UseGuards(UserThrottlerGuard)
  @Throttle(WRITE_LIMIT)
  @HttpCode(204)
  @Delete('releases/:slug/reviews/me')
  removeMine(
    @CurrentUser() user: AuthUser,
    @Param('slug') slug: string,
  ): Promise<void> {
    return this.reviews.deleteMine(user, slug);
  }

  /** Autor ou administrador. A regra está em ReviewPolicy, consultada pelo service. */
  @Can.Anyone()
  @UseGuards(UserThrottlerGuard)
  @Throttle(WRITE_LIMIT)
  @HttpCode(204)
  @Delete('reviews/:id')
  remove(
    @CurrentUser() user: AuthUser,
    @Param('id', { schema: idParamSchema }) id: string,
  ): Promise<void> {
    return this.reviews.deleteById(user, id);
  }

  @Public()
  @Get('users/:username/reviews')
  byUser(
    @Param('username') username: string,
    @Query({ schema: listReviewsSchema }) query: ListReviewsQuery,
  ): Promise<Paginated<UserReviewResponse>> {
    return this.reviews.listByUser(username, query);
  }
}
