import { afterEach, describe, expect, it, vi } from 'vitest'
import handler from './og.ts'

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

  it('se a API falhar, demorar ou não achar o disco, devolve o HTML original', async () => {
    for (const failing of [
      () => Promise.reject(new Error('timeout')),
      () => Promise.resolve(new Response('{}', { status: 404 })),
      () => Promise.resolve(new Response('não é json', { status: 200 })),
    ]) {
      vi.stubGlobal('fetch', vi.fn(failing))
      const html = await (await ask('/lancamentos/x')).text()
      expect(html).toBe(HTML)
    }
  })

  it('não toca em outras rotas nem em métodos que não são GET, e nem chama a API', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    expect(await (await ask('/lancamentos')).text()).toBe(HTML)
    expect(await (await ask('/lancamentos/x', 'POST')).text()).toBe(HTML)
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
