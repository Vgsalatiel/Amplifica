# ADR 0008 — Descoberta: busca, filtros e nota nas listas

- **Data:** 2026-11-12
- **Status:** aceita

## Contexto

Com o catálogo e as avaliações no ar, falta achar discos sem saber o nome exato, filtrar por gênero, tipo e ano, e ver a nota de cada disco sem abrir a página dele.

## Decisão

1. **Busca com a extensão `unaccent` do PostgreSQL.** "sempiternal", "SEMPITERNAL" e "sémpiternal" acham o mesmo disco. A extensão vem com o PostgreSQL e a Neon a permite; uma migration a habilita. O Prisma não chama `unaccent`, então a busca é uma consulta direta e parametrizada que devolve ids, usados depois no filtro normal.
2. **Cada palavra precisa aparecer, em qualquer ordem.** Nos lançamentos, no título ou no nome de um dos artistas. Até 6 palavras. `%`, `_` e `\` digitados pela pessoa valem como texto, não como curinga.
3. **Sem rota `/search`.** A página `/buscar` consulta `GET /artists?q=` e `GET /releases?q=`, duas listas paginadas à parte. O resultado é o mesmo e não há endpoint novo para manter.
4. **Filtros de lançamentos:** `type`, `artist`, `genre` (inclui subgêneros, como na lista de artistas), `year` e `q`. Todos ficam na URL da tela, para copiar o endereço ou voltar com o botão do navegador.
5. **`rating` em todo resumo de lançamento.** Uma consulta agregada (`groupBy`) cobre uma página inteira; a média continua calculada na leitura, como na ADR 0007.
6. **Ordem por nota** (`sort=rating`): média maior primeiro, depois mais notas, depois o mais recente. Discos sem nota ficam por último. O Prisma não ordena por uma média de outra tabela, então o service busca os ids que passam nos filtros, ordena na memória e só carrega a página pedida.
7. **Cabeçalho:** com cinco links, a busca e a conta, a linha completa só cabe a partir de 1280 px; abaixo disso entra o menu de celular, que também tem a caixa de busca.

## Alternativas consideradas

- **Busca textual do PostgreSQL (`tsvector`) ou `pg_trgm`:** melhor para erros de digitação e relevância, mas exige índices e configuração de idioma que o tamanho do catálogo não justifica hoje.
- **Guardar a média no disco (`ratingAvg`):** permitiria ordenar no banco. Fica para quando a ordem em memória pesar.
- **Rota `GET /search` única:** uma chamada só, mas duas paginações juntas complicam a resposta.

## Limites conhecidos

- A ordem por nota carrega os ids de todo o resultado filtrado. Funciona para centenas ou poucos milhares de discos; passando disso, a média deve virar coluna.
- A busca não corrige erros de digitação ("sempiternl" não acha "Sempiternal").
- Não há busca por usuários.
