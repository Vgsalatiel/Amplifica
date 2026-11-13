import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { Public } from '@nestjs/authentication';
import { Can } from '@nestjs/authorization';
import { idParamSchema } from '../../common/id-param.js';
import type { Paginated } from '../../common/pagination.js';
import { CatalogPolicy } from '../catalog/catalog.policy.js';
import type { ShowResponse } from './shows.mappers.js';
import {
  createShowSchema,
  listShowsSchema,
  updateShowSchema,
  type CreateShowDto,
  type ListShowsQuery,
  type UpdateShowDto,
} from './shows.schemas.js';
import { ShowsService } from './shows.service.js';

@Controller('shows')
export class ShowsController {
  constructor(private readonly shows: ShowsService) {}

  @Public()
  @Get()
  list(
    @Query({ schema: listShowsSchema }) query: ListShowsQuery,
  ): Promise<Paginated<ShowResponse>> {
    return this.shows.list(query);
  }

  @Public()
  @Get(':slug')
  getBySlug(@Param('slug') slug: string): Promise<ShowResponse> {
    return this.shows.getBySlug(slug);
  }

  @Can(CatalogPolicy, 'manage')
  @Post()
  create(
    @Body({ schema: createShowSchema }) body: CreateShowDto,
  ): Promise<ShowResponse> {
    return this.shows.create(body);
  }

  @Can(CatalogPolicy, 'manage')
  @Patch(':id')
  update(
    @Param('id', { schema: idParamSchema }) id: string,
    @Body({ schema: updateShowSchema }) body: UpdateShowDto,
  ): Promise<ShowResponse> {
    return this.shows.update(id, body);
  }

  @Can(CatalogPolicy, 'manage')
  @HttpCode(204)
  @Delete(':id')
  remove(@Param('id', { schema: idParamSchema }) id: string): Promise<void> {
    return this.shows.remove(id);
  }
}
