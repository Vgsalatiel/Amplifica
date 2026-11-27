import { afterEach, describe, expect, it, vi } from 'vitest'
import handler from '../edge-functions/og.ts'

const HTML = '<html><head><title>Amplifica</title><meta name="description" content="x" /></head><body>app</body></html>'
const next = () => Promise.resolve(new Response(HTML, { headers: { 'content-type': 'text/html; charset=utf-8', 'content-length': String(HTML.length) } }))
const ask = (path: string, method = 'GET') => handler(new Request(`https://amplificacore.netlify.app${path}`, { method }), { next })

const releaseJson = {
  title: 'Sempiternal',
  type: 'ALBUM',
  releaseDate: '2013-03-29',
  cover: null,
  rating: { average: 9, count: 2 },
  artists: [{ name: 'BMTH', role: 'PRIMARY' }],
  tracks: [],
}

afterEach(() => vi.unstubAllGlobals())

describe('função de borda og', () => {
  it('injeta a prévia na página de um disco, buscando os dados na API', async () => {
    const fetchMock = vi.fn(() => Promise.resolve(new Response(JSON.stringify(releaseJson))))
    vi.stubGlobal('fetch', fetchMock)

    const response = await ask('/lancamentos/bmth-sempiternal')
    const html = await response.text()

    expect(fetchMock.mock.calls[0]).toEqual(expect.arrayContaining(['https://amplifica.onrender.com/api/v1/releases/bmth-sempiternal']))
    expect(html).toContain('og:title" content="Sempiternal, BMTH | Amplifica"')
    expect(html).toContain('<body>app</body>')
    expect(response.headers.get('content-length')).toBeNull()
  })

  it('se a API falhar, demorar ou não achar a página, entrega o cartão do site (com a imagem padrão)', async () => {
    for (const failing of [
      () => Promise.reject(new Error('timeout')),
      () => Promise.resolve(new Response('{}', { status: 404 })),
      () => Promise.resolve(new Response('não é json', { status: 200 })),
    ]) {
      vi.stubGlobal('fetch', vi.fn(failing))
      const html = await (await ask('/lancamentos/x')).text()
      expect(html).toContain('og:title" content="Amplifica | Descoberta musical e comunidade de rock"')
      expect(html).toContain('og:image" content="https://amplificacore.netlify.app/og-image.png"')
      expect(html).toContain('<body>app</body>')
    }
  })

  it('páginas fixas e rotas desconhecidas saem com o cartão do site, sem chamar a API', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    const html = await (await ask('/shows')).text()
    expect(html).toContain('<title>Shows | Amplifica</title>')
    expect(html).toContain('og:image" content="https://amplificacore.netlify.app/og-image.png"')
    expect(await (await ask('/pagina-que-nao-existe')).text()).toContain('og:title')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('show e perfil buscam na API certa e usam a imagem padrão quando não têm foto', async () => {
    const fetchMock = vi.fn((input: string) =>
      Promise.resolve(
        new Response(
          JSON.stringify(
            input.includes('/shows/')
              ? { name: null, date: '2027-03-05', startTime: null, venue: 'V', city: 'C', state: 'SP', poster: null, acts: [{ name: 'Banda X' }] }
              : { username: 'ana', displayName: 'Ana', bio: null, avatar: null },
          ),
        ),
      ),
    )
    vi.stubGlobal('fetch', fetchMock)

    const show = await (await ask('/shows/banda-x-c')).text()
    expect(show).toContain('<title>Banda X, C/SP | Amplifica</title>')
    const user = await (await ask('/u/ana')).text()
    expect(user).toContain('<title>Ana (@ana) | Amplifica</title>')
    expect(user).toContain('og:image" content="https://amplificacore.netlify.app/og-image.png"')
    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      'https://amplifica.onrender.com/api/v1/shows/banda-x-c',
      'https://amplifica.onrender.com/api/v1/users/ana',
    ])
  })

  it('não toca em métodos que não são GET nem em respostas que não são HTML, e nem chama a API', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    const json = () => Promise.resolve(new Response('{}', { headers: { 'content-type': 'application/json' } }))

    expect(await (await ask('/lancamentos/x', 'POST')).text()).toBe(HTML)
    expect(await (await handler(new Request('https://amplificacore.netlify.app/lancamentos/x'), { next: json })).text()).toBe('{}')
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
