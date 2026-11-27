/**
 * Cartão de compartilhamento (Open Graph) das páginas de disco, de artista, de show e de perfil, e das
 * páginas fixas do site.
 *
 * O site é uma SPA: o `index.html` é o mesmo para todas as rotas, e quem cola o link de um
 * álbum no LinkedIn ou no WhatsApp via uma prévia vazia, porque esses leitores não rodam
 * JavaScript. A função de borda (og.ts, na pasta acima) busca os dados na API e injeta as
 * meta tags no HTML antes de entregá-lo. A lógica fica aqui, sem nada específico da Netlify,
 * para ser testada com o Vitest.
 */

export interface PageTags {
  title: string
  description: string
  image: string | null
  url: string
}

export type Target = { kind: 'release' | 'artist' | 'show' | 'user'; slug: string }

const TYPE_LABELS: Record<string, string> = {
  ALBUM: 'Álbum',
  EP: 'EP',
  SINGLE: 'Single',
  LIVE: 'Disco ao vivo',
  COMPILATION: 'Coletânea',
}

/** Escapa texto para uso dentro de um atributo ou elemento HTML. */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/** Reconhece /lancamentos/:slug, /artistas/:slug, /shows/:slug e /u/:username (e só eles). */
export function matchTarget(pathname: string): Target | null {
  const match = /^\/(lancamentos|artistas|shows)\/([a-z0-9]+(?:-[a-z0-9]+)*)\/?$/.exec(pathname)
  if (match) {
    const kind = match[1] === 'lancamentos' ? 'release' : match[1] === 'artistas' ? 'artist' : 'show'
    return { kind, slug: match[2] }
  }
  const user = /^\/u\/([a-z0-9._]{1,40})\/?$/.exec(pathname)
  return user ? { kind: 'user', slug: user[1] } : null
}

const SITE_DESCRIPTION = 'Descubra álbuns, explore discografias e acompanhe a cena: do underground brasileiro às grandes bandas internacionais.'

/** Títulos e descrições das páginas fixas. As outras rotas ficam com o cartão do site. */
const STATIC_PAGES: Record<string, { title: string; description: string }> = {
  '/': { title: 'Amplifica | Descoberta musical e comunidade de rock', description: SITE_DESCRIPTION },
  '/artistas': { title: 'Artistas | Amplifica', description: 'Bandas e artistas de rock, emo, metal e hardcore, com discografia, curiosidades e shows.' },
  '/lancamentos': { title: 'Lançamentos | Amplifica', description: 'Álbuns, EPs e singles do catálogo, com nota da comunidade e links para ouvir.' },
  '/generos': { title: 'Gêneros | Amplifica', description: 'Do metalcore ao emo, do pop-punk ao hardcore: explore os gêneros e subgêneros do catálogo.' },
  '/shows': { title: 'Shows | Amplifica', description: 'A agenda de shows de rock, metal e hardcore no Brasil, com ingressos e quem vai.' },
  '/cena-br': { title: 'Cena BR | Amplifica', description: 'As bandas brasileiras do catálogo: do hardcore dos anos 80 ao metalcore de hoje.' },
  '/cena-br/historia': { title: 'História da cena BR | Amplifica', description: 'Do hardcore dos anos 80 ao emo e ao metalcore de hoje, em cinco capítulos curtos, com fontes.' },
  '/emo-tour': { title: 'Emo Tour | Amplifica', description: 'As datas e cidades do Emo Tour.' },
}

/** O cartão de uma página fixa, ou o do site para qualquer outra rota. */
export function staticTags(pathname: string, origin: string): PageTags {
  const key = pathname.length > 1 ? pathname.replace(/\/$/, '') : pathname
  const page = STATIC_PAGES[key] ?? STATIC_PAGES['/']
  return { title: page.title, description: page.description, image: null, url: `${origin}${key}` }
}

function absolute(image: string | null | undefined, origin: string): string | null {
  if (!image) {
    return null
  }
  if (/^https?:\/\//.test(image)) {
    return image
  }
  return image.startsWith('/') ? `${origin}${image}` : null
}

function shorten(text: string, max = 200): string {
  const clean = text.replace(/\s+/g, ' ').trim()
  if (clean.length <= max) {
    return clean
  }
  return `${clean.slice(0, max - 1).replace(/\s+\S*$/, '')}…`
}

export interface ReleaseData {
  title: string
  type: string
  releaseDate: string
  cover: { large: string } | null
  rating: { average: number | null; count: number }
  artists: Array<{ name: string; role: string }>
  tracks: unknown[]
}

export interface ArtistData {
  name: string
  type: string
  bio: string | null
  country: string | null
  city?: string | null
  formedYear?: number | null
  genres?: Array<{ name: string }>
  image: { large: string } | null
  releases: unknown[]
}

export interface ShowData {
  name: string | null
  date: string
  startTime: string | null
  venue: string
  city: string
  state: string
  status?: string
  poster: { large: string } | null
  acts: Array<{ name: string }>
}

export interface UserData {
  username: string
  displayName: string
  bio: string | null
  avatar: { large: string } | null
}

/** "US" vira "Estados Unidos". Código desconhecido ou erro do navegador: devolve o próprio código. */
export function countryName(code: string): string {
  try {
    return new Intl.DisplayNames(['pt-BR'], { type: 'region' }).of(code.toUpperCase()) ?? code
  } catch {
    return code
  }
}

