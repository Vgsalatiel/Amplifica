# ADR 0009 — Confirmação de e-mail e recuperação de senha

- **Data:** 2026-11-13
- **Status:** aceita

## Contexto

Qualquer pessoa podia criar contas com e-mails inventados e avaliar discos (limite conhecido da ADR 0007), e quem esquecia a senha perdia a conta. As duas coisas pedem a mesma peça: enviar um e-mail com um link de uso único.

## Decisão

1. **Links de uso único, com prazo.** Confirmação vale 24 horas; redefinição de senha, 1 hora. O token são 32 bytes aleatórios; o banco guarda só o SHA-256 (`EmailToken.tokenHash`), então um vazamento da tabela não entrega links utilizáveis. Gastar o token é uma atualização condicional única, e dois cliques simultâneos não passam os dois. Um pedido novo invalida os anteriores. O token de um tipo não serve para o outro.
2. **Quem decide se a confirmação é exigida é a capacidade de enviar e-mail.** Para avaliar, a conta precisa ter o e-mail confirmado **se houver como enviar o link** (Resend configurado, o terminal em desenvolvimento ou a caixa de testes). Em produção sem Resend, nada é exigido: ninguém fica barrado por um e-mail que não pode chegar, e `forgot-password` responde 503. Administradores estão isentos. As contas que já existiam na migração contam como confirmadas.
3. **Sem vazar quais e-mails têm conta.** `forgot-password` devolve 204 para qualquer e-mail válido, e o envio acontece em segundo plano, então nem o texto nem o tempo da resposta mudam. Pedidos limitados a 3 a cada 10 minutos por e-mail.
4. **Nova senha encerra todas as sessões** (`TokenService.revokeAll`), e a conta passa a contar como confirmada, porque quem usou o link provou que lê a caixa. A senha nova segue as mesmas regras do cadastro.
5. **Resend por HTTP, sem SDK.** São dois e-mails de texto curto; uma chamada `fetch` com prazo de 10 s basta. O erro do provedor vai para o log sem a chave nem o destinatário.
6. **Link no e-mail aponta para o site** (`CORS_ORIGIN`). As telas (`/confirmar-email`, `/redefinir-senha`) guardam o token e o tiram da barra de endereço na hora, e a confirmação dispara uma única chamada mesmo com o React remontando o efeito.
7. **Aviso para quem não confirmou:** faixa no alto de todas as páginas e, no lugar do formulário de nota, um texto com "Reenviar e-mail".

## Alternativas consideradas

- **Exigir a confirmação sempre:** quebraria as avaliações em produção até haver provedor configurado.
- **Código de 6 dígitos em vez de link:** pede digitação e um limite de tentativas próprio; o link de uso único é mais simples e igualmente seguro com 256 bits.
- **SDK do Resend ou SMTP:** uma dependência a mais para duas mensagens.

## Limites conhecidos

- O envio em segundo plano não tem fila nem nova tentativa: se o Resend falhar, a pessoa pede o reenvio (na confirmação) ou pede o link de novo (na senha). A falha vai para o log.
- Para o Resend enviar a qualquer destinatário, o domínio do remetente precisa estar verificado nele.
- A confirmação não impede quem tem vários e-mails de criar várias contas.

## Atualização (24/11/2026): a senha agora é redefinida por código

A redefinição de senha deixou de usar link e passou a usar um **código de 6 números** enviado por e-mail. A confirmação de e-mail continua com link.

- A pessoa pede o código em `/esqueci-a-senha`, digita o código em `/redefinir-senha` (passo 1) e depois escolhe a nova senha em dois campos (passo 2). `POST /auth/reset-password/check` confere o código sem gastá-lo; `POST /auth/reset-password` troca a senha e gasta o código.
- O código vale **30 minutos** e só funciona uma vez. Um pedido novo invalida o anterior.
- Como 6 números são fáceis de adivinhar, há **no máximo 8 tentativas** por código (`EmailToken.attempts`, contadas no banco antes de comparar, então chutes em paralelo também respeitam o limite), além do limite de pedidos por minuto. O banco guarda o SHA-256 do código junto com o id da pessoa. Código errado, vencido, esgotado ou de e-mail sem conta recebem a mesma resposta (`invalid_code`).
