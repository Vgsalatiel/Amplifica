# ADR 0011 — Comunidade, clipes sugeridos e moderação

- **Data:** 2026-11-18
- **Status:** aceita (clipes, papel de moderador, presença "Eu vou" e mural com denúncias prontos; links de grupo nas etapas seguintes)

## Contexto

O Amplifica passa de catálogo e agenda para um lugar onde as pessoas também contribuem: sugerem clipes para a playlist da página inicial e, depois, vão combinar idas a shows. Conteúdo enviado por desconhecidos exige alguém que decida o que entra, e quem opera o site sozinho precisa poder dividir essa tarefa sem entregar o catálogo.

## Decisão

1. **Clipes da playlist.** Tabela `Clip` com clipes **fixos** (os escolhidos pelo autor) e **sugestões**. A sugestão exige conta com e-mail confirmado, tem teto de 3 por 24 horas, é conferida no endpoint oEmbed do YouTube (existe, e o dono permite incorporar) e **fica pendente até um administrador ou moderador aprovar**. O servidor só consulta `www.youtube.com`, com o código do vídeo já validado: a pessoa não escolhe o destino da consulta.
2. **Playlist.** Fixos primeiro, na ordem de `position`; depois as sugestões aprovadas, da mais nova para a mais antiga. A ordem de reprodução é controlada pela API de player do YouTube no navegador, porque a lista embutida do YouTube pulava ou repetia vídeos.
3. **Papel de moderador** (`Role.MODERATOR`). Duas políticas separadas: `CatalogPolicy.manage` (catálogo, agenda, equipe) segue **só para administradores**; `ModerationPolicy.moderate` vale para administradores e moderadores e cobre o conteúdo da comunidade (hoje, a fila de clipes). Um moderador **não edita catálogo nem agenda**.
4. **Equipe.** Só administradores promovem ou tiram moderadores, pelo `@usuário`, numa tela própria. O papel de administrador não muda pela API, e quem vira moderador precisa ter o e-mail confirmado (quando o site consegue enviar e-mails).
5. **O papel vale na hora.** O usuário é lido do banco a cada requisição, então promover ou rebaixar tem efeito imediato na API. No navegador, o menu "Moderação" aparece depois que a sessão for recarregada.
6. **Sem votos nem ranking por enquanto.** Eles trocariam a ordem simples da playlist por uma que favorece quem mobiliza amigos, afastando as bandas pequenas, e ampliariam o trabalho de moderação.

## Consequências

- Todo conteúdo novo da comunidade passa pelo mesmo desenho: sugestão pendente, fila de moderação, aprovar ou recusar. Isso será repetido para links de grupo e, depois, para fotos, se vierem.
- A moderação é trabalho humano contínuo. Moderadores de confiança são pré-requisito para abrir comentários ao público.
- Em produção, `ALTER TYPE "Role" ADD VALUE` roda na migration do deploy; os clipes fixos entram pelo script `clips:seed`, e, até lá, a página inicial usa a lista reserva do `clips.ts`.
