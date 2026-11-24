import { Module } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import { ArtistsModule } from '../artists/artists.module.js';
import { UserThrottlerGuard } from '../reviews/user-throttler.guard.js';
import {
  ArtistFavoriteController,
  UserFavoritesController,
} from './favorites.controller.js';
import { FavoritesService } from './favorites.service.js';

@Module({
  imports: [
    ArtistsModule,
    ThrottlerModule.forRoot({
      throttlers: [{ ttl: 60_000, limit: 30 }],
      skipIf: () => process.env['NODE_ENV'] === 'test',
    }),
  ],
  controllers: [ArtistFavoriteController, UserFavoritesController],
  providers: [FavoritesService, UserThrottlerGuard],
})
export class FavoritesModule {}
