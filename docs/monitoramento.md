# Monitoramento: avisos de erro e de queda

Duas camadas, uma para cada tipo de problema.

## 1. Queda do site ou da API (já ligado)

`.github/workflows/uptime.yml` roda a cada 10 minutos no GitHub Actions e confere:
- `GET /api/v1/health` responde `"status":"ok"` e `"database":"up"`;
- `GET /api/v1/artists?limit=1` devolve um total maior que zero;
- o site responde 200.

Se algo falhar, a execução fica vermelha e o GitHub manda e-mail. Para ver o histórico: aba **Actions → Uptime**. Dá para rodar na hora em **Run workflow**.

Efeito colateral útil: a chamada a cada 10 minutos mantém a API do Render (plano grátis) acordada. Dois cuidados: o GitHub desativa workflows agendados de repositórios sem nenhuma atividade por 60 dias (um commit religa), e o plano grátis do Render tem 750 horas por mês, que cobrem um serviço ligado o mês inteiro.

## 2. Erros dentro do código (desligado até você criar o projeto no Sentry)

O código já está pronto e fica **inerte** sem as variáveis abaixo.

1. Crie uma conta grátis em sentry.io e dois projetos: um **Node.js** (API) e um **React** (site).
2. Copie o **DSN** de cada um (um endereço `https://...@...ingest...sentry.io/...`).
3. No Render, no serviço da API, crie `SENTRY_DSN` com o DSN do projeto Node. O Render reinicia sozinho.
4. No Netlify, em *Site configuration → Environment variables*, crie `VITE_SENTRY_DSN` com o DSN do projeto React e faça um novo deploy (a variável entra na hora do build).
5. No Sentry, em *Alerts*, ative o aviso por e-mail para novos erros.

O que é enviado: a API só envia erros 500 inesperados (não envia 4xx, nem 502/503, que são avisos nossos). O site envia erros do JavaScript e telas quebradas. **Nada pessoal vai junto**: o código remove corpo do pedido, cabeçalhos, cookies, e-mail e IP, e corta a busca (`?...`) dos endereços; também não registra o que a pessoa digita nos campos. O Sentry do site é baixado só quando há DSN, então não pesa para quem não usa.

Em uma tela que quebra, o site mostra uma página de erro com o botão **Recarregar** (em vez de uma página em branco). Essa tela também aparece quando há versão nova no ar e a aba aberta é antiga.
