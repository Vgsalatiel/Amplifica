# ADR 0001 — Arquitetura base

- **Data:** 2026-11-11
- **Status:** aceita

## Contexto

O Amplifica é um projeto de portfólio full stack. Precisa de uma arquitetura que demonstre separação de responsabilidades e que seja simples de hospedar em planos gratuitos.

## Decisão

```text
React (Netlify) → NestJS (Render) → Prisma → PostgreSQL (Neon)
```

1. **Dois projetos independentes no mesmo repositório**: `frontend/` e `backend/`, cada um com seu `package.json` e seu lockfile.
2. **O frontend nunca acessa o banco.** Toda regra de negócio, autenticação e autorização fica na API.
3. **Backend em camadas**: controller (HTTP e validação) → service (regras) → `PrismaService` (acesso a dados). Sem camada extra de repositórios: o Prisma já cumpre esse papel.
4. **Organização por domínio** nos dois lados (`modules/` no backend, `features/` no frontend), e não por tipo de arquivo.
5. **Neon como PostgreSQL**, com duas strings de conexão:
   - `DATABASE_URL` (com pooler) para a aplicação em execução;
   - `DATABASE_URL_UNPOOLED` (direta) para o Prisma CLI, porque migrations exigem conexão direta.
6. **API sob o prefixo `/api/v1`.** Em desenvolvimento, o Vite encaminha `/api` para o NestJS; em produção, a Netlify faz o mesmo (`netlify.toml`). O navegador fala com uma única origem.
7. **Variáveis de ambiente validadas na inicialização** da API (`src/config/env.ts`). Segredos só no backend e nunca versionados.

## Alternativas consideradas

- **npm workspaces** (plano original): um único `npm install` na raiz. Descartado nesta etapa porque dois projetos independentes tornam o deploy mais direto (cada serviço aponta para sua pasta) e não há código compartilhado que justifique o workspace.
- **Supabase como banco** (plano original): substituído pelo Neon por decisão do autor. O Neon oferece só o banco; o armazenamento de imagens será decidido na etapa do catálogo.
- **Camada de repositórios sobre o Prisma**: adiada até existir necessidade concreta.

## Consequências

- Cada pasta é instalada, testada e publicada separadamente.
- O plano gratuito do Neon suspende o banco após inatividade; a primeira consulta seguinte demora alguns segundos. Por isso a API não abre a conexão na inicialização e as strings usam `connect_timeout=15`.
- Tipos da API são escritos à mão no frontend por enquanto. Se a duplicação crescer, avaliar geração a partir do OpenAPI.
