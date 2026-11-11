// Configuração do Prisma CLI (migrate, generate, studio).
// O CLI usa a conexão DIRETA do Neon: operações de schema não funcionam bem através do pooler.
// A aplicação em execução usa a conexão com pooler (ver src/prisma/prisma.service.ts).
import 'dotenv/config';
import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: process.env['DATABASE_URL_UNPOOLED'],
  },
});