/** "5 de março de 2027", sem depender do fuso de quem pede. */
function longDate(isoDay: string): string {
  const date = new Date(`${isoDay.slice(0, 10)}T12:00:00Z`)
  return Number.isNaN(date.getTime())
    ? isoDay
    : date.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
}

const formatRating = (value: number) => value.toLocaleString('pt-BR', { maximumFractionDigits: 1 })

export function releaseTags(data: ReleaseData, origin: string, path: string): PageTags {
  const artists = data.artists.filter((a) => a.role === 'PRIMARY').map((a) => a.name).join(', ')
  const parts = [`${TYPE_LABELS[data.type] ?? 'Lançamento'} de ${data.releaseDate.slice(0, 4)}.`]
  if (data.rating.average !== null) {
    const { count } = data.rating
    parts.push(`Nota ${formatRating(data.rating.average)} de 10 (${count === 1 ? '1 avaliação' : `${count} avaliações`}).`)
  } else {
    parts.push('Ainda sem avaliações.')
  }
  if (data.tracks.length > 0) {
    parts.push(`${data.tracks.length} ${data.tracks.length === 1 ? 'faixa' : 'faixas'}.`)
  }
  return {
    title: `${data.title}, ${artists} | Amplifica`,
    description: parts.join(' '),
    image: absolute(data.cover?.large, origin),
    url: `${origin}${path}`,
  }
}

export function artistTags(data: ArtistData, origin: string, path: string): PageTags {
  const kind = data.type === 'SOLO' ? 'Artista solo' : 'Banda'
  const count = data.releases.length
  const where = [data.city, data.country ? countryName(data.country) : null].filter(Boolean).join(', ')
  const parts = [`${kind}${where ? `, ${where}` : ''}${data.formedYear ? `, desde ${data.formedYear}` : ''}.`]
  const genres = (data.genres ?? []).map((genre) => genre.name)
  if (genres.length > 0) {
    parts.push(`${genres.join(', ')}.`)
  }
  parts.push(`${count} ${count === 1 ? 'lançamento' : 'lançamentos'} no catálogo.`)
  return {
    title: `${data.name} | Amplifica`,
    description: data.bio ? shorten(data.bio) : parts.join(' '),
    image: absolute(data.image?.large, origin),
    url: `${origin}${path}`,
  }
}

export function showTags(data: ShowData, origin: string, path: string): PageTags {
  const acts = data.acts.map((act) => act.name).join(', ')
  const headline = data.name ?? acts
  const when = `${longDate(data.date)}${data.startTime ? `, às ${data.startTime.replace(':', 'h')}` : ''}`
  const status = data.status === 'CANCELLED' ? ' Show cancelado.' : data.status === 'SOLD_OUT' ? ' Ingressos esgotados.' : ''
  return {
    title: `${headline}, ${data.city}/${data.state} | Amplifica`,
    description: `${data.name && acts ? `${acts}. ` : ''}${when}, no ${data.venue}, em ${data.city}/${data.state}.${status}`,
    image: absolute(data.poster?.large, origin),
    url: `${origin}${path}`,
  }
}

export function userTags(data: UserData, origin: string, path: string): PageTags {
  return {
    title: `${data.displayName} (@${data.username}) | Amplifica`,
    description: data.bio ? shorten(data.bio) : `Perfil de ${data.displayName} no Amplifica: avaliações, clipes descobertos e bandas favoritas.`,
    image: absolute(data.avatar?.large, origin),
    url: `${origin}${path}`,
  }
}

/** As meta tags de prévia, já escapadas. */
export function renderTags(tags: PageTags): string {
  const t = escapeHtml(tags.title)
  const d = escapeHtml(tags.description)
  const lines = [
    `<meta property="og:site_name" content="Amplifica" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:locale" content="pt_BR" />`,
    `<meta property="og:title" content="${t}" />`,
    `<meta property="og:description" content="${d}" />`,
    `<meta property="og:url" content="${escapeHtml(tags.url)}" />`,
    `<meta name="twitter:card" content="${tags.image ? 'summary_large_image' : 'summary'}" />`,
    `<meta name="twitter:title" content="${t}" />`,
    `<meta name="twitter:description" content="${d}" />`,
  ]
  if (tags.image) {
    lines.push(`<meta property="og:image" content="${escapeHtml(tags.image)}" />`, `<meta name="twitter:image" content="${escapeHtml(tags.image)}" />`)
  }
  return lines.join('\n    ')
}

/** Troca o título e a descrição do `index.html` e acrescenta as tags de prévia antes de </head>. */
export function injectTags(html: string, tags: PageTags): string {
  const title = escapeHtml(tags.title)
  const description = escapeHtml(tags.description)
  // Funções no lugar de strings: `$&` e parecidos no texto não podem virar padrões de troca.
  // As tags de prévia padrão do index.html saem, para a página não ficar com duas de cada.
  const withoutDefaults = html.replace(/[ \t]*<meta (?:property="og:|name="twitter:)[^>]*>\n?/g, '')
  const withTitle = withoutDefaults.replace(/<title>[^<]*<\/title>/, () => `<title>${title}</title>`)
  const withDescription = withTitle.replace(/<meta name="description"[^>]*>/, () => `<meta name="description" content="${description}" />`)
  return withDescription.replace('</head>', () => `    ${renderTags(tags)}\n  </head>`)
}
