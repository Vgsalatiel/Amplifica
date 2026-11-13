import { Module } from '@nestjs/common';
import { GenresModule } from '../genres/genres.module.js';
import { ShowsController } from './shows.controller.js';
import { ShowsService } from './shows.service.js';

@Module({
  imports: [GenresModule],
  controllers: [ShowsController],
  providers: [ShowsService],
})
export class ShowsModule {}
