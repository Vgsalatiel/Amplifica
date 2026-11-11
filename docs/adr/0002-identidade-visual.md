# ADR 0002 — Identidade visual "Editorial"

- **Data:** 2026-11-11
- **Status:** aceita

## Contexto

O Amplifica precisa de uma identidade própria, ligada à cultura rock, sem cair em clichês (caveiras, chamas) nem na aparência de painel genérico. Duas direções foram desenhadas e comparadas: "Core" (cartaz de show, preto e vermelho, títulos em bloco) e "Editorial" (revista de música em papel escuro).

## Decisão

Adotar a direção **Editorial**.

| Elemento | Escolha |
| --- | --- |
| Fundo | Grafite `#1B1B1D` |
| Texto | Papel `#ECE5D5` (13,7:1) e cinza quente `#A39D92` (6,4:1) |
| Destaque | Ocre `#E3A72F` (8,1:1), a única cor de tinta além do papel |
| Títulos | Fraunces |
| Textos longos | Newsreader |
| Interface | Instrument Sans |
| Nota | Medidor de dez níveis, no lugar de estrelas |

- Os tokens ficam em `frontend/src/styles/index.css`, no bloco `@theme` do Tailwind, e são a única fonte de cores e fontes do site.
- As fontes são servidas pelo próprio site (pacotes Fontsource, licença SIL OFL), sem chamadas ao Google em tempo de execução.
- A página `/guia` mostra todos os tokens e componentes-base.

## Pendência: logotipo

A identidade aprovada usa a fonte **Maskneyes** apenas no logotipo. A versão disponível é uma demo de uso pessoal: a licença proíbe uso em logotipos, uso promocional e redistribuição, e o arquivo só contém as letras de A a Z. Por isso a fonte não está no repositório e o logotipo usa a Fraunces provisoriamente.

Quando a licença for adquirida, a troca é feita em um único arquivo: `frontend/src/components/ui/logo.tsx`.

## Consequências

- O medidor mostra a nota de 1 a 10 diretamente, o mesmo valor que será guardado no banco.
- Componentes novos devem usar os tokens; cores avulsas em hexadecimal não entram no código.
