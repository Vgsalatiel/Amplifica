# Amplifica

[![CI](https://github.com/Vgsalatiel/Amplifica/actions/workflows/ci.yml/badge.svg)](https://github.com/Vgsalatiel/Amplifica/actions/workflows/ci.yml)

Plataforma de descoberta musical e comunidade voltada ao rock e suas vertentes: discografias organizadas, gêneros como mapa de navegação, notas e resenhas com assinatura.

> Projeto em desenvolvimento. Estado atual: **etapa 2 (autenticação e usuários)** concluída — dá para criar conta, entrar, sair, ver perfis em `/u/nome` e editar o próprio. Guia visual em [`/guia`](https://amplificacore.netlify.app/guia). O catálogo ainda não existe.

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

Abra o endereço que o Vite mostrar. A página `/guia` reúne os componentes e mostra se a API e o banco estão no ar.

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
| `npm run seed:admin` | Cria o primeiro administrador a partir de `ADMIN_EMAIL`, `ADMIN_USERNAME` e `ADMIN_PASSWORD` (só no backend) |

## API

Todas as rotas ficam sob `/api/v1`. Erros seguem um formato único: `{ statusCode, code, message, details? }`.

| Rota | Acesso | O que faz |
| --- | --- | --- |
| `POST /auth/register` | Pública | Cria a conta e inicia a sessão |
| `POST /auth/login` | Pública | Inicia a sessão |
| `POST /auth/refresh` | Cookie | Renova a sessão e troca o token de renovação |
| `POST /auth/logout` | Cookie | Encerra a sessão do dispositivo |
| `GET /auth/me` | Autenticada | Dados da própria conta |
| `GET /users/:username` | Pública | Perfil público |
| `PATCH /users/me` | Autenticada | Edita nome de exibição e bio |
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
