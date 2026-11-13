// Avaliações: nota, resenha, média, edição, perfil, exclusão e moderação por administrador.
export const name = 'avaliações'

export async function run(t, ctx) {
  const { check, waitFor, text, set, click, submit, goto, run: js, sleep } = t
  const slug = ctx.fixture.releases.coracao
  const album = `/lancamentos/${slug}`
  const A = ctx.newAccount('ra')
  const B = ctx.newAccount('rb')
  const summary = () => js(`(() => { const t = document.querySelector('main').innerText; return { avg: (t.match(/(\\d+(?:,\\d)?)\\s*de 10/) || [])[1] ?? null, count: (t.match(/(\\d+) avalia(?:ção|ções)/) || [])[1] ?? null } })()`)
  const radio = (n) => `document.querySelector('input[aria-label="Nota ${n}"]')`
  const reviewItems = () => js('document.querySelectorAll("section[aria-labelledby=resenhas-titulo] li").length')

  // B avalia pela API; o visitante só lê.
  const regB = await ctx.register(B)
  await ctx.verifyViaApi(B.email)
  await ctx.api(`/releases/${slug}/reviews/me`, { method: 'PUT', token: regB.accessToken, body: { rating: 4, body: 'Esperava mais.' } })

  await goto(album)
  await waitFor('document.body.innerText.includes("Esperava mais.")', 'resenha de B na lista')
  let s = await summary()
  check('visitante: média 4 de 10 com 1 avaliação', s.avg === '4' && s.count === '1', JSON.stringify(s))
  check('visitante: convite para criar conta e nenhum formulário', (await text()).includes('Criar conta') && (await js('!document.querySelector("textarea")')))
  await t.shot('reviews-1-visitante')

  // A cria a conta a partir do disco e volta a ele.
  await js('document.querySelector("section[aria-labelledby=avaliacao-titulo] a[href=\\"/cadastro\\"]").click()')
  await waitFor('location.pathname === "/cadastro"', 'cadastro')
  await set('Qual é o seu e-mail?', A.email); await click('Continuar')
  await set('Como você quer ser chamado?', A.username); await click('Continuar')
  await set('Agora, crie uma senha.', A.password); await submit()
  await waitFor(`location.pathname === "${album}"`, 'voltar ao disco depois do cadastro')
  await waitFor('document.body.innerText.includes("Para avaliar, confirme seu e-mail")', 'pedido de confirmação')
  check('conta nova volta ao disco e vê o pedido de confirmação, sem formulário', (await js('document.querySelectorAll("input[type=radio]").length')) === 0)

  await goto(await ctx.emailLink(A.email, 'confirmar-email'))
  await waitFor('document.body.innerText.includes("E-mail confirmado")', 'e-mail confirmado')
  await goto(album)
  await waitFor('!!document.querySelector("textarea")', 'formulário de avaliação')
  check('logada: 10 notas e o botão Publicar', (await js('document.querySelectorAll("input[type=radio]").length')) === 10 && (await text()).includes('Publicar avaliação'))
  await click('Publicar avaliação'); await sleep(300)
  check('sem escolher a nota, explica o motivo', (await text()).includes('Escolha uma nota de 1 a 10.'))

  await js(`${radio(9)}.click()`)
  await js(`__t.setValue(document.querySelector('textarea'), 'Disco que mudou a banda.\\nSegunda linha.')`)
  await click('Publicar avaliação')
  await waitFor('document.body.innerText.includes("Avaliação salva.")', 'confirmação de salvamento')
  await waitFor('document.body.innerText.includes("2 avaliações")', 'média atualizada')
  s = await summary()
  check('média vira 6,5 com 2 avaliações', s.avg === '6,5' && s.count === '2', JSON.stringify(s))
  check('a resenha de A aparece na lista, com a quebra de linha', (await reviewItems()) === 2 && (await js('getComputedStyle(document.querySelector("section[aria-labelledby=resenhas-titulo] p.whitespace-pre-line")).whiteSpace.startsWith("pre-line")')))
  await t.shot('reviews-2-avaliou')

  await goto(album)
  await waitFor('document.querySelector("textarea") && document.querySelector("textarea").value.length > 0', 'formulário preenchido ao recarregar')
  check('ao recarregar, a nota 9 e o texto voltam preenchidos', await js(`${radio(9)}.checked`))

  // Teclado: setas mudam a nota, como em qualquer grupo de botões de rádio.
  await js(`${radio(9)}.focus()`)
  for (const key of ['ArrowLeft', 'ArrowLeft']) {
    await t.send('Input.dispatchKeyEvent', { type: 'keyDown', key, code: key })
    await t.send('Input.dispatchKeyEvent', { type: 'keyUp', key, code: key })
  }
  await sleep(200)
  check('teclado: duas setas para a esquerda levam de 9 a 7', await js(`${radio(7)}.checked`))
  await click('Salvar alterações')
  await waitFor('/5,5\\s*de 10/.test(document.querySelector("main").innerText)', 'média 5,5 depois de editar')
  check('editar para 7 muda a média para 5,5, ainda com 2 avaliações', (await summary()).count === '2')

  await goto(`/u/${A.username}`)
  await waitFor('document.body.innerText.includes("7/10")', 'avaliação no perfil')
  check('perfil: mostra o disco, a nota e o texto', (await text()).includes('Disco que mudou a banda.'))
  await t.shot('reviews-3-perfil')

  // A apaga a própria avaliação.
  await goto(album)
  await waitFor('document.querySelector("textarea") && document.querySelector("textarea").value.length > 0', 'formulário preenchido')
  await click('Excluir')
  await waitFor('document.body.innerText.includes("Não dá para desfazer")', 'confirmação')
  await click('Sim, excluir')
  await waitFor('document.body.innerText.includes("1 avaliação") && !document.body.innerText.includes("2 avaliações")', 'média refeita')
  await waitFor('document.body.innerText.includes("Publicar avaliação")', 'formulário vazio de novo')
  check('apagar volta a média a 4 e deixa o formulário vazio', (await summary()).avg === '4' && (await js('document.querySelector("textarea").value')) === '' && (await js('document.querySelectorAll("input[type=radio]:checked").length')) === 0)

  // Administrador remove a resenha de outra pessoa.
  const admin = ctx.newAccount('rm')
  await ctx.register(admin)
  await ctx.promoteAdmin(admin.email)
  await t.fresh()
  await goto('/entrar')
  await set('E-mail', admin.email); await set('Senha', admin.password); await submit()
  await waitFor('location.pathname !== "/entrar"', 'login do administrador')
  await goto(album)
  await waitFor('document.body.innerText.includes("Esperava mais.")', 'resenha de B')
  await sleep(500)
  check('administrador vê o botão de remover na resenha de outra pessoa', await js('!!document.querySelector("section[aria-labelledby=resenhas-titulo] button")'))
  await js('document.querySelector("section[aria-labelledby=resenhas-titulo] button").click()')
  await waitFor('document.body.innerText.includes("Excluir a avaliação de")', 'confirmação de moderação')
  await js('[...document.querySelectorAll("section[aria-labelledby=resenhas-titulo] button")].find((b) => b.textContent.trim() === "Sim, excluir").click()')
  await waitFor('document.body.innerText.includes("Ninguém avaliou este disco ainda")', 'disco sem avaliações')
  check('depois da moderação, o disco volta a não ter avaliações', (await text()).includes('Ainda não há resenhas escritas'))

  await t.viewport(390, 844, true)
  await goto(album)
  check('celular: a página do disco não rola na horizontal', await js('document.documentElement.scrollWidth <= window.innerWidth'))
  await t.shot('reviews-4-celular', 390)
}
