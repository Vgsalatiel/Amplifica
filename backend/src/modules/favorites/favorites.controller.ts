import {
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Put,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser, Public } from '@nestjs/authentication';
import { Can } from '@nestjs/authorization';
import { Throttle } from '@nestjs/throttler';
import type { ArtistSummary } from '../catalog/catalog.mappers.js';
import { UserThrottlerGuard } from '../reviews/user-throttler.guard.js';
import type { AuthUser } from '../users/user.types.js';
import { FavoritesService, type MyFavorite } from './favorites.service.js';

const WRITE_LIMIT = { default: { limit: 30, ttl: 60_000 } };

/** A estrela de banda favorita de quem está logado. */
@Controller('artists/:slug/favorite')
export class ArtistFavoriteController {
  constructor(private readonly favorites: FavoritesService) {}

  @Can.Anyone()
  @Get()
  mine(
    @CurrentUser() user: AuthUser,
    @Param('slug') slug: string,
  ): Promise<MyFavorite> {
    return this.favorites.mine(user, slug);
  }

  @Can.Anyone()
  @UseGuards(UserThrottlerGuard)
  @Throttle(WRITE_LIMIT)
  @Put()
  add(
    @CurrentUser() user: AuthUser,
    @Param('slug') slug: string,
  ): Promise<MyFavorite> {
    return this.favorites.add(user, slug);
  }

  @Can.Anyone()
  @UseGuards(UserThrottlerGuard)
  @Throttle(WRITE_LIMIT)
  @HttpCode(204)
  @Delete()
  remove(
    @CurrentUser() user: AuthUser,
    @Param('slug') slug: string,
  ): Promise<void> {
    return this.favorites.remove(user, slug);
  }
}

/** As bandas favoritas que aparecem no perfil público. */
@Controller('users/:username/favorites')
export class UserFavoritesController {
  constructor(private readonly favorites: FavoritesService) {}

  @Public()
  @Get()
  list(@Param('username') username: string): Promise<ArtistSummary[]> {
    return this.favorites.listFor(username);
  }
}
