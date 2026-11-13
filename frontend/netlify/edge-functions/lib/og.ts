/**
 * Cartão de compartilhamento (Open Graph) das páginas de disco e de artista.
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

export type Target = { kind: 'release' | 'artist'; slug: string }

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

/** Reconhece /lancamentos/:slug e /artistas/:slug (e só eles). */
export function matchTarget(pathname: string): Target | null {
  const match = /^\/(lancamentos|artistas)\/([a-z0-9]+(?:-[a-z0-9]+)*)\/?$/.exec(pathname)
  if (!match) {
    return null
  }
  return { kind: match[1] === 'lancamentos' ? 'release' : 'artist', slug: match[2] }
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
  image: { large: string } | null
  releases: unknown[]
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
  const facts = `${kind}${data.country ? `, ${data.country}` : ''}. ${count} ${count === 1 ? 'lançamento' : 'lançamentos'} no catálogo.`
  return {
    title: `${data.name} | Amplifica`,
    description: data.bio ? shorten(data.bio) : facts,
    image: absolute(data.image?.large, origin),
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
  const withTitle = html.replace(/<title>[^<]*<\/title>/, () => `<title>${title}</title>`)
  const withDescription = withTitle.replace(/<meta name="description"[^>]*>/, () => `<meta name="description" content="${description}" />`)
  return withDescription.replace('</head>', () => `    ${renderTags(tags)}\n  </head>`)
}
