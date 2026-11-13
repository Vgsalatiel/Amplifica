# Amplifica

[![CI](https://github.com/Vgsalatiel/Amplifica/actions/workflows/ci.yml/badge.svg)](https://github.com/Vgsalatiel/Amplifica/actions/workflows/ci.yml)

Plataforma de descoberta musical e comunidade voltada ao rock e suas vertentes: discografias organizadas, gêneros como mapa de navegação, notas e resenhas com assinatura.

> Projeto em desenvolvimento. Estado atual: **etapa 6 (descoberta)** concluída, mais confirmação de e-mail, recuperação de senha, aviso de API acordando e prévia de links — busca sem acento por artistas e discos, lista de lançamentos com filtros (gênero, tipo, ano) e ordem por nota, e a nota de cada disco nas listas. Antes, a etapa 5: nota de 1 a 10 e resenha por pessoa e por disco. Gêneros, artistas e discos já abrem a qualquer visitante, com o Bring Me The Horizon como primeiro artista. Guia visual em [`/guia`](https://amplificacore.netlify.app/guia).

## Stack

| Camada | Tecnologias |
| --- | --- |
| Frontend | React 19, TypeScript, Vite, Tailwind CSS, React Router, TanStack Query |
| Backend | Node.js 24, NestJS 12, TypeScript, API REST |
| Banco | PostgreSQL (Neon) com Prisma ORM 7 |
| Testes | Vitest, Testing Library, Supertest |

## Estrutura

```text
.
├── backend/    # API NestJS
├── frontend/   # SPA React
└── docs/adr/   # decisões de arquitetura
```

## Como rodar

Pré-requisitos: Node.js 24 (`nvm use` lê o `.nvmrc`) e um banco PostgreSQL no [Neon](https://neon.com).

### 1. Backend

```bash
cd backend
npm install
cp .env.example .env   # preencha as strings do Neon e gere o JWT_ACCESS_SECRET
npm run prisma:deploy  # cria as tabelas
npm run start:dev
```

A API sobe em `http://localhost:3000/api/v1`. Teste com `curl http://localhost:3000/api/v1/health`.

### 2. Frontend

Em outro terminal:

```bash
cd frontend
npm install
npm run dev
```

Abra o endereço que o Vite mostrar. Se a API estiver em outra porta que não a 3000, use `API_PROXY_TARGET=http://localhost:3100 npm run dev`. A página `/guia` reúne os componentes e mostra se a API e o banco estão no ar.

## Páginas públicas

| Rota | O que mostra |
| --- | --- |
| `/` | Lançamentos recentes e os gêneros principais |
| `/artistas` | Lista com filtro por gênero e busca pelo nome |
| `/artistas/:slug` | História, gêneros e discografia agrupada por tipo |
| `/lancamentos` | Todos os discos, com busca, gênero, tipo, ano e ordem (nota, mais recentes, título); os filtros ficam na URL |
| `/buscar?q=` | Resultado da caixa de busca do cabeçalho: artistas e lançamentos, cada um paginado |
| `/lancamentos/:slug` | Capa, média das notas, faixas, vídeo, resenhas e o formulário de avaliação (para quem tem conta); a cor da capa vale para a página toda |
| `/generos`, `/generos/:slug` | A árvore de gêneros; um gênero com os artistas dele e dos subgêneros |

| `/u/:username` | Perfil público, com os discos que a pessoa avaliou |

Tudo isso abre sem conta. Quem quer avaliar cria uma, e o cadastro iniciado a partir de um disco volta a ele.

## Dados do catálogo

Os discos entram por um arquivo de dados que você revisa antes de ir para o banco:

```bash
cd backend
# 1. Busca a discografia no MusicBrainz e escreve um arquivo para revisão
npm run catalog:fetch -- --mbid <id do artista no MusicBrainz> --genres deathcore,metalcore
# 2. Depois de revisar o arquivo, grava no banco, com as capas
npm run catalog:seed -- prisma/data/<artista>.json --covers
```

O arquivo do Bring Me The Horizon já está em `backend/prisma/data/`, com os lançamentos que uma segunda fonte não confirmou em `pending`. A carga pode ser repetida sem duplicar nada e, por padrão, não sobrescreve o que o admin editou (use `--update` para o arquivo mandar). O MusicBrainz pede que quem consulta se identifique: defina `MUSICBRAINZ_USER_AGENT` no formato `Nome/versão ( contato )`. Detalhes em [`docs/adr/0006-paginas-publicas-e-carga-de-dados.md`](docs/adr/0006-paginas-publicas-e-carga-de-dados.md).

## Administração

O catálogo é cadastrado pelo administrador em `/admin` (o link aparece no cabeçalho só para quem tem o papel ADMIN). Não existe rota que promova contas; o primeiro administrador é criado fora da interface:

```bash
# Em desenvolvimento: cria a conta, ou promove se o e-mail já existe
cd backend && ADMIN_EMAIL=voce@exemplo.com ADMIN_USERNAME=voce ADMIN_PASSWORD=uma-senha-boa npm run seed:admin
```

Em produção, promova uma conta já cadastrada no editor SQL do banco: `UPDATE "User" SET role = 'ADMIN' WHERE email = 'voce@exemplo.com';`

Os e-mails de confirmação e de nova senha saem pelo [Resend](https://resend.com) quando `RESEND_API_KEY` e `MAIL_FROM` estão definidos. Em desenvolvimento, sem elas, o link aparece no terminal da API. Em produção, sem elas, a confirmação de e-mail não é exigida e "esqueci a senha" fica indisponível ([ADR 0009](docs/adr/0009-confirmacao-de-email-e-senha.md)).

Imagens enviadas em desenvolvimento ficam em `backend/storage` (ignorada pelo Git). Em produção, o envio só funciona depois de configurar o bucket (variáveis `STORAGE_*`).

## Scripts

Os mesmos nos dois projetos, salvo indicação:

| Comando | O que faz |
| --- | --- |
| `npm run lint` | Análise estática com oxlint |
| `npm run typecheck` | Checagem de tipos |
| `npm test` | Testes unitários |
| `npm run test:e2e` | Testes da API contra o banco do `.env` (só no backend). Criam e apagam apenas contas `@e2e.amplifica.test` |
| `npm run build` | Build de produção |
| `npm run prisma:migrate` | Cria e aplica migrations em desenvolvimento (só no backend) |
| `npm run catalog:fetch`, `npm run catalog:seed` | Busca e carrega a discografia de um artista a partir de um arquivo revisável (só no backend) |
| `npm run seed:genres` | Cria a árvore inicial de gêneros; pode rodar de novo sem duplicar (só no backend) |
| `npm run seed:admin` | Cria o primeiro administrador a partir de `ADMIN_EMAIL`, `ADMIN_USERNAME` e `ADMIN_PASSWORD` (só no backend) |

## API

Todas as rotas ficam sob `/api/v1`. Erros seguem um formato único: `{ statusCode, code, message, details? }`.

| Rota | Acesso | O que faz |
| --- | --- | --- |
| `POST /auth/register` | Pública | Cria a conta e inicia a sessão |
| `POST /auth/login` | Pública | Inicia a sessão |
| `POST /auth/refresh` | Cookie | Renova a sessão e troca o token de renovação |
| `POST /auth/logout` | Cookie | Encerra a sessão do dispositivo |
| `GET /auth/me` | Autenticada | Dados da própria conta (`needsEmailVerification` diz se falta confirmar o e-mail) |
| `POST /auth/verify-email` | Pública | Confirma o e-mail com o token do link recebido |
| `POST /auth/resend-verification` | Autenticada | Reenvia o link de confirmação (invalida o anterior) |
| `POST /auth/forgot-password` | Pública | Pede o link de nova senha. A resposta é a mesma exista a conta ou não |
| `POST /auth/reset-password` | Pública | Define a nova senha com o token do link e encerra todas as sessões da conta |
| `GET /users/:username` | Pública | Perfil público |
| `PATCH /users/me` | Autenticada | Edita nome de exibição e bio |
| `GET /releases/:slug/reviews` | Pública | Resenhas com texto do disco, paginadas, da mais recente para a mais antiga |
| `GET`, `PUT`, `DELETE /releases/:slug/reviews/me` | Autenticada | Ver, criar ou substituir (nota de 1 a 10, resenha opcional) e apagar a própria avaliação |
| `DELETE /reviews/:id` | Autor ou ADMIN | Apaga uma avaliação (moderação) |
| `GET /users/:username/reviews` | Pública | Todas as avaliações de uma pessoa, com o disco de cada uma |
| `GET /genres`, `GET /genres/:slug` | Pública | Árvore de gêneros; um gênero com pai e filhos |
| `GET /artists` | Pública | Lista paginada. Filtros: `genre` (inclui subgêneros), `q` (nome, sem acento; cada palavra precisa aparecer) |
| `GET /artists/:slug` | Pública | Artista com discografia, do lançamento mais recente ao mais antigo |
| `GET /releases` | Pública | Lista paginada, com `rating` (média e contagem) em cada item. Filtros: `type`, `artist`, `genre` (inclui subgêneros), `year`, `q` (título ou artista, sem acento). Ordem: `sort=recent` (padrão), `rating` (sem nota por último) ou `title` |
| `GET /releases/:slug` | Pública | Lançamento com faixas, cor de destaque e vídeo |
| `POST`, `PATCH`, `DELETE` em `/genres`, `/artists`, `/releases` | ADMIN | Cadastro e edição do catálogo |
| `PUT`, `DELETE` em `/artists/:id/image` e `/releases/:id/cover` | ADMIN | Foto do artista e capa do lançamento |
| `PUT`, `DELETE /users/me/avatar` | Autenticada | Avatar da própria conta |
| `GET /health` | Pública | Estado da API e do banco |

## Deploy

| Parte | Serviço | Configuração |
| --- | --- | --- |
| API | Render (`https://amplifica.onrender.com`) | Root `backend`, build `npm install --include=dev && npm run build`, start `npm run start:prod`, que aplica as migrations antes de subir |
| Frontend | Netlify | Configurado pelo `netlify.toml`, que também encaminha `/api/*` para a API |
| Banco | Neon | Um banco para desenvolvimento e outro para produção |

As variáveis de produção ficam no painel de cada serviço, nunca no repositório. No plano gratuito, a API hiberna após um período sem acessos e a primeira requisição seguinte pode demorar.

## Decisões de arquitetura

Registradas em [`docs/adr`](docs/adr).
