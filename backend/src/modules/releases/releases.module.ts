import { Module } from '@nestjs/common';
import { GenresModule } from '../genres/genres.module.js';
import { ReleasesController } from './releases.controller.js';
import { ReleasesService } from './releases.service.js';

@Module({
  imports: [GenresModule],
  controllers: [ReleasesController],
  providers: [ReleasesService],
})
export class ReleasesModule {}
