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
  ReleaseDetail,
  ReleaseSummary,
} from '../catalog/catalog.mappers.js';
import { CatalogPolicy } from '../catalog/catalog.policy.js';
import { ImageUpload } from '../images/image-upload.js';
import {
  createReleaseSchema,
  listReleasesSchema,
  updateReleaseSchema,
  type CreateReleaseDto,
  type ListReleasesQuery,
  type UpdateReleaseDto,
} from './releases.schemas.js';
import { ReleasesService } from './releases.service.js';

@Controller('releases')
export class ReleasesController {
  constructor(private readonly releases: ReleasesService) {}

  @Public()
  @Get()
  list(
    @Query({ schema: listReleasesSchema }) query: ListReleasesQuery,
  ): Promise<Paginated<ReleaseSummary>> {
    return this.releases.list(query);
  }

  @Public()
  @Get(':slug')
  getBySlug(@Param('slug') slug: string): Promise<ReleaseDetail> {
    return this.releases.getBySlug(slug);
  }

  @Can(CatalogPolicy, 'manage')
  @Post()
  create(
    @Body({ schema: createReleaseSchema }) body: CreateReleaseDto,
  ): Promise<ReleaseDetail> {
    return this.releases.create(body);
  }

  @Can(CatalogPolicy, 'manage')
  @Patch(':id')
  update(
    @Param('id', { schema: idParamSchema }) id: string,
    @Body({ schema: updateReleaseSchema }) body: UpdateReleaseDto,
  ): Promise<ReleaseDetail> {
    return this.releases.update(id, body);
  }

  @Can(CatalogPolicy, 'manage')
  @HttpCode(204)
  @Delete(':id')
  remove(@Param('id', { schema: idParamSchema }) id: string): Promise<void> {
    return this.releases.remove(id);
  }

  @Can(CatalogPolicy, 'manage')
  @Put(':id/cover')
  @UseInterceptors(ImageUpload())
  setCover(
    @Param('id', { schema: idParamSchema }) id: string,
    @UploadedFile() file: Express.Multer.File | undefined,
  ): Promise<ReleaseDetail> {
    return this.releases.setCover(id, file);
  }

  @Can(CatalogPolicy, 'manage')
  @Delete(':id/cover')
  removeCover(
    @Param('id', { schema: idParamSchema }) id: string,
  ): Promise<ReleaseDetail> {
    return this.releases.removeCover(id);
  }
}
