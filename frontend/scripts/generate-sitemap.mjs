/**
 * Gera public/sitemap.xml com as páginas fixas e uma página para cada banda dos arquivos de dados
 * do backend (prisma/data/*.json). Rode depois de acrescentar bandas: npm run sitemap
 * O endereço do site vem de SITE_ORIGIN (padrão: o endereço atual da Netlify); troque quando houver domínio próprio.
 */
import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const origin = (process.env.SITE_ORIGIN ?? 'https://amplificacore.netlify.app').replace(/\/$/, '')
const dataDir = join(here, '..', '..', 'backend', 'prisma', 'data')

const fixed = ['/', '/artistas', '/lancamentos', '/generos', '/shows', '/cena-br', '/cena-br/historia', '/emo-tour']
const slugs = readdirSync(dataDir)
  .filter((file) => file.endsWith('.json'))
  .map((file) => JSON.parse(readFileSync(join(dataDir, file), 'utf8')).artist?.slug)
  .filter(Boolean)
  .sort()

const urls = [...fixed, ...slugs.map((slug) => `/artistas/${slug}`)]
const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((path) => `  <url><loc>${origin}${path}</loc></url>`).join('\n')}
</urlset>
`
writeFileSync(join(here, '..', 'public', 'sitemap.xml'), xml)
writeFileSync(join(here, '..', 'public', 'robots.txt'), `User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /moderacao\nDisallow: /conta\n\nSitemap: ${origin}/sitemap.xml\n`)
console.log(`sitemap.xml: ${urls.length} páginas (${slugs.length} bandas); robots.txt atualizado.`)
