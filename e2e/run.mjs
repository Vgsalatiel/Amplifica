#!/usr/bin/env node
// Testes de fluxo no navegador: sobe a API e o site, abre um Chrome real e percorre o que uma pessoa faz.
//
//   cd e2e && node run.mjs [--skip-build] [--only=reviews,discovery,email]
//
// Usa o banco do backend/.env (como `npm run test:e2e`), com dados próprios: contas
// @e2e.amplifica.test e itens "e2e-...", que são apagados no começo e no fim. Nunca envia e-mails
// de verdade nem grava imagens no bucket: essas variáveis são esvaziadas no processo da API.
import { spawn, spawnSync } from 'node:child_process'
import { closeSync, existsSync, mkdirSync, mkdtempSync, openSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { createServer } from 'node:net'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { connect } from './lib/cdp.mjs'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const BACKEND = join(ROOT, 'backend')
const FRONTEND = join(ROOT, 'frontend')
const OUT = join(ROOT, 'e2e', 'out')
const PORTS = { api: 3100, site: 5191, chrome: 9333 }
const SITE = `http://localhost:${PORTS.site}`
const API = `http://localhost:${PORTS.api}`
const PASSWORD = 'senha-de-teste-123'

const args = process.argv.slice(2)
const skipBuild = args.includes('--skip-build')
const only = args.find((a) => a.startsWith('--only='))?.slice(7).split(',')
const FLOWS = ['reviews', 'discovery', 'email']

if (Number(process.versions.node.split('.')[0]) < 24) {
  console.error(`Use o Node 24 (nvm use). Versão atual: ${process.version}.`)
  process.exit(2)
}
if (!existsSync(join(BACKEND, '.env')) && !process.env.DATABASE_URL) {
  console.error('Falta o backend/.env, ou as variáveis DATABASE_URL e JWT_ACCESS_SECRET no ambiente (veja o README).')
  process.exit(2)
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
const children = []
let tempProfile = null

function portFree(port) {
  return new Promise((resolve) => {
    const server = createServer()
    server.once('error', () => resolve(false))
    server.once('listening', () => server.close(() => resolve(true)))
    server.listen(port, '127.0.0.1')
  })
}

async function waitUntil(check, what, timeout = 60000) {
  const started = Date.now()
  while (Date.now() - started < timeout) {
    try {
      if (await check()) return
    } catch {
      /* ainda subindo */
    }
    await sleep(300)
  }
  throw new Error(`Tempo esgotado esperando: ${what}`)
}

function npm(cwd, ...rest) {
  const result = spawnSync('npm', rest, { cwd, stdio: 'inherit' })
  if (result.status !== 0) {
    throw new Error(`npm ${rest.join(' ')} falhou em ${cwd}`)
  }
}

/** Roda um trecho com o Prisma do backend (para o que a API não oferece: promover admin, limpar testes). */
function inBackend(code) {
  const result = spawnSync(process.execPath, ['--disable-warning=all', '--input-type=module', '-e', `
    import 'dotenv/config';
    import { PrismaPg } from '@prisma/adapter-pg';
    const { PrismaClient } = await import(process.cwd() + '/dist/generated/prisma/client.js');
    const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
    try { ${code} } finally { await prisma.$disconnect(); }
  `], { cwd: BACKEND, encoding: 'utf8' })
  if (result.status !== 0) {
    throw new Error(`Falha no banco: ${result.stderr.split('\n').find((l) => l.trim()) ?? result.stderr}`)
  }
  return result.stdout.trim()
}

/** Apaga o que os testes criaram: contas @e2e.amplifica.test e itens com endereço "e2e-...". */
function cleanup() {
  return inBackend(`
    const slug = { startsWith: 'e2e-' };
    await prisma.release.deleteMany({ where: { slug } });
    await prisma.artist.deleteMany({ where: { slug } });
    await prisma.genre.updateMany({ where: { slug }, data: { parentId: null } });
    await prisma.genre.deleteMany({ where: { slug } });
    const users = await prisma.user.findMany({ where: { email: { endsWith: '@e2e.amplifica.test' } }, select: { id: true } });
    const ids = users.map((u) => u.id);
    await prisma.refreshToken.deleteMany({ where: { userId: { in: ids } } });
    const r = await prisma.user.deleteMany({ where: { id: { in: ids } } });
    console.log(r.count);
  `)
}

function start(command, argv, options) {
  const child = spawn(command, argv, options)
  children.push(child)
  return child
}

async function shutdown() {
  for (const child of children) {
    child.kill('SIGTERM')
  }
  await sleep(500)
  if (tempProfile) {
    rmSync(tempProfile, { recursive: true, force: true })
  }
}

function chromeBinary() {
  for (const name of [process.env.CHROME_BIN, 'google-chrome', 'google-chrome-stable', 'chromium', 'chromium-browser']) {
    if (name && spawnSync('which', [name]).status === 0) return name
  }
  throw new Error('Chrome não encontrado. Instale o Chrome/Chromium ou defina CHROME_BIN.')
}

async function main() {
  for (const [what, port] of Object.entries(PORTS)) {
    if (!(await portFree(port))) {
      throw new Error(`A porta ${port} (${what}) já está em uso. Libere-a: o teste precisa dela.`)
    }
  }
  mkdirSync(OUT, { recursive: true })

  if (!skipBuild) {
    npm(BACKEND, 'run', 'build')
    npm(FRONTEND, 'run', 'build')
  }
  cleanup()

  // API: e-mails vão para o log (nunca para o Resend) e imagens ficam em disco, mesmo que o .env diga o contrário.
  const apiLogPath = join(OUT, 'api.log')
  const apiLog = openSync(apiLogPath, 'w')
  start(process.execPath, ['dist/main'], {
    cwd: BACKEND,
    stdio: ['ignore', apiLog, apiLog],
    env: {
      ...process.env,
      NODE_ENV: 'development',
      PORT: String(PORTS.api),
      // Os links dos e-mails de teste apontam para o site de teste.
      CORS_ORIGIN: SITE,
      RESEND_API_KEY: '',
      MAIL_FROM: '',
      STORAGE_S3_ENDPOINT: '',
      STORAGE_S3_BUCKET: '',
      STORAGE_S3_ACCESS_KEY_ID: '',
      STORAGE_S3_SECRET_ACCESS_KEY: '',
      STORAGE_PUBLIC_URL: '',
    },
  })
  closeSync(apiLog)
  await waitUntil(async () => (await fetch(`${API}/api/v1/health`)).ok, 'a API subir e o banco responder')

  start(process.execPath, [join(FRONTEND, 'node_modules/vite/bin/vite.js'), 'preview', '--port', String(PORTS.site), '--strictPort'], {
    cwd: FRONTEND,
    stdio: 'ignore',
    env: { ...process.env, API_PROXY_TARGET: API },
  })
  await waitUntil(async () => (await fetch(`${SITE}/api/v1/health`)).ok, 'o site subir')

  tempProfile = mkdtempSync(join(tmpdir(), 'amplifica-e2e-chrome-'))
  // No CI (runner Linux sem usuário privilegiado), o sandbox do Chrome pode não abrir; em casa, fica ligado.
  const chromeFlags = process.env.CI ? ['--no-sandbox'] : []
  start(chromeBinary(), ['--headless=new', `--remote-debugging-port=${PORTS.chrome}`, `--user-data-dir=${tempProfile}`, '--no-first-run', '--window-size=1280,900', ...chromeFlags, 'about:blank'], { stdio: 'ignore' })
  await waitUntil(async () => (await fetch(`http://127.0.0.1:${PORTS.chrome}/json/version`)).ok, 'o Chrome abrir')

  // ---------------------------------------------------------------- apoio dos fluxos
  let counter = 0
  const stamp = Date.now().toString(36)
  const api = async (path, { method = 'GET', token, body } = {}) => {
    const response = await fetch(`${API}/api/v1${path}`, {
      method,
      headers: { 'Content-Type': 'application/json', ...(token && { Authorization: `Bearer ${token}` }) },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
    const data = response.status === 204 ? null : await response.json().catch(() => null)
    if (!response.ok) throw new Error(`${method} ${path} -> ${response.status} ${JSON.stringify(data)}`)
    return data
  }
  const ctx = {
    api,
    newAccount(prefix) {
      counter += 1
      return {
        email: `${prefix}.${stamp}${counter}@e2e.amplifica.test`,
        username: `${prefix}_${stamp}${counter}`.slice(0, 20),
        password: PASSWORD,
      }
    },
    register: (account) => api('/auth/register', { method: 'POST', body: account }),
    promoteAdmin: (email) => inBackend(`await prisma.user.update({ where: { email: ${JSON.stringify(email)} }, data: { role: 'ADMIN' } });`),
    /** O link de um e-mail enviado em desenvolvimento, lido no log da API e apontado para o site de teste. */
    async emailLink(email, kind, nth = 1) {
      const escaped = email.replace(/[.+]/g, '\\$&')
      const pattern = new RegExp(`E-mail para ${escaped}[\\s\\S]*?(http\\S*/${kind}\\?token=[A-Za-z0-9_-]+)`, 'g')
      for (let i = 0; i < 80; i += 1) {
        const text = readFileSync(apiLogPath, 'utf8').replace(/\u001b\[[0-9;]*m/g, '')
        const matches = [...text.matchAll(pattern)]
        if (matches.length >= nth) {
          const url = new URL(matches[nth - 1][1])
          return `${SITE}${url.pathname}${url.search}`
        }
        await sleep(250)
      }
      throw new Error(`O e-mail "${kind}" para ${email} não apareceu no log da API`)
    },
    async verifyViaApi(email) {
      const link = new URL(await this.emailLink(email, 'confirmar-email'))
      await api('/auth/verify-email', { method: 'POST', body: { token: link.searchParams.get('token') } })
    },
  }

  // Dados próprios, isolados do que houver no banco.
  const adminAccount = ctx.newAccount('fx')
  const admin = await ctx.register(adminAccount)
  ctx.promoteAdmin(adminAccount.email)
  const post = (path, body) => api(path, { method: 'POST', token: admin.accessToken, body })
  const metal = await post('/genres', { name: 'E2E Metal', slug: 'e2e-metal' })
  const core = await post('/genres', { name: 'E2E Core', slug: 'e2e-core', parentId: metal.id })
  const folk = await post('/genres', { name: 'E2E Folk', slug: 'e2e-folk' })
  const sofia = await post('/artists', { name: 'E2E Sôfia Ruído', slug: 'e2e-sofia-ruido', genreIds: [core.id] })
  const quieta = await post('/artists', { name: 'E2E Banda Quieta', slug: 'e2e-banda-quieta', genreIds: [folk.id] })
  const release = (artist, title, releaseDate, type = 'ALBUM') => post('/releases', { title, type, releaseDate, artists: [{ artistId: artist.id }] })
  const [coracao, ruido, manha] = [
    await release(sofia, 'Coração Elétrico', '2013-03-29'),
    await release(sofia, 'Pequeno Ruído', '2015-06-01', 'EP'),
    await release(quieta, 'Manhã de Domingo', '2013-09-10'),
  ]
  await release(quieta, 'Cem% Verdade_Absoluta', '2020-01-01')
  ctx.fixture = { releases: { coracao: coracao.slug, ruido: ruido.slug, manha: manha.slug } }

  // ---------------------------------------------------------------- fluxos
  const report = []
  let failed = 0
  for (const key of FLOWS.filter((flow) => !only || only.includes(flow))) {
    const flow = await import(`./flows/${key}.mjs`)
    const t = await connect({ debugPort: PORTS.chrome, site: SITE, outDir: OUT })
    t.log.push(`\n== ${flow.name} ==`)
    try {
      await flow.run(t, ctx)
    } catch (error) {
      t.check(`o fluxo terminou sem exceção`, false, String(error).split('\n')[0])
    }
    t.check('nenhuma exceção não tratada no navegador', t.exceptions.length === 0, t.exceptions.join('; '))
    failed += t.failures
    report.push(...t.log)
    t.close()
  }

  writeFileSync(join(OUT, 'report.txt'), report.join('\n'))
  console.log(report.join('\n'))
  console.log(`\n${failed === 0 ? 'TUDO OK' : `${failed} falha(s)`}. Capturas de tela e relatório em e2e/out/.`)
  return failed
}

let exitCode = 1
try {
  exitCode = (await main()) === 0 ? 0 : 1
} catch (error) {
  console.error(`\nErro: ${error.message}`)
} finally {
  await shutdown()
  try {
    console.log(`Limpeza: ${cleanup()} conta(s) de teste removida(s).`)
  } catch (error) {
    console.error(`A limpeza falhou (${error.message}). Rode de novo ou apague os itens e-mails "@e2e.amplifica.test" e "e2e-..." à mão.`)
  }
}
process.exit(exitCode)
