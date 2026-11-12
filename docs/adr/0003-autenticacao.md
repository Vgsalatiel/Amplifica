# ADR 0003 — Autenticação e sessão

- **Data:** 2026-11-12
- **Status:** aceita

## Contexto

O Amplifica precisa de contas próprias (cadastro, login, perfil) com a autenticação implementada no NestJS, não em um serviço externo. O frontend é uma SPA servida em outro domínio que o da API, mas fala com ela por um proxy (`/api`), de modo que o navegador vê uma única origem.

## Decisão

1. **Pacote oficial `@nestjs/authentication`** para o que é sensível e fácil de errar: assinatura e verificação de JWT, hash de senha, rotação de tokens de renovação e detecção de reuso. O que é nosso: os dados do usuário, as regras de cadastro e o armazenamento dos tokens.
2. **Dois tokens.**
   - Token de acesso: JWT de 15 minutos, enviado em `Authorization: Bearer`. O frontend o guarda apenas em memória.
   - Token de renovação: opaco, de uso único, válido por 30 dias (a sessão inteira dura no máximo 90). Viaja em cookie `HttpOnly`, `SameSite=Strict`, restrito a `/api/v1/auth`.
3. **Rotação com detecção de reuso.** Cada renovação invalida o token usado e emite outro. Se um token já usado for apresentado de novo, a sessão inteira é revogada: é sinal de que duas partes têm o token.
4. **Tokens de renovação no PostgreSQL** (`PrismaRefreshTokenStore`), guardados como hash SHA-256. A classe é validada pela suíte de contrato do próprio pacote, incluindo os casos de concorrência.
5. **Guard global.** Toda rota exige autenticação, salvo as marcadas com `@Public()`. Esquecer a anotação deixa a rota fechada, não aberta.
6. **Senhas com scrypt** (N=2^15, r=8, p=3), sem dependência nativa. O custo padrão do pacote (N=2^17) usa cerca de 128 MiB por hash, demais para os 512 MB do plano gratuito do Render.
7. **Validação com Zod** pelo `StandardSchemaValidationPipe`. Os esquemas descartam campos desconhecidos, então o cliente não consegue definir `role`, por exemplo.
8. **Formato único de erro**: `{ statusCode, code, message, details? }`, com mensagens em português.
9. **Limite de tentativas** nas rotas de autenticação. No login e no cadastro a contagem é por e-mail, o que protege cada conta de tentativas de adivinhar a senha.

## Alternativas consideradas

- **Montar tudo com `@nestjs/jwt`** (plano original): mais código próprio em uma área em que erros custam caro. Descartado quando o pacote oficial se mostrou compatível com o Prisma.
- **JWT longo em `localStorage`**: simples, mas qualquer script injetado na página leva o token, e não há como revogar.
- **Sessão só com cookie, sem JWT**: também é segura e o pacote a oferece. Mantivemos JWT de acesso porque é o requisito do projeto e porque deixa a API utilizável por outros clientes.
- **argon2id** (plano original): equivalente em segurança para este uso, mas exige módulo nativo.

## Limitações conhecidas

- O limite de tentativas fica em memória: zera quando a API reinicia e não é compartilhado entre instâncias. Suficiente para uma instância única.
- A contagem por IP depende do proxy do Render informar o IP de origem; por isso o que protege o login é a contagem por e-mail.
- O pacote `@nestjs/authentication` está na versão 0.1.x. A API dele pode mudar; as partes que usamos estão cobertas por testes.
- Não há confirmação de e-mail nem recuperação de senha: dependem de um serviço de envio de e-mail.
- A tabela de tokens não tem chave estrangeira para o usuário, porque o contrato do pacote trata o id como texto opaco. A exclusão de conta, quando existir, precisa revogar e apagar os tokens no service.
