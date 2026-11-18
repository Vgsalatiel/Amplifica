import { Module } from '@nestjs/common';
import { TasteController } from './taste.controller.js';
import { TasteService } from './taste.service.js';

@Module({
  controllers: [TasteController],
  providers: [TasteService],
})
export class TasteModule {}
