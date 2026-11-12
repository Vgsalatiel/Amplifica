# ADR 0004 — Catálogo, permissões e imagens

- **Data:** 2026-11-12
- **Status:** aceita

## Contexto

A etapa 3 cria o catálogo musical (gêneros, artistas, lançamentos e faixas) e a área que o alimenta. Isso exige decidir quem pode escrever, onde guardar imagens e como tratar dados que chegam de fora (arquivos e textos).

## Decisão

1. **Modelo.** Um único `Release` com campo `type` (álbum, EP, single, ao vivo, coletânea); artista e lançamento em N:N por `ReleaseArtist`, para splits e participações; gêneros em árvore por autorreferência. Detalhes no planejamento (seção 6).
2. **Exclusões protegidas.** Artista com lançamentos, gênero com subgêneros ou artistas não podem ser excluídos (`ON DELETE RESTRICT` no banco e mensagem explicando no service). Excluir um lançamento leva as faixas junto.
3. **Permissões pelo pacote `@nestjs/authorization`.** Uma política, `CatalogPolicy.manage`, decide quem altera o catálogo (hoje, só ADMIN). As rotas de escrita declaram `@Can(CatalogPolicy, 'manage')`; rotas de leitura são `@Public()`. Uma rota sem nenhuma anotação é negada, então esquecer a regra fecha a rota em vez de abri-la. O guard de autenticação roda antes do de autorização: visitante recebe 401, usuário comum recebe 403.
4. **Datas com precisão.** O lançamento guarda a data e o quanto dela se conhece (ano, mês ou dia). A API aceita e devolve `"2013"`, `"2013-04"` ou `"2013-04-01"`.
5. **Imagens no Cloudflare R2**, pelo `@nestjs/storage` (S3 compatível). O R2 tem 10 GB gratuitos, tráfego de saída sem custo e não pausa por inatividade, ao contrário do plano gratuito do Supabase. Sem bucket configurado, o desenvolvimento grava em `backend/storage` e a produção recusa uploads com uma mensagem clara, em vez de gravar no disco do servidor, que é apagado a cada deploy.
6. **Upload pela API, não direto do navegador.** O arquivo passa pela API, que confere o conteúdo pelos primeiros bytes (o nome e o tipo declarados não valem), limita a 5 MB e 40 megapixels, redimensiona com `sharp` e grava duas versões em WebP. O nome do arquivo inclui um resumo do conteúdo, então cada imagem nova tem endereço novo e pode ficar em cache para sempre. O banco guarda só o caminho; as URLs são montadas pela API.
7. **Cor de destaque por lançamento.** No upload da capa, a API agrupa os pixels por matiz, dá mais peso às cores saturadas (para não escolher o fundo cinza), e escurece a cor vencedora, mantendo o matiz, até ter contraste de 4,5:1 sobre branco. Capas sem cor marcante resultam em `null`, e o site usa o violeta padrão. O admin pode definir a cor à mão, e a API recusa cores claras demais.
8. **YouTube só como player incorporado.** O lançamento guarda o id do vídeo; o admin cola o link e a API extrai o id. Não usamos a API do YouTube (ver planejamento, seção 10).
9. **Gêneros iniciais por script** (`npm run seed:genres`), idempotente. A árvore é uma proposta editável. Artistas e discos reais são cadastrados pelo admin: não geramos discografias de memória.

## Alternativas consideradas

- **Supabase Storage**: 1 GB gratuito, e projetos gratuitos pausam por inatividade, o que tiraria as imagens do ar junto.
- **URL assinada para upload direto**: poupa banda da API, mas dificulta validar e redimensionar. Com poucas imagens pequenas, o upload pela API é mais simples e mais seguro.
- **Papel "EDITOR"**: a política já isola a regra; criar o papel é uma mudança de um método quando houver necessidade.

## Consequências

- Em produção, o envio de imagens só funciona depois de configurar o bucket (variáveis `STORAGE_*`).
- A extração de cor é heurística: pode errar em capas incomuns, e por isso a cor é editável.
- A política de acesso é conferida por testes contra o banco (visitante 401, usuário 403, admin 2xx) em todas as rotas de escrita.
