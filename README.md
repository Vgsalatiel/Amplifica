# Amplifica

[![CI](https://github.com/Vgsalatiel/Amplifica/actions/workflows/ci.yml/badge.svg)](https://github.com/Vgsalatiel/Amplifica/actions/workflows/ci.yml)

Plataforma de descoberta musical e comunidade voltada ao rock e suas vertentes: discografias organizadas, gêneros como mapa de navegação, notas e resenhas com assinatura.

> Projeto em desenvolvimento. Estado atual: **etapa 0 (fundação)** — esqueleto do frontend e da API conectados, ainda sem funcionalidades de produto.

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
cp .env.example .env   # preencha DATABASE_URL e DATABASE_URL_UNPOOLED com as strings do Neon
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

Abra `http://localhost:5173`. A página mostra se a API e o banco estão no ar.

## Scripts

Os mesmos nos dois projetos, salvo indicação:

| Comando | O que faz |
| --- | --- |
| `npm run lint` | Análise estática com oxlint |
| `npm run typecheck` | Checagem de tipos |
| `npm test` | Testes unitários |
| `npm run test:e2e` | Testes e2e da API (só no backend) |
| `npm run build` | Build de produção |
| `npm run prisma:migrate` | Cria e aplica migrations em desenvolvimento (só no backend) |

## Deploy

| Parte | Serviço | Configuração |
| --- | --- | --- |
| API | Render (`https://amplifica.onrender.com`) | Root `backend`, build `npm install --include=dev && npm run build`, start `npm run start:prod` |
| Frontend | Vercel | Root `frontend`; o `vercel.json` encaminha `/api/*` para a API |
| Banco | Neon | Um banco para desenvolvimento e outro para produção |

As variáveis de produção ficam no painel de cada serviço, nunca no repositório. No plano gratuito, a API hiberna após um período sem acessos e a primeira requisição seguinte pode demorar.

## Decisões de arquitetura

Registradas em [`docs/adr`](docs/adr).
