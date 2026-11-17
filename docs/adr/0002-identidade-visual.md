# ADR 0002 — Identidade visual

- **Data:** 2026-11-11
- **Status:** aceita; **revisada em 2026-11-16** (de "Editorial" para "Emo anos 2000", veja a última seção)

## Contexto

O Amplifica precisa de uma identidade própria, ligada à cultura rock, sem cair em clichês (caveiras, chamas) nem na aparência de painel genérico. Duas direções foram desenhadas e comparadas: "Core" (cartaz de show, preto e vermelho, títulos em bloco) e "Editorial" (revista de música).

## Decisão

Adotar a direção **Editorial**, em fundo branco e com violeta como cor de destaque. A primeira versão era escura com destaque ocre; depois de ver as duas, o autor preferiu a clara e pediu outra cor no lugar do amarelo. O vermelho foi testado e descartado.

| Elemento | Escolha |
| --- | --- |
| Fundo | Branco `#FFFFFF`, com papel `#F3EFE6` em faixas |
| Texto | Tinta `#1B1B1D` (17,2:1) e cinza `#5F5A52` (6,8:1) |
| Destaque | Violeta `#5630D0` (7,7:1), a única cor além da tinta |
| Erros | Vermelho `#B42318` (6,6:1), reservado a mensagens de erro |
| Títulos | Fraunces |
| Textos longos | Newsreader |
| Interface | Instrument Sans |
| Nota | Medidor de dez níveis, no lugar de estrelas |

- Os tokens ficam em `frontend/src/styles/index.css`, no bloco `@theme` do Tailwind, e são a única fonte de cores e fontes do site.
- Os tokens têm nomes de papel (`surface`, `ink`, `accent`), não de cor. A troca do tema escuro para o claro mudou só os valores, sem tocar nos componentes.
- Mensagens de erro levam um ícone e borda mais grossa, para não dependerem só da cor.
- As fontes são servidas pelo próprio site (pacotes Fontsource, licença SIL OFL), sem chamadas ao Google em tempo de execução.
- A página `/guia` mostra todos os tokens e componentes-base.

## Pendência: logotipo

A identidade aprovada usa a fonte **Maskneyes** apenas no logotipo. A versão disponível é uma demo de uso pessoal: a licença proíbe uso em logotipos, uso promocional e redistribuição, e o arquivo só contém as letras de A a Z. Por isso a fonte não está no repositório e o logotipo usa a Fraunces provisoriamente.

Quando a licença for adquirida, a troca é feita em um único arquivo: `frontend/src/components/ui/logo.tsx`.

## Consequências

- O medidor mostra a nota de 1 a 10 diretamente, o mesmo valor que será guardado no banco.
- Componentes novos devem usar os tokens; cores avulsas em hexadecimal não entram no código.

## Revisão de 2026-11-16: "Emo anos 2000"

O autor pediu uma cara mais de emocore. Entre três direções (flyer de show DIY, emo anos 2000 e midwest emo), escolheu **emo anos 2000**, para o site inteiro. A identidade "Editorial" acima fica como histórico; os tokens continuam sendo a única fonte de cores e fontes, e a troca mexeu nos valores e em poucos componentes.

| Elemento | Escolha |
| --- | --- |
| Fundo | Preto `#0B0B0D`, com grafite `#18171C` em faixas |
| Texto | Branco quente `#F6F1F3` (17,6:1) e cinza `#B8B0B6` (9,3:1) |
| Destaque | Rosa-choque `#FF2E93` (5,7:1); o texto sobre ele é preto (5,7:1) |
| Erros | Vermelho claro `#FF7A7A` (7,8:1) |
| Títulos e logotipo | Permanent Marker (Apache 2.0) |
| Recados e enfeites | Reenie Beanie (OFL), nunca em texto de leitura |
| Textos longos e interface | Newsreader e Instrument Sans, como antes |
| Detalhes | Botões em pílula, listras diagonais rosa e preto no cabeçalho e no rodapé, estrela nos títulos de seção, recado manuscrito na página inicial |

