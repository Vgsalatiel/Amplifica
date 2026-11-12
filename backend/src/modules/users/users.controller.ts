import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Put,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { CurrentUser, Public } from '@nestjs/authentication';
import { Can } from '@nestjs/authorization';
import { ImageUpload } from '../images/image-upload.js';
import { ImagesService } from '../images/images.service.js';
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
  private readonly toImageSet: ImagesService['toSet'];

  constructor(
    private readonly users: UsersService,
    images: ImagesService,
  ) {
    this.toImageSet = (path) => images.toSet(path);
  }

  // As rotas "me" valem para qualquer pessoa logada (@Can.Anyone): quem faz a
  // requisição só alcança a própria conta, porque o id vem do token.

  /** Edita o perfil de quem está autenticado. */
  @Can.Anyone()
  @Patch('me')
  async updateMe(
    @CurrentUser() user: AuthUser,
    @Body({ schema: updateProfileSchema }) body: UpdateProfileDto,
  ): Promise<PrivateUserResponse> {
    return toPrivateUser(
      await this.users.updateProfile(user.id, body),
      this.toImageSet,
    );
  }

  @Can.Anyone()
  @Put('me/avatar')
  @UseInterceptors(ImageUpload())
  async setAvatar(
    @CurrentUser() user: AuthUser,
    @UploadedFile() file: Express.Multer.File | undefined,
  ): Promise<PrivateUserResponse> {
    return toPrivateUser(
      await this.users.setAvatar(user.id, file),
      this.toImageSet,
    );
  }

  @Can.Anyone()
  @Delete('me/avatar')
  async removeAvatar(
    @CurrentUser() user: AuthUser,
  ): Promise<PrivateUserResponse> {
    return toPrivateUser(
      await this.users.removeAvatar(user.id),
      this.toImageSet,
    );
  }

  /** Perfil público: qualquer visitante pode ver. */
  @Public()
  @Get(':username')
  async getProfile(
    @Param('username') username: string,
  ): Promise<PublicUserResponse> {
    return toPublicUser(
      await this.users.getByUsername(username),
      this.toImageSet,
    );
  }
}
