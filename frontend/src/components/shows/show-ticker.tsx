import { useState } from 'react'
import { Link } from 'react-router'
import { showDay } from '../../lib/format-date'
import type { Show } from '../../types/api'

interface ShowTickerProps {
  shows: Show[]
  /** Texto que abre a faixa, como "Na agenda" ou "Emo Tour". */
  label: string
  /** Faixa que corre. Sem isto, fica parada. */
  animated?: boolean
  /** Para onde a faixa leva ao ser clicada (só quando corre). */
  to?: string
}

function tickerItems(shows: Show[]): string[] {
  return shows.map((show) => {
    const when = showDay(show.date)
    return `${show.name ?? show.acts[0]?.name ?? ''}, ${when.day} de ${when.month}`
  })
}

const textClasses = 'font-display text-[13px] tracking-wide uppercase'

/**
 * Faixa rosa com os próximos shows. Parada, repete o que a página já mostra e fica escondida de
 * leitores de tela. Correndo, vira um link para a página do organizador, e quem prefere menos
 * movimento a vê parada; há também um botão para pausar, porque movimento contínuo precisa de um.
 */
export function ShowTicker({ shows, label, animated = false, to }: ShowTickerProps) {
  const [paused, setPaused] = useState(false)
  if (shows.length === 0) {
    return null
  }
  const text = `${label} ★ ${tickerItems(shows).join(' ★ ')} ★`

  if (!animated) {
    return (
      <div aria-hidden="true" className="overflow-hidden bg-badge py-2 whitespace-nowrap text-on-accent">
        <p className={`mx-auto w-full max-w-7xl px-6 md:px-16 ${textClasses}`}>{text}</p>
      </div>
    )
  }

  return (
    <div className="relative flex bg-badge text-on-accent">
      <Link
        to={to ?? '/shows'}
        aria-label={`${label}: ${shows.length} ${shows.length === 1 ? 'evento' : 'eventos'}. Ver todos`}
        className="block min-w-0 flex-1 overflow-hidden py-2 whitespace-nowrap focus-visible:outline-offset-[-4px] focus-visible:outline-on-accent"
      >
        <div
          aria-hidden="true"
          className="flex w-max animate-marquee motion-reduce:animate-none"
          style={{ animationPlayState: paused ? 'paused' : 'running' }}
        >
          {[0, 1].map((copy) => (
            <p key={copy} className={`min-w-[100vw] shrink-0 px-8 ${textClasses}`}>
              {text}
            </p>
          ))}
        </div>
      </Link>
      <button
        type="button"
        onClick={() => setPaused((value) => !value)}
        aria-pressed={paused}
        className={`min-h-11 shrink-0 cursor-pointer border-l-2 border-on-accent bg-badge px-4 text-xs font-extrabold hover:bg-accent focus-visible:outline-offset-[-4px] focus-visible:outline-on-accent`}
      >
        {paused ? 'Continuar faixa' : 'Pausar faixa'}
      </button>
    </div>
  )
}
