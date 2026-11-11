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
  { name: 'Grafite', token: 'graphite', hex: '#1B1B1D', use: 'Fundo', swatch: 'bg-graphite border border-rule-strong' },
  { name: 'Grafite elevado', token: 'graphite-raised', hex: '#232326', use: 'Faixas e painéis', swatch: 'bg-graphite-raised border border-rule-strong' },
  { name: 'Papel', token: 'paper', hex: '#ECE5D5', use: 'Texto principal, 13,7:1', swatch: 'bg-paper' },
  { name: 'Cinza quente', token: 'muted', hex: '#A39D92', use: 'Texto secundário, 6,4:1', swatch: 'bg-muted' },
  { name: 'Ocre', token: 'ochre', hex: '#E3A72F', use: 'Destaque, 8,1:1', swatch: 'bg-ochre' },
  { name: 'Fio', token: 'rule', hex: '#47474C', use: 'Divisórias', swatch: 'bg-rule' },
  { name: 'Fio forte', token: 'rule-strong', hex: '#6B6B70', use: 'Borda de campos, 3,2:1', swatch: 'bg-rule-strong' },
  { name: 'Alerta', token: 'danger', hex: '#FF9C8A', use: 'Erros, 8,5:1', swatch: 'bg-danger' },
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
      <h1 className="font-display text-6xl leading-none font-normal tracking-tight md:text-7xl">
        Guia visual
      </h1>
      <p className="mt-6 mb-12 max-w-2xl font-serif text-xl">
        A identidade do Amplifica parte de uma revista de música impressa em papel escuro. Esta
        página reúne as cores, a tipografia e os componentes usados em todo o site.
      </p>

      <Section title="Logotipo">
        <Logo className="text-7xl md:text-8xl" />
        <p className="mt-4 max-w-2xl text-sm text-muted">
          Versão provisória em Fraunces. A identidade aprovada prevê a fonte Maskneyes, que depende
          de licença para uso em logotipo.
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
            <p className="font-display text-6xl leading-none tracking-tight md:text-7xl">
              Tudo que sobrou do inverno
            </p>
            <p className="mt-3 text-sm text-muted">Fraunces: títulos de página e de lançamento</p>
          </div>
          <div>
            <p className="font-display text-4xl leading-none italic">Resenhas</p>
            <p className="mt-3 text-sm text-muted">Fraunces itálica: títulos de seção e nomes de banda</p>
          </div>
          <div>
            <p className="max-w-2xl font-serif text-xl">
              O disco que eu queria ter ouvido aos dezessete. A faixa abre devagar e termina com a
              banda inteira gritando o mesmo verso, e funciona toda vez.
            </p>
            <p className="mt-3 text-sm text-muted">Newsreader: resenhas e textos longos</p>
          </div>
          <div>
            <p>Artistas, lançamentos, gêneros, botões e formulários.</p>
            <p className="mt-3 text-sm text-muted">Instrument Sans: navegação e dados</p>
          </div>
        </div>
      </Section>

      <Section title="Botões e links">
        <div className="flex flex-wrap items-center gap-6">
          <Button>Dar minha nota</Button>
          <Button variant="secondary">Escrever resenha</Button>
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
          <span className="font-display text-8xl leading-[0.8] font-light tracking-tighter text-ochre">
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
            className="mt-2 h-11 w-full accent-ochre"
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
