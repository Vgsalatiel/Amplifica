import { Module } from '@nestjs/common';
import { GenresModule } from '../genres/genres.module.js';
import { ArtistsController } from './artists.controller.js';
import { ArtistsService } from './artists.service.js';

@Module({
  imports: [GenresModule],
  controllers: [ArtistsController],
  providers: [ArtistsService],
})
export class ArtistsModule {}
