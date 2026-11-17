import { useState, type ReactNode } from 'react'
import { Container } from '../../../components/layout/container'
import { Button } from '../../../components/ui/button'
import { GenreTag } from '../../../components/ui/genre-tag'
import { Logo } from '../../../components/ui/logo'
import { RatingMeter } from '../../../components/ui/rating-meter'
import { SectionHeading } from '../../../components/ui/section-heading'
import { TextField } from '../../../components/ui/text-field'
import { TextLink } from '../../../components/ui/text-link'
import { formatRating } from '../../../lib/format-rating'
import { ApiStatus } from '../../status/components/api-status'

const COLORS = [
  {
    name: 'Preto',
    token: 'surface',
    hex: '#0B0B0C',
    use: 'Fundo do site',
    swatch: 'bg-surface border border-rule-strong',
  },
  {
    name: 'Grafite',
    token: 'surface-raised',
    hex: '#161618',
    use: 'Faixas e painéis; fios em #2A2A2E',
    swatch: 'bg-surface-raised border border-rule',
  },
  { name: 'Branco', token: 'ink', hex: '#FFFFFF', use: 'Texto principal, 19,7:1', swatch: 'bg-ink' },
  { name: 'Cinza', token: 'muted', hex: '#B9B9BD', use: 'Texto secundário, 10,1:1', swatch: 'bg-muted' },
  {
    name: 'Amarelo',
    token: 'accent',
    hex: '#FFE600',
    use: 'Cor principal, 15,5:1; texto sobre ele é preto, 15,5:1',
    swatch: 'bg-accent',
  },
  {
    name: 'Amarelo claro',
    token: 'accent-hover',
    hex: '#FFF27A',
    use: 'Destaque ao passar o mouse, 17,1:1',
    swatch: 'bg-accent-hover',
  },
  {
    name: 'Rosa',
    token: 'badge',
    hex: '#FF2D95',
    use: 'Só em selos ("AGORA", "AO VIVO"), 5,7:1; texto sobre ele é preto, 5,7:1',
    swatch: 'bg-badge',
  },
  { name: 'Alerta', token: 'danger', hex: '#FF7A7A', use: 'Erros, 7,8:1', swatch: 'bg-danger' },
  { name: 'Fio forte', token: 'rule-strong', hex: '#8A8A90', use: 'Borda de campos, 5,7:1', swatch: 'bg-rule-strong' },
]

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="border-t border-rule py-12">
      <SectionHeading>{title}</SectionHeading>
      <div className="mt-8">{children}</div>
    </section>
  )
}

/** Guia visual: todos os tokens e componentes-base do Amplifica em uma página. */
export function StyleguidePage() {
  const [rating, setRating] = useState(8)

  return (
    <Container className="pt-12 md:pt-16">
      <h1 className="font-display text-6xl leading-none font-normal tracking-tight md:text-7xl">Guia visual</h1>
      <p className="mt-6 mb-12 max-w-2xl text-xl">
        A identidade do Amplifica vem da TV de clipes: palco quase preto, amarelo como cor principal, rosa só em selos, títulos
        em Archivo Black e listras. Esta página reúne as cores, a tipografia e os componentes usados em todo o site.
      </p>

      <Section title="Logotipo">
        <Logo className="text-7xl md:text-8xl" />
        <p className="mt-4 max-w-2xl text-sm text-muted">
          Archivo Black (licença OFL, que permite uso em logotipo) sobre um bloco amarelo inclinado.
        </p>
      </Section>

      <Section title="Cores">
        <ul className="grid grid-cols-2 gap-x-6 gap-y-8 md:grid-cols-4">
          {COLORS.map((color) => (
            <li key={color.token}>
              <div className={`h-20 ${color.swatch}`} />
              <p className="mt-3 font-semibold">{color.name}</p>
              <p className="text-sm text-muted">
                {color.hex}
                <br />
                {color.use}
              </p>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Tipografia">
        <div className="flex flex-col gap-8">
          <div>
            <p className="font-display text-6xl leading-none tracking-tight md:text-7xl">Tudo que sobrou do inverno</p>
            <p className="mt-3 text-sm text-muted">Archivo Black: títulos de página, de seção e nomes de banda</p>
          </div>
          <div>
            <p className="max-w-2xl text-xl">
              O disco que eu queria ter ouvido aos dezessete. A faixa abre devagar e termina com a banda inteira
              gritando o mesmo verso, e funciona toda vez.
            </p>
            <p className="mt-3 text-sm text-muted">Archivo: resenhas, textos longos, navegação, botões e dados</p>
          </div>
        </div>
      </Section>

      <Section title="Botões e links">
        <div className="flex flex-wrap items-center gap-6">
          <Button>Dar minha nota</Button>
          <Button variant="secondary">Escrever resenha</Button>
          <Button variant="ink">Entrar</Button>
          <Button disabled>Indisponível</Button>
          <TextLink to="/guia">Link de texto</TextLink>
        </div>
      </Section>

      <Section title="Campos">
        <div className="grid max-w-3xl gap-8 md:grid-cols-2">
          <TextField label="Nome de usuário" placeholder="marina.fz" hint="Aparece ao lado das suas resenhas." />
          <TextField
            label="E-mail"
            type="email"
            defaultValue="marina@"
            error="Digite um e-mail completo, como nome@exemplo.com."
          />
        </div>
      </Section>

      <Section title="Gêneros">
        <div className="flex flex-wrap gap-3">
          <GenreTag name="Post-hardcore" to="/guia" />
          <GenreTag name="Midwest emo" to="/guia" />
          <GenreTag name="Metalcore" to="/guia" />
          <GenreTag name="Rock nacional" to="/guia" />
        </div>
      </Section>

      <Section title="Nota">
        <div className="flex flex-wrap items-center gap-8">
          <span className="font-display text-8xl leading-[0.8] font-light tracking-tighter text-accent">
            {formatRating(rating)}
          </span>
          <div>
            <RatingMeter value={rating} />
            <p className="mt-3 text-sm text-muted">Dez níveis, como um medidor de volume.</p>
          </div>
        </div>
        <div className="mt-8 max-w-xs">
          <label htmlFor="nota-exemplo" className="text-sm font-semibold">
            Experimente outra nota
          </label>
          <input
            id="nota-exemplo"
            type="range"
            min={1}
            max={10}
            step={1}
            value={rating}
            onChange={(event) => setRating(Number(event.target.value))}
            className="mt-2 h-11 w-full accent-accent"
          />
        </div>
        <div className="mt-6 flex items-center gap-3 text-sm">
          <span className="font-semibold">caio_dx</span>
          <span className="text-muted">deu nota 7</span>
          <RatingMeter value={7} size="sm" />
        </div>
      </Section>

      <Section title="Estado da API">
        <ApiStatus />
      </Section>
    </Container>
  )
}
