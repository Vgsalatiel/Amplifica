import { describe, expect, it } from 'vitest'
import { artistTags, escapeHtml, injectTags, matchTarget, releaseTags, renderTags } from './og.ts'

const ORIGIN = 'https://amplificacore.netlify.app'
const release = {
  title: 'Sempiternal',
  type: 'ALBUM',
  releaseDate: '2013-03-29',
  cover: { large: 'https://pub-1.r2.dev/covers/x.webp' },
  rating: { average: 8.5, count: 12 },
  artists: [
    { name: 'Bring Me the Horizon', role: 'PRIMARY' },
    { name: 'Convidado', role: 'FEATURED' },
  ],
  tracks: [{}, {}, {}],
}
const page = '<!doctype html><html><head>\n    <title>Amplifica</title>\n    <meta name="description" content="Amplifica: descoberta." />\n  </head><body></body></html>'

describe('matchTarget', () => {
  it('reconhece disco e artista, com ou sem barra final', () => {
    expect(matchTarget('/lancamentos/bmth-sempiternal')).toEqual({ kind: 'release', slug: 'bmth-sempiternal' })
    expect(matchTarget('/artistas/bring-me-the-horizon/')).toEqual({ kind: 'artist', slug: 'bring-me-the-horizon' })
  })

  it('ignora a lista e qualquer outra rota ou slug estranho', () => {
    for (const path of ['/lancamentos', '/lancamentos/', '/artistas', '/buscar', '/lancamentos/a/b', '/lancamentos/../admin', '/lancamentos/A_B', '/u/ana']) {
      expect(matchTarget(path)).toBeNull()
    }
  })
})

describe('releaseTags', () => {
  it('monta título, descrição com nota e imagem da capa', () => {
    const tags = releaseTags(release, ORIGIN, '/lancamentos/x')
    expect(tags.title).toBe('Sempiternal, Bring Me the Horizon | Amplifica')
    expect(tags.description).toBe('Álbum de 2013. Nota 8,5 de 10 (12 avaliações). 3 faixas.')
    expect(tags.image).toBe('https://pub-1.r2.dev/covers/x.webp')
    expect(tags.url).toBe(`${ORIGIN}/lancamentos/x`)
  })

  it('sem avaliações, diz isso; sem faixas, não fala de faixas; singular com 1 avaliação', () => {
    expect(releaseTags({ ...release, rating: { average: null, count: 0 }, tracks: [] }, ORIGIN, '/x').description).toBe('Álbum de 2013. Ainda sem avaliações.')
    expect(releaseTags({ ...release, rating: { average: 7, count: 1 }, tracks: [{}] }, ORIGIN, '/x').description).toBe('Álbum de 2013. Nota 7 de 10 (1 avaliação). 1 faixa.')
  })

  it('sem capa não inventa imagem; capa relativa vira endereço completo', () => {
    expect(releaseTags({ ...release, cover: null }, ORIGIN, '/x').image).toBeNull()
    expect(releaseTags({ ...release, cover: { large: '/files/c.webp' } }, ORIGIN, '/x').image).toBe(`${ORIGIN}/files/c.webp`)
    expect(releaseTags({ ...release, cover: { large: 'javascript:alert(1)' } }, ORIGIN, '/x').image).toBeNull()
  })
})

describe('artistTags', () => {
  const artist = { name: 'Bring Me the Horizon', type: 'BAND', bio: null, country: 'GB', image: null, releases: [{}, {}] }

  it('sem bio, usa os fatos do artista', () => {
    expect(artistTags(artist, ORIGIN, '/artistas/x').description).toBe('Banda, GB. 2 lançamentos no catálogo.')
  })

  it('com bio, usa o começo dela, sem estourar o limite nem cortar palavra', () => {
    const bio = `${'palavra '.repeat(80)}fim`
    const { description } = artistTags({ ...artist, bio }, ORIGIN, '/artistas/x')
    expect(description.length).toBeLessThanOrEqual(200)
    expect(description.endsWith('…')).toBe(true)
    expect(description).not.toMatch(/palavr…$/)
  })
})

describe('escapeHtml e injectTags', () => {
  it('escapa os caracteres que quebrariam um atributo', () => {
    expect(escapeHtml(`<b onclick="x">&'`)).toBe('&lt;b onclick=&quot;x&quot;&gt;&amp;&#39;')
  })

  it('um título malicioso não escapa do atributo nem do <title>', () => {
    const tags = { title: '"><script>alert(1)</script>', description: '</title><script>x</script>', image: 'https://a/"onerror="x', url: ORIGIN }
    const html = injectTags(page, tags)

    expect(html).not.toContain('<script>')
    expect(html).not.toMatch(/content="[^"]*"onerror=/)
    expect(html).toContain('&lt;script&gt;')
  })

  it('troca título e descrição e acrescenta as tags antes de </head>, sem duplicar', () => {
    const html = injectTags(page, releaseTags(release, ORIGIN, '/lancamentos/x'))

    expect(html).toContain('<title>Sempiternal, Bring Me the Horizon | Amplifica</title>')
    expect(html.match(/<title>/g)).toHaveLength(1)
    expect(html.match(/name="description"/g)).toHaveLength(1)
    expect(html).toContain('<meta property="og:title" content="Sempiternal, Bring Me the Horizon | Amplifica" />')
    expect(html).toContain('<meta property="og:image" content="https://pub-1.r2.dev/covers/x.webp" />')
    expect(html.indexOf('og:title')).toBeLessThan(html.indexOf('</head>'))
  })

  it('textos com $& ou $1 não viram padrões de substituição', () => {
    const html = injectTags(page, { title: 'Preço $& $1', description: "US$' ok", image: null, url: ORIGIN })

    expect(html).toContain('<title>Preço $&amp; $1</title>')
    expect(html).toContain("content=\"US$&#39; ok\"")
  })

  it('sem imagem, usa o cartão pequeno e nenhuma tag de imagem', () => {
    const tags = renderTags({ title: 't', description: 'd', image: null, url: ORIGIN })

    expect(tags).toContain('twitter:card" content="summary"')
    expect(tags).not.toContain('og:image')
  })
})
