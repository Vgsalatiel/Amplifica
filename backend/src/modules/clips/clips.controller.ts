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
import { CatalogPolicy } from '../catalog/catalog.policy.js';
import { UserThrottlerGuard } from '../reviews/user-throttler.guard.js';
import type { AuthUser } from '../users/user.types.js';
import type {
  ClipResponse,
  MyClipResponse,
  ReviewClipResponse,
} from './clips.mappers.js';
import {
  listClipsSchema,
  reviewClipSchema,
  reviewListSchema,
  suggestClipSchema,
  type ListClipsQuery,
  type ReviewClipDto,
  type ReviewListQuery,
  type SuggestClipDto,
} from './clips.schemas.js';
import { ClipsService } from './clips.service.js';

/** Dez envios por minuto e por pessoa, além do teto diário que o service aplica. */
const WRITE_LIMIT = { default: { limit: 10, ttl: 60_000 } };

@Controller('clips')
export class ClipsController {
  constructor(private readonly clips: ClipsService) {}

  /** A playlist da página inicial: pública. */
  @Public()
  @Get()
  list(
    @Query({ schema: listClipsSchema }) query: ListClipsQuery,
  ): Promise<ClipResponse[]> {
    return this.clips.list(query);
  }

  /** As sugestões de quem está logado. Fica antes das rotas com `:id`. */
  @Can.Anyone()
  @Get('mine')
  mine(@CurrentUser() user: AuthUser): Promise<MyClipResponse[]> {
    return this.clips.listMine(user);
  }

  @Can.Anyone()
  @UseGuards(UserThrottlerGuard)
  @Throttle(WRITE_LIMIT)
  @Post()
  suggest(
    @CurrentUser() user: AuthUser,
    @Body({ schema: suggestClipSchema }) body: SuggestClipDto,
  ): Promise<MyClipResponse> {
    return this.clips.suggest(user, body);
  }

  @Can(CatalogPolicy, 'manage')
  @Get('review')
  listForReview(
    @Query({ schema: reviewListSchema }) query: ReviewListQuery,
  ): Promise<ReviewClipResponse[]> {
    return this.clips.listForReview(query);
  }

  @Can(CatalogPolicy, 'manage')
  @Patch(':id')
  review(
    @Param('id', { schema: idParamSchema }) id: string,
    @Body({ schema: reviewClipSchema }) body: ReviewClipDto,
  ): Promise<ReviewClipResponse> {
    return this.clips.review(id, body);
  }

  @Can(CatalogPolicy, 'manage')
  @HttpCode(204)
  @Delete(':id')
  remove(@Param('id', { schema: idParamSchema }) id: string): Promise<void> {
    return this.clips.remove(id);
  }
}
