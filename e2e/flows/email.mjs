// Confirmação de e-mail e recuperação de senha, lendo os links no terminal da API (desenvolvimento).
export const name = 'confirmação de e-mail e senha'

export async function run(t, ctx) {
  const { check, waitFor, text, set, click, submit, goto, run: js, sleep } = t
  const album = `/lancamentos/${ctx.fixture.releases.coracao}`
  const A = ctx.newAccount('re')
  const NEW_PASSWORD = 'outra-senha-forte-789'
  const hasBanner = () => js('document.body.innerText.includes("Confirme seu e-mail para poder avaliar discos")')

  await goto('/cadastro')
  await set('Qual é o seu e-mail?', A.email); await click('Continuar')
  await set('Como você quer ser chamado?', A.username); await click('Continuar')
  await set('Agora, crie uma senha.', A.password); await submit()
  await waitFor('location.pathname.startsWith("/u/")', 'conta criada')
  check('depois do cadastro, o aviso de confirmação aparece no alto da página, com o e-mail', (await hasBanner()) && (await text()).includes(A.email))
  await goto(album)
  await waitFor('document.body.innerText.includes("Para avaliar, confirme seu e-mail")', 'pedido no disco')
  check('o formulário de nota não aparece enquanto o e-mail não é confirmado', (await js('document.querySelectorAll("input[type=radio]").length')) === 0)
  await t.shot('email-1-pendente')

  await click('Reenviar e-mail')
  await waitFor('document.body.innerText.includes("E-mail enviado")', 'confirmação do reenvio')
  const first = await ctx.emailLink(A.email, 'confirmar-email', 1)
  const second = await ctx.emailLink(A.email, 'confirmar-email', 2)
  check('cadastro e reenvio mandaram links diferentes', first !== second)

  await goto(first)
  await waitFor('document.body.innerText.includes("Não foi possível confirmar")', 'link anterior ao reenvio recusado')
  check('o link anterior ao reenvio é recusado e o token sai da barra de endereço', !(await t.path()).includes('token'))
  await goto(second)
  await waitFor('document.body.innerText.includes("E-mail confirmado")', 'e-mail confirmado')
  await sleep(500)
  check('depois de confirmar, o aviso do alto some', !(await hasBanner()))
  await t.shot('email-2-confirmado')
  await goto(second)
  await waitFor('document.body.innerText.includes("Não foi possível confirmar")', 'segundo uso recusado')
  check('o mesmo link, aberto de novo, é recusado', true)

  await goto(album)
  await waitFor('!!document.querySelector("textarea")', 'formulário liberado')
  await js('document.querySelector("input[aria-label=\\"Nota 8\\"]").click()')
  await click('Publicar avaliação')
  await waitFor('document.body.innerText.includes("Avaliação salva.")', 'avaliação salva')
  check('com o e-mail confirmado, a avaliação é aceita', true)

  // ------------------------------------------------ esqueci a senha
  await click('Sair')
  await waitFor('location.pathname === "/"', 'logout')
  await goto('/entrar')
  await click('Esqueci minha senha')
  await waitFor('location.pathname === "/esqueci-a-senha"', 'tela de esqueci a senha')
  await set('E-mail', A.email); await click('Enviar link')
  await waitFor('document.body.innerText.includes("Se existe uma conta com o e-mail")', 'confirmação do pedido')
  await t.shot('email-3-esqueci')
  const reset = await ctx.emailLink(A.email, 'redefinir-senha', 1)

  await goto('/esqueci-a-senha')
  await set('E-mail', `ninguem.${Date.now()}@e2e.amplifica.test`); await click('Enviar link')
  await waitFor('document.body.innerText.includes("Se existe uma conta com o e-mail")', 'resposta para e-mail sem conta')
  check('e-mail sem conta recebe exatamente a mesma resposta na tela', true)

  await goto(reset)
  await waitFor('!!__t.field("Nova senha")', 'tela da nova senha')
  check('o token sai da barra de endereço também aqui', !(await t.path()).includes('token'))
  await set('Nova senha', '123'); await submit()
  await waitFor('document.body.innerText.includes("pelo menos 8 caracteres")', 'senha fraca recusada')
  await set('Nova senha', NEW_PASSWORD); await submit()
  await waitFor('document.body.innerText.includes("desconectado de todos os aparelhos")', 'senha alterada')
  check('senha curta é recusada no campo sem gastar o link; a forte é aceita', true)
  await t.shot('email-4-senha-alterada')

  await goto('/entrar')
  await set('E-mail', A.email); await set('Senha', A.password); await submit()
  await waitFor('document.body.innerText.includes("E-mail ou senha incorretos")', 'senha antiga recusada')
  await set('Senha', NEW_PASSWORD); await submit()
  await waitFor('location.pathname !== "/entrar"', 'login com a senha nova')
  check('a senha antiga não entra mais e a nova entra', true)

  await t.fresh()
  await goto(reset)
  await waitFor('!!__t.field("Nova senha")', 'tela com o link já usado')
  await set('Nova senha', 'mais-uma-senha-123'); await submit()
  await waitFor('document.body.innerText.includes("Esse link venceu ou já foi usado")', 'link usado recusado')
  check('o link de redefinição já usado é recusado ao enviar e oferece pedir outro', (await text()).includes('Pedir novo link'))

  await t.viewport(390, 844, true)
  await goto('/esqueci-a-senha')
  check('celular: a tela de esqueci a senha não rola na horizontal', await js('document.documentElement.scrollWidth <= window.innerWidth'))
}
