import { Module } from '@nestjs/common';
import { GenresModule } from '../genres/genres.module.js';
import { DEFAULT_USER_AGENT, PageFetcher } from './import/page-fetcher.js';
import { ShowImportService } from './import/show-import.service.js';
import { ShowsController } from './shows.controller.js';
import { ShowsService } from './shows.service.js';

@Module({
  imports: [GenresModule],
  controllers: [ShowsController],
  providers: [
    ShowsService,
    ShowImportService,
    {
      // O agente que se identifica nos sites lidos não leva nome, e-mail nem endereço de ninguém.
      provide: PageFetcher,
      useFactory: () =>
        new PageFetcher({
          userAgent: process.env['IMPORT_USER_AGENT'] || DEFAULT_USER_AGENT,
        }),
    },
  ],
})
export class ShowsModule {}
