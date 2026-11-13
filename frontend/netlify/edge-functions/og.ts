import { artistTags, injectTags, matchTarget, releaseTags, type ArtistData, type ReleaseData } from './lib/og.ts'

/**
 * Função de borda da Netlify: devolve o `index.html` com as meta tags de prévia do disco ou
 * do artista (veja lib/og.ts). Se a API não responder rápido (ela hiberna no plano gratuito),
 * entrega o HTML original sem alteração: a página funciona do mesmo jeito, só sem prévia.
 */
const API_ORIGIN = (globalThis as { Deno?: { env: { get(name: string): string | undefined } } }).Deno?.env.get('API_ORIGIN') ?? 'https://amplifica.onrender.com'
const API_TIMEOUT_MS = 3000

interface EdgeContext {
  next: () => Promise<Response>
}

export default async function handler(request: Request, context: EdgeContext): Promise<Response> {
  const response = await context.next()
  const url = new URL(request.url)
  const target = matchTarget(url.pathname)
  if (request.method !== 'GET' || !target || !(response.headers.get('content-type') ?? '').includes('text/html')) {
    return response
  }

  try {
    const endpoint = target.kind === 'release' ? 'releases' : 'artists'
    const api = await fetch(`${API_ORIGIN}/api/v1/${endpoint}/${target.slug}`, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(API_TIMEOUT_MS),
    })
    if (!api.ok) {
      return response
    }
    // Uma resposta fora do formato esperado faz as funções abaixo lançarem erro, e o catch devolve o HTML original.
    const data: unknown = await api.json()
    const tags =
      target.kind === 'release'
        ? releaseTags(data as ReleaseData, url.origin, url.pathname)
        : artistTags(data as ArtistData, url.origin, url.pathname)
    const html = injectTags(await response.text(), tags)

    const headers = new Headers(response.headers)
    headers.delete('content-length')
    return new Response(html, { status: response.status, headers })
  } catch {
    // A prévia é um extra: qualquer falha cai no HTML normal.
    return response
  }
}

export const config = { path: ['/lancamentos/*', '/artistas/*'] }
