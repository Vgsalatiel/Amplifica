import { Controller, Get, Param } from '@nestjs/common';
import { CurrentUser } from '@nestjs/authentication';
import { Can } from '@nestjs/authorization';
import type { AuthUser } from '../users/user.types.js';
import { TasteService, type TasteResponse } from './taste.service.js';

/** Quanto o seu gosto combina com o de outra pessoa. Exige login: a comparação é com você. */
@Controller('users/:username/compatibility')
export class TasteController {
  constructor(private readonly taste: TasteService) {}

  @Can.Anyone()
  @Get()
  compare(
    @CurrentUser() user: AuthUser,
    @Param('username') username: string,
  ): Promise<TasteResponse> {
    return this.taste.compare(user, username);
  }
}
