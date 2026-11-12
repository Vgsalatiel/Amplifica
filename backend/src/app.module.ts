import { Module } from '@nestjs/common';
import { AuthorizationModule } from '@nestjs/authorization';
import { ConfigModule } from '@nestjs/config';
import { validateEnv } from './config/env.js';
import { ArtistsModule } from './modules/artists/artists.module.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { CatalogModule } from './modules/catalog/catalog.module.js';
import { GenresModule } from './modules/genres/genres.module.js';
import { HealthModule } from './modules/health/health.module.js';
import { ImagesModule } from './modules/images/images.module.js';
import { ReleasesModule } from './modules/releases/releases.module.js';
import { ReviewsModule } from './modules/reviews/reviews.module.js';
import { UsersModule } from './modules/users/users.module.js';
import { PrismaModule } from './prisma/prisma.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    PrismaModule,
    ImagesModule,
    // A ordem importa: primeiro o guard que identifica o usuário (AuthModule),
    // depois o que decide se ele pode fazer o que pediu (AuthorizationModule).
    AuthModule,
    AuthorizationModule.forRoot({}),
    CatalogModule,
    UsersModule,
    GenresModule,
    ArtistsModule,
    ReleasesModule,
    ReviewsModule,
    HealthModule,
  ],
})
export class AppModule {}
