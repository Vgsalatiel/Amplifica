import { describe, expect, it } from 'vitest'
import { artistTags, countryName, escapeHtml, injectTags, matchTarget, releaseTags, renderTags, showTags, staticTags, userTags } from '../edge-functions/lib/og.ts'

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

  it('reconhece show e perfil', () => {
    expect(matchTarget('/shows/motionless-in-white-sao-paulo')).toEqual({ kind: 'show', slug: 'motionless-in-white-sao-paulo' })
    expect(matchTarget('/u/marina.fz')).toEqual({ kind: 'user', slug: 'marina.fz' })
  })

  it('ignora a lista e qualquer outra rota ou slug estranho', () => {
    for (const path of ['/lancamentos', '/lancamentos/', '/artistas', '/shows', '/buscar', '/lancamentos/a/b', '/lancamentos/../admin', '/lancamentos/A_B', '/u/', '/u/A B', '/u/a/b']) {
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

  it('sem bio, usa os fatos do artista: lugar, ano, gêneros e quantos discos', () => {
    expect(artistTags(artist, ORIGIN, '/artistas/x').description).toBe('Banda, Reino Unido. 2 lançamentos no catálogo.')
    const full = { ...artist, city: 'Sheffield', formedYear: 2004, genres: [{ name: 'Metalcore' }, { name: 'Post-hardcore' }] }
    expect(artistTags(full, ORIGIN, '/artistas/x').description).toBe(
      'Banda, Sheffield, Reino Unido, desde 2004. Metalcore, Post-hardcore. 2 lançamentos no catálogo.',
    )
  })

  it('countryName escreve o país em português e devolve o código se não souber', () => {
    expect(countryName('BR')).toBe('Brasil')
    expect(countryName('us')).toBe('Estados Unidos')
    expect(countryName('??')).toBe('??')
  })

  it('com bio, usa o começo dela, sem estourar o limite nem cortar palavra', () => {
    const bio = `${'palavra '.repeat(80)}fim`
    const { description } = artistTags({ ...artist, bio }, ORIGIN, '/artistas/x')
    expect(description.length).toBeLessThanOrEqual(200)
    expect(description.endsWith('…')).toBe(true)
    expect(description).not.toMatch(/palavr…$/)
  })
})

describe('showTags', () => {
  const show = {
    name: null,
    date: '2027-03-05',
    startTime: '22:00',
    venue: 'Espaço Unimed',
    city: 'São Paulo',
    state: 'SP',
    status: 'CONFIRMED',
    poster: null,
    acts: [{ name: 'Motionless In White' }],
  }

  it('monta título e descrição com a atração, a data por extenso, o horário e o local', () => {
    const tags = showTags(show, ORIGIN, '/shows/x')
    expect(tags.title).toBe('Motionless In White, São Paulo/SP | Amplifica')
    expect(tags.description).toBe('5 de março de 2027, às 22h00, no Espaço Unimed, em São Paulo/SP.')
  })

  it('evento com nome lista as atrações; esgotado e cancelado são avisados; sem horário não inventa', () => {
    const tags = showTags({ ...show, name: 'Festival X', startTime: null, status: 'SOLD_OUT', acts: [{ name: 'A' }, { name: 'B' }] }, ORIGIN, '/shows/x')
    expect(tags.title).toBe('Festival X, São Paulo/SP | Amplifica')
    expect(tags.description).toBe('A, B. 5 de março de 2027, no Espaço Unimed, em São Paulo/SP. Ingressos esgotados.')
    expect(showTags({ ...show, status: 'CANCELLED' }, ORIGIN, '/s').description).toMatch(/Show cancelado\.$/)
  })

  it('usa o pôster como imagem quando existe', () => {
    expect(showTags({ ...show, poster: { large: 'https://r2/p.webp' } }, ORIGIN, '/s').image).toBe('https://r2/p.webp')
  })
})

describe('userTags', () => {
  it('usa a bio ou um texto padrão, e o avatar como imagem', () => {
    const user = { username: 'marina.fz', displayName: 'Marina F.', bio: null, avatar: { large: 'https://r2/a.webp' } }
    expect(userTags(user, ORIGIN, '/u/marina.fz')).toMatchObject({
      title: 'Marina F. (@marina.fz) | Amplifica',
      description: 'Perfil de Marina F. no Amplifica: avaliações, clipes descobertos e bandas favoritas.',
      image: 'https://r2/a.webp',
    })
    expect(userTags({ ...user, bio: 'Ouço emo desde 2005.', avatar: null }, ORIGIN, '/u/x').description).toBe('Ouço emo desde 2005.')
  })
})

describe('staticTags', () => {
  it('páginas fixas têm cartão próprio; qualquer outra rota fica com o do site', () => {
    expect(staticTags('/shows', ORIGIN).title).toBe('Shows | Amplifica')
    expect(staticTags('/cena-br/historia/', ORIGIN)).toMatchObject({ title: 'História da cena BR | Amplifica', url: `${ORIGIN}/cena-br/historia` })
    expect(staticTags('/qualquer-coisa', ORIGIN).title).toBe('Amplifica | Descoberta musical e comunidade de rock')
    expect(staticTags('/', ORIGIN).url).toBe(`${ORIGIN}/`)
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

  it('tira as tags de prévia padrão do index.html: cada uma aparece uma vez só', () => {
    const withDefaults = page.replace('</head>', '    <meta property="og:title" content="Padrão" />\n    <meta name="twitter:card" content="summary_large_image" />\n  </head>')
    const html = injectTags(withDefaults, releaseTags(release, ORIGIN, '/lancamentos/x'))

    expect(html.match(/og:title/g)).toHaveLength(1)
    expect(html.match(/twitter:card/g)).toHaveLength(1)
    expect(html).not.toContain('Padrão')
  })

  it('sem imagem, usa o cartão pequeno e nenhuma tag de imagem', () => {
    const tags = renderTags({ title: 't', description: 'd', image: null, url: ORIGIN })

    expect(tags).toContain('twitter:card" content="summary"')
    expect(tags).not.toContain('og:image')
  })
})