- **Cor do disco no tema escuro.** A cor de destaque de cada disco chega da API escura (com contraste sobre branco). Sobre o preto, ela é clareada em direção ao branco (`onDark`, em `lib/accent.ts`), o que mantém legíveis o texto, os links e o medidor de nota. O texto sobre a cor continua preto.
- **Letra de marcador sem itálico.** A fonte não tem itálico, e o navegador inventaria um torto. Uma regra fora das camadas do Tailwind anula o `italic` dos títulos. Títulos longos quebram com `overflow-wrap: anywhere`, porque a letra é larga.
- **Pendência do logotipo resolvida.** A Permanent Marker pode ser usada em logotipos e redistribuída, ao contrário da demo da Maskneyes.
- **Acessibilidade.** Todos os pares de cor passam em AA; as estrelas, os corações e o recado manuscrito são decorativos (`aria-hidden`); a animação do mural respeita `prefers-reduced-motion`.

## Revisão de 2026-11-17: "TV de clipes" (versão equilibrada)

Depois de ver cinco direções em mockups (zine, revista, tropical, índice e TV de clipes), o autor gostou da **TV de clipes**, que lembra a MTV Brasil, mas achou o resultado forte demais para o site inteiro. Foi aprovada a **versão equilibrada**: o visual de TV fica na página inicial, na Cena BR e na agenda, e as páginas de leitura (disco, banda, resenhas, administração) ficam calmas, com as capas como destaque. Os tokens continuam sendo a única fonte de cores e fontes. Esta é a etapa 1 da troca (base: cores, fontes, botões, cabeçalho, rodapé, logotipo e guia visual); início, páginas internas e o player "Agora na tela" vêm nas etapas seguintes.

| Elemento | Escolha |
| --- | --- |
| Fundo | Quase preto `#0B0B0C`, com grafite `#161618` em faixas |
| Texto | Branco `#FFFFFF` (19,7:1) e cinza `#B9B9BD` (10,1:1) |
| Cor principal | Amarelo `#FFE600` (15,5:1); o texto sobre ele é preto (15,5:1) |
| Selos | Rosa `#FF2D95` (5,7:1), só em selos pequenos como "AGORA"; o texto sobre ele é preto |
| Erros | Vermelho claro `#FF7A7A` (7,8:1) |
| Títulos e logotipo | Archivo Black (OFL, que permite uso em logotipo) |
| Texto e interface | Archivo (OFL), em peso variável |
| Detalhes | Logotipo em bloco amarelo inclinado, botões em pílula, página atual do menu em pílula amarela, listras diagonais amarelas e pretas e rodapé amarelo |

- **Saem** a Permanent Marker, a Reenie Beanie, a Fraunces, a Newsreader e a Instrument Sans, assim como as estrelas, os corações e o recado manuscrito. O rosa deixou de ser a cor principal.
- **Cor do disco.** Continua valendo só na página do disco (`onDark`, em `lib/accent.ts`). Sem cor própria, a página usa o amarelo do site.
- **Uma só família no texto corrido.** O texto de leitura (resenhas, descrições) passou a usar a Archivo, a mesma da interface, em vez de uma fonte serifada separada.
- **Acessibilidade.** Todos os pares de cor passam em AA. A Archivo Black não tem itálico: a regra que anula o `italic` dos títulos continua, e títulos longos quebram com `overflow-wrap: anywhere`.
- **Etapa 3 (páginas internas).** O que muda nas telas de leitura é pouco, de propósito: etiquetas de gênero e o menu da administração em pílula (como o menu principal); faixas do disco em duas colunas, com o número na cor de destaque; hora de início em destaque na agenda; e, em `/cena-br/historia`, a seção "A MTV Brasil e a cena" com linha do tempo. As páginas de disco, banda, gêneros, perfil e administração já herdavam cores e fontes dos tokens da etapa 1.
