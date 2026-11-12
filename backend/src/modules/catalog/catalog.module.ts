import { Global, Module } from '@nestjs/common';
import { CatalogPolicy } from './catalog.policy.js';

/** Disponibiliza a política do catálogo para os módulos de gêneros, artistas e lançamentos. */
@Global()
@Module({
  providers: [CatalogPolicy],
  exports: [CatalogPolicy],
})
export class CatalogModule {}
