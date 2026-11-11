# ADR 0002 — Identidade visual "Editorial"

- **Data:** 2026-11-11
- **Status:** aceita

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
