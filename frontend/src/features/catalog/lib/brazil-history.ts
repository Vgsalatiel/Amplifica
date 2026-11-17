/** Um nome citado na história. Com `slug`, vira link se a banda estiver no catálogo. */
export interface HistoryBand {
  name: string
  slug?: string
}

export interface HistoryEra {
  id: string
  title: string
  period: string
  paragraphs: string[]
  bands: HistoryBand[]
}

export interface HistorySource {
  name: string
  url: string
}

/**
 * Resumo da cena, escrito a partir das fontes listadas abaixo. Cada afirmação aqui tem base
 * numa delas; o que não tem fonte não entra.
 */
export const HISTORY_ERAS: HistoryEra[] = [
  {
    id: 'hardcore-anos-80',
    title: 'O hardcore toma conta do punk',
    period: 'Anos 80',
    paragraphs: [
      'O Brasil não teve uma explosão punk nos anos 1970 como a do Reino Unido e a dos Estados Unidos. Ela veio só no começo dos anos 80, e já sob a influência do hardcore. O primeiro lançamento punk do país foi a coletânea Grito Suburbano, no início de 1982, com quatro músicas rápidas de cada uma de três bandas: Olho Seco, Inocentes e Cólera.',
      'Por volta de 1983, em São Paulo, os grupos que se assumiam hardcore se separaram dos que seguiam o punk rock dos anos 70. Entraram nesse lado Ratos de Porão, Olho Seco e Excomungados, e a cena se espalhou: o Rio tinha Desordeiros e Auschwitz, e Brasília tinha A.R.D. e DF-Caos, que depois virou DFC.',
    ],
    bands: [{ name: 'Olho Seco' }, { name: 'Inocentes' }, { name: 'Cólera' }, { name: 'Ratos de Porão' }],
  },
  {
    id: 'hardcore-melodico-anos-90',
    title: 'Hardcore melódico e skate punk',
    period: 'Anos 90',
    paragraphs: [
      'A maioria das bandas de hardcore melódico do Brasil segue o estilo desde o fim dos anos 1980, influenciada pelas bandas da Califórnia e pela cultura do skate. Entre as que mais se destacaram estão Garage Fuzz, Dead Fish, Aditive, Sugar Kane, Hateen e CPM 22.',
      'O Dead Fish nasceu em Vitória, em 1991. O Hateen é de São Paulo, de 1994, e o CPM 22 é de Barueri, de 1995. Essas bandas misturam o hardcore melódico com post-hardcore, emo e pop punk, e o Charlie Brown Jr. foi além, juntando o estilo a reggae, hip hop, MPB e rock alternativo.',
    ],
    bands: [
      { name: 'Dead Fish', slug: 'dead-fish' },
      { name: 'Hateen', slug: 'hateen' },
      { name: 'CPM 22', slug: 'cpm-22' },
      { name: 'Charlie Brown Jr.', slug: 'charlie-brown-jr' },
    ],
  },
  {
    id: 'emo-anos-2000',
    title: 'O emo chega, e o metalcore também',
    period: 'Anos 2000',
    paragraphs: [
      'Por volta de 2003, a tribo emo se firmou em São Paulo, sob forte influência dos Estados Unidos, e logo se espalhou para outras capitais do Sul e do Sudeste. Mais do que música, era um jeito de se vestir e de se comportar: roupa preta e listrada, Vans, cabelo colorido e franja sobre os olhos. A reação contrária cresceu mais depressa do que o próprio gênero, e os fãs viraram alvo de preconceito e de bullying.',
      'Dessa época vêm o Fresno, de Porto Alegre, formado em 1999, e o Gloria, de São Paulo, formado em 2002. O Gloria é de metalcore, e a banda chamou a atenção da gravadora depois de abrir um show do Fresno em São Paulo. Em 2008, o produtor Rick Bonadio a levou para o elenco da Arsenal Music.',
    ],
    bands: [
      { name: 'Fresno', slug: 'fresno' },
      { name: 'Gloria', slug: 'gloria' },
    ],
  },
  {
    id: 'bandas-coloridas-2009',
    title: 'As bandas coloridas respondem ao emo',
    period: '2009',
    paragraphs: [
      'Em 2009 apareceu o fenômeno das "bandas coloridas", ou happy rock: calças skinny coloridas, camisetas de gola V e uma mistura de pop rock e power pop. Ele surgiu como contraponto ao emo, que dominava os adolescentes desde 2005, com roupa preta e letras sentimentais.',
      'O sucesso começou com a Cine e o single "Garota Radical". Em novembro de 2009 surgiu o Restart, que consolidou o estilo. Também se destacaram Hori, Replace, Jullie, CW7, Caps Lock e Izi.',
    ],
    bands: [{ name: 'Cine' }, { name: 'Restart' }, { name: 'Hori' }, { name: 'Replace' }],
  },
  {
    id: 'cena-atual',
    title: 'A cena hoje',
    period: 'Agora',
    paragraphs: [
      'O hardcore continua vivo, com bandas como menores atos, do Rio de Janeiro, e Bullet Bane. No emo, bandas novas lançam discos de forma independente: o Rolimã, de Águas de Lindóia, lançou o EP Retalho em 2023, e o Metade de Mim e o Bad Luv lançaram álbuns em 2026.',
    ],
    bands: [
      { name: 'menores atos', slug: 'menores-atos' },
      { name: 'Bullet Bane', slug: 'bullet-bane' },
      { name: 'Rolimã', slug: 'rolima' },
      { name: 'Metade de Mim', slug: 'metade-de-mim' },
      { name: 'Bad Luv', slug: 'bad-luv' },
      { name: 'Antipoética', slug: 'antipoetica' },
    ],
  },
]

export const HISTORY_SOURCES: HistorySource[] = [
  { name: 'Wikipédia: Hardcore punk', url: 'https://pt.wikipedia.org/wiki/Hardcore_punk' },
  { name: 'Wikipédia: Hardcore melódico', url: 'https://pt.wikipedia.org/wiki/Hardcore_mel%C3%B3dico' },
  { name: 'Wikipédia: Emo', url: 'https://pt.wikipedia.org/wiki/Emo' },
  { name: 'Wikipédia: Banda colorida', url: 'https://pt.wikipedia.org/wiki/Banda_colorida' },
  { name: 'Wikipédia: Gloria (banda)', url: 'https://pt.wikipedia.org/wiki/Gloria_(banda)' },
  { name: 'MusicBrainz', url: 'https://musicbrainz.org/' },
  { name: 'Spotify (páginas públicas dos artistas)', url: 'https://open.spotify.com/' },
]
