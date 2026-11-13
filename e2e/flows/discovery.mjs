// Descoberta: busca sem acento, filtros e ordem na lista de lançamentos, nota nos cartões e cabeçalho responsivo.
export const name = 'descoberta'

export async function run(t, ctx) {
  const { check, waitFor, text, goto, run: js, sleep } = t
  const { releases } = ctx.fixture
  const cards = () => js('[...document.querySelectorAll("main ul li a[href^=\\"/lancamentos/\\"]")].map((a) => a.innerText.replace(/\\s+/g, " ").trim())')
  const loc = () => js('location.pathname + location.search')
  const searchFor = (value, selector = 'header input[type=search]') =>
    js(`(() => { const el = document.querySelector(${JSON.stringify(selector)}); __t.setValue(el, ${JSON.stringify(value)}); el.form.requestSubmit() })()`)
  const choose = (label, value) => js(`(() => { const l = [...document.querySelectorAll('label')].find((x) => x.textContent.trim() === ${JSON.stringify(label)}); __t.setValue(l.control, ${JSON.stringify(value)}) })()`)

  // Duas pessoas avaliam: Coração Elétrico fica com 9 e 7 (média 8) e Manhã de Domingo com 5.
  const raters = []
  for (const prefix of ['da', 'db']) {
    const account = ctx.newAccount(prefix)
    const session = await ctx.register(account)
    await ctx.verifyViaApi(account.email)
    raters.push(session.accessToken)
  }
  const rate = (token, slug, rating) => ctx.api(`/releases/${slug}/reviews/me`, { method: 'PUT', token, body: { rating } })
  await rate(raters[0], releases.coracao, 9)
  await rate(raters[1], releases.coracao, 7)
  await rate(raters[0], releases.manha, 5)

  // ------------------------------------------------ busca do cabeçalho
  await goto('/')
  await waitFor('!!document.querySelector("header input[type=search]")', 'cabeçalho')
  check('o cabeçalho tem a caixa de busca e o link Lançamentos', await js('!!document.querySelector("header a[href=\\"/lancamentos\\"]")'))

  await searchFor('sofía')
  await waitFor('location.pathname === "/buscar"', 'ir à busca')
  await waitFor('document.body.innerText.includes("Lançamentos (")', 'resultados')
  let page = await text()
  check('busca com acento diferente acha o artista e os dois discos dele', page.includes('Artistas (1)') && page.includes('Lançamentos (2)'))
  check('o campo do cabeçalho mostra o que foi buscado', (await js('document.querySelector("header input[type=search]").value')) === 'sofía')
  await t.shot('discovery-1-busca')

  await searchFor('CORACAO eletrico')
  await waitFor('document.body.innerText.includes("Lançamentos (1)")', 'busca por título')
  page = await text()
  check('busca por título, sem acento e sem maiúsculas, acha o disco e não traz artistas', page.includes('Coração Elétrico') && !page.includes('Artistas ('))

  for (const term of ['xyzzy', '100%']) {
    await searchFor(term)
    await waitFor(`document.body.innerText.includes("Nada encontrado para “${term}”")`, `sem resultado para ${term}`)
  }
  check('busca sem resultado explica; % não vira curinga', true)

  // ------------------------------------------------ lista, nota e ordem
  await goto('/lancamentos?q=e2e')
  await waitFor('document.body.innerText.includes("4 lançamentos")', 'lista dos discos de teste')
  let list = await cards()
  check('lista os 4 discos, do mais recente ao mais antigo', list.length === 4 && list[0].startsWith('Cem% Verdade_Absoluta') && list[3].startsWith('Coração Elétrico'), JSON.stringify(list.map((c) => c.split(' E2E')[0])))
  // O texto do cartão termina em "<ano> <nota>" quando há nota, e só em "<ano>" quando não há.
  const ratingOf = (title) => (list.find((c) => c.startsWith(title)).match(/, \d{4} (\d+)$/) || [])[1] ?? null
  check('os cartões mostram a nota só de quem já foi avaliado', ratingOf('Coração Elétrico') === '8' && ratingOf('Manhã') === '5' && ratingOf('Pequeno') === null && ratingOf('Cem%') === null, JSON.stringify(list))
  await t.shot('discovery-2-lista')

  await choose('Ordenar por', 'rating')
  await waitFor('location.search.includes("sort=rating")', 'ordem por nota na URL')
  await waitFor('document.querySelector("main ul li a").innerText.startsWith("Coração")', 'ordem por nota')
  list = await cards()
  check('ordem por nota: 8, depois 5, e os sem nota por último (do mais recente ao mais antigo)', list[0].startsWith('Coração') && list[1].startsWith('Manhã') && list[2].startsWith('Cem%') && list[3].startsWith('Pequeno'), JSON.stringify(list.map((c) => c.split(' E2E')[0])))
  await t.shot('discovery-3-por-nota')

  await choose('Tipo', 'EP')
  await waitFor('document.body.innerText.includes("1 lançamento")', 'filtro por tipo')
  check('tipo EP: 1 disco, e a URL guarda os filtros', (await cards()).length === 1 && (await loc()).includes('type=EP') && (await loc()).includes('sort=rating'), await loc())

  await goto('/lancamentos?q=e2e&year=2013')
  await waitFor('document.body.innerText.includes("2 lançamentos")', 'filtro por ano')
  check('ano 2013: 2 discos, e o campo Ano vem preenchido', (await cards()).length === 2 && (await js('__t.field("Ano").value')) === '2013')

  await goto('/lancamentos?q=e2e&genre=e2e-metal')
  await waitFor('document.body.innerText.includes("2 lançamentos")', 'gênero com subgêneros')
  check('gênero pai inclui os discos dos subgêneros', (await cards()).every((c) => c.startsWith('Coração') || c.startsWith('Pequeno')))

  await goto('/lancamentos?q=e2e&genre=e2e-vazio')
  await waitFor('document.body.innerText.includes("Nenhum lançamento encontrado")', 'gênero sem discos')
  await t.click('Limpar filtros')
  await waitFor('document.body.innerText.includes("4 lançamentos") || location.search === ""', 'filtros limpos')
  check('"Limpar filtros" tira os filtros da URL', !(await loc()).includes('genre'))

  await goto('/lancamentos')
  await waitFor('!!__t.field("Ano")', 'filtros')
  await t.set('Ano', '13'); await t.click('Aplicar'); await sleep(300)
  check('ano inválido é explicado no campo, sem mudar a lista', (await text()).includes('Digite um ano com 4 dígitos') && (await t.path()) === '/lancamentos')

  // ------------------------------------------------ cabeçalho responsivo
  for (const [width, inline] of [[820, false], [1024, false], [1279, false], [1280, true]]) {
    await t.viewport(width)
    await goto('/lancamentos')
    const h = await js('document.querySelector("header").getBoundingClientRect().height')
    const noScroll = await js('document.documentElement.scrollWidth <= window.innerWidth')
    const menuButton = await js('getComputedStyle(document.querySelector("button[aria-controls=menu-celular]")).display !== "none"')
    const searchWidth = await js('document.querySelector("header input[type=search]").getBoundingClientRect().width')
    const nothingCut = await js('[...document.querySelectorAll("header a, header button")].filter((e) => e.offsetParent).every((e) => e.getBoundingClientRect().right <= window.innerWidth)')
    check(`${width}px: ${inline ? 'menu completo na linha, busca com largura útil' : 'menu de hambúrguer'}, nada cortado, sem rolagem horizontal`, noScroll && nothingCut && h < 90 && (inline ? !menuButton && searchWidth >= 150 : menuButton), `altura ${Math.round(h)}, busca ${Math.round(searchWidth)}px`)
  }
  await t.viewport(390, 844, true)
  await goto('/lancamentos')
  await js('document.querySelector("button[aria-controls=menu-celular]").click()')
  await sleep(300)
  check('celular: o menu tem a caixa de busca', await js('!!document.querySelector("#menu-celular input[type=search]")'))
  await searchFor('sofia', '#menu-celular input[type=search]')
  await waitFor('location.pathname === "/buscar"', 'busca pelo menu do celular')
  await sleep(400)
  check('celular: buscar fecha o menu e mostra os resultados', (await text()).includes('Sôfia') && !(await js('!!document.querySelector("#menu-celular")')))
  await t.shot('discovery-4-celular', 390)
}
