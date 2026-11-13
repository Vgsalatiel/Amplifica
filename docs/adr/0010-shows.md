# ADR 0010 — Shows

- **Data:** 2026-11-13
- **Status:** aceita (API, carga de dados, administração e importação por link; telas públicas na etapa seguinte)

## Contexto

O site passa a ter uma agenda de shows de rock e vertentes no Brasil. Não existe fonte gratuita e confiável que cubra o país, e raspar sites de ingresso quebra com facilidade e costuma violar os termos de uso. A fonte dos dados é, então, o cadastro manual (pelo admin ou por arquivo revisável), e a API precisa guardar também de onde e de quando veio cada informação.

## Decisão

1. **Três tabelas.** `Show` (o evento), `ShowAct` (a escalação, em ordem) e `ShowGenre` (os gêneros). Um festival com doze bandas é um show com doze atrações, e não doze shows.
2. **Atração com ou sem catálogo.** `ShowAct.artistId` é opcional: com ele, o show liga à página da banda; sem ele (banda de fora do catálogo), só o nome aparece. Apagar a banda do catálogo **não apaga o show** (`ON DELETE SET NULL`).
3. **Gêneros próprios do show**, e não herdados do artista. Assim os filtros por gênero valem também para bandas que não estão no catálogo. Um gênero em uso por um show não pode ser excluído (`RESTRICT`, e a API responde 409 `genre_in_use` em vez de erro 500).
4. **A data é um dia de calendário** (`date`, sem horário), e o horário de início é um texto opcional "HH:MM". "Hoje" é o dia em **São Paulo**, e não em UTC: às 22h de 14/03 no Brasil já é 15/03 em UTC, mas o show de 14/03 ainda não aconteceu.
5. **`verifiedAt`**: quando alguém conferiu o show na fonte. A página mostra essa data, porque datas de show mudam e uma agenda sem isso envelhece sem avisar. Só muda quando é enviada: editar a cidade não conta como conferir.
6. **Cada show leva um link** da página oficial ou do vendedor (só `http` e `https`, validado na entrada e filtrado de novo na saída). O site não vende ingresso nem copia texto ou imagem de terceiros; usa a foto da banda do próprio catálogo.
7. **Estado é a sigla de uma lista fixa** (26 estados e DF); o banco tem uma regra `CHECK` para o formato da sigla e do horário.
8. **Rotas.** `GET /shows` e `GET /shows/:slug` são públicas; criar, editar e excluir é só para admin (a mesma política do catálogo). A lista traz por padrão os próximos shows, do mais perto para o mais longe, **sem os cancelados**. Filtros: `when` (`upcoming`, `past`, `all`), `state`, `city`, `genre` (inclui subgêneros), `artist`, `month` e `status`.
9. **Endereço (slug)** gerado de "nome do evento ou primeira banda + cidade + data", como `linkin-park-sao-paulo-2027-03-15`, com sufixo numérico se já existir.
10. **Carga por arquivo**, como no catálogo: `npm run shows:seed -- prisma/data/shows/ARQUIVO.json`. O arquivo exige link, data de conferência e ao menos um gênero por show. É seguro repetir: o show é reconhecido por dia, cidade, local e primeira banda. Por padrão o que já existe é mantido (para não perder edições do admin); `--update` atualiza.

11. **Importar de um link, com revisão.** No formulário de novo show, o admin cola o link de uma página de evento. `POST /shows/import-preview` (só ADMIN) lê aquela página e devolve uma **sugestão**: nada é gravado até a pessoa conferir e enviar o formulário. A leitura usa os dados que a própria página publica para buscadores (JSON-LD, tipo `Event`/`MusicEvent` do schema.org): nome, dia e horário, local, cidade, estado, bandas, situação (cancelado, esgotado, reagendado). As bandas que têm o mesmo nome de uma do catálogo já vêm ligadas a ela, e a resposta avisa se o show já está cadastrado. Sem esses dados na página, vem só o título e o aviso de que o resto é à mão.
12. **Como a leitura se comporta.** É uma página por clique, como a pré-visualização de um link: não rastreia o site, não segue links e não roda sozinha. Respeita o `robots.txt` (e recusa ler quando não consegue conferi-lo), identifica-se com um agente genérico (`catalog-import/0.1`, ajustável por `IMPORT_USER_AGENT`) sem dados de ninguém, aceita só as portas 80 e 443, limita a 10 s e 2 MB (já descomprimidos) e recusa endereços internos (máquina local, redes privadas, metadados de nuvem), conferindo o endereço no momento da conexão, também nos redirecionamentos.

## O que a importação mostrou na prática

Na página de um show de teste do Ticket360, a data estruturada dizia 9 de janeiro e o texto da descrição falava em 10 de outubro; o evento estava marcado como reagendado. O Clube do Ingresso publica só os lotes de ingresso, sem data nem local. Por isso a sugestão nunca é salva sozinha, e a data de conferência é a da pessoa que olhou.

## Alternativas consideradas

- **API de terceiros (Bandsintown, Songkick, Ticketmaster):** exigem chave, restringem o uso público nos termos e cobrem pouco o Brasil.
- **Raspagem automática e agendada de sites de ingresso:** frágil (quebra quando o site muda), costuma violar os termos de uso e publicaria dados errados sem ninguém ver. A importação por link é o meio-termo: automática na leitura, humana na decisão.
- **Um show por banda, sem escalação:** simples, mas duplica festivais e não deixa listar "quem toca no evento".
- **Gêneros herdados do artista:** evitaria cadastrar gêneros, mas deixaria de fora toda banda que não está no catálogo.

## Limites conhecidos

- A lista é tão completa quanto o cadastro. "Todos os shows do Brasil" não é uma promessa que um cadastro manual consiga cumprir; por isso a data de conferência e o link oficial ficam visíveis.
- Cada site publica (ou não) os dados do evento do seu jeito: a importação funciona bem onde há `Event` estruturado e fica só com o título onde não há. Sites que proíbem leitura automática no `robots.txt` são respeitados.
- Não há histórico de alterações nem aviso automático de cancelamento ou mudança de data.
- O filtro de cidade compara o texto da cidade sem diferenciar maiúsculas, mas não ignora acento ("Brasilia" não acha "Brasília"). A tela vai oferecer as cidades existentes em vez de campo livre.
