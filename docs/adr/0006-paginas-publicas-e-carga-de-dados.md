# ADR 0006 — Páginas públicas, cor por disco e carga de dados

- **Data:** 2026-11-12
- **Status:** aceita

## Contexto

A etapa 4 mostra o catálogo ao visitante. Três perguntas: quem pode ver o quê, como entram os primeiros dados (começando pelo Bring Me The Horizon) e como a cor extraída de cada capa chega à página.

## Decisão

1. **Ver é público, avaliar exige conta.** Gêneros, artistas e discos abrem para qualquer visitante, sem login. Quem quer avaliar cria conta, e o cadastro iniciado a partir de um disco **volta a esse disco** depois (o destino viaja em `state.from`, só caminhos internos são aceitos). A avaliação em si é a etapa seguinte; até lá, quem já tem conta vê um aviso.
2. **A cor do disco é um tema local, feito só com CSS.** As cores do site são variáveis (`--color-accent` e `--color-accent-hover`). A página do disco as redefine em um elemento que envolve o conteúdo, e botões, destaques e links dali passam a usar a cor da capa, sem tocar em nenhum componente. Cabeçalho, rodapé e as demais páginas continuam no violeta. O realce é a mesma cor misturada com preto (`color-mix`). Capa sem cor marcante não aplica tema nenhum.
3. **Os dados entram por um arquivo de revisão, não direto do MusicBrainz para o banco.** `npm run catalog:fetch` escreve um arquivo JSON (`backend/prisma/data/`); uma pessoa o lê e corrige; `npm run catalog:seed` o grava no banco. A carga é idempotente (artista pelo endereço, lançamento pelo identificador do MusicBrainz) e, por padrão, não sobrescreve o que já existe, então edições feitas no admin sobrevivem. Com `--update`, o arquivo manda. O arquivo é validado com os mesmos limites da API e versionado no Git.
4. **O que uma segunda fonte não confirma não entra.** Cada lançamento é conferido na Wikipédia (inglês e português). Os que ela não lista ficam em `pending`, ignorados pela carga, até alguém decidir.
5. **Regras de classificação e data, escritas e testadas.** O tipo vem do MusicBrainz: ao vivo vira LIVE; coletânea e álbum de remixes viram COMPILATION; remix e demo em EP continuam EP; um single gravado ao vivo continua single (e singles ficam fora). A data é a do primeiro lançamento em qualquer país segundo o MusicBrainz, o que difere em dias ou semanas das datas regionais que a Wikipédia usa para alguns discos. Casos em que os dois discordam do tipo são decididos à mão no arquivo, com a justificativa no registro de revisão.
6. **A história da banda é texto autoral, com fontes à vista.** Escrita em português a partir de fatos que as duas edições da Wikipédia confirmam, com a lista de fontes (campo `sources` do artista) exibida na página. Só links http e https viram link, e a lista de fontes é validada na API e de novo na tela.
7. **Capas do Cover Art Archive, com aviso de direitos.** O rodapé informa a origem, diz que os direitos pertencem aos titulares e indica como pedir a remoção. Discos sem capa mostram o título em um quadro, e não um buraco.
8. **Player do YouTube em privacidade reforçada** (`youtube-nocookie.com`, documentado pelo YouTube), com `loading="lazy"` e o id conferido de novo no navegador antes de montar o endereço.

## Alternativas consideradas

- **Importar direto do MusicBrainz para o banco**: mais rápido, mas sem o ponto de revisão onde as discordâncias entre fontes apareceram (datas regionais, discos que só uma fonte lista, títulos longos demais).
- **Tema por classe no corpo da página, ou componentes que recebem a cor por propriedade**: mais código e acoplamento. As variáveis CSS já existiam por causa dos tokens.
- **Importação dentro do admin**: reservada para a v1.1.

## Consequências

- Carregar outro artista é o mesmo caminho: buscar, revisar o arquivo, carregar.
- Em produção, as capas só são gravadas depois de configurar o bucket; sem ele, a carga grava os dados e pula as imagens, avisando.
- A extração de cor é heurística. Capas escuras ou de tons parecidos resultam em tons discretos (várias do BMTH ficaram em marrons e vinhos); o admin pode escolher outra cor.

## Lições registradas

- **Tipografia em tamanho grande precisa ser olhada em resolução real.** A Fraunces ajusta o contraste ao tamanho, e em títulos de 96 px a barra do "e" desaparecia ("Mc thc Horizon"). O eixo `opsz` foi limitado a 48 e a altura de linha dos títulos grandes subiu para 1,06, porque a perna do "g" e do "p" encostava na linha de baixo.
- **Imagens `loading="lazy"` não aparecem em captura de página inteira** que não rola. Não é defeito, mas a verificação precisa rolar a página de verdade.
