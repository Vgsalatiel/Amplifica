import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { Public } from '@nestjs/authentication';
import { Can } from '@nestjs/authorization';
import { idParamSchema } from '../../common/id-param.js';
import { CatalogPolicy } from '../catalog/catalog.policy.js';
import type { GenreNode } from './genre-tree.js';
import {
  createGenreSchema,
  updateGenreSchema,
  type CreateGenreDto,
  type UpdateGenreDto,
} from './genres.schemas.js';
import {
  GenresService,
  type GenreDetail,
  type GenreItem,
} from './genres.service.js';

@Controller('genres')
export class GenresController {
  constructor(private readonly genres: GenresService) {}

  @Public()
  @Get()
  tree(): Promise<Array<GenreNode<GenreItem>>> {
    return this.genres.tree();
  }

  @Public()
  @Get(':slug')
  getBySlug(@Param('slug') slug: string): Promise<GenreDetail> {
    return this.genres.getBySlug(slug);
  }

  @Can(CatalogPolicy, 'manage')
  @Post()
  create(
    @Body({ schema: createGenreSchema }) body: CreateGenreDto,
  ): Promise<GenreItem> {
    return this.genres.create(body);
  }

  @Can(CatalogPolicy, 'manage')
  @Patch(':id')
  update(
    @Param('id', { schema: idParamSchema }) id: string,
    @Body({ schema: updateGenreSchema }) body: UpdateGenreDto,
  ): Promise<GenreItem> {
    return this.genres.update(id, body);
  }

  @Can(CatalogPolicy, 'manage')
  @HttpCode(204)
  @Delete(':id')
  remove(@Param('id', { schema: idParamSchema }) id: string): Promise<void> {
    return this.genres.remove(id);
  }
}
