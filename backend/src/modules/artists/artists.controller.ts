import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { Public } from '@nestjs/authentication';
import { Can } from '@nestjs/authorization';
import { idParamSchema } from '../../common/id-param.js';
import type { Paginated } from '../../common/pagination.js';
import type {
  ArtistDetail,
  ArtistSummary,
} from '../catalog/catalog.mappers.js';
import { CatalogPolicy } from '../catalog/catalog.policy.js';
import { ImageUpload } from '../images/image-upload.js';
import {
  createArtistSchema,
  listArtistsSchema,
  updateArtistSchema,
  type CreateArtistDto,
  type ListArtistsQuery,
  type UpdateArtistDto,
} from './artists.schemas.js';
import { ArtistsService } from './artists.service.js';

@Controller('artists')
export class ArtistsController {
  constructor(private readonly artists: ArtistsService) {}

  @Public()
  @Get()
  list(
    @Query({ schema: listArtistsSchema }) query: ListArtistsQuery,
  ): Promise<Paginated<ArtistSummary>> {
    return this.artists.list(query);
  }

  @Public()
  @Get(':slug')
  getBySlug(@Param('slug') slug: string): Promise<ArtistDetail> {
    return this.artists.getBySlug(slug);
  }

  @Can(CatalogPolicy, 'manage')
  @Post()
  create(
    @Body({ schema: createArtistSchema }) body: CreateArtistDto,
  ): Promise<ArtistSummary> {
    return this.artists.create(body);
  }

  @Can(CatalogPolicy, 'manage')
  @Patch(':id')
  update(
    @Param('id', { schema: idParamSchema }) id: string,
    @Body({ schema: updateArtistSchema }) body: UpdateArtistDto,
  ): Promise<ArtistSummary> {
    return this.artists.update(id, body);
  }

  @Can(CatalogPolicy, 'manage')
  @HttpCode(204)
  @Delete(':id')
  remove(@Param('id', { schema: idParamSchema }) id: string): Promise<void> {
    return this.artists.remove(id);
  }

  @Can(CatalogPolicy, 'manage')
  @Put(':id/image')
  @UseInterceptors(ImageUpload())
  setImage(
    @Param('id', { schema: idParamSchema }) id: string,
    @UploadedFile() file: Express.Multer.File | undefined,
  ): Promise<ArtistSummary> {
    return this.artists.setImage(id, file);
  }

  @Can(CatalogPolicy, 'manage')
  @Delete(':id/image')
  removeImage(
    @Param('id', { schema: idParamSchema }) id: string,
  ): Promise<ArtistSummary> {
    return this.artists.removeImage(id);
  }
}
