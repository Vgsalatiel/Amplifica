import {
  artistTags,
  injectTags,
  matchTarget,
  releaseTags,
  showTags,
  staticTags,
  userTags,
  type ArtistData,
  type PageTags,
  type ReleaseData,
  type ShowData,
  type Target,
  type UserData,
} from './lib/og.ts'

/**
 * Função de borda da Netlify: devolve o `index.html` com as meta tags de prévia da página (disco,
 * artista, show, perfil ou página fixa; veja lib/og.ts). Páginas sem foto própria usam o cartão do site.
 * Se a API não responder rápido (ela hiberna no plano gratuito), a página sai com o cartão do site.
 */
const API_ORIGIN = (globalThis as { Deno?: { env: { get(name: string): string | undefined } } }).Deno?.env.get('API_ORIGIN') ?? 'https://amplifica.onrender.com'
const API_TIMEOUT_MS = 3000

interface EdgeContext {
  next: () => Promise<Response>
}

const ENDPOINTS: Record<Target['kind'], string> = { release: 'releases', artist: 'artists', show: 'shows', user: 'users' }

function dynamicTags(target: Target, data: unknown, origin: string, path: string): PageTags {
  switch (target.kind) {
    case 'release':
      return releaseTags(data as ReleaseData, origin, path)
    case 'artist':
      return artistTags(data as ArtistData, origin, path)
    case 'show':
      return showTags(data as ShowData, origin, path)
    case 'user':
      return userTags(data as UserData, origin, path)
  }
}

export default async function handler(request: Request, context: EdgeContext): Promise<Response> {
  const response = await context.next()
  const url = new URL(request.url)
  if (request.method !== 'GET' || !(response.headers.get('content-type') ?? '').includes('text/html')) {
    return response
  }

  // Sem foto própria, o cartão usa a imagem do site.
  const withImage = (tags: PageTags): PageTags => ({ ...tags, image: tags.image ?? `${url.origin}/og-image.png` })
  const target = matchTarget(url.pathname)

  try {
    // Ponto de partida: o cartão do site. Se os dados da página chegarem, ele é trocado pelo da página.
    let tags = staticTags(url.pathname, url.origin)
    if (target) {
      try {
        const api = await fetch(`${API_ORIGIN}/api/v1/${ENDPOINTS[target.kind]}/${target.slug}`, {
          headers: { Accept: 'application/json' },
          signal: AbortSignal.timeout(API_TIMEOUT_MS),
        })
        if (api.ok) {
          // Uma resposta fora do formato esperado faz as funções acima lançarem erro e vale o cartão do site.
          tags = dynamicTags(target, await api.json(), url.origin, url.pathname)
        }
      } catch {
        // A API hiberna no plano gratuito: sem dados, a página sai com o cartão do site.
      }
    }
    const html = injectTags(await response.text(), withImage(tags))

    const headers = new Headers(response.headers)
    headers.delete('content-length')
    return new Response(html, { status: response.status, headers })
  } catch {
    // A prévia é um extra: qualquer falha cai no HTML normal.
    return response
  }
}

export const config = {
  path: '/*',
  // Só páginas: arquivos do site passam direto, sem esperar a função.
  excludedPath: ['/assets/*', '/historia/*', '/*.svg', '/*.png', '/*.jpg', '/*.webp', '/*.ico', '/*.txt', '/*.xml', '/*.json'],
}
