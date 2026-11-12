import { Body, Controller, Get, Param, Patch } from '@nestjs/common';
import { CurrentUser, Public } from '@nestjs/authentication';
import {
  toPrivateUser,
  toPublicUser,
  type AuthUser,
  type PrivateUserResponse,
  type PublicUserResponse,
} from './user.types.js';
import { updateProfileSchema, type UpdateProfileDto } from './users.schemas.js';
import { UsersService } from './users.service.js';

@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  /** Edita o perfil de quem está autenticado. */
  @Patch('me')
  async updateMe(
    @CurrentUser() user: AuthUser,
    @Body({ schema: updateProfileSchema }) body: UpdateProfileDto,
  ): Promise<PrivateUserResponse> {
    return toPrivateUser(await this.users.updateProfile(user.id, body));
  }

  /** Perfil público: qualquer visitante pode ver. */
  @Public()
  @Get(':username')
  async getProfile(
    @Param('username') username: string,
  ): Promise<PublicUserResponse> {
    return toPublicUser(await this.users.getByUsername(username));
  }
}
